import { describe, it, expect } from 'vitest'
import { mergeCardV2 } from '@/lib/crm-webhook'
import { colunaDoCard, FONTES_EVENTO } from '@/app/admin/crm/crm-constants'
import { dataReferenciaPeriodo } from '@/lib/crm-datas'

// Validação pedida pelo time do webhook antes do PR de transbordo (12/08/2026):
// o consumidor de transbordo move o card PARA TRÁS (em_atendimento →
// aguardando_vendedor, com vendedor novo). Este arquivo fixa o que o site
// garante — e o que ele NÃO garante sozinho.

const ANTES = '2026-08-12T10:00:00Z'
const DEPOIS = '2026-08-12T15:00:00Z'

const existente = { atualizado_em: ANTES, dados: null }

describe('regressão de etapa (transbordo)', () => {
	it('NÃO existe guarda de "etapa não regride": em_atendimento volta para aguardando', () => {
		const r = mergeCardV2(existente, {
			id: '1',
			etapa: 'aguardando_vendedor',
			vendedor: 'Vendedor Novo',
			atualizado_em: DEPOIS,
		})
		expect(r.action).toBe('update')
		if (r.action !== 'update') throw new Error('unreachable')
		expect(r.row.vendedor).toBe('Vendedor Novo')
	})

	// A etapa v1 é normalizada na entrada: o que fica gravado é 'novo'.
	it('aguardando_vendedor é GRAVADO como novo (normalização v1→v2)', () => {
		const r = mergeCardV2(existente, { id: '1', etapa: 'aguardando_vendedor', atualizado_em: DEPOIS })
		if (r.action !== 'update') throw new Error('unreachable')
		expect(r.row.etapa).toBe('novo')
	})

	// A única guarda que existe é de ordenação — e ela vale para a regressão também.
	it('a regressão é IGNORADA se atualizado_em não for estritamente maior', () => {
		expect(mergeCardV2(existente, { id: '1', etapa: 'aguardando_vendedor', atualizado_em: ANTES }).action).toBe('skip')
		expect(mergeCardV2(existente, { id: '1', etapa: 'aguardando_vendedor', atualizado_em: '2026-08-12T09:00:00Z' }).action).toBe('skip')
	})

	// "Campo ausente mantém" é a regra do contrato — e no transbordo ela morde:
	// o card volta para a fila de aceite carregando o estado do vendedor ANTERIOR.
	it('campos não reenviados sobrevivem à regressão (situação do vendedor antigo)', () => {
		const r = mergeCardV2(existente, { id: '1', etapa: 'aguardando_vendedor', vendedor: 'Novo', atualizado_em: DEPOIS })
		if (r.action !== 'update') throw new Error('unreachable')
		expect(r.row).not.toHaveProperty('situacao')
		expect(r.row).not.toHaveProperty('primeiro_contato_em')
		expect(r.row).not.toHaveProperty('atribuido_em')
	})

	it('null explícito limpa o que o vendedor anterior deixou', () => {
		const r = mergeCardV2(existente, {
			id: '1',
			etapa: 'aguardando_vendedor',
			situacao: 'aguardando_contato',
			primeiro_contato_em: null,
			andamento: null,
			atribuido_em: DEPOIS,
			atualizado_em: DEPOIS,
		})
		if (r.action !== 'update') throw new Error('unreachable')
		expect(r.row.primeiro_contato_em).toBeNull()
		expect(r.row.andamento).toBeNull()
		expect(r.row.situacao).toBe('aguardando_contato')
	})

	// O relógio de SLA e o filtro de período leem atribuido_em quando a etapa é
	// 'novo' — não atualizado_em. Sem reenviar, o vendedor novo herda a espera.
	it('sem atribuido_em novo, o card é datado pelo alerta ANTIGO', () => {
		const alertaAntigo = '2026-08-01T12:00:00Z'
		const card = {
			etapa: 'novo',
			atualizado_em: DEPOIS,
			encerrado_em: null,
			atribuido_em: alertaAntigo,
			dados: null,
		}
		expect(dataReferenciaPeriodo(card)).toBe(alertaAntigo)
		expect(dataReferenciaPeriodo({ ...card, atribuido_em: DEPOIS })).toBe(DEPOIS)
	})
})

describe('fonte_evento = "transbordo"', () => {
	it('é COLUNA própria, não extra do JSONB dados', () => {
		const r = mergeCardV2(existente, { id: '1', fonte_evento: 'transbordo', atualizado_em: DEPOIS })
		if (r.action !== 'update') throw new Error('unreachable')
		expect(r.row.fonte_evento).toBe('transbordo')
		expect(r.row).not.toHaveProperty('dados')
	})

	// Nada no kanban faz switch fechado sobre fonte_evento.
	it('não quebra a escolha de coluna: valor desconhecido cai no ramo padrão', () => {
		expect(colunaDoCard({ etapa: 'em_atendimento', fonte_evento: 'transbordo' })).toBe('assumido')
		expect(colunaDoCard({ etapa: 'em_negociacao', fonte_evento: 'transbordo' })).toBe('assumido')
	})

	// Depois do transbordo a etapa é 'novo', e ela tem precedência sobre a fonte.
	it('card transbordado aparece em Aguardando aceite', () => {
		expect(colunaDoCard({ etapa: 'novo', fonte_evento: 'transbordo' })).toBe('aguardando')
	})

	it('o rótulo cai para o valor cru em vez de sumir', () => {
		expect(FONTES_EVENTO['transbordo'] ?? 'transbordo').toBe('Transbordo para outro vendedor')
	})
})
