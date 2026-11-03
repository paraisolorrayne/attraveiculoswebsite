import { describe, it, expect } from 'vitest'
import { destinoDoVendido, slugDaAutoConf, vendidoHaMuitoTempo } from '@/lib/veiculos-publicados'

describe('destinoDoVendido', () => {
	it('manda para a página da marca pelo começo do slug', () => {
		expect(destinoDoVendido('porsche-911-2019-950539')).toBe('/comprar/porsche')
		expect(destinoDoVendido('land-rover-defender-2024-981234')).toBe('/comprar/land-rover')
		expect(destinoDoVendido('aston-martin-dbx-2023-970001')).toBe('/comprar/aston-martin')
	})

	it('entende a marca como a AutoConf escreve no slug', () => {
		expect(destinoDoVendido('mercedes-g-63-2019-989248')).toBe('/comprar/mercedes-benz')
		expect(destinoDoVendido('range-rover-sport-2022-960000')).toBe('/comprar/land-rover')
	})

	it('prefere a marca do registro quando o slug não a traz', () => {
		expect(destinoDoVendido('812-2024-995000', 'Ferrari')).toBe('/comprar/ferrari')
		expect(destinoDoVendido('gle-63s-2023-990000', 'Mercedes-Benz')).toBe('/comprar/mercedes-benz')
	})

	it('marca sem página vai para o estoque', () => {
		expect(destinoDoVendido('toyota-hilux-2025-990001', 'Toyota')).toBe('/veiculos')
		expect(destinoDoVendido('ram-3500-2024-990002')).toBe('/veiculos')
	})
})

describe('slugDaAutoConf', () => {
	it('aceita marca-modelo-ano-id', () => {
		expect(slugDaAutoConf('porsche-911-2019-950539')).toBe(true)
		expect(slugDaAutoConf('812-2024-995000')).toBe(true)
	})

	it('recusa o que não tem ano e id: slug inventado segue 404', () => {
		expect(slugDaAutoConf('xxxxx')).toBe(false)
		expect(slugDaAutoConf('porsche-911')).toBe(false)
		expect(slugDaAutoConf('porsche-911-2019')).toBe(false)
		expect(slugDaAutoConf('porsche-911-2019-12')).toBe(false)
		expect(slugDaAutoConf('Porsche-911-2019-950539')).toBe(false)
	})
})

describe('vendidoHaMuitoTempo', () => {
	const agora = new Date('2026-11-02T12:00:00Z')
	it('até 90 dias a ficha fica no ar', () => {
		expect(vendidoHaMuitoTempo(new Date('2026-08-05T12:00:00Z'), agora)).toBe(false)
	})
	it('depois de 90 dias, redirect', () => {
		expect(vendidoHaMuitoTempo(new Date('2026-08-03T12:00:00Z'), agora)).toBe(true)
	})
})
