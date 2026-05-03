import { NextResponse } from 'next/server'
import { searchWeb } from '@/lib/jina'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

/**
 * POST /api/llm/monitor
 *
 * Monitors Attra's position in search results for strategic keywords using
 * Jina Search API. Returns position data for each keyword.
 *
 * Auth: requires CRON_SECRET header.
 *
 * Body (optional): { keywords: string[] } — override default keyword list.
 */

const DEFAULT_KEYWORDS = [
	'comprar supercarros brasil',
	'comprar carro de luxo brasil',
	'carros de luxo à venda brasil',
	'ferrari a venda brasil',
	'porsche seminovo brasil',
	'carros premium uberlândia',
	'concessionária premium uberlândia',
	'comprar porsche brasil',
	'mercedes amg brasil preço',
	'bmw m3 comprar brasil',
	'carros importados premium brasil',
	'loja de supercarros brasil',
	'carros exclusivos alto desempenho',
	'carros de luxo acima de 300 mil',
]

const ATTRA_DOMAINS = ['attraveiculos.com.br', 'attra.com.br']

interface PositionResult {
	keyword: string
	position: number | null
	url: string | null
	total_results: number
	top3: { title: string; url: string }[]
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

	let keywords = DEFAULT_KEYWORDS
	try {
		const body = await request.json().catch(() => null)
		if (body?.keywords && Array.isArray(body.keywords)) {
			keywords = body.keywords
		}
	} catch {
		// use defaults
	}

	const results: PositionResult[] = []

	for (const keyword of keywords) {
		try {
			const searchResult = await searchWeb(keyword)
			const entries = searchResult.data || []

			let position: number | null = null
			let matchUrl: string | null = null

			for (let i = 0; i < entries.length; i++) {
				const entryUrl = entries[i].url || ''
				if (ATTRA_DOMAINS.some(d => entryUrl.includes(d))) {
					position = i + 1
					matchUrl = entryUrl
					break
				}
			}

			results.push({
				keyword,
				position,
				url: matchUrl,
				total_results: entries.length,
				top3: entries.slice(0, 3).map(e => ({ title: e.title, url: e.url })),
			})

			// Small delay to avoid rate limiting
			await new Promise(r => setTimeout(r, 500))
		} catch (err) {
			results.push({
				keyword,
				position: null,
				url: null,
				total_results: 0,
				top3: [],
			})
			console.error(`Monitor failed for "${keyword}":`, err)
		}
	}

	const summary = {
		timestamp: new Date().toISOString(),
		total_keywords: results.length,
		found: results.filter(r => r.position !== null).length,
		not_found: results.filter(r => r.position === null).length,
		avg_position: (() => {
			const found = results.filter(r => r.position !== null)
			if (found.length === 0) return null
			return Math.round((found.reduce((sum, r) => sum + (r.position ?? 0), 0) / found.length) * 10) / 10
		})(),
	}

	return NextResponse.json({ summary, results })
}
