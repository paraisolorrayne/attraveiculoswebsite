import { NextRequest, NextResponse } from 'next/server'
import { sql } from 'kysely'
import { db } from '@/lib/db'
import { embedQuery, rerankDocuments } from '@/lib/jina'
import { SITE_URL } from '@/lib/constants'
import {
	formatMileage,
	formatPrice,
	loadListedInventory,
	vehicleName,
} from '@/app/api/llm/_inventory'
import type { Vehicle } from '@/types'

// Migrado de supabase-js (rpc match_vehicles) → Kysely + SQL cru pgvector
// (ver docs/MIGRACAO_POSTGRES_PURO.md).

export const dynamic = 'force-dynamic'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? SITE_URL

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 10
const ipRequestMap = new Map<string, { count: number; resetAt: number }>()
let cleanupCounter = 0

function checkRateLimit(ip: string): boolean {
	const now = Date.now()

	if (++cleanupCounter % 100 === 0) {
		for (const [key, val] of ipRequestMap) {
			if (now > val.resetAt) ipRequestMap.delete(key)
		}
	}

	const entry = ipRequestMap.get(ip)
	if (!entry || now > entry.resetAt) {
		ipRequestMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
		return true
	}
	entry.count++
	return entry.count <= RATE_LIMIT_MAX
}

// ---------------------------------------------------------------------------
// Busca léxica sobre o estoque vivo
// ---------------------------------------------------------------------------

/** Palavras que não carregam intenção de busca e só geram ruído no score. */
const STOPWORDS = new Set([
	'a', 'as', 'o', 'os', 'um', 'uma', 'de', 'do', 'da', 'dos', 'das', 'em',
	'no', 'na', 'nos', 'nas', 'por', 'para', 'pra', 'com', 'sem', 'e', 'ou',
	'que', 'ao', 'aos', 'quero', 'tem', 'ter', 'carro', 'carros', 'veiculo',
	'veiculos', 'attra',
])

/**
 * Intenção → atributos do estoque. É o que faz "carro esportivo para pista"
 * (a consulta de controle da auditoria) devolver os supercarros em vez de
 * lista vazia: nenhum desses termos aparece literalmente na ficha do veículo.
 */
const INTENT_MAP: Record<string, string[]> = {
	esportivo: ['sports', 'supercar'],
	esportivos: ['sports', 'supercar'],
	esporte: ['sports', 'supercar'],
	pista: ['sports', 'supercar'],
	track: ['sports', 'supercar'],
	corrida: ['sports', 'supercar'],
	superesportivo: ['supercar'],
	supercarro: ['supercar'],
	superrcarro: ['supercar'],
	luxo: ['luxury', 'premium'],
	luxuoso: ['luxury', 'premium'],
	premium: ['premium', 'luxury'],
	suv: ['suv'],
	utilitario: ['suv'],
	familia: ['suv', 'executive'],
	executivo: ['executive', 'premium'],
	sedan: ['sedan'],
	sedã: ['sedan'],
	cupe: ['coupe'],
	coupe: ['coupe'],
	conversivel: ['conversivel', 'cabriolet'],
	cabrio: ['conversivel', 'cabriolet'],
	eletrico: ['eletrico', 'elétrico'],
	hibrido: ['hibrido', 'híbrido'],
	diesel: ['diesel'],
	blindado: ['blindado'],
	blindagem: ['blindado'],
	importado: ['imported'],
	importados: ['imported'],
	novo: ['0km'],
	zero: ['0km'],
	'0km': ['0km'],
	seminovo: ['seminovo'],
}

/** Marcas escritas de formas diferentes pelo usuário e pela AutoConf. */
const BRAND_ALIASES: Record<string, string> = {
	mercedes: 'mercedesbenz',
	benz: 'mercedesbenz',
	merc: 'mercedesbenz',
	rangerover: 'landrover',
	range: 'landrover',
	vw: 'volkswagen',
	rolls: 'rollsroyce',
	aston: 'astonmartin',
}

/** Minúsculas, sem acento e sem separadores — "G-63" e "g63" viram a mesma coisa. */
function normalize(text: string): string {
	return text
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[-_./]/g, '')
		.trim()
}

function tokenize(query: string): string[] {
	return normalize(query)
		.split(/\s+/)
		.filter(t => t.length >= 2 && !STOPWORDS.has(t))
}

interface ScoredVehicle {
	vehicle: Vehicle
	lexical: number
	semantic: number
	matched: string[]
}

/**
 * Pontua um veículo contra os termos da consulta. Campos mais identificadores
 * (marca, modelo) pesam mais que descrição livre, para "porsche" não ranquear
 * um BMW cuja descrição cita Porsche.
 */
