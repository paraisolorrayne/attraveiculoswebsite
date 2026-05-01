import { manualAttraTerms } from '@/lib/manual-attra-data'
import { SITE_URL } from '@/lib/constants'
import { sitemapResponse, type SitemapUrl } from '@/lib/sitemap-utils'

export const revalidate = 86400

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? SITE_URL

export async function GET() {
  const lastmod = new Date().toISOString()
  const urls: SitemapUrl[] = [
    { loc: `${BASE}/manual-attra`, lastmod, changefreq: 'weekly', priority: 0.7 },
    ...manualAttraTerms.map(t => ({
      loc: `${BASE}/manual-attra/${t.slug}`,
      lastmod,
      changefreq: 'monthly' as const,
      priority: 0.6,
    })),
  ]
  return sitemapResponse(urls)
}
