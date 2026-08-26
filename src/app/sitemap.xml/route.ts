import { SITE_URL } from '@/lib/constants'
import { getVehicles } from '@/lib/autoconf-api'
import { getBlogPosts } from '@/lib/blog-api'
import { LASTMOD_CONTEUDO_ESTATICO, dataMaisRecente, lastmodDoEstoque } from '@/lib/seo/frescor'

export const revalidate = 3600

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? SITE_URL

export async function GET() {
  // lastmod de cada sub-sitemap = a mudança mais recente do que ele lista, não
  // a hora do build (ver src/lib/seo/frescor.ts). Fonte indisponível → data
  // estática, nunca now().
  let estoque = LASTMOD_CONTEUDO_ESTATICO
  let blog = LASTMOD_CONTEUDO_ESTATICO
  try {
    const { vehicles } = await getVehicles({ registros_por_pagina: 1000 })
    estoque = lastmodDoEstoque(vehicles)
  } catch (err) {
    console.error('sitemap: estoque indisponível, lastmod estático', err)
  }
  try {
    const posts = await getBlogPosts({ limit: 50 })
    blog = dataMaisRecente(posts.map(p => p.updated_date || p.published_date)) ?? blog
  } catch (err) {
    console.error('sitemap: blog indisponível, lastmod estático', err)
  }
  const pages = dataMaisRecente([estoque, blog, LASTMOD_CONTEUDO_ESTATICO]) ?? LASTMOD_CONTEUDO_ESTATICO

  const sitemaps: Array<{ loc: string; lastmod: string }> = [
    { loc: `${BASE}/sitemap-pages.xml`, lastmod: pages },
    { loc: `${BASE}/sitemap-blog.xml`, lastmod: blog },
    { loc: `${BASE}/sitemap-estoque.xml`, lastmod: estoque },
    { loc: `${BASE}/sitemap-manual.xml`, lastmod: LASTMOD_CONTEUDO_ESTATICO },
  ]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps
  .map(
    s => `  <sitemap>
    <loc>${s.loc}</loc>
    <lastmod>${s.lastmod}</lastmod>
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
