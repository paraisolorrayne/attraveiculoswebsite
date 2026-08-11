import { describe, it, expect } from 'vitest'
import { linhaRejeicao } from '@/lib/crm-webhook'

describe('linhaRejeicao', () => {
	const base = { status: 401, motivo: 'assinatura inválida', bytes: 812, assinatura: false } as const

	it('carrega o suficiente para provar a entrega: prefixo, status e motivo', () => {
		const l = linhaRejeicao(base)
		expect(l).toContain('[FykosCRM]')
		expect(l).toContain('REJEITADO')
		expect(l).toContain('status=401')
		expect(l).toContain('assinatura inválida')
	})

	it('registra tamanho do corpo e presença do header de assinatura', () => {
		expect(linhaRejeicao(base)).toContain('bytes=812')
		expect(linhaRejeicao(base)).toContain('assinatura=ausente')
		expect(linhaRejeicao({ ...base, assinatura: true })).toContain('assinatura=presente')
	})

	// Sem os ids não dá para cruzar com o log do emissor e a prova não fecha.
	it('lista os ids dos cards da requisição recusada', () => {
		const l = linhaRejeicao({ ...base, ids: ['39ba9dac', 'aa11'] })
		expect(l).toContain('39ba9dac')
		expect(l).toContain('aa11')
	})

	// Lote grande não pode gerar uma linha de log gigante.
	it('trunca lista longa de ids sinalizando quantos ficaram de fora', () => {
		const ids = Array.from({ length: 30 }, (_, i) => `id${i}`)
		const l = linhaRejeicao({ ...base, ids })
		expect(l).toContain('id0')
		expect(l).not.toContain('id29')
		expect(l).toContain('+10')
		expect(l).toContain('total=30')
	})

	it('omite o trecho de ids quando não há card na requisição', () => {
		expect(linhaRejeicao(base)).not.toContain('ids=')
	})

	// O corpo traz nome e telefone de cliente: log não é lugar para isso.
	it('não aceita nem ecoa o corpo da requisição', () => {
		const l = linhaRejeicao({ ...base, motivo: 'JSON inválido' })
		expect(l).not.toMatch(/\{|\}/)
	})

	// Erro do Postgres pode trazer o valor da coluna que violou a restrição.
	it('corta motivo muito longo para não despejar dado de cliente no log', () => {
		const l = linhaRejeicao({ ...base, motivo: 'x'.repeat(500) })
		expect(l).toContain('[cortado]')
		expect(l.length).toBeLessThan(420)
	})
})
