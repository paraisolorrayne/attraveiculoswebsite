/**
 * Vehicle picker for AI-generated blog posts.
 *
 * Responsibilities:
 * - Fetch eligible cars from AutoConf (> R$300k)
 * - Avoid re-using cars that appeared in ANY AI post recently (review or comparison)
 * - Never review the same car twice, never repeat a comparison pair
 * - Pair similar cars for "comparison" posts, rotating through every possible pair
 * - Best-effort match of a car name (from IG caption) to inventory
 */

import type { Vehicle } from '@/types'
import {
  fetchAutoConfVehicles,
  mapAutoConfToVehicle,
  type AutoConfVehicle,
} from '@/lib/autoconf-api'
import { db } from '@/lib/db'

// DB migrado supabase-js → Kysely (ver docs/MIGRACAO_POSTGRES_PURO.md).

export const REVIEW_MIN_PRICE = 300_000

/**
 * Carros que já apareceram em post gerado por IA nos últimos `days` dias —
 * em REVIEW ou em COMPARATIVO.
 *
 * Até 26/08/2026 só os reviews contavam (lia-se `car_review.brand|model` dos
 * posts), e comparativo é `post_type: 'educativo'`, sem `car_review`. Os
 * carros de comparativos nunca entravam na exclusão, e o par
 * Ferrari 296 GTS × McLaren GTS saiu quatro vezes em dez dias. Os comparativos
 * ficam registrados em `blog_ai_generations.source` como ids de veículo; o id
 * é estável na AutoConf, então basta mapear id → marca|modelo pelo estoque
 * elegível de hoje (carro que saiu do estoque some da exclusão — e também do
 * sorteio, então tanto faz).
 */
export function chavesUsadasRecentemente(params: {
	reviews: Array<{ brand?: string | null; model?: string | null }>
	comparativos: Array<{ vehicle_a_id?: string | null; vehicle_b_id?: string | null }>
	elegiveis: Vehicle[]
}): Set<string> {
	const usados = new Set<string>()
	for (const r of params.reviews) {
		if (r.brand && r.model) usados.add(`${r.brand}|${r.model}`.toLowerCase())
	}
	const porId = new Map(params.elegiveis.map((v) => [v.id, vehicleKey(v)]))
	for (const c of params.comparativos) {
		for (const id of [c.vehicle_a_id, c.vehicle_b_id]) {
			const key = id ? porId.get(id) : undefined
			if (key) usados.add(key)
		}
	}
	return usados
}

async function usadosRecentemente(elegiveis: Vehicle[], days = 60): Promise<Set<string>> {
	try {
		const since = new Date(Date.now() - days * 86_400_000)
		const [reviews, comparativos] = await Promise.all([
			db.selectFrom('dual_blog_posts')
				.select(['car_review'])
				.where('published_date', '>=', since)
				.execute(),
			db.selectFrom('blog_ai_generations')
				.select(['source'])
				.where('strategy', '=', 'comparison')
				.where('success', '=', true)
				.where('run_at', '>=', since)
				.execute(),
		])
		return chavesUsadasRecentemente({
			reviews: reviews.map((r) => (r.car_review as { brand?: string; model?: string } | null) ?? {}),
			comparativos: comparativos.map((c) => (c.source as { vehicle_a_id?: string; vehicle_b_id?: string } | null) ?? {}),
			elegiveis,
		})
	} catch {
		return new Set()
	}
}

/**
 * Chaves de um exemplar: o id da AutoConf e marca|modelo|ano|cor.
 *
 * A janela de 60 dias acima só ordena a preferência; ela não impede repetição.
 * Com ~35 carros elegíveis e um review a cada dois dias (os comparativos gastam
 * mais dois carros), o estoque "inédito" acabava e o sorteio voltava ao pool
 * inteiro — e carro parado no pátio por mais de 60 dias voltava de qualquer
 * jeito. Em 13/10/2026 havia 3 reviews do mesmo Corvette Z06 preto, 2 do mesmo
 * 911 Turbo S rosa (id 993322, 23 dias de intervalo) e 2 do mesmo RAM 1500:
 * páginas quase iguais disputando a mesma busca.
 *
 * O id sozinho não basta: o mesmo carro já apareceu duas vezes na AutoConf com
 * ids diferentes (mesma km, mesmo preço). Marca|modelo|ano|cor pega o
 * recadastro; dois exemplares diferentes com tudo isso igual dariam, de
 * qualquer forma, dois posts indistinguíveis.
 */
export function chavesDoExemplar(c: {
	id?: string | null
	brand?: string | null
	model?: string | null
	year?: number | string | null
	color?: string | null
}): string[] {
	const chaves: string[] = []
	if (c.id) chaves.push(`id:${c.id}`)
	if (c.brand && c.model && c.year) {
		chaves.push(`exemplar:${[c.brand, c.model, c.year, c.color ?? ''].join('|').toLowerCase().trim()}`)
	}
	return chaves
}

