import { describe, it, expect } from 'vitest'
import {
	formatarDataBR,
	dataMaisRecente,
	lastmodDoEstoque,
	LASTMOD_CONTEUDO_ESTATICO,
} from '@/lib/seo/frescor'

describe('formatarDataBR — a data que o visitante e o LLM leem na página', () => {
	it('formata ISO em dd/mm/aaaa no fuso do Brasil', () => {
		expect(formatarDataBR('2026-08-26T14:15:33.651Z')).toBe('26/08/2026')
	})

	it('meia-noite UTC ainda é o dia anterior em Brasília — não pode virar o dia errado', () => {
		expect(formatarDataBR('2026-08-27T01:30:00.000Z')).toBe('26/08/2026')
	})

	it('data inválida vira null em vez de "Invalid Date" na tela', () => {
		expect(formatarDataBR('não-é-data')).toBeNull()
		expect(formatarDataBR(undefined)).toBeNull()
	})
})

describe('dataMaisRecente / lastmodDoEstoque — o lastmod das páginas que listam estoque', () => {
	it('escolhe a publicação mais nova entre os veículos', () => {
		const vs = [
			{ updated_at: '2026-08-01T00:00:00.000Z' },
			{ updated_at: '2026-08-20T10:00:00.000Z' },
			{ updated_at: '2026-08-10T00:00:00.000Z' },
		]
		expect(dataMaisRecente(vs.map(v => v.updated_at))).toBe('2026-08-20T10:00:00.000Z')
	})

	it('ignora datas ausentes ou inválidas', () => {
		expect(dataMaisRecente(['x', undefined, '2026-08-02T00:00:00.000Z'])).toBe('2026-08-02T00:00:00.000Z')
	})

	it('sem nenhuma data válida devolve null — o chamador decide o fallback', () => {
		expect(dataMaisRecente([])).toBeNull()
		expect(dataMaisRecente([undefined, 'x'])).toBeNull()
	})

	it('lastmodDoEstoque nunca devolve a hora do build: cai no lastmod estático', () => {
		expect(lastmodDoEstoque([])).toBe(LASTMOD_CONTEUDO_ESTATICO)
		expect(lastmodDoEstoque([{ updated_at: '2026-08-20T10:00:00.000Z' }])).toBe('2026-08-20T10:00:00.000Z')
	})

	it('o lastmod estático é uma data ISO fixa, não now()', () => {
		expect(LASTMOD_CONTEUDO_ESTATICO).toMatch(/^\d{4}-\d{2}-\d{2}T/)
		expect(new Date(LASTMOD_CONTEUDO_ESTATICO).getTime()).toBeLessThan(Date.now())
	})
})
