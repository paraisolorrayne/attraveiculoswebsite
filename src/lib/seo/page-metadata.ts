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
 * Sufixo de seção ("| Manual Attra", "| Blog Attra"). Com o da marca que o
 * template põe depois, os 99 verbetes do manual e os posts do blog saíam com
 * 30 caracteres de marca no fim e cortados no Google (auditoria de 28/10/2026).
 */
const TRAILING_SECAO = /\s*[|–—-]\s*(?:Manual|Blog) Attra\s*$/i

/** O título já diz "Attra": o sufixo do template seria a marca duas vezes. */
const CITA_A_MARCA = /\bAttra\b/i

/**
 * Até onde o Google mostra o título sem cortar. O handoff de SEO de 02/11/2026
 * achou 254 páginas acima disso: a maioria só por causa do sufixo de 17
 * caracteres que o template do layout raiz acrescenta.
 */
export const LIMITE_TITULO = 60

/** O que o `title.template` do layout raiz põe depois do título. */
const SUFIXO_DO_TEMPLATE = ` | ${TITLE_SUFFIX}`
/** O sufixo curto, quando o longo não cabe. */
const SUFIXO_CURTO = ' | Attra'

/**
 * Pontuação ou conectivo que não pode terminar um título cortado. Sem a flag
 * `i`: "Classe A" e "Série M" terminam em maiúscula e ficam.
 */
const FIM_SOLTO = /[\s,:;–—-]+(?:e|de|da|do|das|dos|com|na|no|em|para|vs|ou)?$/

/**
 * Corta um texto no último espaço que cabe no limite, sem deixar conectivo ou
 * pontuação pendurados no fim.
 */
export function encurtar(texto: string, limite: number): string {
  if (texto.length <= limite) return texto
  let corte = texto.slice(0, limite + 1)
  corte = corte.slice(0, corte.lastIndexOf(' ')).trim()
  while (FIM_SOLTO.test(corte)) corte = corte.replace(FIM_SOLTO, '').trim()
  return corte || texto.slice(0, limite).trim()
}

/**
 * Normaliza um título de página: tira o sufixo de marca do fim e o faz caber
 * em `LIMITE_TITULO` caracteres, já contando o que o template acrescenta.
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
 *
 * Para caber, na ordem: saem os trechos depois de " | " ("Comprar Porsche no
 * Brasil | Porsche Seminovo e 0 km"), depois o sufixo vira " | Attra" e, por
 * último, o título é cortado numa palavra inteira, sem sufixo.
 *
 * Quando a marca está no meio ("Sobre a Attra Veículos | Loja em Uberlândia",
 * "... na Attra Veículos" dos posts de IA), o título sai absoluto, sem o
 * sufixo do template.
 */
export function pageTitle(raw: string): string | { absolute: string } {
  let title = raw.trim()
  // Laço: houve caso de sufixo repetido duas vezes na mesma string, e de
  // seção seguida da marca ("| Blog Attra | Attra Veículos").
  while (TRAILING_BRAND.test(title) || TRAILING_SECAO.test(title)) {
    title = title.replace(TRAILING_BRAND, '').replace(TRAILING_SECAO, '').trim()
  }
  // Um título que era só a marca perderia tudo; fica a marca, uma vez.
  if (!title) return { absolute: TITLE_SUFFIX }

  const cabe = (t: string) =>
    (CITA_A_MARCA.test(t) ? t.length : t.length + SUFIXO_DO_TEMPLATE.length) <= LIMITE_TITULO
  while (!cabe(title) && title.includes(' | ')) {
    title = title.slice(0, title.lastIndexOf(' | ')).trim()
  }

  if (CITA_A_MARCA.test(title)) return { absolute: encurtar(title, LIMITE_TITULO) }
  if (cabe(title)) return title
  if (title.length + SUFIXO_CURTO.length <= LIMITE_TITULO) return { absolute: `${title}${SUFIXO_CURTO}` }
  return { absolute: encurtar(title, LIMITE_TITULO) }
}

/** Faixa de meta description que o Google mostra inteira (handoff de 02/11/2026). */
export const DESCRICAO_MIN = 120
export const DESCRICAO_MAX = 155

