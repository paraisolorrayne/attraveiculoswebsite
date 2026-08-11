import { describe, it, expect } from 'vitest'
import { colunaDoCard, COLUNAS_KANBAN, SITUACOES, FONTES_EVENTO } from '@/app/admin/crm/crm-constants'
import { linkWhatsApp } from '@/app/admin/crm/crm-card'

describe('colunaDoCard — coluna Aguardando aceite', () => {
	it('lead designado e ainda não aceito vai para "aguardando"', () => {
		// O card real de 10/08: etapa novo, fonte alerta. Antes ele nem chegava
		// ao quadro (era descartado por `etapa !== 'novo'`).
		expect(colunaDoCard({ etapa: 'novo', fonte_evento: 'alerta' })).toBe('aguardando')
	})

	it('a etapa vence a fonte: card em `novo` NÃO pode virar "assumido"', () => {
		// Regressão do bug de rotulagem: qualquer fonte diferente de 'reporte'
		// caía em "Assumido pelo vendedor", afirmando um aceite inexistente.
		expect(colunaDoCard({ etapa: 'novo', fonte_evento: 'cobranca_semanal' })).toBe('aguardando')
		expect(colunaDoCard({ etapa: 'novo', fonte_evento: null })).toBe('aguardando')
		expect(colunaDoCard({ etapa: 'novo', fonte_evento: 'reporte' })).toBe('aguardando')
	})

	it('depois do aceite o card sai da fila', () => {
		expect(colunaDoCard({ etapa: 'em_atendimento', fonte_evento: 'aceite' })).toBe('assumido')
		expect(colunaDoCard({ etapa: 'em_atendimento', fonte_evento: 'reporte' })).toBe('movimentando')
	})

	it('encerrado vence tudo, inclusive um `novo` encerrado direto', () => {
		expect(colunaDoCard({ etapa: 'encerrado_ganho', fonte_evento: 'venda' })).toBe('ganho')
		expect(colunaDoCard({ etapa: 'encerrado_perdido', fonte_evento: 'inatividade' })).toBe('perdido')
	})

	it('a coluna aguardando é a primeira do quadro', () => {
		expect(COLUNAS_KANBAN[0].id).toBe('aguardando')
		expect(COLUNAS_KANBAN.map(c => c.id)).toEqual(['aguardando', 'assumido', 'movimentando', 'ganho', 'perdido'])
	})

	it('toda coluna devolvida por colunaDoCard existe em COLUNAS_KANBAN', () => {
		const ids = new Set<string>(COLUNAS_KANBAN.map(c => c.id))
		for (const etapa of ['novo', 'em_atendimento', 'em_negociacao', 'encerrado_ganho', 'encerrado_perdido']) {
			for (const fonte of [null, 'alerta', 'aceite', 'reporte', 'cobranca_semanal', 'venda', 'perda']) {
				expect(ids.has(colunaDoCard({ etapa, fonte_evento: fonte }))).toBe(true)
			}
		}
	})
})

describe('vocabulário conferido contra o emissor (produção 10/08)', () => {
	it('as situações que o emissor manda têm rótulo próprio', () => {
		// aguardando_contato é a situação de TODO card de alerta e caía no
		// fallback genérico, sem cor.
		for (const s of ['aguardando_contato', 'assumido', 'perdido', 'sem_atualizacao']) {
			expect(SITUACOES[s], `situacao "${s}" sem rótulo`).toBeDefined()
		}
	})

	it('as fontes de evento vistas em produção têm rótulo próprio', () => {
		for (const f of ['alerta', 'alerta_manual', 'aceite', 'reporte', 'cobranca_semanal',
			'inatividade', 'venda', 'perda', 'sistema', 'correcao_manual', 'backfill_lead_novo']) {
			expect(FONTES_EVENTO[f], `fonte_evento "${f}" sem rótulo`).toBeDefined()
		}
	})
})

describe('linkWhatsApp', () => {
	it('não duplica o 55 do telefone que o emissor manda', () => {
		// O bug: 343 dos 367 cards têm o telefone como "+55…" e o link saía
		// wa.me/555511999908011 — número inexistente.
		expect(linkWhatsApp('+5511999908011')).toBe('https://wa.me/5511999908011')
		expect(linkWhatsApp('5511999908011')).toBe('https://wa.me/5511999908011')
	})

	it('acrescenta o 55 quando ele realmente falta', () => {
		expect(linkWhatsApp('11999908011')).toBe('https://wa.me/5511999908011')
		expect(linkWhatsApp('(11) 99990-8011')).toBe('https://wa.me/5511999908011')
	})

	it('cobre os dois formatos que convivem no banco', () => {
		expect(linkWhatsApp('+5545991242400')).toBe('https://wa.me/5545991242400')
		expect(linkWhatsApp('554896616355')).toBe('https://wa.me/554896616355') // fixo, 12 dígitos
	})

	it('telefone sem dígito nenhum não vira link', () => {
		expect(linkWhatsApp('-')).toBeNull()
		expect(linkWhatsApp('')).toBeNull()
	})
})
