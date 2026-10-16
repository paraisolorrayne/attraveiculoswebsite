/**
 * Lead que veio do anúncio da Meta direto para o WhatsApp não passa pelo site,
 * então não tem visita para ligar. A Fykos manda a campanha do anúncio no card
 * (`dados.origem_detalhe`), e é por ela que o lead entra na área da agência.
 *
 * Caso de 16/10: os 6 leads da Media House que foram ao vendedor estavam no
 * CRM, com a campanha no card, e a aba Leads da Media House não mostrava nenhum.
 */
import { describe, it, expect } from 'vitest'
import { toqueDoAnuncioMeta } from '@/lib/agencias/anuncio-meta'

const MH = { nome: 'Media House', prefixos: ['%5bva%5d', '[va]', 'va-'], ids_campanha: ['120250000000000001'] }

const card = (origem: Record<string, unknown> | null) => (origem ? { origem_detalhe: origem } : {})

describe('toqueDoAnuncioMeta', () => {
	it('campanha da Media House pelo prefixo entra, com a plataforma do card', () => {
		const t = toqueDoAnuncioMeta(card({ campanha_nome: '[VA][MediaHouse][Leads][Whatsapp][Catalogo]', plataforma: 'meta', canal: 'meta_whatsapp_direto' }), MH, {})
		expect(t).toEqual({ campanha: '[VA][MediaHouse][Leads][Whatsapp][Catalogo]', plataforma: 'meta' })
	})

	it('campanha sem prefixo, mas com a agência no card, entra', () => {
		const t = toqueDoAnuncioMeta(card({ campanha_nome: 'Campanha nova', agencia: 'Media House', plataforma: 'meta' }), MH, {})
		expect(t?.campanha).toBe('Campanha nova')
	})

	it('campanha de outra agência não entra', () => {
		expect(toqueDoAnuncioMeta(card({ campanha_nome: '[EB] [WPP] | Loja Rondon', agencia: 'EB', plataforma: 'meta' }), MH, {})).toBeNull()
	})

	it('card sem campanha não entra', () => {
		expect(toqueDoAnuncioMeta(card(null), MH, {})).toBeNull()
		expect(toqueDoAnuncioMeta(card({ agencia: 'Media House', plataforma: 'meta' }), MH, {})).toBeNull()
	})

	it('prefixo no meio do nome não conta (só no começo)', () => {
		expect(toqueDoAnuncioMeta(card({ campanha_nome: 'nova-colecao-va-', plataforma: 'meta' }), MH, {})).toBeNull()
	})

	it('casa pelo id da campanha, como o utm_id da visita; sem nome, aparece pelo id', () => {
		const t = toqueDoAnuncioMeta(card({ campanha_nome: 'Sem padrão', campanha_id: ' 120250000000000001 ', plataforma: 'meta' }), MH, {})
		expect(t?.campanha).toBe('Sem padrão')
		expect(toqueDoAnuncioMeta(card({ campanha_id: '120250000000000001', plataforma: 'meta' }), MH, {})?.campanha).toBe('120250000000000001')
		expect(toqueDoAnuncioMeta(card({ campanha_nome: 'Sem padrão', campanha_id: '9', plataforma: 'meta' }), MH, {})).toBeNull()
	})

	it('prefixo ou id vazio na lista não abre tudo', () => {
		const vazia = { nome: 'X', prefixos: ['', '  '], ids_campanha: [' '] }
		expect(toqueDoAnuncioMeta(card({ campanha_nome: 'qualquer', plataforma: 'meta' }), vazia, {})).toBeNull()
		expect(toqueDoAnuncioMeta(card({ campanha_nome: 'qualquer', campanha_id: '', plataforma: 'meta' }), vazia, {})).toBeNull()
	})

	it('respeita o filtro de plataforma e de campanha da tela', () => {
		const c = card({ campanha_nome: '[VA][MediaHouse][FORM][Leads][Whatsapp]', plataforma: 'meta' })
		expect(toqueDoAnuncioMeta(c, MH, { plataforma: 'google' })).toBeNull()
		expect(toqueDoAnuncioMeta(c, MH, { plataforma: 'meta' })).not.toBeNull()
		expect(toqueDoAnuncioMeta(c, MH, { campanhas: ['outra'] })).toBeNull()
		expect(toqueDoAnuncioMeta(c, MH, { campanhas: [' [va][mediahouse][form][leads][whatsapp] '] })).not.toBeNull()
	})

	it('sem agência (visão de tudo), qualquer campanha de anúncio entra', () => {
		expect(toqueDoAnuncioMeta(card({ campanha_nome: '[EB] [WPP] | Loja Rondon', plataforma: 'meta' }), null, {})?.campanha).toBe('[EB] [WPP] | Loja Rondon')
	})
})
