import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
// Migrado de supabase-js → Kysely (ver docs/MIGRACAO_POSTGRES_PURO.md).
import { embedQuery, cosineSimilarity } from '@/lib/jina'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

/**
 * POST /api/llm/gaps
 *
 * Content gap analysis: compares target search queries against existing
 * vehicle embeddings to identify which terms have weak or no semantic
 * coverage in the current inventory pages.
 *
 * Body: { queries: string[] } — search terms to analyse.
 *
 * Auth: requires CRON_SECRET header.
 */

const DEFAULT_QUERIES = [
	'comprar supercarros brasil',
	'comprar carro de luxo brasil',
	'ferrari brasil preço',
	'porsche 911 comprar brasil',
	'bmw m3 comprar brasil',
	'mercedes amg gt brasil',
	'carro esportivo para track day',
	'suv premium para família',
	'carro para executivo luxo',
	'carros exclusivos alto desempenho',
	'lamborghini à venda brasil',
	'mclaren comprar brasil',
	'audi rs à venda brasil',
	'range rover sport preço brasil',
	'carro de luxo acima de 500 mil',
]

interface GapResult {
	query: string
	best_match: {
		vehicle_slug: string
		passage: string
		similarity: number
	} | null
	coverage: 'strong' | 'moderate' | 'weak' | 'none'
	recommendation: string
}

export async function POST(request: Request) {
	const authHeader = request.headers.get('authorization')
	const cronSecret = process.env.CRON_SECRET
	if (!cronSecret) {
		return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
	}
	if (authHeader !== `Bearer ${cronSecret}`) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	}

	if (!process.env.JINA_API_KEY) {
		return NextResponse.json({ error: 'JINA_API_KEY not configured' }, { status: 500 })
	}

	let queries = DEFAULT_QUERIES
	try {
		const body = await request.json().catch(() => null)
		if (body?.queries && Array.isArray(body.queries)) {
			queries = body.queries
		}
	} catch {
		// use defaults
	}

	// Load all embeddings do banco
	let allEmbeddings: Array<{ vehicle_slug: string; passage_text: string; embedding: string }>
	try {
		allEmbeddings = await db.selectFrom('vehicle_embeddings')
			.select(['vehicle_slug', 'passage_text', 'embedding'])
			.execute()
	} catch (loadError) {
		return NextResponse.json({
			error: 'No vehicle embeddings found. Run /api/embeddings/sync first.',
			details: loadError instanceof Error ? loadError.message : String(loadError),
		}, { status: 503 })
	}

	if (allEmbeddings.length === 0) {
		return NextResponse.json({
			error: 'No vehicle embeddings found. Run /api/embeddings/sync first.',
		}, { status: 503 })
	}

	const results: GapResult[] = []

	for (const query of queries) {
		try {
			const queryEmb = await embedQuery(query)

			let bestMatch: GapResult['best_match'] = null
			let bestSim = -1

			for (const row of allEmbeddings) {
				const embedding = typeof row.embedding === 'string'
					? JSON.parse(row.embedding)
					: row.embedding
				const sim = cosineSimilarity(queryEmb, embedding)
				if (sim > bestSim) {
					bestSim = sim
					bestMatch = {
						vehicle_slug: row.vehicle_slug,
						passage: row.passage_text,
						similarity: Math.round(sim * 1000) / 1000,
					}
				}
			}

			let coverage: GapResult['coverage']
			let recommendation: string
			if (bestSim >= 0.7) {
				coverage = 'strong'
				recommendation = 'Bom coverage — conteúdo existente atende esta busca.'
			} else if (bestSim >= 0.5) {
				coverage = 'moderate'
				recommendation = 'Coverage parcial — considere criar conteúdo de blog ou landing page para esta busca.'
			} else if (bestSim >= 0.3) {
				coverage = 'weak'
				recommendation = 'Coverage fraco — criar página dedicada com conteúdo otimizado para este termo.'
			} else {
				coverage = 'none'
				recommendation = 'Sem coverage — gap crítico. Criar landing page + blog post imediatamente.'
			}

			results.push({ query, best_match: bestMatch, coverage, recommendation })

			await new Promise(r => setTimeout(r, 300))
		} catch (err) {
			results.push({
				query,
				best_match: null,
				coverage: 'none',
				recommendation: `Error: ${err instanceof Error ? err.message : 'unknown'}`,
			})
		}
	}

	const summary = {
		timestamp: new Date().toISOString(),
		total_queries: results.length,
		strong: results.filter(r => r.coverage === 'strong').length,
		moderate: results.filter(r => r.coverage === 'moderate').length,
		weak: results.filter(r => r.coverage === 'weak').length,
		none: results.filter(r => r.coverage === 'none').length,
		vehicle_embeddings_count: allEmbeddings.length,
	}

	return NextResponse.json({ summary, results })
}
