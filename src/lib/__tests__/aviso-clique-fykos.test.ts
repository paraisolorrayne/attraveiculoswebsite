import { describe, expect, it } from 'vitest'
import { montarAvisoDeClique } from '@/lib/aviso-clique-fykos'
import type { RespostaAtribuicao } from '@/lib/atribuicao-sessao'

const COM_ORIGEM: RespostaAtribuicao = {
	session_id: '1784810859532-pupqonclbi',
	ligacao: 'correlacao_clique_whatsapp',
	first_touch: {
		source: 'google', medium: 'cpc', campaign: '[VA] Search | Estoque Premium',
		content: null, term: null, gclid: 'Cj0KCQjw', wbraid: null, gbraid: null, fbclid: null,
		landing: '/', ts: '2026-09-19T13:41:02.000Z',
	},
	last_touch: {
		source: 'linktr.ee', medium: null, campaign: null,
		content: null, term: null, gclid: null, wbraid: null, gbraid: null, fbclid: null,
		landing: '/comprar', ts: '2026-09-19T16:41:02.000Z',
	},
}

const SEM_ORIGEM: RespostaAtribuicao = {
	session_id: 'abc123def',
	ligacao: 'correlacao_clique_whatsapp',
	first_touch: null,
	last_touch: null,
}

describe('montarAvisoDeClique', () => {
	it('se identifica como aviso, não como lead', () => {
		// Se o receptor criar usuário ou card com isto, o mesmo lead entra duas
		// vezes: uma por aqui e outra pela entrada real do WhatsApp.
		const a = montarAvisoDeClique('c1', new Date('2026-09-19T16:42:11Z'), COM_ORIGEM, '/veiculo/x-988095', '988095')
		expect(a?.tipo).toBe('aviso_clique_site')
		expect(a?.versao).toBe(1)
	})

	it('leva a campanha do primeiro toque e o contexto do clique', () => {
		const a = montarAvisoDeClique('c1', new Date('2026-09-19T16:42:11Z'), COM_ORIGEM, '/veiculo/x-988095', '988095')
		expect(a?.first_touch?.campaign).toBe('[VA] Search | Estoque Premium')
		expect(a?.first_touch?.gclid).toBe('Cj0KCQjw')
		expect(a?.session_id).toBe('1784810859532-pupqonclbi')
		expect(a?.veiculo_id).toBe('988095')
		expect(a?.clique_em).toBe('2026-09-19T16:42:11.000Z')
	})

	it('o clique_id vai junto, para reentrega não duplicar a nota', () => {
		expect(montarAvisoDeClique('c1', new Date(), COM_ORIGEM, null, null)?.clique_id).toBe('c1')
	})

	it('aceita o Timestamp do Kysely, que não é Date', () => {
		const a = montarAvisoDeClique('c1', '2026-09-19T16:42:11.000Z', COM_ORIGEM, null, null)
		expect(a?.clique_em).toBe('2026-09-19T16:42:11.000Z')
	})

	it('não avisa quando não há origem nenhuma', () => {
		// "Chegou alguém, não sei de onde" não ajuda o CRM a decidir nada, e
		// ainda gasta uma nota que pode casar com a conversa errada.
		expect(montarAvisoDeClique('c1', new Date(), SEM_ORIGEM, null, null)).toBeNull()
		expect(montarAvisoDeClique('c1', new Date(), null, null, null)).toBeNull()
	})
})
