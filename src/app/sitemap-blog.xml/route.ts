import { getBlogPosts } from '@/lib/blog-api'
import { SITE_URL } from '@/lib/constants'
import { sitemapResponse, type SitemapUrl } from '@/lib/sitemap-utils'

export const revalidate = 1800

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? SITE_URL

export async function GET() {
  const urls: SitemapUrl[] = []
  try {
    const posts = await getBlogPosts({ type: 'all', limit: 1000 })
    for (const post of posts) {
      urls.push({
        loc: `${BASE}/blog/${post.slug}`,
        lastmod: post.updated_date || post.published_date || new Date().toISOString(),
        changefreq: 'weekly',
        priority: post.post_type === 'car_review' ? 0.8 : 0.7,
      })
    }
  } catch (err) {
    console.error('sitemap-blog: failed to load posts', err)
  }
  return sitemapResponse(urls)
}
