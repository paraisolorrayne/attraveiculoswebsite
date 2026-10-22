/**
 * A ficha técnica que o marketing da Attra escreve na "Descrição Customizada
 * para o Site" da AutoConf (`descricao` do `POST /veiculo`), lida sem IA.
 *
 * O molde (22/10/2026) segue o jeito que o marketing preencheu o S 63: a ficha
 * começa sempre na linha MOTOR — o que vem antes é texto livre e fica de fora
 * —, uma linha por rótulo fixo ("POTÊNCIA: 802 cv") e DIFERENCIAIS e OPCIONAIS
 * como títulos de lista, com um item por linha embaixo ("- " opcional).
 *
 * As regras são as de `scripts/diagnostico/validar-molde-autoconf.mjs`, que se
 * roda antes de liberar um carro: o que o validador marca como erro não é
 * publicado aqui. Mudou uma, muda a outra.
 *
 * Sai a linha (ou o item), e o resto da ficha continua, quando:
 * - o valor está vazio ou é provisório ("?", "a confirmar");
 * - traz preço, link ou contato;
 * - fala de procedência ou garantia (revisões, único dono, laudo, manual…).
 *   Isso só entra com documento, e o texto não prova nada;
 * - potência, torque, 0-100 ou velocidade máxima estão fora do formato;
 * - a potência briga com a do cadastro (o Aston dizia 510 e 680 cv);
 * - o carro é blindado e a linha é 0-100 ou velocidade máxima, que são
 *   números de fábrica do carro sem blindagem.
 *
 * Texto padrão da AutoConf ("A procura de um…") ou sem linha MOTOR: sem ficha.
 * O texto bruto nunca é publicado; só os campos lidos daqui.
 */

import type { Vehicle } from '@/types'

export interface FichaDoAnuncio {
	motor: string | null
	potencia: string | null
	torque: string | null
	cambio: string | null
	tracao: string | null
	aceleracao_0_100: string | null
	velocidade_maxima: string | null
	cor: string | null
	interior: string | null
	som: string | null
	rodas: string | null
	freios: string | null
	diferenciais: string[]
	opcionais: string[]
}

type CampoDeLista = 'diferenciais' | 'opcionais'
type CampoDeLinha = Exclude<keyof FichaDoAnuncio, CampoDeLista>

/** O que o leitor usa do `POST /veiculo`. */
export interface AnuncioComDescricao {
	descricao?: string | null
	modelo_nome?: string | null
	versao_descricao?: string | null
	potencia?: number | string | null
	potencia2?: number | string | null
	acessorios?: Array<{ nome?: string | null }> | null
	tags?: unknown[] | null
}

// --- texto do editor da AutoConf → linhas -------------------------------------

const ENTIDADES: Record<string, string> = {
	nbsp: ' ', amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', ndash: '–', mdash: '—', bull: '•', deg: '°',
	aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', atilde: 'ã', otilde: 'õ', ccedil: 'ç',
	acirc: 'â', ecirc: 'ê', ocirc: 'ô', agrave: 'à', Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó',
	Uacute: 'Ú', Atilde: 'Ã', Otilde: 'Õ', Ccedil: 'Ç', Acirc: 'Â', Ecirc: 'Ê', Ocirc: 'Ô', Agrave: 'À',
}

function paraLinhas(bruto: string): string[] {
	const texto = bruto
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/<\/(p|div|li|h\d)>/gi, '\n')
		.replace(/<li[^>]*>/gi, '- ')
		.replace(/<[^>]+>/g, '')
		.replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
		.replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
		.replace(/&([a-z]+);/gi, (m, n: string) => ENTIDADES[n] ?? m)
	return texto.split(/\r?\n/).map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean)
}

// --- o molde --------------------------------------------------------------------

// Sem acento, sem espaço e em maiúsculas: "Potencia", "0 - 100 km/h" e "0-100" contam.
const chave = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '').toUpperCase()

const PELA_CHAVE = new Map<string, CampoDeLinha | CampoDeLista>([
	['MOTOR', 'motor'],
	['POTENCIA', 'potencia'],
	['TORQUE', 'torque'],
	['CAMBIO', 'cambio'],
	['TRACAO', 'tracao'],
	['0-100KM/H', 'aceleracao_0_100'],
	['0-100', 'aceleracao_0_100'],
	['0A100KM/H', 'aceleracao_0_100'],
	['VELOCIDADEMAXIMA', 'velocidade_maxima'],
	['COR', 'cor'],
	['INTERIOR', 'interior'],
	['SOM', 'som'],
	['RODAS', 'rodas'],
	['FREIOS', 'freios'],
	['DIFERENCIAIS', 'diferenciais'],
	['OPCIONAIS', 'opcionais'],
	// Nomes do primeiro molde continuam valendo.
	['DESTAQUES', 'diferenciais'],
	['EQUIPAMENTOS', 'opcionais'],
])

const ehLista = (c: CampoDeLinha | CampoDeLista): c is CampoDeLista => c === 'diferenciais' || c === 'opcionais'

const MARCA_DE_ITEM = /^[-•–*]\s*/
const COM_ROTULO = /^([^:]{2,30}):\s*(.*)$/

function rotuloDa(linha: string) {
	const m = linha.match(COM_ROTULO)
	if (!m) return null
	return { campo: PELA_CHAVE.get(chave(m[1].replace(MARCA_DE_ITEM, ''))), valor: m[2].trim() }
}

// --- regras (as mesmas do validador) ---------------------------------------------

