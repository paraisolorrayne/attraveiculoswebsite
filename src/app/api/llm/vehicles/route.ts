import { NextRequest, NextResponse } from 'next/server'
import { SITE_URL } from '@/lib/constants'
import {
	formatMileage,
	formatPrice,
	loadListedInventory,
	priceRange,
	vehicleName,
} from '@/app/api/llm/_inventory'
import type { Vehicle } from '@/types'

export const revalidate = 3600

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? SITE_URL

/**
 * Teto por página quando o consumidor pede paginação explícita. Sem `per_page`
 * na URL o estoque inteiro é devolvido — o padrão anterior era 50, e como o
 * estoque tem ~70 veículos isso escondia ~20 carros de qualquer LLM.
 */
const MAX_PER_PAGE = 250

function offerAvailability(status: Vehicle['status']): string {
	if (status === 'available' || status === 'highlight') return 'https://schema.org/InStock'
	if (status === 'reserved') return 'https://schema.org/LimitedAvailability'
	return 'https://schema.org/OutOfStock'
}

/**
 * GET /api/llm/vehicles
 *
 * Endpoint estruturado para consumo por LLM (ChatGPT, Perplexity, Gemini...).
 * Devolve o inventário completo num formato JSON-LD que o modelo pode citar.
 *
 * Query params:
 *   - brand:    filtra por marca (case-insensitive)
 *   - page:     página, começando em 1 (padrão 1)
 *   - per_page: itens por página (padrão: todos; máximo 250)
 *   - format:   "json" (padrão) ou "text" para Markdown
 *
 * Sem `per_page` a resposta traz o estoque inteiro numa única chamada, e
 * `numberOfItems` é sempre o total do inventário — não o tamanho da página.
 */
