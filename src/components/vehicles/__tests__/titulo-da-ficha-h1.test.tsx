import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { TituloDaFicha } from '../titulo-da-ficha'
import type { Vehicle } from '@/types'

const f812 = {
	id: '1154688', brand: 'Ferrari', model: '812', version: 'GTS', year_manufacture: 2023, year_model: 2024,
	mileage: 5600, horsepower: null, transmission: 'Automático', fuel_type: 'Gasolina', price: 6300000,
} as unknown as Vehicle

/** O texto do h1 como o buscador lê do HTML: tags e comentários fora, SEM inventar espaço entre elas. */
function textoDoH1(html: string): string {
	const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? ''
	return h1.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

describe('h1 da ficha', () => {
	// 04/11/2026: os três spans vinham colados no HTML, "Ferrari812GTS • 2023/2024".
	// Na tela o CSS separa; no texto do documento as palavras grudavam.
	it('marca, modelo e versão saem separados no texto do h1', () => {
		expect(textoDoH1(renderToStaticMarkup(<TituloDaFicha vehicle={f812} />))).toBe('Ferrari 812 GTS • 2023/2024')
	})
})
