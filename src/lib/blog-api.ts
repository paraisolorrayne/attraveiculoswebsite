import { unstable_cache } from 'next/cache'
import type { DualBlogPost, BlogPostType, BlogAuthor, EducativoFields, CarReviewFields, BlogPostSEO } from '@/types'
import { importedBlogPosts } from './imported-blog-posts'
import { processInstagramEmbeds } from './instagram-processor'
import { db } from '@/lib/db'

// Migrado de supabase-js → Kysely (ver docs/MIGRACAO_POSTGRES_PURO.md).

// ===========================================
// HELPERS
// ===========================================

function isoOrUndef(v: unknown): string | undefined {
  if (v == null) return undefined
  return v instanceof Date ? v.toISOString() : String(v)
}

function transformDbPost(p: Record<string, unknown>): DualBlogPost {
  return {
    id: p.id as string,
    post_type: p.post_type as BlogPostType,
    title: p.title as string,
    slug: p.slug as string,
    excerpt: p.excerpt as string,
    content: p.content as string,
    featured_image: p.featured_image as string,
    featured_image_alt: p.featured_image_alt as string,
    author: p.author as BlogAuthor,
    published_date: isoOrUndef(p.published_date) as string,
    updated_date: isoOrUndef(p.updated_date),
    reading_time: p.reading_time as string,
    is_published: p.is_published as boolean,
    educativo: p.educativo as EducativoFields | undefined,
    car_review: p.car_review as CarReviewFields | undefined,
    seo: p.seo as BlogPostSEO,
  }
}

// ===========================================
// API FUNCTIONS
// ===========================================

export interface GetBlogPostsOptions {
  type?: BlogPostType | 'all'
  limit?: number
  category?: string
}

export async function getBlogPosts(options: GetBlogPostsOptions = {}): Promise<DualBlogPost[]> {
  const { type = 'all', limit, category } = options

  // Fetch published posts do banco
  let supabasePosts: DualBlogPost[] = []
  try {
    const dbPosts = await db.selectFrom('dual_blog_posts').selectAll()
      .where('is_published', '=', true)
      .orderBy('published_date', 'desc')
      .execute()
    supabasePosts = dbPosts.map(p => transformDbPost(p as unknown as Record<string, unknown>))
  } catch (error) {
    console.error('DB error in getBlogPosts:', error)
  }

  // Merge with imported WordPress posts
  let posts = [...supabasePosts, ...importedBlogPosts.filter(p => p.is_published)]

  if (type !== 'all') {
    posts = posts.filter(p => p.post_type === type)
  }

  if (category && type === 'educativo') {
    posts = posts.filter(p => p.educativo?.category === category)
  }

  // Sort by date (newest first)
  posts.sort((a, b) => new Date(b.published_date).getTime() - new Date(a.published_date).getTime())

  if (limit) {
    posts = posts.slice(0, limit)
  }

  return posts
}

export async function getBlogPost(slug: string): Promise<DualBlogPost | null> {
  // Try DB first (admin-created posts)
  try {
    const dbPost = await db.selectFrom('dual_blog_posts').selectAll()
      .where('slug', '=', slug)
      .where('is_published', '=', true)
      .executeTakeFirst()

    if (dbPost) {
      const post = transformDbPost(dbPost as unknown as Record<string, unknown>)
      return {
        ...post,
        content: processInstagramEmbeds(post.content),
      }
    }
  } catch (error) {
    console.error('DB error in getBlogPost:', error)
  }

  // Fall back to imported WordPress posts
  const post = importedBlogPosts.find(p => p.slug === slug && p.is_published)
  if (!post) return null

  return {
    ...post,
    content: processInstagramEmbeds(post.content),
  }
}

export async function getRelatedPosts(currentSlug: string, postType: BlogPostType, limit = 3): Promise<DualBlogPost[]> {
  const posts = await getBlogPosts({ type: postType, limit: limit + 1 })
  return posts.filter(p => p.slug !== currentSlug).slice(0, limit)
}

export function getEducativoCategories(): string[] {
  return ['Curadoria', 'Mercado', 'Dicas', 'Lifestyle']
}

// ===========================================
// PREVIEW (listagens) — sem `content`/`seo` pra não inflar o payload RSC
// ===========================================

export interface BlogPostPreview {
  id: string
  post_type: BlogPostType
  title: string
  slug: string
  excerpt: string
  featured_image: string
  featured_image_alt: string
  published_date: string
  reading_time: string
  educativo?: { category?: string; seo_keyword?: string }
  car_review?: { brand: string; model: string; year: number; version?: string }
}

export function toPreview(post: DualBlogPost): BlogPostPreview {
  return {
    id: post.id,
    post_type: post.post_type,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    featured_image: post.featured_image,
    featured_image_alt: post.featured_image_alt,
    published_date: post.published_date,
    reading_time: post.reading_time,
    educativo: post.educativo
      ? { category: post.educativo.category, seo_keyword: post.educativo.seo_keyword }
      : undefined,
    car_review: post.car_review
      ? {
          brand: post.car_review.brand,
          model: post.car_review.model,
          year: post.car_review.year,
          version: post.car_review.version,
        }
      : undefined,
  }
}

// Busca leve (sem `content`) + cache de 30 min: as páginas de listagem viram
// dinâmicas por causa de searchParams, e sem isto cada request (inclusive
// crawler paginando o arquivo) faria um full scan da tabela com o conteúdo
// integral de todos os posts.
async function fetchAllPreviews(): Promise<BlogPostPreview[]> {
  let dbPreviews: BlogPostPreview[] = []
  try {
    const rows = await db.selectFrom('dual_blog_posts')
      .select([
        'id', 'post_type', 'title', 'slug', 'excerpt', 'featured_image',
        'featured_image_alt', 'published_date', 'reading_time', 'educativo', 'car_review',
      ])
      .where('is_published', '=', true)
      .orderBy('published_date', 'desc')
      .execute()
    dbPreviews = rows.map(r => toPreview({
      ...r,
      published_date: isoOrUndef(r.published_date),
    } as unknown as DualBlogPost))
  } catch (error) {
    console.error('DB error in fetchAllPreviews:', error)
  }

  const imported = importedBlogPosts.filter(p => p.is_published).map(toPreview)
  const posts = [...dbPreviews, ...imported]
  posts.sort((a, b) => new Date(b.published_date).getTime() - new Date(a.published_date).getTime())
  return posts
}

const getAllPreviewsCached = unstable_cache(fetchAllPreviews, ['blog-posts-preview'], { revalidate: 1800 })

export async function getBlogPostsPreview(options: GetBlogPostsOptions = {}): Promise<BlogPostPreview[]> {
  const { type = 'all', limit, category } = options
  let posts = await getAllPreviewsCached()
  if (type !== 'all') {
    posts = posts.filter(p => p.post_type === type)
  }
  if (category && type === 'educativo') {
    posts = posts.filter(p => p.educativo?.category === category)
  }
  if (limit) {
    posts = posts.slice(0, limit)
  }
  return posts
}

