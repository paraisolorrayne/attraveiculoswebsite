/**
 * Evento que liga a barra de progresso do topo (RacingProgress) quando a
 * navegação sai de um router.push — filtros, ordenação, categorias — e não de
 * um clique em link, que a barra já percebe sozinha.
 */
export const EVENTO_NAVEGANDO = 'attra:navegando'

export function avisarNavegacao(destino: string): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(EVENTO_NAVEGANDO, { detail: { destino } }))
}
