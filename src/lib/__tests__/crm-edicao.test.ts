import { describe, expect, it } from 'vitest'
import type { Selectable } from 'kysely'
import type { CrmCardsTable } from '@/lib/db/types'
import { mudancasCrm, podeEditarCrm, validarEdicaoCrm } from '@/lib/crm-edicao'
import { colunaDoCard } from '@/app/admin/crm/crm-constants'

const agora = new Date('2026-09-08T18:00:00Z')
const card = {
	id: 'cliente-1', etapa: 'em_atendimento', fonte_evento: 'reporte', vendedor: 'Ana',
	encerrado_em: null, motivo_encerramento: null, atualizado_em: new Date('2026-09-08T17:00:00Z'),
	dados: { session_id: 'visita-1', resultado: 'encerrado_por_inatividade', encerrado_em: '2026-08-01T12:00:00Z' },
} as unknown as Selectable<CrmCardsTable>
const versao = card.atualizado_em.toISOString()

describe('edição manual do CRM', () => {
	it('permite Owner/admin e recusa os demais papéis', () => {
		expect(podeEditarCrm('owner')).toBe(true)
		expect(podeEditarCrm('admin')).toBe(true)
		for (const role of ['operador', 'marketing', 'gerente', '']) expect(podeEditarCrm(role)).toBe(false)
	})
	it.each([null, [], {}, { atualizado_em: 'ontem', coluna: 'ganho' }, { atualizado_em: versao, coluna: 'inventada' },
		{ atualizado_em: versao, vendedor: {} }, { atualizado_em: versao, vendedor: '' }, { atualizado_em: versao, vendedor: 'Ana', etapa: 'novo' }])('recusa entrada inválida: %j', body => {
		expect(() => validarEdicaoCrm(body)).toThrow()
	})
	it('normaliza nome e aceita remoção explícita', () => {
		expect(validarEdicaoCrm({ atualizado_em: versao, vendedor: '  João  ' }).vendedor).toBe('João')
		expect(validarEdicaoCrm({ atualizado_em: versao, vendedor: null }).vendedor).toBeNull()
	})
	it('troca vendedor sem mover um card que está movimentando', () => {
		const mudancas = mudancasCrm(card, { atualizado_em: versao, vendedor: 'João' }, agora)!
		expect(mudancas.vendedor).toBe('João')
		expect(mudancas.atribuido_em).toEqual(agora)
		expect(mudancas.etapa).toBeUndefined()
		expect(colunaDoCard({ ...card, ...mudancas } as typeof card)).toBe('movimentando')
	})
	it.each(['aguardando', 'assumido', 'movimentando', 'ganho', 'perdido'] as const)('movimenta para %s e preserva metadados do cliente', coluna => {
		const original = { ...card, etapa: 'encerrado_perdido' }
		if (coluna === 'perdido') original.etapa = 'novo'
		const m = mudancasCrm(original, { atualizado_em: versao, coluna, motivo_encerramento: 'Cliente desistiu' }, agora)!
		expect(colunaDoCard({ ...original, ...m } as typeof card)).toBe(coluna)
		expect(m.dados).toMatchObject({ session_id: 'visita-1', resultado: null, encerrado_em: null })
		expect(m.encerrado_em).toEqual(['ganho', 'perdido'].includes(coluna) ? agora : null)
	})
	it('exige motivo para perda e não inventa contato ao assumir', () => {
		expect(() => mudancasCrm(card, { atualizado_em: versao, coluna: 'perdido' }, agora)).toThrow('motivo')
		expect(mudancasCrm(card, { atualizado_em: versao, coluna: 'assumido' }, agora)!.primeiro_contato_em).toBeUndefined()
	})
	it('não gera evento quando nada mudou', () => {
		expect(mudancasCrm(card, { atualizado_em: versao, coluna: 'movimentando', vendedor: 'Ana' }, agora)).toBeNull()
	})
})
