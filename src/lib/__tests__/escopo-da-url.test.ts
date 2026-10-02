import { describe, expect, it } from 'vitest'
import { escopoDaUrl } from '@/lib/visitors/escopo-da-url'

const AG = '00000000-0000-0000-0000-0000000000aa'

describe('escopoDaUrl', () => {
	it('a agência vem de quem chama; da URL só saem plataforma e campanha', () => {
		expect(escopoDaUrl('http://x/?plataforma=meta&campanha=%5BVA%5D%20Leads', AG)).toEqual({
			tipo: 'agencia', agenciaId: AG, plataforma: 'meta', campanhas: ['[VA] Leads'],
		})
	})

	it('campanha é o rótulo da tela (nome ou "campanha #<id>"), podendo repetir', () => {
		const e = escopoDaUrl('http://x/?campanha=va-pmax&campanha=campanha%20%2324295047322', AG)
		expect(e).toMatchObject({ campanhas: ['va-pmax', 'campanha #24295047322'] })
	})

	it('valor inválido é ignorado e nunca alarga o escopo', () => {
		const e = escopoDaUrl(`http://x/?plataforma=tiktok&campanha=%20%20&campanha=${'a'.repeat(201)}`, AG)
		expect(e).toEqual({ tipo: 'agencia', agenciaId: AG, plataforma: null, campanhas: null })
	})

	it('no máximo 20 campanhas', () => {
		const url = 'http://x/?' + Array.from({ length: 25 }, (_, i) => `campanha=c${i}`).join('&')
		expect((escopoDaUrl(url, AG) as { campanhas: string[] }).campanhas).toHaveLength(20)
	})
})