function chavesDoVeiculo(v: Vehicle): string[] {
	return chavesDoExemplar({ id: v.id, brand: v.brand, model: v.model, year: v.year_model, color: v.color })
}

export function jaResenhado(v: Vehicle, resenhados: Set<string>): boolean {
	return chavesDoVeiculo(v).some((k) => resenhados.has(k))
}

/** Todo carro que já tem review, em qualquer data — publicado ou não. */
export async function exemplaresJaResenhados(): Promise<Set<string>> {
	const linhas = await db.selectFrom('dual_blog_posts')
		.select(['car_review'])
		.where('post_type', '=', 'car_review')
		.execute()
	const chaves = new Set<string>()
	for (const l of linhas) {
		const cr = (l.car_review ?? {}) as {
			vehicle_id?: string; brand?: string; model?: string; year?: number; color?: string
		}
		for (const k of chavesDoExemplar({ id: cr.vehicle_id, ...cr })) chaves.add(k)
	}
	return chaves
}

/** Par de comparativo sem ordem: "McLaren GTS vs Ferrari 296 GTS" é o mesmo post. */
export function chaveDoPar(a: string, b: string): string {
	return [a, b].sort().join(' vs ')
}

/**
 * Pares já publicados, em qualquer data. Comparativos novos gravam as chaves
 * marca|modelo no `source`; os antigos só têm os ids, resolvidos pelo estoque
 * elegível de hoje (par com carro que já saiu não pode ser sorteado mesmo).
 */
export function paresJaFeitos(
	comparativos: Array<{
		vehicle_a_id?: string | null; vehicle_b_id?: string | null
		vehicle_a_key?: string | null; vehicle_b_key?: string | null
	}>,
	elegiveis: Vehicle[],
): Set<string> {
	const porId = new Map(elegiveis.map((v) => [v.id, vehicleKey(v)]))
	const pares = new Set<string>()
	for (const c of comparativos) {
		const a = c.vehicle_a_key ?? (c.vehicle_a_id ? porId.get(c.vehicle_a_id) : undefined)
		const b = c.vehicle_b_key ?? (c.vehicle_b_id ? porId.get(c.vehicle_b_id) : undefined)
		if (a && b) pares.add(chaveDoPar(a, b))
	}
	return pares
}

async function comparativosFeitos(elegiveis: Vehicle[]): Promise<Set<string>> {
	const linhas = await db.selectFrom('blog_ai_generations')
		.select(['source'])
		.where('strategy', '=', 'comparison')
		.where('success', '=', true)
		.execute()
	return paresJaFeitos(linhas.map((l) => (l.source ?? {}) as Record<string, string>), elegiveis)
}

/** Quantos posts de uma estratégia já saíram — o índice de rotação do sorteio. */
async function rodadasDaEstrategia(strategy: 'review' | 'comparison'): Promise<number> {
	try {
		const r = await db.selectFrom('blog_ai_generations')
			.select(({ fn }) => fn.countAll<number>().as('n'))
			.where('strategy', '=', strategy)
			.where('success', '=', true)
			.executeTakeFirst()
		return Number(r?.n ?? 0)
	} catch {
		return Math.floor(Date.now() / 86_400_000)
	}
}

export function vehicleKey(v: Vehicle): string {
	return `${v.brand}|${v.model}`.toLowerCase()
}

/**
 * Fetch eligible vehicles from AutoConf priced above `minPrice`, mapped to our
 * internal `Vehicle` shape. Returns a sorted list (most expensive first).
 */
export async function getEligibleVehicles(
	minPrice = REVIEW_MIN_PRICE
): Promise<Vehicle[]> {
	const response = await fetchAutoConfVehicles({
		tipo: 'carros',
		registros_por_pagina: 100,
		preco_de: minPrice,
		ordenar: 'preco',
		ordem: 'desc',
	})

	const vehicles = response.veiculos
		.map(mapAutoConfToVehicle)
		.filter((v) => v.price >= minPrice)
		.filter((v) => (v.photos?.length ?? 0) > 0)

	return vehicles
}

/**
 * Escolha pura do carro do review. Carro que já tem review está fora, sem
 * exceção (ver `chavesDoExemplar`); sem carro inédito, devolve null e o job
 * tenta o comparativo. Entre os inéditos, prefere quem não apareceu nos
 * últimos 60 dias; `indice` rotaciona (é o número de reviews já feitos, não o
 * dia — o dia pulava de dois em dois e visitava metade do pool).
 */
export function escolherVeiculoParaReview(
	elegiveis: Vehicle[],
	usados: Set<string>,
	indice: number,
	resenhados: Set<string> = new Set()
): Vehicle | null {
	const ineditos = elegiveis.filter((v) => !jaResenhado(v, resenhados))
	if (ineditos.length === 0) return null
	const fresh = ineditos.filter((v) => !usados.has(vehicleKey(v)))
	const pool = fresh.length > 0 ? fresh : ineditos
	return pool[Math.abs(indice) % pool.length]
}

