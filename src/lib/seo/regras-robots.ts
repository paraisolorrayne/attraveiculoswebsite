import type { MetadataRoute } from 'next'

/**
 * As regras do robots.txt da Attra. A rota é `src/app/robots.ts`, a única fonte
 * do arquivo: não há `public/robots.txt` nem regra no nginx (a resposta de
 * produção vem com `x-nextjs-cache`, ou seja, do Next).
 *
 * Política de rastreamento, não de segurança: o robots.txt é público e
 * voluntário, e nada do que está em /admin/ ou /api/ depende dele para ficar
 * protegido.
 *
 * Revisado no handoff "robots.txt, OAI-SearchBot e sitemaps" (21/10/2026):
 *   - cada grupo repete as mesmas restrições, porque um grupo por user-agent
 *     SUBSTITUI o grupo `*` inteiro (RFC 9309). Antes, Googlebot e Bingbot não
 *     tinham /private/ nem /*.json$, e os robôs de IA não tinham /*.json$;
 *   - os robôs da OpenAI ganharam grupos próprios: busca, acesso a pedido do
 *     usuário e treinamento são controles independentes;
 *   - saiu a linha `Host:`, que não é diretiva do protocolo (o domínio
 *     canônico já é resolvido pelo redirect www → raiz e pelo canonical).
 *
 * As regras são conferidas em src/lib/seo/__tests__/regras-robots.test.ts e, em
 * produção, pela auditoria semanal (scripts/auditar-catalogo-publico.mjs).
 */

/**
 * As duas APIs públicas que existem para assistentes lerem, anunciadas no
 * llms.txt. Vencem o `Disallow: /api/` por serem a regra mais longa.
 *
 * - `/api/llm/vehicles` e não `/api/llm/`: as outras rotas ali (`gaps`,
 *   `monitor`) são internas, só POST com CRON_SECRET.
 * - `/api/vehicles/search` já cobre `?q=...`: a regra casa pelo começo do
 *   caminho, e a query faz parte dele. A variante `?q=` era redundante.
 *
 * Nenhuma das duas expõe dado que a página não mostra: é o estoque público.
 */
export const APIS_PUBLICAS = ['/api/llm/vehicles', '/api/vehicles/search']

/**
 * O que nenhum robô deve rastrear, repetido em TODOS os grupos.
 *
 * SEM `/_next/`: ali estão o CSS, o JS e as fotos otimizadas (/_next/image).
 * Bloqueado, o Googlebot renderizava a página sem estilo nem imagem — o Google
 * pede para não bloquear recursos de renderização. `/*.json$` não pega nada
 * disso: o App Router busca o payload por `?_rsc=`, não por `.json`, e o
 * JSON-LD vai dentro do HTML.
 *
 * SEM `Disallow: /*?*`. Essa regra bloqueava toda URL com querystring, e o
 * estoque filtrado (/veiculos?marca=...) é exatamente isso. Duplicação já é
 * tratada no lugar certo: /veiculos?marca=x canonicaliza para a página da
 * marca (/comprar/x), e combinação de filtros vem com noindex. O crawler que
 * não busca a página também não lê o canonical nem o noindex, e a URL pode
 * acabar indexada sem conteúdo.
 */
export const RESTRICOES = ['/admin/', '/private/', '/api/', '/*.json$']

/**
 * GPTBot (treinamento de modelos da OpenAI).
 *
 * Decisão de negócio, não técnica: bloquear o GPTBot não afeta o ChatGPT
 * Search, que usa o OAI-SearchBot. O handoff de 21/10/2026 propôs bloquear;
 * até a Attra decidir, fica como sempre esteve (liberado), conforme o próprio
 * handoff pede. Para bloquear, trocar para 'bloqueado' — o teste cobre os dois.
 */
export type PoliticaGptbot = 'liberado' | 'bloqueado'
export const POLITICA_GPTBOT: PoliticaGptbot = 'liberado'

/**
 * Outros robôs de assistentes de IA, liberados EXPLICITAMENTE.
 *
 * Eles entrariam pelo grupo `*`, mas a decisão de permitir precisa estar
 * escrita: é a diferença entre "ninguém pensou nisso" e "a Attra quer ser lida
 * por Claude, Perplexity, Gemini e companhia". Para uma loja, ser citada na
 * resposta é o objetivo; bloquear "para proteger conteúdo" tiraria a Attra
 * justamente do canal que o painel de visitantes mede como o de maior
 * conversão (canal "Assistente de IA" em src/lib/traffic-channel.ts).
 *
 * Inclui os de treinamento (Google-Extended, Applebot-Extended, CCBot) de
 * propósito: o ganho de bloqueá-los é simbólico e o custo é sumir de modelos
 * que respondem sem buscar na web. Mudar isso é decisão da Attra, fora deste
 * ajuste.
 *
 * O OAI-AdsBot não tem grupo: sem campanha de anúncios no ChatGPT, segue o `*`.
 */
const OUTROS_ROBOS_DE_IA = [
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

/** Grupo de leitura pública: o site inteiro, as APIs públicas, sem as áreas restritas. */
function publico(userAgent: string | string[]) {
  return { userAgent, allow: ['/', ...APIS_PUBLICAS], disallow: RESTRICOES }
}

export function montarRobots({
  siteUrl,
  politicaGptbot = POLITICA_GPTBOT,
}: { siteUrl: string; politicaGptbot?: PoliticaGptbot }): MetadataRoute.Robots {
  return {
    rules: [
      publico('*'),
      // Busca orgânica: os grupos próprios existem para deixar a regra de cada
      // um explícita, e por isso repetem tudo do `*`.
      publico('Googlebot'),
      {
        userAgent: 'Googlebot-Image',
        allow: ['/images/', '/*.jpg$', '/*.jpeg$', '/*.png$', '/*.webp$'],
        disallow: RESTRICOES,
      },
      publico('Bingbot'),
      // OpenAI — descoberta para o ChatGPT Search (é este que dá citação).
      publico('OAI-SearchBot'),
      // OpenAI — quando um usuário do ChatGPT pede para abrir uma página. A
      // OpenAI avisa que esse acesso pode não seguir o robots.txt.
      publico('ChatGPT-User'),
      // OpenAI — treinamento (ver POLITICA_GPTBOT).
      politicaGptbot === 'bloqueado'
        ? { userAgent: 'GPTBot', disallow: '/' }
        : publico('GPTBot'),
      publico(OUTROS_ROBOS_DE_IA),
    ],
    // O índice referencia os sub-sitemaps; os robôs seguem a partir dele.
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
