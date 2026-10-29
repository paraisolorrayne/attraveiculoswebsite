/**
 * Código invisível do clique no WhatsApp (29/10/2026).
 *
 * O link do WhatsApp só leva o número e o texto pré-preenchido, e o código
 * visível (`[ref: ...]`) saiu duas vezes porque aparecia na mensagem do
 * comprador (ver whatsapp-ref.ts). Este código viaja no mesmo texto, mas em
 * caracteres que não aparecem: a pessoa vê só "Olá! Tenho interesse no...".
 *
 * Testado em 29/10/2026 no iPhone, no WhatsApp Web e com a mensagem editada
 * antes de enviar: chegou inteiro nos três, até o banco da Fykos. O Android
 * ficou sem teste.
 *
 * Formato (o mesmo que a Fykos lê; ver docs/crm/codigo-invisivel-whatsapp.md):
 * 44 caracteres seguidos, U+200C vale 0 e U+200D vale 1.
 *   - 4 de marca de início: 1011
 *   - 32 do código, número sem sinal, bit mais alto primeiro
 *   - 8 de verificação: CRC-8 (polinômio 0x07, início 0) dos 4 bytes do código
 * Leitura que não confere é descartada: é melhor não ligar a conversa ao
 * clique do que ligar à pessoa errada.
 */

export const ZERO = '\u200c'
export const UM = '\u200d'
const MARCA = '1011'
export const TAMANHO_DO_CODIGO = 44
const MAIOR_CODIGO = 0xffffffff

export function crc8(bytes: number[]): number {
	let c = 0
	for (const b of bytes) {
		c ^= b
		for (let i = 0; i < 8; i++) c = c & 0x80 ? ((c << 1) ^ 0x07) & 0xff : (c << 1) & 0xff
	}
	return c
}

const bytesDoCodigo = (codigo: number) => [(codigo >>> 24) & 255, (codigo >>> 16) & 255, (codigo >>> 8) & 255, codigo & 255]
const bits = (n: number, largura: number) => (n >>> 0).toString(2).padStart(largura, '0')

export function codigoValido(codigo: unknown): codigo is number {
	return typeof codigo === 'number' && Number.isInteger(codigo) && codigo >= 0 && codigo <= MAIOR_CODIGO
}

/** Os 44 caracteres invisíveis do código. */
export function codificarCodigo(codigo: number): string {
	if (!codigoValido(codigo)) throw new Error(`código fora de 0..2^32-1: ${codigo}`)
	return (MARCA + bits(codigo, 32) + bits(crc8(bytesDoCodigo(codigo)), 8))
		.split('')
		.map(b => (b === '1' ? UM : ZERO))
		.join('')
}

/** O código escondido no texto, ou null se não houver um que confira. */
export function lerCodigo(texto: string | null | undefined): number | null {
	if (!texto) return null
	for (const sequencia of texto.match(/[\u200c\u200d]+/g) ?? []) {
		for (let i = 0; i + TAMANHO_DO_CODIGO <= sequencia.length; i++) {
			const b = [...sequencia.slice(i, i + TAMANHO_DO_CODIGO)].map(c => (c === UM ? '1' : '0')).join('')
			if (!b.startsWith(MARCA)) continue
			const codigo = parseInt(b.slice(4, 36), 2)
			if (parseInt(b.slice(36), 2) === crc8(bytesDoCodigo(codigo))) return codigo
		}
	}
	return null
}

/**
 * O código que a Fykos devolve no card (`codigo_whatsapp`), já lido da
 * mensagem. Aceita número ou texto só de dígitos, porque JSON de outro sistema
 * pode trazer o inteiro entre aspas. Qualquer outra coisa é null.
 */
export function codigoDoCampo(valor: unknown): number | null {
	const n = typeof valor === 'string' && /^\d{1,10}$/.test(valor.trim()) ? Number(valor.trim()) : valor
	return codigoValido(n) ? n : null
}

/** O texto sem códigos (e sem sobras deles): para trocar um código por outro. */
export function semCodigo(texto: string): string {
	return texto.replace(/[\u200c\u200d]{8,}/g, '')
}

/**
 * Onde o código entra: logo depois da saudação ("Olá!", "Olá,"), que foi onde
 * ele passou no teste. Não vai no fim: o cursor do WhatsApp fica lá, e quem
 * apaga a última palavra apagaria primeiro 44 caracteres que não vê.
 */
function posicaoDoCodigo(texto: string): number {
	const pontuacao = texto.slice(0, 24).search(/[!,.:;?]/)
	if (pontuacao >= 0) return pontuacao + 1
	const espaco = texto.search(/\s/)
	return espaco >= 0 ? espaco : texto.length
}

export function textoComCodigo(texto: string, codigo: number): string {
	const limpo = semCodigo(texto)
	const p = posicaoDoCodigo(limpo)
	return limpo.slice(0, p) + codificarCodigo(codigo) + limpo.slice(p)
}

const HOST_WHATSAPP = /^(?:api\.)?wa\.me$|^(?:www\.|api\.|web\.)?whatsapp\.com$/i

/**
 * O mesmo link de WhatsApp com o código no texto. Só o `text=` muda, em
 * encodeURIComponent (espaço vira %20, não "+"). null se não for link de
 * WhatsApp, e aí o clique segue como estava.
 */
export function linkComCodigo(href: string, codigo: number): string | null {
	let url: URL
	try {
		url = new URL(href)
	} catch {
		return null
	}
	if (!/^https?:$/.test(url.protocol) || !HOST_WHATSAPP.test(url.hostname)) return null
	const texto = textoComCodigo(url.searchParams.get('text') ?? '', codigo)
	const valor = encodeURIComponent(texto)
	if (/[?&]text=/.test(href)) return href.replace(/([?&]text=)[^&#]*/, `$1${valor}`)
	const [base, ancora] = href.split('#')
	return `${base}${base.includes('?') ? '&' : '?'}text=${valor}${ancora !== undefined ? `#${ancora}` : ''}`
}

/** Código novo para um clique: 32 bits aleatórios. */
export function novoCodigo(): number {
	return crypto.getRandomValues(new Uint32Array(1))[0]
}
