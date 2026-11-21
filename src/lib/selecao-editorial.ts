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

/**
 * A frase de cada carro na seleção editorial da home: o primeiro diferencial
 * que o marketing escreveu na ficha do anúncio ou, no 0 km, só o fato. Sem
 * ficha, devolve null e o componente não mostra frase.
 *
 * Até 20/11/2026 a frase saía de faixas de preço e marca ("rara no mercado
 * brasileiro" para todo carro acima de R$ 2 mi; "Configuração rara selecionada
 * à mão" para o resto). Alegação que o dado não sustenta derruba a confiança de
 * quem conhece o mercado (auditoria de 20/11/2026).
 */
export function motivoDaCuradoria(v: Vehicle): string | null {
  const diferencial = v.ficha?.diferenciais?.find((d) => d.trim())
  if (diferencial) return diferencial.trim().replace(/[.;]+$/, '')
  if (v.is_new || v.mileage === 0) return '0 km, em estoque'
  return null
}
