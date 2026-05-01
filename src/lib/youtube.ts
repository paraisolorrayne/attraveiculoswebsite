/**
 * YouTube Data API v3 fetcher for the Attra Veículos channel.
 *
 * Requires the env var `YOUTUBE_API_KEY` (Google Cloud Console → YouTube Data
 * API v3). Optionally `YOUTUBE_CHANNEL_ID` — if not set, we resolve from the
 * @attraveiculos handle on every cold cache.
 *
 * Returns { videos, shorts } partitioned by duration (≤60s = short).
 */

const API_BASE = 'https://www.googleapis.com/youtube/v3'
const HANDLE = 'attraveiculos'
const SHORT_DURATION_LIMIT_SECONDS = 60
const MAX_RESULTS = 50 // hard limit per call; we paginate twice = up to 100 videos
const MAX_PAGES = 2

export interface YouTubeVideo {
  id: string
  title: string
  description: string
  publishedAt: string
  thumbnail: string
  durationSeconds: number
  isShort: boolean
  url: string
}

export interface YouTubeFeed {
  videos: YouTubeVideo[]
  shorts: YouTubeVideo[]
  channelUrl: string
  fetchedAt: string
  error?: string
}

interface ChannelListResponse {
  items?: Array<{
    id: string
    contentDetails?: { relatedPlaylists?: { uploads?: string } }
  }>
}

interface PlaylistItemsResponse {
  items?: Array<{
    contentDetails?: { videoId?: string }
    snippet?: {
      title?: string
      description?: string
      publishedAt?: string
      thumbnails?: Record<string, { url?: string; width?: number; height?: number }>
    }
  }>
  nextPageToken?: string
}

interface VideosListResponse {
  items?: Array<{
    id: string
    contentDetails?: { duration?: string }
  }>
}

/** ISO 8601 duration "PT1M30S" → seconds. */
function parseIsoDurationSeconds(iso: string): number {
  const match = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso)
  if (!match) return 0
  const [, h, m, s] = match
  return (parseInt(h ?? '0', 10) * 3600) + (parseInt(m ?? '0', 10) * 60) + parseInt(s ?? '0', 10)
}

function pickBestThumbnail(thumbs?: Record<string, { url?: string; width?: number }>): string {
  if (!thumbs) return ''
  const order = ['maxres', 'standard', 'high', 'medium', 'default']
  for (const k of order) {
    const t = thumbs[k]
    if (t?.url) return t.url
  }
  const any = Object.values(thumbs).find(t => t?.url)
  return any?.url ?? ''
}

async function ytFetch<T>(path: string, params: Record<string, string>, apiKey: string): Promise<T> {
  const qs = new URLSearchParams({ ...params, key: apiKey }).toString()
  const res = await fetch(`${API_BASE}/${path}?${qs}`, {
    next: { revalidate: 3600 },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`YouTube API ${path} ${res.status}: ${body.substring(0, 200)}`)
  }
  return res.json() as Promise<T>
}

async function resolveChannelId(apiKey: string): Promise<string> {
  if (process.env.YOUTUBE_CHANNEL_ID) return process.env.YOUTUBE_CHANNEL_ID

  const data = await ytFetch<ChannelListResponse>(
    'channels',
    { part: 'contentDetails', forHandle: HANDLE },
    apiKey,
  )
  const id = data.items?.[0]?.id
  if (!id) throw new Error(`Channel @${HANDLE} not found`)
  return id
}

async function getUploadsPlaylistId(channelId: string, apiKey: string): Promise<string> {
  const data = await ytFetch<ChannelListResponse>(
    'channels',
    { part: 'contentDetails', id: channelId },
    apiKey,
  )
  const id = data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads
  if (!id) throw new Error(`Uploads playlist not found for ${channelId}`)
  return id
}

async function listPlaylistItems(playlistId: string, apiKey: string) {
  const items: NonNullable<PlaylistItemsResponse['items']> = []
  let pageToken: string | undefined
  for (let page = 0; page < MAX_PAGES; page++) {
    const params: Record<string, string> = {
      part: 'contentDetails,snippet',
      playlistId,
      maxResults: String(MAX_RESULTS),
    }
    if (pageToken) params.pageToken = pageToken
    const data = await ytFetch<PlaylistItemsResponse>('playlistItems', params, apiKey)
    items.push(...(data.items ?? []))
    if (!data.nextPageToken) break
    pageToken = data.nextPageToken
  }
  return items
}

async function listVideoDurations(ids: string[], apiKey: string): Promise<Map<string, number>> {
  const result = new Map<string, number>()
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50)
    const data = await ytFetch<VideosListResponse>(
      'videos',
      { part: 'contentDetails', id: batch.join(',') },
      apiKey,
    )
    for (const v of data.items ?? []) {
      result.set(v.id, parseIsoDurationSeconds(v.contentDetails?.duration ?? 'PT0S'))
    }
  }
  return result
}

/**
 * Fetch the latest videos (up to 100) from the Attra channel and split into
 * long-form vs shorts. On any failure, returns an empty feed with an error
 * message — the page should render a fallback CTA to the YouTube channel.
 */
export async function fetchAttraYouTubeFeed(): Promise<YouTubeFeed> {
  const channelUrl = `https://www.youtube.com/@${HANDLE}`
  const empty: YouTubeFeed = {
    videos: [],
    shorts: [],
    channelUrl,
    fetchedAt: new Date().toISOString(),
  }
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) {
    return { ...empty, error: 'YOUTUBE_API_KEY not configured' }
  }

  try {
    const channelId = await resolveChannelId(apiKey)
    const uploadsId = await getUploadsPlaylistId(channelId, apiKey)
    const items = await listPlaylistItems(uploadsId, apiKey)
    const videoIds = items
      .map(it => it.contentDetails?.videoId)
      .filter((x): x is string => Boolean(x))
    const durations = await listVideoDurations(videoIds, apiKey)

    const videos: YouTubeVideo[] = []
    const shorts: YouTubeVideo[] = []
    for (const it of items) {
      const id = it.contentDetails?.videoId
      if (!id) continue
      const seconds = durations.get(id) ?? 0
      const isShort = seconds > 0 && seconds <= SHORT_DURATION_LIMIT_SECONDS
      const v: YouTubeVideo = {
        id,
        title: it.snippet?.title ?? '',
        description: it.snippet?.description ?? '',
        publishedAt: it.snippet?.publishedAt ?? '',
        thumbnail: pickBestThumbnail(it.snippet?.thumbnails),
        durationSeconds: seconds,
        isShort,
        url: isShort
          ? `https://www.youtube.com/shorts/${id}`
          : `https://www.youtube.com/watch?v=${id}`,
      }
      ;(isShort ? shorts : videos).push(v)
    }

    return { ...empty, videos, shorts }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[youtube] fetch failed:', msg)
    return { ...empty, error: msg }
  }
}

export function formatDuration(seconds: number): string {
  if (seconds <= 0) return '–'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}
