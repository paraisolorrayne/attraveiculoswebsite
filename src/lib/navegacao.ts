/**
 * Evento que liga a barra de progresso do topo (RacingProgress) quando a
 * navegação sai de um router.push — filtros, ordenação, categorias — e não de
 * um clique em link, que a barra já percebe sozinha.
 */
export const EVENTO_NAVEGANDO = 'attra:navegando'

/** A aba "Menu" da barra do celular pede ao cabeçalho para abrir o menu completo. */
export const EVENTO_ABRIR_MENU = 'attra:abrir-menu'

export function avisarNavegacao(destino: string): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(EVENTO_NAVEGANDO, { detail: { destino } }))
}

/**
 * Páginas cujo conteúdo, em tela larga, ocupa 80% da tela em vez de parar em
 * 1280 px: a home, a ficha e o artigo do blog (01/11/2026; a lista e o arquivo
 * do blog seguem em 1280). O cabeçalho e o rodapé acompanham a largura da
 * página, para o logo ficar alinhado com o conteúdo (31/10/2026).
 */
export const LARGURA_LARGA = 'max-w-[max(80%,1280px)]'

export function paginaLarga(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname.startsWith('/veiculo/') ||
    (pathname.startsWith('/blog/') && pathname !== '/blog/arquivo')
  )
}

/** Listas do blog. O artigo (/blog/<slug>) não entra: tem escala própria (.blog-coluna). */
const LISTAS_DO_BLOG = ['/blog', '/blog/arquivo', '/blog/reviews', '/blog/artigos', '/blog/comparativos']

/**
 * Páginas internas que, em tela larga, crescem junto com a tela: conteúdo em
 * 80% da largura e letra, espaçamento e colunas de texto na mesma proporção
 * (classe .pagina-ampla, em globals.css). A regra é pela exceção: toda página
 * nova já nasce ampla, em vez de ficar numa caixa de 1280 px com letra de 14 px
 * no meio de um monitor grande (13/11/2026, /comprar/ferrari).
 *
 * Ficam de fora só as que já têm largura e escala próprias para tela larga: a
 * home, a ficha, o estoque e o artigo do blog.
 */
export function paginaAmpla(pathname: string): boolean {
  if (pathname === '/') return false
  if (pathname === '/veiculos' || pathname.startsWith('/veiculo/')) return false
  if (pathname.startsWith('/blog/')) return LISTAS_DO_BLOG.includes(pathname)
  return true
}
