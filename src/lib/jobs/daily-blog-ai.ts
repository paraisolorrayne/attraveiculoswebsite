/**
 * Daily Blog AI Job
 *
 * Runs once a day (triggered by Supabase pg_cron → /api/cron/blog-ai).
 *
 * Strategy:
 *   1. Is there an IG post from @attra.veiculos in the last 24h?
 *      → Yes: expand it into a blog post.
 *        - If post has images, use them.
 *        - If post is a video, extract car name from caption and pull photos
 *          from AutoConf inventory.
 *   2. No IG post today:
 *      → Alternate between 'review' (car > R$300k) and 'comparison' based on
 *        what was generated yesterday.
 *
 * Idempotency: if a row already exists in `blog_ai_generations` for today,
 * the job returns early without generating.
 */

import { createAdminClient } from '@/lib/supabase/server'
import { snapshotExternalImages } from '@/lib/supabase/storage'
import type { CarReviewGalleryImage } from '@/types'
import {
  fetchLatestInstagramPost,
  extractImageUrls,
  guessCarNameFromCaption,
} from '@/lib/blog-ai/instagram-fetcher'
import {
  pickVehicleForReview,
  pickVehiclesForComparison,
  findVehicleByName,
} from '@/lib/blog-ai/vehicle-picker'
import {
  generateReview,
  generateComparison,
  generateFromInstagram,
  type BlogAiStrategy,
  type GeneratedBlog,
} from '@/lib/blog-ai/gemini-blog'
import { addInternalLinks } from '@/lib/blog-ai/internal-linker'

export interface BlogAiRunResult {
  success: boolean
  strategy: BlogAiStrategy | 'skipped'
  blogPostId?: string
  blogPostSlug?: string
  error?: string
  debug?: Record<string, unknown>
}

/**
 * Options to override default orchestration behavior. Used for manual testing
 * (e.g. forcing the comparison strategy or bypassing the once-per-day guard).
 *
 * `strategy` only supports fallback strategies (review/comparison) — 'instagram'
 * requires a real IG post in the last 24h and can't be forced without one.
 */
export interface ForceOptions {
  strategy?: 'review' | 'comparison'
  skipIdempotency?: boolean
}

const SAO_PAULO_TZ = 'America/Sao_Paulo'

function todayInSaoPaulo(): string {
  // YYYY-MM-DD in America/Sao_Paulo
  return new Date().toLocaleDateString('en-CA', { timeZone: SAO_PAULO_TZ })
}

async function alreadyRanToday(): Promise<boolean> {
  const supabase = createAdminClient()
  const today = todayInSaoPaulo()
  const { data, error } = await supabase
    .from('blog_ai_generations')
    .select('id, strategy, success')
    .eq('run_date', today)
    .eq('success', true)
    .limit(1)

  if (error) {
    console.error('[DailyBlogAI] idempotency check failed:', error.message)
    return false // fail-open: try to generate
  }
  return (data?.length ?? 0) > 0
}

async function lastStrategy(): Promise<BlogAiStrategy | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('blog_ai_generations')
    .select('strategy')
    .eq('success', true)
    .in('strategy', ['review', 'comparison'])
    .order('run_at', { ascending: false })
    .limit(1)

  const s = data?.[0]?.strategy as BlogAiStrategy | undefined
  return s ?? null
}

async function logRun(params: {
  strategy: BlogAiStrategy | 'skipped'
  blogPostId?: string
  source: Record<string, unknown>
  success: boolean
  errorMessage?: string
}): Promise<void> {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from('blog_ai_generations').insert({
      strategy: params.strategy,
      blog_post_id: params.blogPostId ?? null,
      source: params.source,
      success: params.success,
      error_message: params.errorMessage ?? null,
      run_date: todayInSaoPaulo(),
    })
    if (error) {
      // Don't fail the job if the tracking table isn't available yet (migration pending).
      console.warn('[DailyBlogAI] logRun insert failed (non-fatal):', error.message)
    }
  } catch (err) {
    console.warn('[DailyBlogAI] logRun threw (non-fatal):', err instanceof Error ? err.message : String(err))
  }
}

/**
 * Snapshot all external image URLs in a post (featured, gallery, content) into
 * Supabase Storage, so the post is immune to upstream link rot.
 * Returns a copy of the post with snapshotted URLs.
 */
async function snapshotPostImages(post: GeneratedBlog['post']): Promise<GeneratedBlog['post']> {
  const urls: string[] = []
  if (post.featured_image) urls.push(post.featured_image)

  const gallery = post.car_review?.gallery_images
  if (Array.isArray(gallery)) {
    for (const g of gallery) {
      const url = typeof g === 'string' ? g : g.url
      if (url) urls.push(url)
    }
  }

  const contentImgUrls: string[] = []
  if (post.content) {
    const re = /<img[^>]*src=["'](https?:\/\/[^"']+)["']/g
    let m: RegExpExecArray | null
    while ((m = re.exec(post.content)) !== null) {
      contentImgUrls.push(m[1])
      urls.push(m[1])
    }
  }

  if (urls.length === 0) return post

  const map = await snapshotExternalImages(urls)

  const apply = (url: string) => map[url] ?? url

  let nextContent = post.content
  for (const u of contentImgUrls) {
    if (map[u] && map[u] !== u) {
      nextContent = nextContent.split(u).join(map[u])
    }
  }

  let nextGallery: typeof gallery = gallery
  if (Array.isArray(gallery)) {
    nextGallery = (gallery as Array<string | CarReviewGalleryImage>).map(g =>
      typeof g === 'string' ? apply(g) : { ...g, url: apply(g.url) }
    ) as typeof gallery
  }

  return {
    ...post,
    featured_image: apply(post.featured_image),
    content: nextContent,
    car_review: post.car_review
      ? { ...post.car_review, gallery_images: nextGallery ?? post.car_review.gallery_images }
      : post.car_review,
  }
}

