/**
 * Instagram Graph API fetcher for @attra.veiculos
 *
 * Uses a long-lived Page Access Token tied to the IG Business Account.
 * Docs: https://developers.facebook.com/docs/instagram-api/guides/content-publishing
 */

const GRAPH_API_VERSION = 'v21.0'
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`

export type IGMediaType = 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'

export interface IGMediaChild {
  id: string
  media_type: 'IMAGE' | 'VIDEO'
  media_url: string
  thumbnail_url?: string
}

export interface IGPost {
  id: string
  permalink: string
  caption: string
  media_type: IGMediaType
  media_url: string
  thumbnail_url?: string
  timestamp: string // ISO
  children?: IGMediaChild[]
}

interface GraphError {
  error?: { message: string; type: string; code: number }
}

function env(name: string): string | null {
  const v = process.env[name]
  return v && v.trim().length > 0 ? v : null
}

/**
 * Exchange a short-lived token for a long-lived one.
 * Useful when the stored token is about to expire.
 */
export async function refreshLongLivedToken(shortToken: string): Promise<string | null> {
  const appId = env('META_APP_ID')
  const appSecret = env('META_APP_SECRET')
  if (!appId || !appSecret) return null

  const url = new URL(`${GRAPH_BASE}/oauth/access_token`)
  url.searchParams.set('grant_type', 'fb_exchange_token')
  url.searchParams.set('client_id', appId)
  url.searchParams.set('client_secret', appSecret)
  url.searchParams.set('fb_exchange_token', shortToken)

  const res = await fetch(url.toString())
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as GraphError
    console.error('[InstagramFetcher] Token refresh failed:', err.error?.message)
    return null
  }
  const data = (await res.json()) as { access_token?: string }
  return data.access_token ?? null
}

/** As duas variáveis da Graph API estão no ambiente? Sem elas o blog não tem pauta. */
export function instagramConfigurado(): boolean {
  return Boolean(env('META_IG_BUSINESS_ACCOUNT_ID') && env('META_LONG_LIVED_TOKEN'))
}

/**
 * Os posts mais recentes de @attra.veiculos, do mais novo ao mais velho.
 * Lista vazia quando a Graph API falha ou não está configurada (o motivo vai
 * para o log).
 */
export async function fetchRecentInstagramPosts(limit = 25): Promise<IGPost[]> {
  const igBusinessId = env('META_IG_BUSINESS_ACCOUNT_ID')
  const token = env('META_LONG_LIVED_TOKEN')

  if (!igBusinessId || !token) {
    console.warn(
      '[InstagramFetcher] META_IG_BUSINESS_ACCOUNT_ID or META_LONG_LIVED_TOKEN not set — skipping IG fetch.'
    )
    return []
  }

  const fields = [
    'id',
    'permalink',
    'caption',
    'media_type',
    'media_url',
    'thumbnail_url',
    'timestamp',
    'children{id,media_type,media_url,thumbnail_url}',
  ].join(',')

  const url = new URL(`${GRAPH_BASE}/${igBusinessId}/media`)
  url.searchParams.set('fields', fields)
  url.searchParams.set('limit', String(limit))
  url.searchParams.set('access_token', token)

  const res = await fetch(url.toString(), { cache: 'no-store' })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as GraphError
    console.error(
      `[InstagramFetcher] Graph API error ${res.status}:`,
      err.error?.message ?? res.statusText
    )
    return []
  }

  const data = (await res.json()) as {
    data?: Array<IGPost & { children?: { data?: IGMediaChild[] } }>
  }

  // Normalise children shape (Graph returns { data: [...] })
  return (data.data ?? []).map((p) => ({
    id: p.id,
    permalink: p.permalink,
    caption: p.caption ?? '',
    media_type: p.media_type,
    media_url: p.media_url,
    thumbnail_url: p.thumbnail_url,
    timestamp: p.timestamp,
    children: (p.children as { data?: IGMediaChild[] } | undefined)?.data,
  }))
}

/**
 * Extract all IMAGE URLs from a post (handles single image and carousel).
 * For VIDEO posts returns the thumbnail if available.
 */
export function extractImageUrls(post: IGPost): string[] {
  if (post.media_type === 'IMAGE') {
    return [post.media_url]
  }

  if (post.media_type === 'VIDEO') {
    return post.thumbnail_url ? [post.thumbnail_url] : []
  }

  // CAROUSEL_ALBUM
  const urls: string[] = []
  for (const child of post.children ?? []) {
    if (child.media_type === 'IMAGE') {
      urls.push(child.media_url)
    } else if (child.media_type === 'VIDEO' && child.thumbnail_url) {
      urls.push(child.thumbnail_url)
    }
  }
  return urls
}

/**
 * Heuristic extraction of a car name/model from the IG caption.
 * Used when the post is a video and we need to pull gallery photos from AutoConf.
 *
 * Returns the first candidate match — e.g. "Ferrari SF90 Spider",
 * "Porsche 911 GT3 RS", "Lamborghini Huracán".
 *
 * Kept intentionally simple: the Gemini prompt does a second pass if this fails.
 */
export function guessCarNameFromCaption(caption: string): string | null {
  if (!caption) return null

  const brands = [
    'Ferrari', 'Lamborghini', 'Porsche', 'McLaren', 'Bentley', 'Rolls-Royce',
    'Aston Martin', 'Maserati', 'Bugatti', 'Pagani', 'Koenigsegg',
    'BMW', 'Mercedes', 'Mercedes-Benz', 'Mercedes-AMG', 'Audi',
    'Lexus', 'Land Rover', 'Range Rover', 'Jaguar', 'Volvo',
  ]

  // Match brand followed by up to 5 tokens (model + version)
  const pattern = new RegExp(
    `(${brands.join('|')})\\s+([A-Z0-9][A-Za-z0-9-]*(?:\\s+[A-Z0-9][A-Za-z0-9-]*){0,4})`,
    'i'
  )
  const match = caption.match(pattern)
  if (!match) return null

  return `${match[1]} ${match[2]}`.trim()
}