const VAZIO_OU_PROVISORIO = /^(|\?+|-+|x+|n\/?a|tbd|pendente|verificar|a confirmar|confirmar|\.\.\.)$/i
const COMERCIAL = /(R\$|\bwhats|\bzap\b|ligue|financ|parcel|\bentrada\b|aceita troca|\bipva\b|desconto|https?:\/\/|www\.|\.com\b)/i
const CONTATO = /([\w.+-]+@[\w-]+\.[\w.]+|\(?\d{2}\)?\s?9?\d{4}[-\s]?\d{4})/
const PROCEDENCIA = /(garantia|revis[ãa]o|revis[õo]es|[úu]nico dono|\b1 dono|laudo|cautelar|proced[êe]ncia|nota fiscal|manual|chave reserva)/i
const DECIMAL_COM_PONTO = /\b\d+\.\d{1,2}\b/

const FORMATO: Partial<Record<CampoDeLinha, RegExp>> = {
	potencia: /^\d{2,4}(,\d)?\s?cv\b/i,
	torque: /^\d{1,3}(,\d{1,2})?\s?kgfm\b/i,
	aceleracao_0_100: /^\d{1,2}(,\d{1,2})?\s?s\b/i,
	velocidade_maxima: /^\d{3}\s?km\/h\b/i,
}

/** Texto que pode ir para a página: com dado, sem venda e sem promessa de procedência. */
function publicavel(valor: string): boolean {
	if (VAZIO_OU_PROVISORIO.test(valor) || /a confirmar/i.test(valor)) return false
	if (COMERCIAL.test(valor) || CONTATO.test(valor)) return false
	return !PROCEDENCIA.test(valor)
}

function cvs(texto: unknown): number[] {
	return [...String(texto ?? '').matchAll(/(\d{2,4})\s*cv\b/gi)].map(m => Number(m[1]))
}

/** A potência da ficha em número, para o campo `horsepower` quando o cadastro não tem. */
export function potenciaEmCv(ficha: FichaDoAnuncio | null | undefined): number | null {
	return cvs(ficha?.potencia)[0] ?? null
}

const VAZIA: FichaDoAnuncio = {
	motor: null, potencia: null, torque: null, cambio: null, tracao: null, aceleracao_0_100: null,
	velocidade_maxima: null, cor: null, interior: null, som: null, rodas: null, freios: null,
	diferenciais: [], opcionais: [],
}

export function lerFichaDoAnuncio(anuncio: AnuncioComDescricao): FichaDoAnuncio | null {
	const bruto = typeof anuncio.descricao === 'string' ? anuncio.descricao.trim() : ''
	if (!bruto || /^A procura de um/i.test(bruto)) return null

	const linhas = paraLinhas(bruto)
	const inicio = linhas.findIndex(l => rotuloDa(l)?.campo === 'motor')
	if (inicio === -1) return null

	const valores = new Map<CampoDeLinha, string[]>()
	const listas: Record<CampoDeLista, string[]> = { diferenciais: [], opcionais: [] }
	let lista: CampoDeLista | null = null

	for (const linha of linhas.slice(inicio)) {
		const r = rotuloDa(linha)
		if (r?.campo) {
			if (ehLista(r.campo)) {
				lista = r.campo
				// "DIFERENCIAIS: a; b" na mesma linha também vale.
				if (r.valor) listas[lista].push(...r.valor.split(';').map(t => t.trim()).filter(Boolean))
			} else {
				lista = null
				valores.set(r.campo, [...(valores.get(r.campo) ?? []), r.valor])
			}
			continue
		}
		// Dentro de uma lista, até "Algo: valor" sem rótulo do molde vira item.
		if (lista) listas[lista].push(linha.replace(MARCA_DE_ITEM, '').trim())
		// Fora de lista, linha sem rótulo do molde não é lida.
	}

	const ficha: FichaDoAnuncio = { ...VAZIA, diferenciais: [], opcionais: [] }
	for (const [campo, achados] of valores) {
		// Rótulo repetido com valores diferentes: não há como saber qual vale.
		if (new Set(achados).size > 1) continue
		const valor = achados[0]
		if (!publicavel(valor)) continue
		const formato = FORMATO[campo]
		if (formato && (!formato.test(valor) || DECIMAL_COM_PONTO.test(valor))) continue
		ficha[campo] = valor
	}
	for (const campo of ['diferenciais', 'opcionais'] as const) {
		ficha[campo] = [...new Set(listas[campo].filter(publicavel))]
	}

	const potencia = potenciaEmCv(ficha)
	const doCadastro = [
		...cvs(anuncio.modelo_nome),
		...cvs(anuncio.versao_descricao),
		...[anuncio.potencia, anuncio.potencia2].filter(n => Number(n) > 0).map(Number),
	]
	if (potencia && doCadastro.length && !doCadastro.includes(potencia)) ficha.potencia = null

	const blindado = [
		anuncio.modelo_nome, anuncio.versao_descricao,
		...(anuncio.acessorios ?? []).map(a => a?.nome),
		...(anuncio.tags ?? []),
		...ficha.diferenciais, ...ficha.opcionais,
	].some(t => /blind/i.test(String(t ?? '')))
	if (blindado) {
		ficha.aceleracao_0_100 = null
		ficha.velocidade_maxima = null
	}

	const temAlgo = Object.values(ficha).some(v => (Array.isArray(v) ? v.length > 0 : v !== null))
	return temAlgo ? ficha : null
}

/**
 * Opcionais para a página: os do molde, escritos pelo marketing, antes dos do
 * catálogo fixo da AutoConf ("Alarme", "Travas elétricas"); repetidos saem.
 */
export function opcionaisDoVeiculo(vehicle: Pick<Vehicle, 'options' | 'ficha'>): string[] {
	const vistos = new Set<string>()
	return [...(vehicle.ficha?.opcionais ?? []), ...(vehicle.options ?? [])].filter(item => {
		const k = chave(item)
		if (vistos.has(k)) return false
		vistos.add(k)
		return true
	})
}