function scoreVehicle(vehicle: Vehicle, tokens: string[]): { score: number; matched: string[] } {
	const brand = normalize(vehicle.brand || '')
	const model = normalize(vehicle.model || '')
	const version = normalize(vehicle.version || '')
	const attributes = [
		vehicle.category,
		vehicle.body_type,
		vehicle.fuel_type,
		vehicle.transmission,
		vehicle.color,
		vehicle.origin,
		vehicle.is_new ? '0km' : 'seminovo',
		...(vehicle.options || []),
	].map(v => normalize(String(v ?? ''))).filter(Boolean)
	const description = normalize(vehicle.description || '')
	const years = [String(vehicle.year_model), String(vehicle.year_manufacture)]

	let score = 0
	const matched: string[] = []

	for (const raw of tokens) {
		// O apelido é uma alternativa, não uma substituição: a AutoConf grava
		// tanto "Mercedes" quanto "Mercedes-Benz", e trocar o termo cegamente
		// fazia "mercedes" deixar de casar com a marca gravada como "Mercedes".
		const variants = BRAND_ALIASES[raw] ? [raw, BRAND_ALIASES[raw]] : [raw]
		const matchesAny = (field: string) => field !== '' && variants.some(t => field.includes(t))
		// Marca e modelo casam nos dois sentidos: o usuário escreve
		// "mercedesbenz" e a AutoConf gravou só "Mercedes" (e vice-versa).
		const matchesIdentity = (field: string) =>
			field.length >= 3 && variants.some(t => field.includes(t) || t.includes(field))
		let hit = 0

		if (matchesIdentity(brand)) hit = Math.max(hit, 5)
		if (matchesIdentity(model)) hit = Math.max(hit, 4)
		if (matchesAny(version)) hit = Math.max(hit, 3)
		if (years.includes(raw)) hit = Math.max(hit, 3)
		if (attributes.some(a => matchesAny(a))) hit = Math.max(hit, 2)

		// Intenção: "esportivo" não está na ficha, mas mapeia para a categoria.
		const intents = INTENT_MAP[raw]
		if (intents && attributes.some(a => intents.some(i => a.includes(normalize(i))))) {
			hit = Math.max(hit, 3)
		}

		if (hit === 0 && matchesAny(description)) hit = 1

		if (hit > 0) {
			score += hit
			matched.push(raw)
		}
	}

	return { score, matched }
}

// ---------------------------------------------------------------------------
// Busca semântica (pgvector + Jina) — sinal opcional
// ---------------------------------------------------------------------------

interface SemanticHit {
	vehicle_slug: string
	rerank_score: number
}

/**
 * Retorna os slugs mais próximos da consulta no índice vetorial, ou `null`
 * quando o índice não está disponível.
 *
 * `null` é diferente de lista vazia de propósito: o índice
 * (`vehicle_embeddings`) só é populado por `POST /api/embeddings/sync`, que
 * não estava instalado em nenhum cron. Índice ausente não pode mais derrubar
 * a resposta inteira — era exatamente isso que fazia o endpoint responder
 * `results: []` para qualquer consulta.
 */
