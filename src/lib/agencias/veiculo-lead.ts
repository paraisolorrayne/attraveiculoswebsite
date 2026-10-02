/**
 * Veículo de interesse do lead, do jeito que a agência pode ver (spec
 * 2026-10-02-area-agencia, "Normalizador do veículo"). O campo `veiculo` do
 * CRM é texto livre digitado no atendimento: traz preço, km, cor, recado do
 * vendedor e às vezes dado do cliente. Aqui sai só marca + modelo/versão/ano,
 * e texto sem marca reconhecível vira "Não especificado" — nunca o texto cru.
 *
 * Puro: sem banco, sem React. O texto original não muda no banco.
 */

export type TipoLead = 'comprar' | 'vender_trocar'

export interface VeiculoLead {
	veiculo: string
	tipo: TipoLead
}

export const NAO_ESPECIFICADO = 'Não especificado'

/** Apelido (minúsculas, sem acento) → marca canônica. O mais longo é testado primeiro. */
const MARCAS: Record<string, string> = {
	'mercedes-amg': 'Mercedes-Benz',
	'mercedes-benz': 'Mercedes-Benz',
	'mercedes benz': 'Mercedes-Benz',
	mercedes: 'Mercedes-Benz',
	ferrari: 'Ferrari',
	lamborghini: 'Lamborghini',
	porsche: 'Porsche',
	mclaren: 'McLaren',
	bmw: 'BMW',
	audi: 'Audi',
	'land rover': 'Land Rover',
	'range rover': 'Land Rover',
	'rolls-royce': 'Rolls-Royce',
	'rolls royce': 'Rolls-Royce',
	bentley: 'Bentley',
	'aston martin': 'Aston Martin',
	maserati: 'Maserati',
	jaguar: 'Jaguar',
	volvo: 'Volvo',
	toyota: 'Toyota',
	lexus: 'Lexus',
	jeep: 'Jeep',
	ram: 'RAM',
	gmc: 'GMC',
	chevrolet: 'Chevrolet',
	ford: 'Ford',
	volkswagen: 'Volkswagen',
	honda: 'Honda',
	hyundai: 'Hyundai',
	kia: 'Kia',
	mitsubishi: 'Mitsubishi',
	nissan: 'Nissan',
	fiat: 'Fiat',
	byd: 'BYD',
	tesla: 'Tesla',
	mini: 'Mini',
	lotus: 'Lotus',
	bugatti: 'Bugatti',
	'alfa romeo': 'Alfa Romeo',
	dodge: 'Dodge',
	cadillac: 'Cadillac',
}
const APELIDOS = Object.keys(MARCAS).sort((a, b) => b.length - a.length)

/** Apelidos que já são parte do nome do modelo: "Range Rover Sport" mantém o "Range Rover". */
const APELIDO_E_MODELO = new Set(['range rover'])

const CORES = /\b(preto|preta|branco|branca|prata|cinza|vermelho|vermelha|azul|verde|amarelo|amarela|laranja|grafite|bege|marrom|dourado|dourada|vinho)\b/gi

const PREFIXOS_TIPO =
	/^\s*(troca\s*:|venda do ve[ií]culo do cliente\s*:?|carro d[oa] cliente para venda\s*:?|cliente quer vender( a| o)?)\s*/i
const VENDER_TROCAR = /(^\s*troca\s*:)|venda do ve[ií]culo do cliente|carro d[oa] cliente para venda|cliente quer vender/i

function semAcento(t: string): string {
	return t.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function limpar(texto: string): string {
	return texto
		.replace(PREFIXOS_TIPO, '')
		.split(/[|—]| - /)[0]
		.replace(/\([^)]*\)/g, ' ')
		.replace(/R\$\s*[\d.,]+(\s*(mil|mi|milh[oõ]es))?/gi, ' ')
		.replace(/\b[\d.]+\s*km\b/gi, ' ')
		.replace(/\b(zero quil[oô]metro|0\s*km)\b/gi, ' ')
		.replace(CORES, ' ')
		.replace(/\s+/g, ' ')
		.replace(/^[\s,;:.-]+|[\s,;:.-]+$/g, '')
}

/** Marca canônica + o que vem depois dela, ou null se nenhuma marca aparece. */
function comMarca(trecho: string): string | null {
	const minusculo = semAcento(trecho.toLowerCase())
	let melhor: { pos: number; apelido: string } | null = null
	for (const apelido of APELIDOS) {
		const m = new RegExp(`(^|[^a-z0-9])${apelido.replace(/[-]/g, '\\-')}(?=$|[^a-z0-9])`).exec(minusculo)
		if (!m) continue
		const pos = m.index + m[1].length
		if (!melhor || pos < melhor.pos) melhor = { pos, apelido }
	}
	if (!melhor) return null
	const marca = MARCAS[melhor.apelido]
	const inicioResto = APELIDO_E_MODELO.has(melhor.apelido) ? melhor.pos : melhor.pos + melhor.apelido.length
	const resto = trecho.slice(inicioResto).trim()
	return `${marca} ${resto}`.trim()
}

export function normalizarVeiculoInteresse(bruto: string | null | undefined): VeiculoLead {
	const texto = (bruto ?? '').trim()
	const tipo: TipoLead = VENDER_TROCAR.test(texto) ? 'vender_trocar' : 'comprar'
	if (!texto) return { veiculo: NAO_ESPECIFICADO, tipo }

	const carros = limpar(texto)
		.split('/')
		.map(c => c.trim())
		.filter(Boolean)
	const primeiro = carros.length > 0 ? comMarca(carros[0]) : null
	if (!primeiro) return { veiculo: NAO_ESPECIFICADO, tipo }
	return { veiculo: carros.length > 1 ? `${primeiro} +${carros.length - 1}` : primeiro, tipo }
}

export interface VeiculoDetalhe {
	tipo?: string | null
	marca?: string | null
	modelo?: string | null
	versao?: string | null
	ano?: number | string | null
}

/**
 * O que a agência vê: o `veiculo_interesse_detalhe` da Fykos quando veio (tem
 * precedência), senão o texto livre normalizado.
 */
export function veiculoDoLead(texto: string | null | undefined, detalhe: VeiculoDetalhe | null | undefined): VeiculoLead {
	if (detalhe && (detalhe.marca || detalhe.modelo)) {
		const marcaBruta = String(detalhe.marca ?? '').trim()
		const marca = MARCAS[semAcento(marcaBruta.toLowerCase())] ?? marcaBruta
		const partes = [marca, detalhe.modelo, detalhe.versao, detalhe.ano].map(p => (p == null ? '' : String(p).trim())).filter(Boolean)
		const tipo: TipoLead = /vend|troca/i.test(String(detalhe.tipo ?? '')) ? 'vender_trocar' : 'comprar'
		return { veiculo: partes.join(' '), tipo }
	}
	return normalizarVeiculoInteresse(texto)
}
