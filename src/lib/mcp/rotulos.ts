/**
 * Rótulos de intenção derivados por REGRA, não por modelo.
 *
 * Um cupê de duas portas não é familiar. Isso é derivável de `body_type` e
 * `doors`, e o que é derivável deve ser determinístico e testável — não palpite
 * de um modelo que pode acertar 95% das vezes e errar justamente no carro que o
 * cliente foi ver.
 *
 * NÃO EXISTE campo `seats` no veículo do AutoConf. Toda regra de lotação passa
 * por `body_type` e `doors`.
 *
 * `conforto`, `liquidez` e `exclusividade` estão no vocabulário mas NUNCA são
 * derivados: nada no banco os sustenta. `exclusividade` viria da marca ser
 * superesportiva, mas `brand` saiu das regras — adjudicado pelo controlador:
 * o rótulo fica órfão de propósito, não vira regra. Os três existem só para a
 * Attra atribuir à mão.
 */

export const VOCABULARIO = {
	uso: ['urbano', 'viagem', 'fim-de-semana', 'familia', 'pista', 'colecao'],
	comprador: ['primeiro-premium', 'executivo', 'familia', 'entusiasta', 'colecionador'],
	forca: ['desempenho', 'espaco', 'exclusividade', 'baixa-quilometragem', 'conforto', 'liquidez'],
} as const

export type RotuloUso = (typeof VOCABULARIO.uso)[number]
export type RotuloComprador = (typeof VOCABULARIO.comprador)[number]
export type RotuloForca = (typeof VOCABULARIO.forca)[number]

export interface Rotulos {
	uso: RotuloUso[]
	comprador: RotuloComprador[]
	forca: RotuloForca[]
}

export interface VeiculoParaRotulo {
	body_type?: string | null
	doors?: number | null
	mileage?: number | null
	price?: number | null
	horsepower?: number | null
	year_model?: number | null
	brand?: string | null
}

/** Carrocerias de duas portas voltadas a desempenho. */
const ESPORTIVAS = new Set(['cupe', 'coupe', 'conversivel', 'cabriolet', 'roadster', 'targa', 'spider', 'spyder'])
/** Carrocerias que comportam família. */
const FAMILIARES = new Set(['suv', 'seda', 'sedan', 'perua', 'minivan', 'hatch'])
/** Subconjunto com espaço de carga relevante. */
const ESPACOSAS = new Set(['suv', 'perua', 'minivan'])

const LIMIAR_BAIXA_KM = 30_000
const LIMIAR_DESEMPENHO_CV = 400
const LIMIAR_EXECUTIVO_BRL = 250_000
const LIMIAR_PRIMEIRO_PREMIUM_BRL = 300_000
const IDADE_DE_COLECAO = 20
const MIN_PORTAS_FAMILIAR = 4

function normalizar(v: string | null | undefined): string {
	if (typeof v !== 'string') return ''
	return v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

export function derivarRotulos(v: VeiculoParaRotulo, anoAtual: number): Rotulos {
	const carroceria = normalizar(v.body_type)
	const esportiva = ESPORTIVAS.has(carroceria)
	const familiar = FAMILIARES.has(carroceria) && (v.doors ?? 0) >= MIN_PORTAS_FAMILIAR
	const espacosa = ESPACOSAS.has(carroceria) && (v.doors ?? 0) >= MIN_PORTAS_FAMILIAR
	const antigo = v.year_model != null && anoAtual - v.year_model >= IDADE_DE_COLECAO
	const potente = (v.horsepower ?? 0) >= LIMIAR_DESEMPENHO_CV

	const uso: RotuloUso[] = []
	// `urbano` só sai acoplado a `familiar` — um compacto de duas portas não
	// aciona nenhuma regra de uso e fica sem `urbano`. Acoplamento conhecido,
	// não reestruturado nesta rodada.
	if (familiar) { uso.push('familia', 'viagem', 'urbano') }
	if (esportiva) { uso.push('fim-de-semana') }
	if (esportiva && potente) uso.push('pista')
	if (antigo) uso.push('colecao')

	const comprador: RotuloComprador[] = []
	if (familiar) comprador.push('familia')
	if (familiar && (v.price ?? 0) >= LIMIAR_EXECUTIVO_BRL) comprador.push('executivo')
	if (esportiva || potente) comprador.push('entusiasta')
	if (antigo) comprador.push('colecionador')
	if ((v.price ?? 0) > 0 && (v.price ?? 0) < LIMIAR_PRIMEIRO_PREMIUM_BRL) comprador.push('primeiro-premium')

	const forca: RotuloForca[] = []
	if (potente) forca.push('desempenho')
	if (espacosa) forca.push('espaco')
	if (v.mileage != null && v.mileage < LIMIAR_BAIXA_KM) forca.push('baixa-quilometragem')
	// `conforto`, `liquidez` e `exclusividade`: nunca aqui. Só override — a
	// Attra atribui à mão. `exclusividade` viria de marca superesportiva, mas
	// `brand` saiu das regras (adjudicado), então fica órfão de propósito.

	return {
		uso: [...new Set(uso)],
		comprador: [...new Set(comprador)],
		forca: [...new Set(forca)],
	}
}
