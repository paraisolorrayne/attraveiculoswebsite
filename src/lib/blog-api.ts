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

interface GetBlogPostsOptions {
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

