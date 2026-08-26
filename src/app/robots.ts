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

/**
 * Crawlers de assistentes de IA — liberados EXPLICITAMENTE.
 *
 * Eles já entravam pelo grupo `*`, mas a decisão de permitir precisa estar
 * escrita: é a diferença entre "ninguém pensou nisso" e "a Attra quer ser lida
 * por ChatGPT, Perplexity, Claude, Gemini e Copilot". Para uma loja, ser
 * citada na resposta é o objetivo; bloquear "para proteger conteúdo" tiraria
 * a Attra justamente do canal que o painel de visitantes mede como o de maior
 * conversão (canal "Assistente de IA" em src/lib/traffic-channel.ts).
 *
 * Inclui os bots de treinamento (Google-Extended, Applebot-Extended, CCBot)
 * de propósito: o ganho de bloqueá-los é simbólico e o custo é sumir de
 * modelos que respondem sem buscar na web.
 *
 * Lembrete do protocolo: um grupo por user-agent SUBSTITUI o grupo `*` por
 * inteiro, então cada um repete o allow dos endpoints de LLM.
 */
const AI_CRAWLERS = [
  'GPTBot',            // OpenAI — treinamento
  'OAI-SearchBot',     // OpenAI — busca do ChatGPT (citações)
  'ChatGPT-User',      // OpenAI — quando o usuário pede pra abrir uma página
  'ClaudeBot',         // Anthropic — treinamento
  'Claude-SearchBot',  // Anthropic — busca
  'Claude-User',       // Anthropic — a pedido do usuário
  'PerplexityBot',     // Perplexity — índice
  'Perplexity-User',   // Perplexity — a pedido do usuário
  'Google-Extended',   // Google — Gemini (treinamento/grounding)
  'Applebot-Extended', // Apple — Apple Intelligence
  'Amazonbot',         // Amazon — Alexa
  'CCBot',             // Common Crawl — base de vários modelos
  'meta-externalagent',// Meta AI
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
      // Assistentes de IA — mesmas regras do `*`, declaradas por nome (ver AI_CRAWLERS).
      {
        userAgent: AI_CRAWLERS,
        allow: [
          '/',
          ...LLM_ENDPOINT_ALLOWS,
        ],
        disallow: [
          '/admin/',
          '/api/',
          '/_next/',
          '/private/',
        ],
      },
    ],
    // Index sitemap referencia os sub-sitemaps; crawlers seguem a partir dele.
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}