async function persistPost(generated: GeneratedBlog): Promise<{
  id: string
  slug: string
}> {
  const supabase = createAdminClient()
  const linked = await addInternalLinks(generated.post)
  if (linked.linksAdded > 0) {
    console.log(`[DailyBlogAI] added ${linked.linksAdded} internal links`)
  }
  const post = await snapshotPostImages(linked.post)

  const { data, error } = await supabase
    .from('dual_blog_posts')
    .insert({
      post_type: post.post_type,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      featured_image: post.featured_image,
      featured_image_alt: post.featured_image_alt,
      author: post.author,
      published_date: post.published_date,
      reading_time: post.reading_time,
      is_published: post.is_published,
      educativo: post.educativo ?? null,
      car_review: post.car_review ?? null,
      seo: post.seo,
      source: 'admin', // 'admin' so it shows up in the normal feed
    })
    .select('id, slug')
    .single()

  if (error || !data) {
    throw new Error(`Supabase insert failed: ${error?.message ?? 'no data'}`)
  }
  return { id: data.id as string, slug: data.slug as string }
}

// ---------------------------------------------------------------------------
// Public entrypoint
// ---------------------------------------------------------------------------

export async function runDailyBlogAi(force: ForceOptions = {}): Promise<BlogAiRunResult> {
  console.log('[DailyBlogAI] starting run for', todayInSaoPaulo(), force)

  if (!force.skipIdempotency && !force.strategy && (await alreadyRanToday())) {
    console.log('[DailyBlogAI] already ran today — skipping')
    return { success: true, strategy: 'skipped' }
  }

  // ---- 1. Try Instagram first (unless overridden) -------------------------
  if (!force.strategy) {
  try {
    const igPost = await fetchLatestInstagramPost(24)

    if (igPost) {
      console.log('[DailyBlogAI] IG post found:', igPost.permalink)

      let images = extractImageUrls(igPost)
      let vehicle = null

      // Video posts usually have no usable images → try to enrich from stock.
      const looksLikeVideo = igPost.media_type === 'VIDEO' || images.length === 0
      if (looksLikeVideo) {
        const carName = guessCarNameFromCaption(igPost.caption)
        if (carName) {
          vehicle = await findVehicleByName(carName)
          if (vehicle && (vehicle.photos?.length ?? 0) > 0) {
            images = vehicle.photos ?? []
          }
        }
      }

      const generated = await generateFromInstagram({
        caption: igPost.caption,
        permalink: igPost.permalink,
        images,
        vehicle,
      })
      const saved = await persistPost(generated)
      await logRun({
        strategy: 'instagram',
        blogPostId: saved.id,
        source: { ig_post_id: igPost.id, permalink: igPost.permalink, vehicle_id: vehicle?.id },
        success: true,
      })

      return {
        success: true,
        strategy: 'instagram',
        blogPostId: saved.id,
        blogPostSlug: saved.slug,
      }
    }

    console.log('[DailyBlogAI] no IG post in last 24h, falling back to review/comparison')
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[DailyBlogAI] IG strategy failed, falling back:', msg)
    // don't return — we still try review/comparison below
  }
  } // end of if (!force.strategy)

  // ---- 2. Fallback: alternate review vs comparison ------------------------
  let nextStrategy: BlogAiStrategy
  if (force.strategy) {
    nextStrategy = force.strategy
    console.log('[DailyBlogAI] strategy forced to', nextStrategy)
  } else {
    const last = await lastStrategy()
    nextStrategy = last === 'review' ? 'comparison' : 'review'
  }

  try {
    if (nextStrategy === 'review') {
      const vehicle = await pickVehicleForReview()
      if (!vehicle) {
        throw new Error('No eligible vehicle (> R$300k) in stock for review')
      }
      const generated = await generateReview(vehicle)
      const saved = await persistPost(generated)
      await logRun({
        strategy: 'review',
        blogPostId: saved.id,
        source: { vehicle_id: vehicle.id, vehicle_slug: vehicle.slug },
        success: true,
      })
      return {
        success: true,
        strategy: 'review',
        blogPostId: saved.id,
        blogPostSlug: saved.slug,
      }
    }

    // comparison
    const pair = await pickVehiclesForComparison()
    if (!pair) {
      throw new Error('Not enough eligible vehicles to build a comparison')
    }
    const [a, b] = pair
    const generated = await generateComparison(a, b)
    const saved = await persistPost(generated)
    await logRun({
      strategy: 'comparison',
      blogPostId: saved.id,
      source: { vehicle_a_id: a.id, vehicle_b_id: b.id },
      success: true,
    })
    return {
      success: true,
      strategy: 'comparison',
      blogPostId: saved.id,
      blogPostSlug: saved.slug,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[DailyBlogAI] fallback strategy failed:', msg)
    await logRun({
      strategy: nextStrategy,
      source: {},
      success: false,
      errorMessage: msg,
    })
    return { success: false, strategy: nextStrategy, error: msg }
  }
}
