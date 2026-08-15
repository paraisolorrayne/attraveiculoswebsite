import { describe, it, expect } from 'vitest'
import {
	eventoDePagina,
	eventoDeClique,
	eventoDeSolicitacao,
} from '@/lib/analytics-marca'

describe('eventoDePagina', () => {
	it('usa um nome de evento distinto por tipo de página', () => {
		expect(eventoDePagina({ tipo: 'marca', caminho: '/ferrari' }).nome).toBe('brand_page_view')
		expect(eventoDePagina({ tipo: 'modelo', caminho: '/ferrari/roma' }).nome).toBe('model_page_view')
		expect(eventoDePagina({ tipo: 'categoria', caminho: '/superesportivos' }).nome).toBe('category_page_view')
	})

	it('carrega marca, modelo, categoria e página de origem', () => {
		const { params } = eventoDePagina({
			tipo: 'modelo',
			marca: 'Ferrari',
			modelo: 'Roma',
			categoria: 'superesportivo',
			caminho: '/ferrari/roma',
		})
		expect(params).toEqual({
			brand: 'Ferrari',
			model: 'Roma',
			category: 'superesportivo',
			source_page: '/ferrari/roma',
		})
	})

	// GA4 grava undefined como o literal "(not set)", que depois é lido como se
	// fosse um valor real. Ausente é mais honesto.
	it('omite campos vazios em vez de mandá-los nulos', () => {
		const { params } = eventoDePagina({
			tipo: 'marca',
			marca: 'Pagani',
			modelo: null,
			categoria: undefined,
			caminho: '/pagani',
		})
		expect(params).toEqual({ brand: 'Pagani', source_page: '/pagani' })
		expect('model' in params).toBe(false)
		expect('category' in params).toBe(false)
	})
})

describe('eventoDeClique', () => {
	// A razão de o evento existir: `view_vehicle` dispara na página do veículo,
	// quando a origem já se perdeu.
	it('preserva a página que originou o clique', () => {
		const { nome, params } = eventoDeClique(
			{ id: '123', marca: 'Ferrari', modelo: 'Roma', slug: 'ferrari-roma-2021' },
			{ tipo: 'categoria', categoria: 'superesportivo', caminho: '/superesportivos' },
		)
		expect(nome).toBe('vehicle_click')
		expect(params.source_page).toBe('/superesportivos')
		expect(params.vehicle_id).toBe('123')
	})

	// Em /superesportivos a marca do veículo e a da página divergem, e é
	// exatamente a divergência que o relatório precisa enxergar.
	it('separa a marca do veículo da marca da página', () => {
		const { params } = eventoDeClique(
			{ id: '9', marca: 'Lamborghini', modelo: 'Huracán' },
			{ tipo: 'marca', marca: 'Ferrari', caminho: '/ferrari' },
		)
		expect(params.brand).toBe('Lamborghini')
		expect(params.page_brand).toBe('Ferrari')
	})

	it('sobrevive a veículo sem dado nenhum além do id', () => {
		const { params } = eventoDeClique({ id: '7' }, { tipo: 'marca', caminho: '/porsche' })
		expect(params).toEqual({ vehicle_id: '7', source_page: '/porsche' })
	})
})

describe('eventoDeSolicitacao', () => {
	it('reporta o que foi enviado, não o que veio pré-preenchido', () => {
		const { nome, params } = eventoDeSolicitacao({
			marca: 'McLaren',      // usuário chegou por /ferrari e trocou a marca
			modelo: '720S',
			categoria: 'superesportivo',
			caminho: '/ferrari',
		})
		expect(nome).toBe('vehicle_request')
		expect(params.brand).toBe('McLaren')
		expect(params.source_page).toBe('/ferrari')
	})
})
