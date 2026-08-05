/**
 * Estatística e classificação dos termos de busca.
 *
 * Fica FORA da rota de propósito: a rota arrasta Next e Auth.js, e isso não é
 * testável em unidade. Aqui é lógica pura — entra número e texto, sai número e
 * texto —, então o comportamento que decide investimento de mídia tem teste.
 */

/** Abaixo disso a taxa é ruído: 3 conversões em 10 sessões "dão" 30%. */
export const VOLUME_MINIMO_TERMO = 20

/**
 * Piso do intervalo de confiança de Wilson (95%).
 *
 * Ordenar por taxa crua premia amostra pequena: um termo com 3 conversões em 26
 * sessões aparece com 11,5% e passa na frente de um com 47 em 623. O piso
 * responde "qual taxa este termo COMPROVA" — é por ele que a tabela ordena, com
 * a taxa crua visível ao lado para a diferença ficar aparente.
 */
export function pisoWilson(conversoes: number, sessoes: number): number {
  if (sessoes <= 0) return 0
  const z = 1.96
  const p = conversoes / sessoes
  const d = 1 + (z * z) / sessoes
  const centro = (p + (z * z) / (2 * sessoes)) / d
  const margem = (z * Math.sqrt((p * (1 - p) + (z * z) / (4 * sessoes)) / sessoes)) / d
  return Math.max(0, centro - margem) * 100
}

const MARCAS = ['ferrari', 'lamborghini', 'porsche', 'land rover', 'bentley',
  'mercedes', 'bmw', 'audi', 'mclaren', 'cadillac', 'ram', 'volvo']

export type PadraoTermo =
  | 'estabelecimento' | 'comprar_marca' | 'marca_venda'
  | 'comprar_categoria' | 'categoria_generica' | 'criativo' | 'outros'

/** Tira acento para a classificação não depender de como a campanha foi digitada. */
function normalizar(t: string): string {
  return t.toLowerCase().trim().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/**
 * Classifica a INTENÇÃO por trás do termo.
 *
 * O agrupamento existe porque a lista de termos, sozinha, não vira decisão: o
 * que se repete é o padrão. Na base da Attra, quem procura a LOJA ("loja de…",
 * "onde comprar") converte cerca de 4x mais que quem procura a categoria
 * ("carros… à venda"). É esse contraste que orienta onde investir.
 */
export function classificarPadrao(termo: string): PadraoTermo {
  const t = normalizar(termo)
  // Nomes de criativo de rede social entram pelo MESMO campo que os termos de
  // busca. Sem separá-los, o volume deles (milhares de sessões, quase nenhuma
  // conversão) achata a média e esconde o que de fato converte.
  if (/^\(?(reels|corte|story|stories|criativo)/.test(t)) return 'criativo'

  const temMarca = MARCAS.some(m => t.includes(m))
  if (/^(loja|onde comprar|concessionari|revenda)/.test(t)) return 'estabelecimento'
  if (t.startsWith('comprar') && temMarca) return 'comprar_marca'
  if (t.startsWith('comprar')) return 'comprar_categoria'
  if (temMarca && /(\ba venda\b|usad)/.test(t)) return 'marca_venda'
  if (/(\ba venda\b|venda de|usad)/.test(t)) return 'categoria_generica'
  return 'outros'
}