/**
 * Meta description dentro de `DESCRICAO_MAX`: corta no fim da última frase que
 * cabe, se ela tiver pelo menos `DESCRICAO_MIN` caracteres; senão, na última
 * palavra, com reticências. Curta demais, recebe o `complemento` (uma frase
 * da página, nunca texto genérico repetido em todas).
 */
export function descricaoSeo(texto: string, complemento?: string): string {
  let d = texto.replace(/\s+/g, ' ').trim()
  if (d.length < DESCRICAO_MIN && complemento) {
    d = `${d}${/[.!?]$/.test(d) ? '' : '.'} ${complemento.trim()}`
  }
  if (d.length <= DESCRICAO_MAX) return d
  const corte = d.slice(0, DESCRICAO_MAX)
  const fimDeFrase = Math.max(corte.lastIndexOf('. '), corte.lastIndexOf('! '), corte.lastIndexOf('? '))
  if (fimDeFrase + 1 >= DESCRICAO_MIN) return corte.slice(0, fimDeFrase + 1)
  return `${encurtar(d, DESCRICAO_MAX - 1).replace(/[.,;:]$/, '')}…`
}

/**
 * Imagem de compartilhamento das páginas sem foto própria: a fachada da loja
 * com o letreiro, em 1200×630 (o recorte que WhatsApp, Facebook e LinkedIn
 * usam). Vai no layout raiz e em toda página que declara `openGraph`, porque
 * o Next troca o `openGraph` inteiro do pai pelo da página: sem repetir aqui,
 * 222 páginas saíam sem imagem (auditoria de 28/10/2026).
 */
export const IMAGEM_COMPARTILHAMENTO = {
  url: '/images/compartilhar-attra.jpg',
  width: 1200,
  height: 630,
  alt: 'Fachada da Attra Veículos em Uberlândia',
}

/**
 * Metadados de uma página fixa com as regras do handoff de SEO de 02/11/2026
 * num lugar só: título em até 60 caracteres (`pageTitle`), descrição em até 155
 * (`descricaoSeo`), canonical e `og:url` iguais e a imagem de compartilhamento.
 * Faltava `og:url` em 22 páginas; nas sem `openGraph`, o `og:title` era o da home.
 */
export function metadadosDaPagina(
  caminho: string,
  dados: { titulo: string; descricao: string; complemento?: string; keywords?: Metadata['keywords'] },
): Metadata {
  const url = canonicalUrl(caminho)
  const title = pageTitle(dados.titulo)
  const description = descricaoSeo(dados.descricao, dados.complemento)
  return {
    title,
    description,
    ...(dados.keywords ? { keywords: dados.keywords } : {}),
    alternates: { canonical: url },
    openGraph: {
      url,
      title: typeof title === 'string' ? title : title.absolute,
      description,
      type: 'website',
      locale: 'pt_BR',
      siteName: TITLE_SUFFIX,
      images: [IMAGEM_COMPARTILHAMENTO],
    },
  }
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

/**
 * Canonical de uma listagem filtrável.
 *
 *   - sem filtro: a própria listagem;
 *   - só `pagina=N`: a própria página N. Cada página lista outros carros, e o
 *     canonical de todas na 1ª dizia ao buscador que as páginas 2 a 6 eram
 *     cópia dela — junto com a paginação em botão, 56 dos 68 carros ficavam
 *     sem caminho a partir da listagem (auditoria de 20/10/2026);
 *   - um único filtro com destino próprio em `destinos` (a marca que tem
 *     página em /comprar): esse destino;
 *   - qualquer outra combinação: a listagem limpa (e `listingRobots` a tira do
 *     índice).
 */
export function listingCanonical(
  path: string,
  searchParams: SearchParamsRecord | undefined,
  destinos: Record<string, (valor: string) => string> = {},
): string {
  const ativas = activeFilterKeys(searchParams)
  if (ativas.length !== 1) return canonicalUrl(path)

  const [chave] = ativas
  const bruto = searchParams?.[chave]
  const valor = (Array.isArray(bruto) ? bruto[0] : bruto ?? '').trim()
  if (chave === 'pagina' && /^\d+$/.test(valor)) return canonicalUrl(`${path}?pagina=${Number(valor)}`)
  const destino = destinos[chave]
  return canonicalUrl(destino ? destino(valor) : path)
}
