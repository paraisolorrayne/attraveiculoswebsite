/**
 * Jina AI API Client
 *
 * Provides three capabilities:
 *   1. Reranker  — reorder documents by semantic relevance to a query
 *   2. Embeddings — generate vector embeddings for semantic search
 *   3. Reader    — fetch a URL as clean Markdown (for LLMO monitoring)
 */

function getJinaApiKey() { return process.env.JINA_API_KEY }

function headers(): Record<string, string> {
	const key = getJinaApiKey()
	return {
		'Content-Type': 'application/json',
		...(key ? { Authorization: `Bearer ${key}` } : {}),
	}
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RerankResult {
	index: number
	document?: { text: string }
	relevance_score: number
}

export interface RerankResponse {
	model: string
	usage: { total_tokens: number; prompt_tokens: number }
	results: RerankResult[]
}

export interface EmbeddingData {
	object: 'embedding'
	index: number
	embedding: number[]
}

export interface EmbeddingResponse {
	model: string
	data: EmbeddingData[]
	usage: { total_tokens: number; prompt_tokens: number }
}

export interface ReaderResponse {
	code: number
	status: number
	data: {
		title: string
		description: string
		url: string
		content: string
		usage: { tokens: number }
	}
}

export interface SearchResult {
	title: string
	url: string
	content: string
	description: string
}

export interface SearchResponse {
	code: number
	status: number
	data: SearchResult[]
}

// ---------------------------------------------------------------------------
// Reranker
// ---------------------------------------------------------------------------

export async function rerankDocuments(
	query: string,
	documents: string[],
	topN = 5,
): Promise<RerankResponse> {
	const res = await fetch('https://api.jina.ai/v1/rerank', {
		method: 'POST',
		headers: headers(),
		body: JSON.stringify({
			model: 'jina-reranker-v3',
			query,
			top_n: topN,
			documents,
			return_documents: true,
		}),
	})
	if (!res.ok) throw new Error(`Jina Reranker error ${res.status}: ${await res.text()}`)
	return res.json()
}

// ---------------------------------------------------------------------------
// Embeddings
// ---------------------------------------------------------------------------

export async function generateEmbeddings(
	texts: string[],
	task: 'retrieval.query' | 'retrieval.passage' = 'retrieval.passage',
): Promise<EmbeddingResponse> {
	const res = await fetch('https://api.jina.ai/v1/embeddings', {
		method: 'POST',
		headers: headers(),
		body: JSON.stringify({
			model: 'jina-embeddings-v3',
			task,
			dimensions: 1024,
			normalized: true,
			input: texts,
		}),
	})
	if (!res.ok) throw new Error(`Jina Embeddings error ${res.status}: ${await res.text()}`)
	return res.json()
}

/** Convenience: embed a single query string. */
export async function embedQuery(query: string): Promise<number[]> {
	const resp = await generateEmbeddings([query], 'retrieval.query')
	return resp.data[0].embedding
}

/** Convenience: embed a single passage string. */
export async function embedPassage(text: string): Promise<number[]> {
	const resp = await generateEmbeddings([text], 'retrieval.passage')
	return resp.data[0].embedding
}

// ---------------------------------------------------------------------------
// Reader (LLMO monitoring)
// ---------------------------------------------------------------------------

export async function readUrl(url: string): Promise<ReaderResponse> {
	const res = await fetch(`https://r.jina.ai/${url}`, {
		headers: {
			Accept: 'application/json',
			...(getJinaApiKey() ? { Authorization: `Bearer ${getJinaApiKey()}` } : {}),
		},
	})
	if (!res.ok) throw new Error(`Jina Reader error ${res.status}: ${await res.text()}`)
	return res.json()
}

// ---------------------------------------------------------------------------
// Search (ranking monitoring)
// ---------------------------------------------------------------------------

export async function searchWeb(query: string): Promise<SearchResponse> {
	const res = await fetch(`https://s.jina.ai/${encodeURIComponent(query)}`, {
		headers: {
			Accept: 'application/json',
			...(getJinaApiKey() ? { Authorization: `Bearer ${getJinaApiKey()}` } : {}),
		},
	})
	if (!res.ok) throw new Error(`Jina Search error ${res.status}: ${await res.text()}`)
	return res.json()
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a rich text passage from vehicle data for embedding. */
export function buildVehiclePassage(vehicle: {
	brand?: string | null
	model?: string | null
	version?: string | null
	year_model?: number | null
	color?: string | null
	body_type?: string | null
	fuel_type?: string | null
	engine?: string | null
	horsepower?: number | null
	mileage?: number
	price?: number
	description?: string | null
}): string {
	const parts: string[] = []
	const name = [vehicle.brand, vehicle.model, vehicle.version, vehicle.year_model]
		.filter(Boolean)
		.join(' ')
	if (name) parts.push(name)
	if (vehicle.color) parts.push(`cor ${vehicle.color}`)
	if (vehicle.body_type) parts.push(`tipo ${vehicle.body_type}`)
	if (vehicle.fuel_type) parts.push(`combustível ${vehicle.fuel_type}`)
	if (vehicle.engine) parts.push(`motor ${vehicle.engine}`)
	if (vehicle.horsepower) parts.push(`${vehicle.horsepower} cv`)
	if (vehicle.mileage != null) parts.push(`${vehicle.mileage.toLocaleString('pt-BR')} km`)
	if (vehicle.price) parts.push(`R$ ${vehicle.price.toLocaleString('pt-BR')}`)
	if (vehicle.description) parts.push(vehicle.description.slice(0, 300))
	return parts.join('. ')
}

/** Cosine similarity between two normalised vectors. */
export function cosineSimilarity(a: number[], b: number[]): number {
	let dot = 0
	for (let i = 0; i < a.length; i++) dot += a[i] * b[i]
	return dot
}
