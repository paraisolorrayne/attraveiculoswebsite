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
 * `/api/vehicles/search` só funciona com querystring (`?q=`) e precisa vencer
 * o `Disallow: /api/`. Google e Bing resolvem conflito pela regra mais longa,
 * então a variante com `?q=` continua listada — sem ela o endpoint fica
 * anunciado no llms.txt e bloqueado no robots.txt.
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
          // SEM `Disallow: /*?*`.
          //
          // Essa regra bloqueava TODA url com querystring, e o estoque filtrado
          // (/veiculos?marca=...) é exatamente isso. Como os grupos por
          // user-agent substituem o grupo `*` inteiro, Googlebot e Bingbot
          // nunca tiveram essa regra — quem pagava eram os crawlers de LLM, que
          // caem aqui. O estoque filtrado é o conteúdo mais citável do site, e
          // ficava invisível justamente para eles.
          //
          // Duplicação já é tratada no lugar certo: /veiculos?marca=x
          // canonicaliza para /veiculos, e combinação de filtros vem com
          // noindex. Bloquear no robots.txt seria pior, não melhor — o crawler
          // que não busca a página também não lê o canonical nem o noindex, e
          // a URL pode acabar indexada sem conteúdo.
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