async function semanticSearch(query: string, limit: number): Promise<SemanticHit[] | null> {
	if (!process.env.JINA_API_KEY) return null

	try {
		const queryEmbedding = await embedQuery(query)

		// Cosine distance <=> ; similarity = 1 - distância. Threshold 0.25.
		const embStr = JSON.stringify(queryEmbedding)
		const matchCount = limit * 2
		const matchThreshold = 0.25
		const { rows: matches } = await sql<{
			vehicle_id: number
			vehicle_slug: string
			passage_text: string
			similarity: number
		}>`
			SELECT ve.vehicle_id, ve.vehicle_slug, ve.passage_text,
			       1 - (ve.embedding <=> ${embStr}::vector) AS similarity
			FROM vehicle_embeddings ve
			WHERE 1 - (ve.embedding <=> ${embStr}::vector) > ${matchThreshold}
			ORDER BY ve.embedding <=> ${embStr}::vector
			LIMIT ${matchCount}
		`.execute(db)

		if (!matches || matches.length === 0) return null

		const reranked = await rerankDocuments(query, matches.map(m => m.passage_text), limit)

		return reranked.results.map(r => ({
			vehicle_slug: matches[r.index].vehicle_slug,
			rerank_score: r.relevance_score,
		}))
	} catch (err) {
		// Índice vazio, Postgres fora do ar ou Jina indisponível não podem
		// zerar a resposta — a busca léxica sobre o estoque vivo cobre.
		console.error('[vehicles/search] camada semântica indisponível:', err)
		return null
	}
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

function toCitableResult(scored: ScoredVehicle, position: number) {
	const v = scored.vehicle
	return {
		position,
		name: vehicleName(v),
		url: `${BASE}/veiculo/${v.slug}`,
		slug: v.slug,
		brand: v.brand || null,
		model: v.model || null,
		version: v.version || null,
		year: v.year_model || null,
		mileage_km: v.mileage,
		mileage_formatted: formatMileage(v.mileage),
		price_brl: v.price > 0 ? v.price : null,
		price_formatted: formatPrice(v.price),
		color: v.color || null,
		fuel_type: v.fuel_type || null,
		transmission: v.transmission || null,
		body_type: v.body_type || null,
		category: v.category || null,
		image: v.photos?.[0] ?? null,
		matched_terms: scored.matched,
		relevance: Math.round((scored.lexical + scored.semantic * 10) * 100) / 100,
		signals: {
			lexical_score: scored.lexical,
			semantic_score: scored.semantic > 0 ? Math.round(scored.semantic * 1000) / 1000 : null,
		},
	}
}

/**
 * GET /api/vehicles/search?q=<query>&limit=<n>
 *
 * Busca de veículos no estoque da Attra, exposta para consumo por LLM
 * (liberada no robots.txt e divulgada no llms.txt).
 *
 * Combina dois sinais:
 *   1. Busca léxica/por atributo sobre o estoque vivo — sempre disponível,
 *      é a fonte de verdade da resposta.
 *   2. Busca semântica (Jina embeddings + pgvector + reranker) — reordena
 *      quando o índice `vehicle_embeddings` está populado.
 *
 * A resposta nunca é uma lista vazia sem contexto: mesmo sem casar nada,
 * devolve o tamanho do estoque e o link do catálogo, porque `results: []`
 * puro é lido por um modelo como "esta loja não tem carros".
 */
export async function GET(request: NextRequest) {
	const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
	if (!checkRateLimit(ip)) {
		return NextResponse.json(
			{ error: 'Rate limit exceeded. Max 10 requests per minute.' },
			{ status: 429, headers: { 'Retry-After': '60' } },
		)
	}

	const query = request.nextUrl.searchParams.get('q')
	const limit = Math.min(Number(request.nextUrl.searchParams.get('limit')) || 10, 50)

	if (!query || query.trim().length < 2) {
		return NextResponse.json({ error: 'Query parameter "q" is required (min 2 chars)' }, { status: 400 })
	}

	let inventory
	try {
		inventory = await loadListedInventory()
	} catch (err) {
		console.error('[vehicles/search] falha ao carregar o estoque:', err)
		// 503 em vez de lista vazia: um erro explícito é melhor que uma
		// resposta que afirma, em silêncio, que não há estoque.
		return NextResponse.json(
			{
				error: 'Inventory temporarily unavailable',
				detail: 'Não foi possível carregar o estoque agora. Consulte ' +
					`${BASE}/veiculos ou tente novamente em alguns minutos.`,
				inventory_url: `${BASE}/veiculos`,
			},
			{ status: 503, headers: { 'Retry-After': '300' } },
		)
	}

	if (inventory.vehicles.length === 0) {
		return NextResponse.json(
			{
				error: 'Inventory temporarily unavailable',
				detail: 'A fonte de estoque respondeu sem nenhum veículo. ' +
					`Consulte ${BASE}/veiculos.`,
				inventory_url: `${BASE}/veiculos`,
			},
			{ status: 503, headers: { 'Retry-After': '300' } },
		)
	}

	const tokens = tokenize(query)
	const semanticHits = await semanticSearch(query, limit)
	const semanticBySlug = new Map(semanticHits?.map(h => [h.vehicle_slug, h]) ?? [])

	const scored: ScoredVehicle[] = inventory.vehicles.map(vehicle => {
		const { score, matched } = scoreVehicle(vehicle, tokens)
		const hit = semanticBySlug.get(vehicle.slug)
		return {
			vehicle,
			lexical: score,
			semantic: hit?.rerank_score ?? 0,
			matched,
		}
	})

	const relevant = scored
		.filter(s => s.lexical > 0 || s.semantic > 0)
		.sort((a, b) => (b.lexical + b.semantic * 10) - (a.lexical + a.semantic * 10))

	const results = relevant.slice(0, limit).map((s, i) => toCitableResult(s, i + 1))

	const mode = semanticHits === null
		? 'lexical'
		: relevant.some(s => s.semantic > 0)
			? 'semantic+lexical'
			: 'lexical'

	return NextResponse.json(
		{
			query,
			mode,
			count: results.length,
			total_matches: relevant.length,
			// Sempre presente: mesmo com zero resultados o consumidor sabe que
			// existe estoque e para onde ir.
			inventory_size: inventory.vehicles.length,
			inventory_url: `${BASE}/veiculos`,
			results,
			...(results.length === 0
				? {
					note: `Nenhum veículo do estoque atual casa com "${query}". ` +
						`A Attra tem ${inventory.vehicles.length} veículos disponíveis — ` +
						`veja o catálogo completo em ${BASE}/veiculos ou use ` +
						`${BASE}/api/llm/vehicles.`,
				}
				: {}),
			...(semanticHits === null
				? {
					semantic_index: 'unavailable',
					semantic_index_note: 'Ranking semântico indisponível nesta ' +
						'resposta; os resultados vieram da busca por atributo ' +
						'sobre o estoque vivo.',
				}
				: { semantic_index: 'available' }),
		},
		{ headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } },
	)
}
