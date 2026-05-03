import { NextRequest, NextResponse } from 'next/server'
import { getVehicles } from '@/lib/autoconf-api'
import { SITE_URL } from '@/lib/constants'

export const revalidate = 3600

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? SITE_URL

/**
 * GET /api/llm/vehicles
 *
 * Structured endpoint optimised for LLM consumption (ChatGPT, Perplexity,
 * Gemini, etc.). Returns the full inventory in a clean JSON-LD-like format
 * that LLMs can ingest and cite directly.
 *
 * Query params:
 *   - brand: filter by brand name (case-insensitive)
 *   - limit: max results (default 50, max 200)
 *   - format: "json" (default) or "text" for Markdown
 */
export async function GET(request: NextRequest) {
	const brand = request.nextUrl.searchParams.get('brand')
	const limit = Math.min(Number(request.nextUrl.searchParams.get('limit') ?? 50) || 50, 200)
	const format = request.nextUrl.searchParams.get('format') ?? 'json'

	try {
		const result = await getVehicles({
			tipo: 'carros',
			registros_por_pagina: 200,
		})

		let vehicles = result.vehicles.filter(v => v.status === 'available' || v.status === 'highlight')

		if (brand) {
			const brandLower = brand.toLowerCase()
			vehicles = vehicles.filter(v => (v.brand || '').toLowerCase().includes(brandLower))
		}

		vehicles = vehicles.slice(0, limit)

		if (format === 'text') {
			const lines = [
				`# Attra Veículos — Estoque Atual (${vehicles.length} veículos)`,
				'',
				'> Curadoria de supercarros, importados e veículos premium com procedência verificada.',
				'> Entrega em todo o Brasil. WhatsApp: (34) 99944-4747',
				'',
			]

			for (const v of vehicles) {
				const name = [v.brand, v.model, v.version, v.year_model].filter(Boolean).join(' ')
				const price = v.price > 0 ? `R$ ${v.price.toLocaleString('pt-BR')}` : 'Sob consulta'
				const km = v.mileage === 0 ? '0 km' : `${v.mileage.toLocaleString('pt-BR')} km`
				lines.push(`## ${name}`)
				lines.push(`- Preço: ${price}`)
				lines.push(`- Quilometragem: ${km}`)
				if (v.color) lines.push(`- Cor: ${v.color}`)
				if (v.fuel_type) lines.push(`- Combustível: ${v.fuel_type}`)
				if (v.engine) lines.push(`- Motor: ${v.engine}`)
				if (v.horsepower) lines.push(`- Potência: ${v.horsepower} cv`)
				lines.push(`- Link: ${BASE}/veiculo/${v.slug}`)
				lines.push('')
			}

			return new Response(lines.join('\n'), {
				headers: {
					'Content-Type': 'text/plain; charset=utf-8',
					'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
				},
			})
		}

		const structured = {
			'@context': 'https://schema.org',
			'@type': 'ItemList',
			name: 'Attra Veículos — Estoque de Supercarros e Veículos Premium',
			description: 'Curadoria de supercarros, importados e veículos premium com procedência verificada. Entrega em todo o Brasil.',
			url: `${BASE}/veiculos`,
			numberOfItems: vehicles.length,
			provider: {
				'@type': 'AutoDealer',
				name: 'Attra Veículos',
				url: BASE,
				telephone: '+55-34-99944-4747',
				areaServed: { '@type': 'Country', name: 'Brasil' },
			},
			itemListElement: vehicles.map((v, i) => {
				const name = [v.brand, v.model, v.version, v.year_model].filter(Boolean).join(' ')
				return {
					'@type': 'ListItem',
					position: i + 1,
					item: {
						'@type': 'Vehicle',
						name,
						url: `${BASE}/veiculo/${v.slug}`,
						brand: v.brand ? { '@type': 'Brand', name: v.brand } : undefined,
						model: v.model,
						vehicleModelDate: String(v.year_model),
						color: v.color || undefined,
						fuelType: v.fuel_type || undefined,
						vehicleEngine: v.engine ? { '@type': 'EngineSpecification', name: v.engine } : undefined,
						mileageFromOdometer: { '@type': 'QuantitativeValue', value: v.mileage, unitCode: 'KMT' },
						image: v.photos?.[0],
						offers: {
							'@type': 'Offer',
							price: v.price,
							priceCurrency: 'BRL',
							availability: v.status === 'available' || v.status === 'highlight'
								? 'https://schema.org/InStock'
								: v.status === 'reserved'
									? 'https://schema.org/LimitedAvailability'
									: 'https://schema.org/OutOfStock',
						},
					},
				}
			}),
		}

		return NextResponse.json(structured, {
			headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
		})
	} catch (err) {
		console.error('LLM vehicles endpoint failed:', err)
		return NextResponse.json(
			{ error: err instanceof Error ? err.message : 'Failed to load inventory' },
			{ status: 500 },
		)
	}
}
