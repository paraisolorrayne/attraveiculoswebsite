import { describe, it, expect } from 'vitest'
import { createHmac } from 'node:crypto'
import { verifyCrmSignature, normalizeEtapa, mergeCardV2, atualizadoEmInvalido, safeEquals } from '@/lib/crm-webhook'

const SECRET = 'segredo-teste'
const sign = (body: string) => createHmac('sha256', SECRET).update(body).digest('hex')

describe('verifyCrmSignature', () => {
	it('aceita assinatura correta', () => {
		const body = '{"id":"1"}'
		expect(verifyCrmSignature(body, sign(body), SECRET)).toBe(true)
	})
	it('rejeita assinatura errada, ausente ou de outro corpo', () => {
		expect(verifyCrmSignature('{"id":"1"}', sign('{"id":"2"}'), SECRET)).toBe(false)
		expect(verifyCrmSignature('{"id":"1"}', null, SECRET)).toBe(false)
		expect(verifyCrmSignature('{"id":"1"}', 'zz-not-hex', SECRET)).toBe(false)
	})
})

describe('normalizeEtapa', () => {
	it('mapeia etapas v1 para v2', () => {
		expect(normalizeEtapa('aguardando_vendedor')).toEqual({ etapa: 'novo' })
		expect(normalizeEtapa('encerrado_sucesso')).toEqual({ etapa: 'encerrado_ganho' })
		expect(normalizeEtapa('sem_atualizacao')).toEqual({ etapa: 'em_atendimento', situacaoImplicita: 'sem_atualizacao' })
	})
	it('etapas v2 e desconhecidas passam intactas', () => {
		expect(normalizeEtapa('em_negociacao')).toEqual({ etapa: 'em_negociacao' })
		expect(normalizeEtapa('etapa_exotica')).toEqual({ etapa: 'etapa_exotica' })
	})
})

