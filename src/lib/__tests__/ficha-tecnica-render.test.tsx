import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { VehicleSpecsFallback } from '@/components/vehicles/vehicle-specs-fallback'
import { lerFichaDoAnuncio } from '@/lib/ficha-do-anuncio'
import type { Vehicle } from '@/types'

const s63 = {
	id: '1142317', slug: 'mercedes-benz-s-63-2025-1142317', brand: 'Mercedes-Benz', model: 'S 63',
	version: 'AMG E Performance', year_manufacture: 2025, year_model: 2025, color: 'Prata', mileage: 1200,
	fuel_type: 'Híbrido', transmission: 'Automático', body_type: 'Sedã', engine: null, horsepower: null,
	torque: null, acceleration: null, top_speed: null, ficha: null,
} as unknown as Vehicle

const texto = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

describe('Ficha técnica da página com o molde da AutoConf', () => {
	it('mostra os campos do molde e os diferenciais, e a cor do molde vence a do cadastro', () => {
		const ficha = lerFichaDoAnuncio({
			descricao: 'MOTOR: 4.0 V8 Biturbo Híbrido\nPOTÊNCIA: 802 cv\nTORQUE: 145,8 kgfm\nTRAÇÃO: Integral 4MATIC+\n'
				+ 'COR: Prata High-Tech Metálico\nINTERIOR: Preto\nSOM: Burmester\n'
				+ 'DIFERENCIAIS:\nBlindado BSS com vidros Graphene Full Steel\nAcabamentos em fibra de carbono',
		})
		const html = texto(renderToStaticMarkup(<VehicleSpecsFallback vehicle={{ ...s63, ficha }} />))
		expect(html).toContain('Motor 4.0 V8 Biturbo Híbrido')
		expect(html).toContain('Potência 802 cv')
		expect(html).toContain('Torque 145,8 kgfm')
		expect(html).toContain('Câmbio Automático')
		expect(html).toContain('Tração Integral 4MATIC+')
		expect(html).toContain('Cor Prata High-Tech Metálico')
		expect(html).toContain('Interior Preto')
		expect(html).toContain('Som Burmester')
		expect(html).toContain('Diferenciais Blindado BSS com vidros Graphene Full Steel Acabamentos em fibra de carbono')
		expect(html).not.toContain('Cor Prata Carroceria')
	})

	it('sem molde, a ficha fica como era', () => {
		const html = texto(renderToStaticMarkup(<VehicleSpecsFallback vehicle={s63} />))
		expect(html).toContain('Câmbio Automático')
		expect(html).toContain('Cor Prata')
		expect(html).not.toContain('Diferenciais')
		expect(html).not.toContain('Tração')
	})
})
