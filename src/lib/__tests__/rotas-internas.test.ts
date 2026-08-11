import { describe, it, expect } from 'vitest'
import { ehRotaInterna, PADROES_LIKE_ROTAS_INTERNAS } from '@/lib/rotas-internas'

describe('ehRotaInterna', () => {
	it('pega o painel e tudo abaixo dele', () => {
		// Os caminhos reais medidos em produção nos 30 dias até 10/08/2026.
		for (const p of [
			'/admin',
			'/admin/crm',
			'/admin/visitors',
			'/admin/visitors/veiculos',
			'/admin/gerador-criativos',
			'/admin/newsletter/campaigns',
			'/admin/login',
		]) {
			expect(ehRotaInterna(p), p).toBe(true)
		}
	})

	it('não pega página pública nenhuma', () => {
		for (const p of ['/', '/veiculos', '/veiculo/sf90-2024-1062018', '/blog', '/sobre', '/troca']) {
			expect(ehRotaInterna(p), p).toBe(false)
		}
	})

	it('compara segmento, não prefixo de string', () => {
		// O risco de filtrar por prefixo cru: uma futura /administrativo ou
		// /admin-blog sumiria do relatório sem ninguém notar.
		expect(ehRotaInterna('/administrativo')).toBe(false)
		expect(ehRotaInterna('/admin-blog')).toBe(false)
		expect(ehRotaInterna('/adminconsole')).toBe(false)
	})

	it('caminho ausente não é rota interna', () => {
		expect(ehRotaInterna(null)).toBe(false)
		expect(ehRotaInterna(undefined)).toBe(false)
		expect(ehRotaInterna('')).toBe(false)
	})
})

describe('PADROES_LIKE_ROTAS_INTERNAS', () => {
	/** Mesma semântica do LIKE do Postgres, para provar que os dois lados batem. */
	const casaLike = (valor: string, padrao: string) =>
		new RegExp('^' + padrao.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*') + '$').test(valor)

	it('o filtro do SQL cobre exatamente o que ehRotaInterna cobre', () => {
		const caminhos = [
			'/admin', '/admin/crm', '/admin/visitors/veiculos', '/admin/login',
			'/', '/veiculos', '/veiculo/sf90-2024-1062018', '/blog',
			'/administrativo', '/admin-blog',
		]
		for (const c of caminhos) {
			const porSql = PADROES_LIKE_ROTAS_INTERNAS.some(p => casaLike(c, p))
			expect(porSql, `divergência em "${c}"`).toBe(ehRotaInterna(c))
		}
	})
})
