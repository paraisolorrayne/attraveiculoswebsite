import { getVehicles } from '@/lib/autoconf-api'
import { SITE_URL } from '@/lib/constants'
import { sitemapResponse, type SitemapUrl } from '@/lib/sitemap-utils'

export const revalidate = 900

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? SITE_URL

export async function GET() {
  const urls: SitemapUrl[] = []
  try {
    const { vehicles } = await getVehicles({ registros_por_pagina: 1000 })
    for (const v of vehicles) {
      urls.push({
        loc: `${BASE}/veiculo/${v.slug}`,
        // Sem data da fonte, sem lastmod — nunca now() (ver src/lib/seo/frescor.ts).
        lastmod: v.updated_at ? new Date(v.updated_at).toISOString() : undefined,
        changefreq: 'daily',
        priority: 0.8,
      })
    }
  } catch (err) {
    console.error('sitemap-estoque: failed to load vehicles', err)
  }
  return sitemapResponse(urls)
}
