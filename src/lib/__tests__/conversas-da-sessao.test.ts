import { describe, it, expect } from 'vitest'
import { montarConversas, type LinhaCard, type LinhaClique } from '@/lib/visitors/consultas/conversas-da-sessao'

const SESSAO = '7c9e6679-7425-40de-944b-e07fc1f90ae7'

const cards: LinhaCard[] = [
	{
		id: 'card-b',
		criado_em: '2026-10-29T15:00:00.000Z',
		etapa: 'encerrado_ganho',
		veiculo: 'Porsche 911 Carrera',
		dados: { site_session_id: SESSAO, site_session_origem: 'correlacao_clique_veiculo' },
	},
	{
		id: 'card-a',
		criado_em: '2026-10-29T13:37:00.000Z',
		etapa: 'em_atendimento',
		veiculo: 'Mercedes S 63',
		dados: { site_session_id: SESSAO, site_session_origem: 'codigo_whatsapp', codigo_whatsapp: 1630495827 },
	},
]

const cliques: LinhaClique[] = [
	{ clicked_at: '2026-10-29T13:36:41.000Z', page_path: '/veiculo/mercedes-s-63-2025-1142317', codigo_whatsapp: '1630495827', card_id: 'card-a' },
	{ clicked_at: '2026-10-29T14:59:00.000Z', page_path: '/', codigo_whatsapp: null, card_id: 'card-b' },
	{ clicked_at: '2026-10-29T16:00:00.000Z', page_path: '/veiculos', codigo_whatsapp: '3917058264', card_id: null },
]

describe('montarConversas', () => {
	it('leads em ordem de entrada, com a forma da ligação; cada clique aponta o lead dele', () => {
		const r = montarConversas(cliques, cards, false)
		expect(r.leads.map(l => [l.ligacao, l.certa, l.situacao])).toEqual([
			['codigo', true, 'Em atendimento'],
			['horario_e_carro', false, 'Vendido'],
		])
		expect(r.cliques.map(c => [c.com_codigo, c.lead])).toEqual([
			[true, 0],
			[false, 1],
			[true, null],
		])
	})

	it('a agência vê a situação resumida, como na lista de leads dela, e nunca o id do card', () => {
		const r = montarConversas(cliques, cards, true)
		expect(r.leads.map(l => l.situacao)).toEqual(['Com o vendedor', 'Vendido'])
		expect(JSON.stringify(r)).not.toContain('card-a')
		expect(JSON.stringify(r)).not.toContain('1630495827')
	})
})
