/**
 * Blog Reranker — finds the most relevant blog posts for a given vehicle.
 *
 * Uses Jina Reranker to semantically match vehicle specs against blog post
 * titles/excerpts, then returns the top N posts as "Leitura Recomendada".
 */

import { rerankDocuments, type RerankResult } from './jina'

interface BlogPostSummary {
	slug: string
	title: string
	excerpt: string
}

export interface RankedBlogPost {
	slug: string
	title: string
	excerpt: string
	relevance_score: number
}

/**
 * Given a vehicle description and a list of blog posts, return the top
 * `limit` posts ranked by semantic relevance.
 *
 * Falls back to an empty array if JINA_API_KEY is missing or the call fails.
 */
export async function rankBlogPostsForVehicle(
	vehicleQuery: string,
	posts: BlogPostSummary[],
	limit = 3,
): Promise<RankedBlogPost[]> {
	if (!process.env.JINA_API_KEY || posts.length === 0) return []

	try {
		const documents = posts.map(p => `${p.title}. ${p.excerpt}`)
		const response = await rerankDocuments(vehicleQuery, documents, limit)

		return response.results
			.filter((r: RerankResult) => r.relevance_score > 0)
			.map((r: RerankResult) => ({
				slug: posts[r.index].slug,
				title: posts[r.index].title,
				excerpt: posts[r.index].excerpt,
				relevance_score: r.relevance_score,
			}))
	} catch (err) {
		console.error('Blog reranker failed:', err)
		return []
	}
}
