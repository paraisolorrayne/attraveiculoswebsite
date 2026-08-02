/**
 * Metadata compartilhado das rotas públicas.
 *
 * Reúne as três regras que a auditoria de SEO/GEO encontrou quebradas em
 * escala (A5, A6 e A7) num único lugar, para que rota nova nasça correta em
 * vez de depender de cada autor lembrar da convenção.
 */

import type { Metadata } from 'next'
import { SITE_URL } from '@/lib/constants'

/**
 * Sufixo de marca que o `title.template` do layout raiz (src/app/layout.tsx)
 * acrescenta sozinho a todo título vindo de uma página.
 */
const TITLE_SUFFIX = 'Attra Veículos'

/**
 * Separadores aceitos antes do sufixo de marca. O acento é opcional porque
 * parte do conteúdo legado foi gravado sem ele.
 */
const TRAILING_BRAND = /\s*[|–—-]\s*Attra Ve[íi]culos\s*$/i

/**
 * Normaliza um título de página removendo o sufixo de marca do fim.
 *
 * O layout raiz aplica `'%s | Attra Veículos'` por cima do que a página
 * entrega. Quando o título já vem com a marca — e ele vem, porque nasce fora
 * do código de rota: dos dados editoriais em `src/lib/seo`, do `meta_title`
 * gravado no banco do blog e do `seo_title` montado a partir do feed de
 * estoque — o resultado sai duplicado
 * ("Porsche 911 2026 | Attra Veículos | Attra Veículos").
 *
 * Normalizar aqui, na borda em que o dado vira `Metadata`, mantém o conserto
 * de pé para conteúdo publicado depois desta correção.
 */
export function pageTitle(raw: string): string {
  let title = raw.trim()
  // Laço: houve caso de sufixo repetido duas vezes na mesma string.
  while (TRAILING_BRAND.test(title)) {
    title = title.replace(TRAILING_BRAND, '').trim()
  }
  // Um título que era só a marca perderia tudo; nesse caso o template resolve.
  return title || TITLE_SUFFIX
}

/**
 * URL absoluta de um caminho do site, para canonical e `og:url`.
 *
 * Usa a mesma base dos demais módulos de schema (`NEXT_PUBLIC_SITE_URL` com
 * fallback na constante) para que canonical, JSON-LD e sitemap não divirjam.
 */
export function canonicalUrl(path: string): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? SITE_URL).replace(/\/$/, '')
  if (path === '/' || path === '') return `${base}/`
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

export type SearchParamsRecord = Record<string, string | string[] | undefined>

/**
 * `pagina=1` é a própria listagem base, não um filtro. Tratar como filtro
 * mandaria a URL limpa paginada para `noindex` sem motivo.
 */
const INERT_PARAMS: Record<string, string> = { pagina: '1' }

/** Chaves de query que estão realmente filtrando a listagem. */
function activeFilterKeys(searchParams: SearchParamsRecord | undefined): string[] {
  return Object.entries(searchParams ?? {})
    .filter(([key, value]) => {
      const first = Array.isArray(value) ? value[0] : value
      if (typeof first !== 'string' || first.trim() === '') return false
      return INERT_PARAMS[key] !== first.trim()
    })
    .map(([key]) => key)
}

/**
 * Robots de uma listagem filtrável.
 *
 * A interface de `/veiculos` combina 6 dimensões de filtro mais ordenação, o
 * que gera um espaço combinatório indexável de URLs com o mesmo conteúdo. A
 * regra: uma única dimensão da whitelist continua indexável (é a única com
 * demanda de busca própria); qualquer combinação de duas ou mais, ou qualquer
 * chave fora da whitelist, sai do índice mas mantém o rastreio dos links.
 */
export function listingRobots(
  searchParams: SearchParamsRecord | undefined,
  indexableKeys: readonly string[],
): NonNullable<Metadata['robots']> {
  const active = activeFilterKeys(searchParams)
  const deepCombination =
    active.length > 1 || active.some(key => !indexableKeys.includes(key))

  return deepCombination
    ? { index: false, follow: true }
    : { index: true, follow: true }
}
