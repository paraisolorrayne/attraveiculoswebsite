/**
 * Campanha informada pelo CRM no card (caminho 2 do spec da área da agência).
 * Caso real (14/10): Nilton Blaese, anúncio do Instagram da Media House que
 * abre o WhatsApp direto; o painel dizia "Ainda não há lead com vendedor para
 * relacionar" porque só olhava visitas do site.
 */
import { describe, it, expect } from 'vitest'
import { campanhaDoCard, campanhaEhDaAgencia } from '@/lib/visitors/consultas/leads-agencia'

const MH = { prefixos: ['[va]', 'va-', ''], ids_campanha: ['120250000000000001'] }

describe('campanhaDoCard', () => {
	it('lê nome e id de origem_detalhe', () => {
		expect(campanhaDoCard({ origem_detalhe: { canal: 'meta_whatsapp_direto', campanha_nome: ' [VA][MediaHouse][Leads][Whatsapp] Nucleo ', campanha_id: '120250000000000001' } }))
			.toEqual({ nome: '[VA][MediaHouse][Leads][Whatsapp] Nucleo', id: '120250000000000001' })
	})

	it('sem campanha resolvida (só o anúncio) não há campanha', () => {
		expect(campanhaDoCard({ origem_detalhe: { canal: 'meta_whatsapp_direto', referral: { source_id: '1' }, campanha_nome: null } })).toBeNull()
		expect(campanhaDoCard({})).toBeNull()
		expect(campanhaDoCard(null)).toBeNull()
		expect(campanhaDoCard({ origem_detalhe: 'texto' })).toBeNull()
	})
})

describe('campanhaEhDaAgencia', () => {
	it('prefixo da agência no começo do nome, sem caixa', () => {
		expect(campanhaEhDaAgencia({ nome: '[VA][MediaHouse][Leads][Whatsapp] Nucleo', id: null }, MH)).toBe(true)
	})

	it('campanha de outra agência não é da Media House', () => {
		expect(campanhaEhDaAgencia({ nome: '[EB] [WPP] | Loja Rondon', id: '9' }, MH)).toBe(false)
	})

	it('prefixo no meio do nome não conta (só no começo)', () => {
		expect(campanhaEhDaAgencia({ nome: 'nova-colecao-va-', id: null }, MH)).toBe(false)
	})

	it('casa pelo id da campanha', () => {
		expect(campanhaEhDaAgencia({ nome: null, id: '120250000000000001' }, MH)).toBe(true)
	})

	it('item vazio na lista não abre tudo', () => {
		expect(campanhaEhDaAgencia({ nome: 'qualquer', id: '' }, { prefixos: [''], ids_campanha: [' '] })).toBe(false)
	})
})
