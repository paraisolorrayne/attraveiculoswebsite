/**
 * Blog AI Job
 *
 * Desde 28/10/2026 roda 3 vezes por semana (seg, qua e sex; ver
 * deploy/cron/cron.d/attra-blog-ai) e escreve a partir do Instagram:
 *
 *   1. Pega o post mais recente de @attra.veiculos (até 21 dias) que ainda
 *      não virou artigo e cuja legenda rende artigo (escolher-post-instagram).
 *   2. Procura na legenda o carro do estoque; achou, o texto usa a ficha do
 *      molde (números) e o post sai como review, com o preço ao vivo no
 *      quadro de disponibilidade. Carro que já tem review sai como história.
 *   3. Sem post novo, não publica: o blog espera o próximo post em vez de
 *      inventar pauta.
 *
 * Enquanto a Meta não tem token (META_* fora do .env.production), o post sai
 * de um carro do estoque que ainda não tem review, na mesma voz curta e com os
 * números da ficha (generateReviewDoEstoque). O review longo e o comparativo
 * diários (80 e 62 posts até 28/10) acabaram; o comparativo fica só à mão
 * (?strategy=comparison), e ?strategy=review dispara o review do estoque.
 *
 * Idempotency: if a row already exists in `blog_ai_generations` for today,
 * the job returns early without generating.
 */

import { db } from '@/lib/db'
import { snapshotExternalImages } from '@/lib/supabase/storage'

// DB migrado supabase-js → Kysely; storage segue no Supabase (Fase 6).
import type { CarReviewFields, CarReviewGalleryImage } from '@/types'
import {
  fetchRecentInstagramPosts,
  extractImageUrls,
  guessCarNameFromCaption,
  instagramConfigurado,
} from '@/lib/blog-ai/instagram-fetcher'
import { escolherPostDoInstagram, textoDaLegenda } from '@/lib/blog-ai/escolher-post-instagram'
import { getVehicleBySlug } from '@/lib/autoconf-api'
import type { Vehicle } from '@/types'
import {
  pickVehicleForReview,
  pickVehiclesForComparison,
  findVehicleByName,
  exemplaresJaResenhados,
  jaResenhado,
  vehicleKey,
} from '@/lib/blog-ai/vehicle-picker'
import {
  generateReviewDoEstoque,
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
 * `strategy` dispara o review do estoque ou o comparativo à mão; sem ela,
 * Instagram (ou o review do estoque, sem token da Meta).
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
  try {
    const today = todayInSaoPaulo()
    const data = await db.selectFrom('blog_ai_generations')
      .select(['id', 'strategy', 'success'])
      .where('run_date', '=', today)
      .where('success', '=', true)
      .limit(1)
      .execute()
    return data.length > 0
  } catch (error) {
    console.error('[DailyBlogAI] idempotency check failed:', error instanceof Error ? error.message : error)
    return false // fail-open: try to generate
  }
}

async function logRun(params: {
  strategy: BlogAiStrategy | 'skipped'
  blogPostId?: string
  source: Record<string, unknown>
  success: boolean
  errorMessage?: string
}): Promise<void> {
  try {
    await db.insertInto('blog_ai_generations').values({
      strategy: params.strategy,
      blog_post_id: params.blogPostId ?? null,
      source: params.source,
      success: params.success,
      error_message: params.errorMessage ?? null,
      run_date: todayInSaoPaulo(),
    }).execute()
  } catch (err) {
    console.warn('[DailyBlogAI] logRun threw (non-fatal):', err instanceof Error ? err.message : String(err))
  }
}

/** Discriminate the gallery union (`string[] | CarReviewGalleryImage[]`). */
function isStringGallery(
  gallery: CarReviewFields['gallery_images']
): gallery is string[] {
  return gallery.length === 0 || typeof gallery[0] === 'string'
}

