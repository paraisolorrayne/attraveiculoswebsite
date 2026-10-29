import { describe, it, expect } from 'vitest'
import {
	codificarCodigo,
	codigoDoCampo,
	lerCodigo,
	textoComCodigo,
	linkComCodigo,
	semCodigo,
	novoCodigo,
	TAMANHO_DO_CODIGO,
	UM,
	ZERO,
} from '@/lib/codigo-whatsapp'

// Os IDs do teste de 29/10/2026, que a Fykos leu iguais no banco dela.
const TESTE_IPHONE = 1630495827
const TESTE_WEB = 3917058264

const invisiveis = (s: string) => (s.match(/[\u200c\u200d]/g) ?? []).length

describe('codificarCodigo e lerCodigo', () => {
	it('ida e volta, inclusive nos extremos', () => {
		for (const c of [0, 1, TESTE_IPHONE, TESTE_WEB, 0xffffffff]) {
			const codigo = codificarCodigo(c)
			expect(codigo).toHaveLength(TAMANHO_DO_CODIGO)
			expect(codigo).toMatch(/^[\u200c\u200d]+$/)
			expect(lerCodigo(`Olá!${codigo} Tenho interesse`)).toBe(c)
		}
	})

	it('começa pela marca 1011', () => {
		expect(codificarCodigo(TESTE_IPHONE).slice(0, 4)).toBe(UM + ZERO + UM + UM)
	})

	it('código com caractere a menos não é lido (não liga à pessoa errada)', () => {
		const codigo = codificarCodigo(TESTE_WEB)
		expect(lerCodigo(`Olá!${codigo.slice(0, 20)}${codigo.slice(21)} Tenho interesse`)).toBeNull()
	})

	it('dígito verificador errado não é lido', () => {
		const codigo = codificarCodigo(TESTE_WEB)
		const ultimo = codigo.at(-1) === UM ? ZERO : UM
		expect(lerCodigo(`Olá!${codigo.slice(0, -1)}${ultimo}`)).toBeNull()
	})

	it('texto sem código, emoji com ZWJ e vazio: null', () => {
		expect(lerCodigo('Olá! Tenho interesse no 911')).toBeNull()
		expect(lerCodigo('Olá 👨\u200d👩\u200d👧 tudo bem')).toBeNull()
		expect(lerCodigo('')).toBeNull()
		expect(lerCodigo(null)).toBeNull()
	})

	it('fora de 0..2^32-1 não codifica', () => {
		expect(() => codificarCodigo(-1)).toThrow()
		expect(() => codificarCodigo(2 ** 32)).toThrow()
		expect(() => codificarCodigo(1.5)).toThrow()
	})
})

describe('textoComCodigo', () => {
	it('entra logo depois da saudação, como no teste', () => {
		const t = textoComCodigo('Olá! Tenho interesse no Porsche 911.', TESTE_IPHONE)
		expect(t.startsWith(`Olá!${codificarCodigo(TESTE_IPHONE)} Tenho`)).toBe(true)
		expect(textoComCodigo('Olá, Attra. Tenho interesse.', 7).startsWith(`Olá,${codificarCodigo(7)} Attra.`)).toBe(true)
	})

	it('a pessoa vê o mesmo texto', () => {
		const original = 'Olá! Gostaria de mais informações sobre os veículos disponíveis.'
		expect(semCodigo(textoComCodigo(original, TESTE_WEB))).toBe(original)
	})

	it('troca o código anterior em vez de somar outro', () => {
		const duas = textoComCodigo(textoComCodigo('Olá! Oi', 1), 2)
		expect(invisiveis(duas)).toBe(TAMANHO_DO_CODIGO)
		expect(lerCodigo(duas)).toBe(2)
	})

	it('sobrevive a uma edição no fim, como no teste "Editado"', () => {
		const enviado = textoComCodigo('Olá! Tenho interesse no 911 Carrera S. Gostaria de mais informações.', TESTE_WEB)
			.replace('informações.', 'Financia?')
		expect(lerCodigo(enviado)).toBe(TESTE_WEB)
	})

	it('sem texto: só o código', () => {
		expect(textoComCodigo('', 5)).toBe(codificarCodigo(5))
	})
})

describe('linkComCodigo', () => {
	it('troca só o text=, com espaço em %20', () => {
		const href = 'https://wa.me/5534999444747?text=Ol%C3%A1!%20Tenho%20interesse'
		const novo = linkComCodigo(href, TESTE_IPHONE)!
		expect(novo.startsWith('https://wa.me/5534999444747?text=Ol%C3%A1!%E2%80%8')).toBe(true)
		expect(novo).not.toContain('+')
		expect(lerCodigo(new URL(novo).searchParams.get('text'))).toBe(TESTE_IPHONE)
	})

	it('link sem texto ganha o text= com o código', () => {
		const novo = linkComCodigo('https://wa.me/5534999444747', 9)!
		expect(lerCodigo(new URL(novo).searchParams.get('text'))).toBe(9)
	})

	it('mantém os outros parâmetros do api.whatsapp.com', () => {
		const novo = linkComCodigo('https://api.whatsapp.com/send?phone=5534999444747&text=Ol%C3%A1!%20Oi', 3)!
		const url = new URL(novo)
		expect(url.searchParams.get('phone')).toBe('5534999444747')
		expect(lerCodigo(url.searchParams.get('text'))).toBe(3)
	})

	it('o que não é WhatsApp fica de fora', () => {
		expect(linkComCodigo('https://attraveiculos.com.br/?text=Oi', 1)).toBeNull()
		expect(linkComCodigo('tel:+553430143232', 1)).toBeNull()
		expect(linkComCodigo('não é url', 1)).toBeNull()
	})
})

describe('novoCodigo', () => {
	it('dá um inteiro de 32 bits', () => {
		const c = novoCodigo()
		expect(Number.isInteger(c) && c >= 0 && c <= 0xffffffff).toBe(true)
	})
})

describe('codigoDoCampo', () => {
	it('número ou texto de dígitos, como a Fykos pode mandar no card', () => {
		expect(codigoDoCampo(TESTE_IPHONE)).toBe(TESTE_IPHONE)
		expect(codigoDoCampo(String(TESTE_WEB))).toBe(TESTE_WEB)
		expect(codigoDoCampo(' 0 ')).toBe(0)
		expect(codigoDoCampo('4294967295')).toBe(0xffffffff)
	})

	it('o resto é null', () => {
		for (const v of [null, undefined, '', 'abc', '12a', '-1', '1.5', 1.5, -1, 2 ** 32, '4294967296', {}, []]) {
			expect(codigoDoCampo(v)).toBeNull()
		}
	})
})
