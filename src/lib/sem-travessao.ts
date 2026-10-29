/**
 * Tira o travessão (—) e a meia-risca usada como travessão (" – ") de textos
 * gerados por IA antes de irem para a página: o site não usa travessão em
 * frase (regra da Attra, 23/10/2026). Os textos escritos à mão já foram
 * revisados um a um; este é o filtro para o que vem do banco (posts do blog,
 * textos das seções da ficha), que a IA escreveu antes da regra.
 *
 * Par na mesma frase ("o carro — da escolha à entrega — chega") vira
 * vírgulas; travessão solto vira vírgula. Intervalos sem espaço ("0–100")
 * ficam como estão.
 */
const PAR = /\s+[—–]\s+([^—–.!?\n<]{1,160}?)\s+[—–]\s+/g
const SOLTO = /\s*—\s*|\s+–\s+/g

export function semTravessao(texto: string): string
export function semTravessao(texto: string | null | undefined): string | null | undefined
export function semTravessao(texto: string | null | undefined) {
  if (!texto || (!texto.includes('—') && !texto.includes(' – '))) return texto
  return texto.replace(PAR, ', $1, ').replace(SOLTO, ', ').replace(/,\s*([.,;:!?])/g, '$1')
}
