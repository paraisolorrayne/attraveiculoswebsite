import { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://attraveiculos.com.br'

/**
 * Dynamic robots.txt for Attra Veículos
 * 
 * Optimized for:
 * - Maximum crawlability of public content
 * - Protection of admin and API routes
 * - Proper sitemap reference
 */
/**
 * Endpoints públicos destinados a consumo por LLM.
 *
 * `/api/vehicles/search` só funciona com querystring (`?q=`), e a regra
 * `Disallow: /*?*` abaixo casa com ela. Google e Bing resolvem o conflito pela
 * regra mais longa, então o Allow precisa incluir o `?q=` para vencer — sem
 * isso o endpoint fica anunciado no llms.txt e bloqueado no robots.txt.
 */
const LLM_ENDPOINT_ALLOWS = [
  '/api/llm/',
  '/api/vehicles/search',
  '/api/vehicles/search?q=',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          ...LLM_ENDPOINT_ALLOWS,
        ],
        disallow: [
          '/admin/',
          '/admin/*',
          '/api/',
          '/api/*',
          '/_next/',
          '/_next/*',
          '/private/',
          '/*.json$',
          '/*?*', // Prevent crawling of query parameters (optional, can be removed if needed)
        ],
      },
      // Googlebot specific rules (more permissive).
      // Os grupos por user-agent substituem o grupo `*` inteiro — sem repetir
      // o allow dos endpoints de LLM aqui, o `Disallow: /api/` bloqueava
      // /api/llm/* e /api/vehicles/search para o Googlebot.
      {
        userAgent: 'Googlebot',
        allow: [
          '/',
          ...LLM_ENDPOINT_ALLOWS,
        ],
        disallow: [
          '/admin/',
          '/api/',
          '/_next/',
        ],
      },
      // Googlebot-Image for image indexing
      {
        userAgent: 'Googlebot-Image',
        allow: [
          '/images/',
          '/*.jpg$',
          '/*.jpeg$',
          '/*.png$',
          '/*.webp$',
        ],
        disallow: [
          '/admin/',
          '/api/',
        ],
      },
      // Bingbot — mesma razão do Googlebot acima.
      {
        userAgent: 'Bingbot',
        allow: [
          '/',
          ...LLM_ENDPOINT_ALLOWS,
        ],
        disallow: [
          '/admin/',
          '/api/',
          '/_next/',
        ],
      },
    ],
    // Index sitemap referencia os sub-sitemaps; crawlers seguem a partir dele.
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}