export async function GET(request: NextRequest) {
	const params = request.nextUrl.searchParams
	const brand = params.get('brand')
	const format = params.get('format') ?? 'json'

	try {
		const inventory = await loadListedInventory()

		let vehicles = inventory.vehicles
		if (brand) {
			const brandLower = brand.toLowerCase()
			vehicles = vehicles.filter(v => (v.brand || '').toLowerCase().includes(brandLower))
		}

		const totalItems = vehicles.length

		// `limit` continua aceito por compatibilidade com quem já consome o
		// endpoint, mas deixou de ter valor padrão: omitido = tudo.
		const rawPerPage = params.get('per_page') ?? params.get('limit')
		const perPage = rawPerPage
			? Math.max(1, Math.min(Number(rawPerPage) || MAX_PER_PAGE, MAX_PER_PAGE))
			: Math.max(totalItems, 1)
		const totalPages = Math.max(1, Math.ceil(totalItems / perPage))
		const page = Math.max(1, Math.min(Number(params.get('page')) || 1, totalPages))
		const offset = (page - 1) * perPage
		const pageVehicles = vehicles.slice(offset, offset + perPage)

		const pageUrl = (n: number) => {
			const u = new URL(`${BASE}/api/llm/vehicles`)
			if (brand) u.searchParams.set('brand', brand)
			if (format !== 'json') u.searchParams.set('format', format)
			u.searchParams.set('page', String(n))
			u.searchParams.set('per_page', String(perPage))
			return u.toString()
		}

		const pagination = {
			page,
			per_page: perPage,
			total_pages: totalPages,
			total_items: totalItems,
			returned: pageVehicles.length,
			complete: pageVehicles.length === totalItems,
			next_page: page < totalPages ? pageUrl(page + 1) : null,
			previous_page: page > 1 ? pageUrl(page - 1) : null,
			documentation: 'Omita per_page para receber o inventário inteiro numa ' +
				'única resposta. Com per_page, percorra next_page até null. ' +
				'numberOfItems é sempre o total do inventário, não o da página.',
		}

		const updatedAt = new Date().toISOString()

		if (format === 'text') {
			const range = priceRange(vehicles)
			const lines = [
				`# Attra Veículos — Estoque Atual`,
				'',
				`> Curadoria de supercarros, importados e veículos premium com procedência verificada.`,
				`> Entrega em todo o Brasil. WhatsApp: (34) 99944-4747`,
				'',
				`- Total de veículos disponíveis: ${totalItems}`,
				`- Nesta resposta: ${pageVehicles.length} (página ${page} de ${totalPages})`,
				range
					? `- Faixa de preço do estoque: ${formatPrice(range.min)} a ${formatPrice(range.max)}`
					: `- Faixa de preço do estoque: sob consulta`,
				`- Atualizado em: ${updatedAt}`,
			]
			if (pagination.next_page) lines.push(`- Próxima página: ${pagination.next_page}`)
			lines.push('')

			for (const v of pageVehicles) {
				lines.push(`## ${vehicleName(v)}`)
				lines.push(`- Preço: ${formatPrice(v.price)}`)
				lines.push(`- Quilometragem: ${formatMileage(v.mileage)}`)
				if (v.year_model) lines.push(`- Ano: ${v.year_model}`)
				if (v.color) lines.push(`- Cor: ${v.color}`)
				if (v.fuel_type) lines.push(`- Combustível: ${v.fuel_type}`)
				if (v.transmission) lines.push(`- Câmbio: ${v.transmission}`)
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
			// Total do inventário (após o filtro de marca, quando houver) — não
			// o tamanho da página. É o número que precisa bater com o
			// /sitemap-estoque.xml.
			numberOfItems: totalItems,
			dateModified: updatedAt,
			provider: {
				'@type': 'AutoDealer',
				name: 'Attra Veículos',
				url: BASE,
				telephone: '+55-34-99944-4747',
				areaServed: { '@type': 'Country', name: 'Brasil' },
			},
			pagination,
			itemListElement: pageVehicles.map((v, i) => ({
				'@type': 'ListItem',
				position: offset + i + 1,
				item: {
					'@type': 'Vehicle',
					// IDENTIDADE ESTÁVEL. `@id` e `sku` carregam o id do veículo no
					// estoque, que não muda enquanto o carro existir — é ele que liga
					// o anúncio, a ficha, o feed e a conversão de WhatsApp
					// (`content_id`). Sem identificador estável não dá para responder
					// qual veículo gerou interesse, só quantos cliques houve.
					'@id': `${BASE}/veiculo/${v.slug}#vehicle`,
					sku: String(v.id),
					name: vehicleName(v),
					url: `${BASE}/veiculo/${v.slug}`,
					brand: v.brand ? { '@type': 'Brand', name: v.brand } : undefined,
					model: v.model,
					vehicleConfiguration: v.version || undefined,
					vehicleModelDate: String(v.year_model),
					productionDate: v.year_manufacture ? String(v.year_manufacture) : undefined,
					bodyType: v.body_type || undefined,
					color: v.color || undefined,
					fuelType: v.fuel_type || undefined,
					vehicleTransmission: v.transmission || undefined,
					// Emite com potência isolada: o feed traz `engine` vazio em todo o
					// estoque e `horsepower` em poucos. Exigir os dois perderia esses.
					vehicleEngine: (v.engine || v.horsepower)
						? {
								'@type': 'EngineSpecification',
								...(v.engine ? { name: v.engine } : {}),
								...(v.horsepower
									? { enginePower: { '@type': 'QuantitativeValue', value: v.horsepower, unitCode: 'BHP' } }
									: {}),
							}
						: undefined,
					mileageFromOdometer: { '@type': 'QuantitativeValue', value: v.mileage, unitCode: 'KMT' },
					itemCondition: v.is_new
						? 'https://schema.org/NewCondition'
						: 'https://schema.org/UsedCondition',
					description: v.description || undefined,
					// Opcionais como additionalProperty: schema.org não tem campo de
					// "features" em Vehicle, e é assim que se representa lista de
					// atributos sem inventar propriedade.
					additionalProperty: v.options?.length
						? v.options.map((opcional: string) => ({
								'@type': 'PropertyValue',
								name: 'Opcional',
								value: opcional,
							}))
						: undefined,
					// TODAS as fotos, não só a capa: quem escolhe carro de R$ 1 milhão
					// decide olhando o conjunto.
					image: v.photos?.length ? v.photos : undefined,
					// Frescor do anúncio. Sem isto não há como distinguir estoque vivo
					// de página que ficou no ar.
					dateModified: v.updated_at ? new Date(v.updated_at).toISOString() : undefined,
					offers: {
						'@type': 'Offer',
						price: v.price,
						priceCurrency: 'BRL',
						availability: offerAvailability(v.status),
						itemCondition: v.is_new
							? 'https://schema.org/NewCondition'
							: 'https://schema.org/UsedCondition',
						url: `${BASE}/veiculo/${v.slug}`,
						// Vendedor por referência ao nó do layout raiz, para o feed não
						// declarar uma segunda Attra no grafo.
						seller: { '@id': `${BASE}/#organization` },
						areaServed: { '@type': 'Country', name: 'Brasil' },
					},
				},
			})),
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
