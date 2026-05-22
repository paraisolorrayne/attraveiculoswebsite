/**
 * YouTube feed da Attra — busca o vídeo mais recente do canal via RSS
 * público (sem API key, sem custo).
 *
 * O feed RSS do YouTube não aceita @handle, só channel_id. O ID do
 * @attraveiculos foi resolvido uma vez (extraído do HTML da página do
 * canal) e fixado aqui — channel_id não muda.
 *
 * Usado no hero da home pra mostrar o último vídeo em autoplay mudo.
 */

const ATTRA_CHANNEL_ID = 'UCkjTjmzoOvIZJR-Ze0hNVDg'
const RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${ATTRA_CHANNEL_ID}`
const REVALIDATE_SECONDS = 3600 // 1h — não precisa checar vídeo novo com mais frequência

export interface YouTubeVideo {
  videoId: string
  title: string
  publishedAt: string
}

/**
 * Retorna o vídeo mais recente do canal. Null em qualquer falha (caller
 * decide o fallback — ex: esconder a coluna de vídeo).
 *
 * Parse via regex no XML (sem dependência de parser): o primeiro <entry>
 * do feed é sempre o vídeo mais recente.
 */
export async function getLatestAttraVideo(): Promise<YouTubeVideo | null> {
  try {
    const resp = await fetch(RSS_URL, {
      // ISR: cacheia o resultado por 1h. Não martela o YouTube a cada request.
      next: { revalidate: REVALIDATE_SECONDS },
    })
    if (!resp.ok) {
      console.error('[youtube-feed] RSS HTTP', resp.status)
      return null
    }

    const xml = await resp.text()

    // Primeiro <entry> = vídeo mais recente
    const entryMatch = xml.match(/<entry>([\s\S]*?)<\/entry>/)
    if (!entryMatch) return null
    const entry = entryMatch[1]

    const videoId = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1]
    const title = entry.match(/<media:title>([^<]+)<\/media:title>/)?.[1]
      ?? entry.match(/<title>([^<]+)<\/title>/)?.[1]
    const publishedAt = entry.match(/<published>([^<]+)<\/published>/)?.[1]

    if (!videoId) return null

    return {
      videoId,
      title: title ?? 'Attra Veículos',
      publishedAt: publishedAt ?? '',
    }
  } catch (error) {
    console.error('[youtube-feed] failed:', error)
    return null
  }
}
