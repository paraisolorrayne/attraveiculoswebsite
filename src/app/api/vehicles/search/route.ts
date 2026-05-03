import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { embedQuery, rerankDocuments } from '@/lib/jina'

export const dynamic = 'force-dynamic'

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

/**
 * GET /api/vehicles/search?q=<query>&limit=<n>
 *
 * Semantic vehicle search powered by Jina Embeddings + pgvector + Reranker.
 *
 * Flow:
 *   1. Embed the user query with Jina Embeddings (retrieval.query)
 *   2. Find nearest vectors in Supabase via match_vehicles() RPC
 *   3. Re-rank the top results with Jina Reranker for precision
 *   4. Return ordered vehicle slugs + similarity scores
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

	if (!process.env.JINA_API_KEY) {
		return NextResponse.json({ error: 'Semantic search not configured' }, { status: 503 })
	}

	try {
		// Step 1: embed the query
		const queryEmbedding = await embedQuery(query)

		// Step 2: vector search in Supabase
		const supabase = createAdminClient()
		const { data: matches, error: matchError } = await supabase.rpc('match_vehicles', {
			query_embedding: JSON.stringify(queryEmbedding),
			match_count: limit * 2,
			match_threshold: 0.25,
		})

		if (matchError) {
			throw new Error(`pgvector search failed: ${matchError.message}`)
		}

		if (!matches || matches.length === 0) {
			return NextResponse.json({ results: [], query })
		}

		// Step 3: rerank with Jina for final precision
		const documents = matches.map((m: { passage_text: string }) => m.passage_text)
		const reranked = await rerankDocuments(query, documents, limit)

		// Step 4: map reranked results back to vehicle data
		const results = reranked.results.map(r => {
			const original = matches[r.index] as {
				vehicle_id: number
				vehicle_slug: string
				passage_text: string
				similarity: number
			}
			return {
				vehicle_id: original.vehicle_id,
				vehicle_slug: original.vehicle_slug,
				vector_similarity: original.similarity,
				rerank_score: r.relevance_score,
			}
		})

		return NextResponse.json({ results, query }, {
			headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
		})
	} catch (err) {
		console.error('Semantic search failed:', err)
		return NextResponse.json(
			{ error: err instanceof Error ? err.message : 'Search failed' },
			{ status: 500 },
		)
	}
}
