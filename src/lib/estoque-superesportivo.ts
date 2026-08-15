/**
 * Quais veículos do estoque podem aparecer sob o título "Superesportivos à
 * venda".
 *
 * Filtrar só pela MARCA não serve, e isso foi medido no estoque real em
 * 15/08/2026: BMW, Porsche e Mercedes estão classificadas como performance, e o
 * hub acabou anunciando um BMW X2, três Porsche Macan e um Mercedes G-63 —
 * todos SUVs — debaixo de um H1 que promete superesportivo. A marca não decide
 * isso; o modelo decide.
 *
 * O campo `category` do veículo NÃO resolve: no mesmo estoque, os três Macan
 * (SUV) vêm marcados como "sports" e o Corvette Z06 vem como "luxury". Ele
 * mistura posicionamento comercial com tipo de carro. `body_type` é o campo que
 * descreve o carro de fato, e é o usado aqui.
 *
 * A carroceria vale para TODA marca, sem exceção por prestígio. A primeira
 * versão isentava as marcas classificadas como superesportivas, e o resultado
 * foi que os três Porsche Macan continuaram no hub — Porsche está classificada
 * como superesportiva, e o Macan é um SUV. Não existe marca cuja linha inteira
 * seja esportiva: Ferrari tem Purosangue, Lamborghini tem Urus, Aston Martin
 * tem DBX. A isenção protegia a marca, não o leitor.
 *
 * O custo: um exótico com `body_type` vazio ou errado some do hub. É o lado
 * certo do erro — ele continua visível na página da própria marca e no estoque
 * geral, enquanto um SUV anunciado como superesportivo seria uma promessa
 * quebrada na cara de quem chegou pela busca.
 */

import type { CategoriaEditorial } from '@/lib/seo-brands'

/**
 * Carrocerias que sustentam a promessa da página.
 *
 * Comparadas sem acento e em minúsculas: o AutoConf grava "Cupê", mas "Cupé" e
 * "Coupe" aparecem em cadastro feito à mão.
 */
const CARROCERIAS_ESPORTIVAS = new Set([
	'cupe',
	'coupe',
	'conversivel',
	'cabriolet',
	'roadster',
	'targa',
	'spider',
	'spyder',
])

function normalizar(valor: string | null | undefined): string {
	if (typeof valor !== 'string') return ''
	return valor
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.trim()
}

export function carroceriaEhEsportiva(bodyType: string | null | undefined): boolean {
	return CARROCERIAS_ESPORTIVAS.has(normalizar(bodyType))
}

/**
 * O veículo pode ser anunciado como superesportivo?
 *
 * `categoriaDaMarca` vem de SEO_BRANDS. Marca sem classificação editorial fica
 * de fora: se ninguém decidiu o que ela é, o hub não decide por conta própria.
 */
export function podeAparecerNoHub(
	veiculo: { body_type?: string | null },
	categoriaDaMarca: CategoriaEditorial | undefined,
): boolean {
	if (categoriaDaMarca === undefined) return false
	return carroceriaEhEsportiva(veiculo.body_type)
}
