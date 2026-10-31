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
 * 1280 px: a home e a ficha. O cabeçalho e o rodapé acompanham a largura da
 * página, para o logo ficar alinhado com o conteúdo (31/10/2026).
 */
export const LARGURA_LARGA = 'max-w-[max(80%,1280px)]'

export function paginaLarga(pathname: string): boolean {
  return pathname === '/' || pathname.startsWith('/veiculo/')
}
