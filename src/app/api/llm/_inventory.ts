/**
 * Fonte única de estoque para os ativos consumidos por LLM
 * (`/api/llm/vehicles`, `/api/vehicles/search` e `llms.txt`).
 *
 * Existe porque os três liam o estoque de formas diferentes e cada um chegava a
 * uma contagem diferente: a auditoria de 01/08/2026 mediu `numberOfItems: 50`
 * no feed enquanto o sitemap declarava 70 veículos. Um LLM que cruza as duas
 * fontes conclui que a Attra tem menos carro do que tem.
 *
 * Não é um arquivo de rota: o Next só trata `route.ts` como endpoint, então
 * este módulo pode morar dentro de `app/` sem virar URL pública.
 */

import { getVehicles } from '@/lib/autoconf-api'
import type { Vehicle } from '@/types'

/** Tamanho de página pedido à AutoConf. */
const PAGE_SIZE = 200

/**
 * Teto de páginas percorridas. A AutoConf pode ignorar `pagina` e devolver
 * sempre a primeira; sem teto isso vira laço infinito em produção.
 */
const MAX_PAGES = 10

export interface FullInventory {
	/** Veículos únicos, na ordem em que a fonte devolveu. */
	vehicles: Vehicle[]
	/** Total declarado pela fonte (campo `count` da AutoConf). */
	sourceTotal: number
	pagesFetched: number
	/** true quando o teto de páginas foi atingido antes de esgotar a fonte. */
	truncated: boolean
}

/** Um veículo só é citável por um LLM se estiver de fato à venda. */
export function isPubliclyListed(vehicle: Vehicle): boolean {
	return vehicle.status === 'available' || vehicle.status === 'highlight'
}

/**
 * Carrega o estoque inteiro, percorrendo todas as páginas da fonte.
 *
 * `getVehicles` já tem cascata própria de fallback (AutoConf → snapshot no
 * Postgres → JSON empacotado), então esta função nunca fica sem resposta —
 * mas pode devolver menos veículos do que a produção quando roda sem as
 * credenciais da AutoConf.
 */
export async function loadFullInventory(): Promise<FullInventory> {
	const seen = new Set<string>()
	const vehicles: Vehicle[] = []
	let sourceTotal = 0
	let pagesFetched = 0
	let page = 1

	for (; page <= MAX_PAGES; page++) {
		const result = await getVehicles({
			tipo: 'carros',
			pagina: page,
			registros_por_pagina: PAGE_SIZE,
		})
		pagesFetched++

		sourceTotal = Math.max(sourceTotal, result.total ?? 0)

		let added = 0
		for (const vehicle of result.vehicles) {
			if (seen.has(vehicle.id)) continue
			seen.add(vehicle.id)
			vehicles.push(vehicle)
			added++
		}

		// Página vazia, página repetida (fonte ignorou `pagina`) ou última
		// página declarada: não há mais o que buscar.
		if (added === 0) break
		if (page >= (result.totalPages ?? 1)) break
	}

	return {
		vehicles,
		// A fonte às vezes reporta um `count` menor que o número de linhas que
		// devolve; o que vale para um LLM é o que dá pra citar.
		sourceTotal: Math.max(sourceTotal, vehicles.length),
		pagesFetched,
		truncated: page > MAX_PAGES,
	}
}

/** Carrega só o que está efetivamente à venda. */
export async function loadListedInventory(): Promise<FullInventory> {
	const inventory = await loadFullInventory()
	const listed = inventory.vehicles.filter(isPubliclyListed)
	return { ...inventory, vehicles: listed, sourceTotal: listed.length }
}

/** Nome comercial completo, do jeito que um LLM deve citar. */
export function vehicleName(vehicle: Vehicle): string {
	return [vehicle.brand, vehicle.model, vehicle.version, vehicle.year_model]
		.filter(Boolean)
		.join(' ')
}

/**
 * Preço em texto. Preço zero na AutoConf significa "não publicado", não
 * "de graça" — declarar R$ 0 seria dado errado repetido por um modelo.
 */
export function formatPrice(price: number): string {
	return price > 0 ? `R$ ${price.toLocaleString('pt-BR')}` : 'Sob consulta'
}

export function formatMileage(mileage: number): string {
	return mileage > 0 ? `${mileage.toLocaleString('pt-BR')} km` : '0 km'
}

/** Faixa de preço do estoque, ignorando os veículos sem preço publicado. */
export function priceRange(vehicles: Vehicle[]): { min: number; max: number } | null {
	const prices = vehicles.map(v => v.price).filter(p => p > 0)
	if (prices.length === 0) return null
	return { min: Math.min(...prices), max: Math.max(...prices) }
}
