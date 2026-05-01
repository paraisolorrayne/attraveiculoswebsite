import { SITE_URL } from '@/lib/constants'

export const revalidate = 3600

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? SITE_URL

export async function GET() {
  const lastmod = new Date().toISOString()
  const sitemaps = [
    `${BASE}/sitemap-pages.xml`,
    `${BASE}/sitemap-blog.xml`,
    `${BASE}/sitemap-estoque.xml`,
    `${BASE}/sitemap-manual.xml`,
  ]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps
  .map(
    s => `  <sitemap>
    <loc>${s}</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>`
  )
  .join('\n')}
</sitemapindex>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