/** Apply URL substitution to a gallery without losing its discriminated type. */
function rewriteGallery(
  gallery: CarReviewFields['gallery_images'],
  apply: (url: string) => string
): CarReviewFields['gallery_images'] {
  if (isStringGallery(gallery)) {
    return gallery.map(apply)
  }
  return gallery.map((g): CarReviewGalleryImage => ({ ...g, url: apply(g.url) }))
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
  if (gallery) {
    if (isStringGallery(gallery)) {
      for (const u of gallery) if (u) urls.push(u)
    } else {
      for (const g of gallery) if (g.url) urls.push(g.url)
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

  return {
    ...post,
    featured_image: apply(post.featured_image),
    content: nextContent,
    car_review: post.car_review
      ? {
          ...post.car_review,
          gallery_images: rewriteGallery(post.car_review.gallery_images, apply),
        }
      : post.car_review,
  }
}

async function persistPost(generated: GeneratedBlog): Promise<{
  id: string
  slug: string
}> {
  const linked = await addInternalLinks(generated.post)
  if (linked.linksAdded > 0) {
    console.log(`[DailyBlogAI] added ${linked.linksAdded} internal links`)
  }
  const post = await snapshotPostImages(linked.post)

  const data = await db.insertInto('dual_blog_posts')
    .values({
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
    .returning(['id', 'slug'])
    .executeTakeFirst()

  if (!data) {
    throw new Error('DB insert failed: no data')
  }
  return { id: data.id as string, slug: data.slug as string }
}

// ---------------------------------------------------------------------------
// Public entrypoint
// ---------------------------------------------------------------------------

/** Ids dos posts do Instagram que já viraram artigo. */
async function postsDoInstagramJaUsados(): Promise<Set<string>> {
  const linhas = await db.selectFrom('blog_ai_generations')
    .select('source')
    .where('strategy', '=', 'instagram')
    .where('success', '=', true)
    .execute()
  const ids = linhas.map((l) => (l.source as { ig_post_id?: string } | null)?.ig_post_id)
  return new Set(ids.filter((id): id is string => Boolean(id)))
}

/** O carro do estoque citado na legenda, com a ficha do molde (só a busca da ficha a traz). */
async function carroDaLegenda(legenda: string): Promise<Vehicle | null> {
  const nome = guessCarNameFromCaption(legenda)
  if (!nome) return null
  const achado = await findVehicleByName(nome)
  if (!achado) return null
  return (await getVehicleBySlug(achado.slug)) ?? achado
}

async function runInstagram(): Promise<BlogAiRunResult> {
  try {
    const posts = await fetchRecentInstagramPosts(25)
    // A conta tem centenas de posts: lista vazia é a Graph API recusando
    // (token vencido, permissão), não falta de pauta.
    if (posts.length === 0) throw new Error('Graph API não devolveu nenhum post (token vencido ou sem permissão?)')

    const ig = escolherPostDoInstagram(posts, await postsDoInstagramJaUsados())
    if (!ig) {
      console.log('[DailyBlogAI] nenhum post novo do Instagram que renda artigo — sem post hoje')
      return { success: true, strategy: 'skipped', debug: { motivo: 'sem post novo do Instagram que renda artigo' } }
    }
    console.log('[DailyBlogAI] IG post escolhido:', ig.permalink)

    const vehicle = await carroDaLegenda(ig.caption)
    const carroJaResenhado = vehicle ? jaResenhado(vehicle, await exemplaresJaResenhados()) : false
    // Fotos do post primeiro (são as que o leitor viu); as do anúncio completam.
    const images = [...extractImageUrls(ig), ...(vehicle?.photos ?? [])].slice(0, 10)

    const generated = await generateFromInstagram({
      caption: textoDaLegenda(ig.caption),
      permalink: ig.permalink,
      images,
      vehicle,
      carroJaResenhado,
    })
    const saved = await persistPost(generated)
    await logRun({
      strategy: 'instagram',
      blogPostId: saved.id,
      source: { ig_post_id: ig.id, permalink: ig.permalink, vehicle_id: vehicle?.id, como: generated.post.post_type },
      success: true,
    })
    return { success: true, strategy: 'instagram', blogPostId: saved.id, blogPostSlug: saved.slug }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[DailyBlogAI] Instagram strategy failed:', msg)
    await logRun({ strategy: 'instagram', source: {}, success: false, errorMessage: msg })
    return { success: false, strategy: 'instagram', error: msg }
  }
}

/** Review de um carro do estoque que ainda não tem review (ver generateReviewDoEstoque). */
async function runReviewDoEstoque(): Promise<BlogAiRunResult> {
  try {
    const escolhido = await pickVehicleForReview()
    if (!escolhido) {
      console.log('[DailyBlogAI] todo carro elegível já tem review — sem post hoje')
      return { success: true, strategy: 'skipped', debug: { motivo: 'todo carro elegível já tem review' } }
    }
    // Só a busca da ficha traz o molde (interior, torque, 0 a 100).
    const vehicle = (await getVehicleBySlug(escolhido.slug)) ?? escolhido
    const generated = await generateReviewDoEstoque(vehicle)
    const saved = await persistPost(generated)
    await logRun({
      strategy: 'review',
      blogPostId: saved.id,
      source: { vehicle_id: vehicle.id, vehicle_slug: vehicle.slug },
      success: true,
    })
    return { success: true, strategy: 'review', blogPostId: saved.id, blogPostSlug: saved.slug }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[DailyBlogAI] review do estoque falhou:', msg)
    await logRun({ strategy: 'review', source: {}, success: false, errorMessage: msg })
    return { success: false, strategy: 'review', error: msg }
  }
}

async function runComparison(): Promise<BlogAiRunResult> {
  try {
    const pair = await pickVehiclesForComparison()
    if (!pair) throw new Error('Nothing new to write: every comparison pair was published')
    const [a, b] = pair
    const generated = await generateComparison(a, b)
    const saved = await persistPost(generated)
    await logRun({
      strategy: 'comparison',
      blogPostId: saved.id,
      // As chaves marca|modelo deixam o par reconhecível mesmo se a AutoConf
      // trocar o id de um dos carros (ver paresJaFeitos).
      source: { vehicle_a_id: a.id, vehicle_b_id: b.id, vehicle_a_key: vehicleKey(a), vehicle_b_key: vehicleKey(b) },
      success: true,
    })
    return { success: true, strategy: 'comparison', blogPostId: saved.id, blogPostSlug: saved.slug }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[DailyBlogAI] comparison failed:', msg)
    await logRun({ strategy: 'comparison', source: {}, success: false, errorMessage: msg })
    return { success: false, strategy: 'comparison', error: msg }
  }
}

export async function runDailyBlogAi(force: ForceOptions = {}): Promise<BlogAiRunResult> {
  console.log('[DailyBlogAI] starting run for', todayInSaoPaulo(), force)

  if (!force.skipIdempotency && !force.strategy && (await alreadyRanToday())) {
    console.log('[DailyBlogAI] already ran today — skipping')
    return { success: true, strategy: 'skipped' }
  }

  if (force.strategy === 'comparison') return runComparison()
  if (force.strategy === 'review') return runReviewDoEstoque()

  if (instagramConfigurado()) return runInstagram()
  console.log('[DailyBlogAI] Instagram sem token da Meta — post do estoque')
  return runReviewDoEstoque()
}
