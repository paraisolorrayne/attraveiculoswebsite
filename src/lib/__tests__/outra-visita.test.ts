import { describe, expect, it } from 'vitest'
import { descreverOutraVisita } from '@/app/admin/visitors/sessoes/[id]/outra-visita'

describe('descreverOutraVisita', () => {
	it('visita de campanha mostra fonte e campanha, com link', () => {
		expect(
			descreverOutraVisita({ rotulo_fonte: 'Google Ads', campanha: 'va-search-ferrari', origem_de_fora: false, atual: false }),
		).toEqual({ origem: 'Google Ads · va-search-ferrari', abreDetalhe: true })
	})

	it('sem campanha mostra só a fonte', () => {
		expect(
			descreverOutraVisita({ rotulo_fonte: 'Direto', campanha: '(sem campanha)', origem_de_fora: false, atual: false }),
		).toEqual({ origem: 'Direto', abreDetalhe: true })
	})

	it('visita de fora (agência) diz "outra origem", sem "null" e sem link para um 404', () => {
		expect(
			descreverOutraVisita({ rotulo_fonte: null, campanha: null, origem_de_fora: true, atual: false }),
		).toEqual({ origem: 'outra origem', abreDetalhe: false })
	})

	it('a visita atual não vira link', () => {
		expect(
			descreverOutraVisita({ rotulo_fonte: 'Meta Ads', campanha: '(sem campanha)', origem_de_fora: false, atual: true }).abreDetalhe,
		).toBe(false)
	})
})
