import { describe, it, expect } from 'vitest'
import { dataEncerramento, dataReferenciaPeriodo } from '@/lib/crm-datas'

const base = {
	etapa: 'encerrado_ganho',
	atualizado_em: '2026-07-22T12:24:50.096Z',
	encerrado_em: null as string | null,
	dados: null as Record<string, unknown> | null,
}

describe('dataEncerramento', () => {
	it('usa a coluna encerrado_em quando presente', () => {
		const c = { ...base, encerrado_em: '2026-07-25T10:00:00Z' }
		expect(dataEncerramento(c)).toBe('2026-07-25T10:00:00Z')
	})

	it('cai no dados.encerrado_em quando a coluna está vazia (cards do v1)', () => {
		const c = { ...base, dados: { encerrado_em: '2026-07-12T03:32:33.676268+00:00' } }
		expect(dataEncerramento(c)).toBe('2026-07-12T03:32:33.676268+00:00')
	})

	it('null quando não há data em lugar nenhum ou é inválida', () => {
		expect(dataEncerramento(base)).toBeNull()
		expect(dataEncerramento({ ...base, dados: { encerrado_em: 'ontem' } })).toBeNull()
	})
})

describe('dataReferenciaPeriodo', () => {
	it('encerrado usa a data efetiva de encerramento, não o atualizado_em', () => {
		// O caso real: venda fechada em 12/07, mas o lote v1 de 22/07 carimbou
		// atualizado_em — o card NÃO pode contar como "ganho da semana"
		const c = { ...base, dados: { encerrado_em: '2026-07-12T03:32:33Z' } }
		expect(dataReferenciaPeriodo(c)).toBe('2026-07-12T03:32:33Z')
	})

	it('encerrado sem data de encerramento cai no atualizado_em', () => {
		expect(dataReferenciaPeriodo(base)).toBe(base.atualizado_em)
	})

	it('etapa ativa usa atualizado_em (movimentação)', () => {
		const c = { ...base, etapa: 'em_negociacao', encerrado_em: '2026-07-25T10:00:00Z' }
		expect(dataReferenciaPeriodo(c)).toBe(base.atualizado_em)
	})
})
