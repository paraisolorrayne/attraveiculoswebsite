import { manualAttraTerms } from '@/lib/manual-attra-data'
import { SITE_URL } from '@/lib/constants'
import { sitemapResponse, type SitemapUrl } from '@/lib/sitemap-utils'
import { LASTMOD_CONTEUDO_ESTATICO } from '@/lib/seo/frescor'

export const revalidate = 86400

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? SITE_URL

export async function GET() {
  // Glossário é conteúdo fixo: lastmod mantido à mão (ver src/lib/seo/frescor.ts).
  const lastmod = LASTMOD_CONTEUDO_ESTATICO
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
