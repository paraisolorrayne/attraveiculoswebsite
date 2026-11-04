import type { Vehicle } from '@/types'

/** Marca e modelo sem caixa, acento, espaço nem hífen: "Mercedes-Benz Classe G" = "MERCEDES BENZ classe g". */
function chaveDoModelo(v: Vehicle): string {
  return `${v.brand ?? ''}|${v.model ?? ''}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9|]+/g, '')
}

/**
 * Os primeiros `quantos` carros da lista, pulando quem repete marca e modelo de
 * um já escolhido. A ordem da lista (preço) é mantida.
 *
 * 04/11/2026: "Três peças do acervo" mostrava a Ferrari 296 e dois Aston Martin
 * Vantage 2026 praticamente iguais. Sem modelos diferentes suficientes, devolve
 * menos em vez de repetir.
 */
export function semModeloRepetido(lista: Vehicle[], quantos: number): Vehicle[] {
  const escolhidos: Vehicle[] = []
  const vistos = new Set<string>()
  for (const v of lista) {
    if (escolhidos.length >= quantos) break
    const chave = chaveDoModelo(v)
    if (vistos.has(chave)) continue
    vistos.add(chave)
    escolhidos.push(v)
  }
  return escolhidos
}
