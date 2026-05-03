import { SITE_URL } from '@/lib/constants'
import { sitemapResponse, type SitemapUrl } from '@/lib/sitemap-utils'
import { SEO_BRANDS } from '@/lib/seo-brands'

export const revalidate = 3600

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? SITE_URL

export async function GET() {
  const lastmod = new Date().toISOString()
  const pages: SitemapUrl[] = [
    { loc: BASE, lastmod, changefreq: 'daily', priority: 1.0 },
    { loc: `${BASE}/veiculos`, lastmod, changefreq: 'hourly', priority: 0.9 },
    { loc: `${BASE}/sobre`, lastmod, changefreq: 'monthly', priority: 0.7 },
    { loc: `${BASE}/contato`, lastmod, changefreq: 'monthly', priority: 0.8 },
    { loc: `${BASE}/financiamento`, lastmod, changefreq: 'monthly', priority: 0.8 },
    { loc: `${BASE}/servicos/consignado`, lastmod, changefreq: 'monthly', priority: 0.7 },
    { loc: `${BASE}/compramos-seu-carro`, lastmod, changefreq: 'monthly', priority: 0.7 },
    { loc: `${BASE}/solicitar-veiculo`, lastmod, changefreq: 'monthly', priority: 0.6 },
    { loc: `${BASE}/blog`, lastmod, changefreq: 'daily', priority: 0.8 },
    { loc: `${BASE}/blog/arquivo`, lastmod, changefreq: 'daily', priority: 0.6 },
    { loc: `${BASE}/videos`, lastmod, changefreq: 'daily', priority: 0.7 },
    { loc: `${BASE}/guia-supercarro-gratis`, lastmod, changefreq: 'monthly', priority: 0.6 },
    { loc: `${BASE}/jornada`, lastmod, changefreq: 'monthly', priority: 0.5 },
    { loc: `${BASE}/glossario-automotivo`, lastmod, changefreq: 'weekly', priority: 0.5 },
    { loc: `${BASE}/politica-privacidade`, lastmod, changefreq: 'yearly', priority: 0.3 },
    { loc: `${BASE}/termos-uso`, lastmod, changefreq: 'yearly', priority: 0.3 },
    // SEO landing pages — brand/model hubs
    { loc: `${BASE}/comprar`, lastmod, changefreq: 'daily', priority: 0.8 },
    ...SEO_BRANDS.flatMap(brand => [
      { loc: `${BASE}/comprar/${brand.slug}`, lastmod, changefreq: 'daily', priority: 0.8 },
      ...brand.models.map(model => ({
        loc: `${BASE}/comprar/${brand.slug}/${model.slug}`,
        lastmod,
        changefreq: 'daily' as const,
        priority: 0.7,
      })),
    ]),
  ]

  return sitemapResponse(pages)
}