describe('mergeCardV2', () => {
	const T1 = '2026-07-27T10:00:00Z'
	const T2 = '2026-07-27T11:00:00Z'

	it('insere card novo com defaults', () => {
		const r = mergeCardV2(null, { id: 42, etapa: 'novo', nome: 'Ana', atualizado_em: T1 })
		expect(r.action).toBe('insert')
		if (r.action === 'skip' || r.action === 'invalid') throw new Error('unreachable')
		expect(r.row.id).toBe('42')
		expect(r.row.nome).toBe('Ana')
		expect(r.row.atualizado_em.toISOString()).toBe('2026-07-27T10:00:00.000Z')
	})

	it('IGNORA evento com atualizado_em <= o salvo (fora de ordem)', () => {
		const existing = { atualizado_em: new Date(T2), dados: null }
		expect(mergeCardV2(existing, { id: '1', atualizado_em: T1, nome: 'Atrasado' }).action).toBe('skip')
		expect(mergeCardV2(existing, { id: '1', atualizado_em: T2, nome: 'Empate' }).action).toBe('skip')
	})

	it('campo ausente mantém (não entra no row); null limpa', () => {
		const existing = { atualizado_em: new Date(T1), dados: null }
		const r = mergeCardV2(existing, { id: '1', atualizado_em: T2, impedimento: null })
		if (r.action !== 'update') throw new Error('esperava update')
		expect(r.row).not.toHaveProperty('nome')
		expect(r.row.impedimento).toBeNull()
	})

	it('veiculo_interesse mapeia para a coluna veiculo; valor string vira número', () => {
		const r = mergeCardV2(null, { id: '1', atualizado_em: T1, veiculo_interesse: 'RS6 Avant', valor: '799000' })
		if (r.action === 'skip' || r.action === 'invalid') throw new Error('unreachable')
		expect(r.row.veiculo).toBe('RS6 Avant')
		expect(r.row.valor).toBe(799000)
	})

	it('etapa v1 no payload é normalizada; sem_atualizacao vira situacao', () => {
		const r = mergeCardV2(null, { id: '1', atualizado_em: T1, etapa: 'sem_atualizacao' })
		if (r.action === 'skip' || r.action === 'invalid') throw new Error('unreachable')
		expect(r.row.etapa).toBe('em_atendimento')
		expect(r.row.situacao).toBe('sem_atualizacao')
	})

	it('situacao explícita vence a implícita do sem_atualizacao', () => {
		const r = mergeCardV2(null, { id: '1', atualizado_em: T1, etapa: 'sem_atualizacao', situacao: 'nao_responde' })
		if (r.action === 'skip' || r.action === 'invalid') throw new Error('unreachable')
		expect(r.row.situacao).toBe('nao_responde')
	})

	it('extras desconhecidos vão para dados, mesclando com os existentes', () => {
		const existing = { atualizado_em: new Date(T1), dados: { legado: 'x' } }
		const r = mergeCardV2(existing, { id: '1', atualizado_em: T2, score_ia: 87 })
		if (r.action !== 'update') throw new Error('esperava update')
		expect(r.row.dados).toEqual({ legado: 'x', score_ia: 87 })
	})

	it('datas da linha do tempo viram Date; null limpa', () => {
		const r = mergeCardV2(null, { id: '1', atualizado_em: T1, proxima_acao_em: T2, encerrado_em: null })
		if (r.action === 'skip' || r.action === 'invalid') throw new Error('unreachable')
		expect(r.row.proxima_acao_em).toBeInstanceOf(Date)
		expect(r.row.encerrado_em).toBeNull()
	})

	it('atualizado_em presente mas inválido é rejeitado (não vira "agora")', () => {
		expect(mergeCardV2(null, { id: '1', atualizado_em: 'ontem à noite' }).action).toBe('invalid')
		expect(mergeCardV2(null, { id: '1', atualizado_em: 12345 }).action).toBe('invalid')
		expect(atualizadoEmInvalido({ atualizado_em: 'ontem' })).toBe(true)
		expect(atualizadoEmInvalido({ atualizado_em: T1 })).toBe(false)
		expect(atualizadoEmInvalido({})).toBe(false)
	})

	it('atualizado_em ausente (emissor v1) usa o relógio do servidor', () => {
		const antes = Date.now()
		const r = mergeCardV2(null, { id: '1', nome: 'V1' })
		if (r.action !== 'insert') throw new Error('esperava insert')
		expect(r.row.atualizado_em.getTime()).toBeGreaterThanOrEqual(antes)
	})

	it('valor não-numérico vira null, nunca NaN', () => {
		const r = mergeCardV2(null, { id: '1', atualizado_em: T1, valor: 'R$ 799.000' })
		if (r.action === 'skip' || r.action === 'invalid') throw new Error('unreachable')
		expect(r.row.valor).toBeNull()
	})

	it('insert sem etapa assume novo', () => {
		const r = mergeCardV2(null, { id: '1', atualizado_em: T1, nome: 'Ana' })
		if (r.action !== 'insert') throw new Error('esperava insert')
		expect(r.row.etapa).toBe('novo')
	})

	it('extra com null remove a chave do dados existente', () => {
		const existing = { atualizado_em: new Date(T1), dados: { observacoes_alerta: 'resolvido', outro: 1 } }
		const r = mergeCardV2(existing, { id: '1', atualizado_em: T2, observacoes_alerta: null })
		if (r.action !== 'update') throw new Error('esperava update')
		expect(r.row.dados).toEqual({ outro: 1 })
	})

	it('envelope (cards/remover/dados) nunca vira extra', () => {
		const r = mergeCardV2(null, { id: '1', atualizado_em: T1, remover: ['x'], dados: { a: 1 } })
		if (r.action === 'skip' || r.action === 'invalid') throw new Error('unreachable')
		expect(r.row.dados).toBeUndefined()
	})
})

describe('safeEquals', () => {
	it('compara segredos sem vazar por tamanho', () => {
		expect(safeEquals('abc', 'abc')).toBe(true)
		expect(safeEquals('abc', 'abd')).toBe(false)
		expect(safeEquals('abc', 'abcd')).toBe(false)
	})
})