/**
 * Pick a single vehicle for a `car_review` post: a car that was never
 * reviewed, preferring models we haven't written about in the last 60 days.
 */
export async function pickVehicleForReview(): Promise<Vehicle | null> {
	const eligible = await getEligibleVehicles()
	if (eligible.length === 0) return null
	const [usados, rodada, resenhados] = await Promise.all([
		usadosRecentemente(eligible), rodadasDaEstrategia('review'), exemplaresJaResenhados(),
	])
	return escolherVeiculoParaReview(eligible, usados, rodada, resenhados)
}

/**
 * Escolha pura do par do comparativo.
 *
 * Todos os pares possíveis da mesma categoria entram na roda, e `indice`
 * (número de comparativos já feitos) escolhe um. Antes, o segundo carro era
 * sempre "o primeiro diferente do escolhido" — ou seja, o mais caro da
 * categoria mais cara — e a Ferrari 296 estava em todo par. Carros usados nos
 * últimos 60 dias ficam fora enquanto sobrar par inédito com os demais; sem
 * categoria com dois modelos, o par é o de preço mais próximo. Par já
 * publicado (em qualquer ordem, em qualquer data) nunca volta: sem par inédito,
 * devolve null.
 */
export function escolherParParaComparativo(
	elegiveis: Vehicle[],
	usados: Set<string>,
	indice: number,
	feitos: Set<string> = new Set()
): [Vehicle, Vehicle] | null {
	const distinct = dedupeByBrandModel(elegiveis)
	if (distinct.length < 2) return null
	const fresh = distinct.filter((v) => !usados.has(vehicleKey(v)))
	const pares = paresIneditos(fresh, feitos)
	const pool = pares.length > 0 ? pares : paresIneditos(distinct, feitos)
	if (pool.length === 0) return null
	return pool[Math.abs(indice) % pool.length]
}

function paresIneditos(pool: Vehicle[], feitos: Set<string>): Array<[Vehicle, Vehicle]> {
	const novo = (a: Vehicle, b: Vehicle) => !feitos.has(chaveDoPar(vehicleKey(a), vehicleKey(b)))
	const pares: Array<[Vehicle, Vehicle]> = []
	for (let i = 0; i < pool.length; i++) {
		for (let j = i + 1; j < pool.length; j++) {
			if (pool[i].category === pool[j].category && novo(pool[i], pool[j])) pares.push([pool[i], pool[j]])
		}
	}
	if (pares.length === 0) {
		for (let i = 0; i < pool.length; i++) {
			for (let j = i + 1; j < pool.length; j++) if (novo(pool[i], pool[j])) pares.push([pool[i], pool[j]])
		}
		pares.sort((p, q) => Math.abs(p[0].price - p[1].price) - Math.abs(q[0].price - q[1].price))
	}
	return pares
}

/**
 * Pick two vehicles for a comparison post (a pair never published before).
 */
export async function pickVehiclesForComparison(): Promise<
	[Vehicle, Vehicle] | null
> {
	const eligible = await getEligibleVehicles()
	if (eligible.length < 2) return null
	const [usados, rodada, feitos] = await Promise.all([
		usadosRecentemente(eligible), rodadasDaEstrategia('comparison'), comparativosFeitos(eligible),
	])
	return escolherParParaComparativo(eligible, usados, rodada, feitos)
}

function dedupeByBrandModel(vehicles: Vehicle[]): Vehicle[] {
	const seen = new Set<string>()
	const out: Vehicle[] = []
	for (const v of vehicles) {
		const key = vehicleKey(v)
		if (!seen.has(key)) {
			seen.add(key)
			out.push(v)
		}
	}
	return out
}

/**
 * Best-effort lookup of a vehicle matching a free-text car name
 * (typically extracted from an IG caption). Returns null if no good match.
 */
export async function findVehicleByName(
  carName: string
): Promise<Vehicle | null> {
  if (!carName) return null

  const needle = carName.toLowerCase()
  const response = await fetchAutoConfVehicles({
    tipo: 'carros',
    registros_por_pagina: 100,
  })

  // Score each vehicle by how many caption tokens appear in "brand model version"
  const tokens = needle
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1)

  let best: { vehicle: AutoConfVehicle; score: number } | null = null

  for (const v of response.veiculos) {
    const haystack = `${v.marca_nome} ${v.modelopai_nome} ${v.modelo_nome} ${v.versao_descricao ?? ''}`.toLowerCase()
    let score = 0
    for (const t of tokens) {
      if (haystack.includes(t)) score += 1
    }
    if (!best || score > best.score) best = { vehicle: v, score }
  }

  if (!best || best.score < 2) return null // require at least 2 token matches
  return mapAutoConfToVehicle(best.vehicle)
}
