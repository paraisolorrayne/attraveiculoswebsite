/**
 * YouTube feed da Attra — o vídeo mais recente do canal que REALMENTE TOCA.
 *
 * O feed RSS do YouTube não aceita @handle, só channel_id. O ID do
 * @attraveiculos foi resolvido uma vez (extraído do HTML da página do canal) e
 * fixado aqui — channel_id não muda.
 *
 * Usado no hero da home pra mostrar o último vídeo em autoplay mudo.
 *
 * POR QUE NÃO BASTA PEGAR O PRIMEIRO DO FEED. O RSS lista ESTREIAS AGENDADAS
 * junto dos vídeos publicados, e sem nenhuma marca que as distinga: mesma
 * estrutura, mesma thumbnail, `<published>` no passado (é a data em que o vídeo
 * foi criado, não a da estreia). O hero então carregava um embed que mostra a
 * capa e não toca — foi o que aconteceu em 04/09/2026 com o vídeo das Ferrari,
 * marcado para estrear 30 horas depois.
 *
 * O QUE DISTINGUE é o `playabilityStatus` da página do vídeo: `OK` num
 * publicado, `LIVE_STREAM_OFFLINE` numa estreia que ainda não aconteceu.
 * Medido nos dois casos reais em 05/09/2026. Descartei dois sinais mais
 * baratos antes de chegar aqui:
 *
 *   oembed        devolve 200 para os dois — a página existe publicamente
 *                 mesmo antes de estrear, então não diferencia nada.
 *   views=0       o RSS traz `<media:statistics views="0">` na estreia. É
 *                 heurística: um vídeo recém-publicado também pode estar em
 *                 zero, e aí o hero esconderia um vídeo bom por até uma hora.
 *
 * O CUSTO É ACEITÁVEL porque a verificação só roda quando o cache de 1h expira:
 * a página do vídeo tem ~1,2 MB, e isso é uma vez por hora no servidor, não a
 * cada visita.
 */

const ATTRA_CHANNEL_ID = 'UCkjTjmzoOvIZJR-Ze0hNVDg'
const RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${ATTRA_CHANNEL_ID}`
const REVALIDATE_SECONDS = 3600 // 1h — não precisa checar vídeo novo com mais frequência

/**
 * Quantos vídeos do topo do feed vale verificar.
 *
 * Quatro cobre com folga o caso real (uma estreia agendada por vez, às vezes
 * duas). Passar disso seria pagar downloads de 1,2 MB atrás de um cenário que
 * não acontece — e o fallback abaixo já resolve se acontecer.
 */
const CANDIDATOS = 4

/** Teto por verificação. O hero não pode ficar esperando o YouTube. */
const TIMEOUT_MS = 4000

export interface YouTubeVideo {
	videoId: string
	title: string
	publishedAt: string
}

/** O que a verificação conseguiu concluir sobre um vídeo. */
export type Reproduzivel = 'sim' | 'nao' | 'indeterminado'

/**
 * Lê as entradas do XML do feed. Função pura — o primeiro `<entry>` é sempre o
 * vídeo mais recente, e a ordem do feed é preservada.
 */
export function parsearFeed(xml: string): YouTubeVideo[] {
	const videos: YouTubeVideo[] = []
	for (const [, entry] of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
		const videoId = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1]
		if (!videoId) continue
		const title =
			entry.match(/<media:title>([^<]+)<\/media:title>/)?.[1] ??
			entry.match(/<title>([^<]+)<\/title>/)?.[1]
		videos.push({
			videoId,
			title: title ?? 'Attra Veículos',
			publishedAt: entry.match(/<published>([^<]+)<\/published>/)?.[1] ?? '',
		})
	}
	return videos
}

/**
 * Lê o `playabilityStatus` do HTML da página do vídeo. Função pura.
 *
 * NÃO ENCONTRAR devolve `indeterminado`, e não `nao`: se o YouTube mudar a
 * forma do JSON, o certo é o hero continuar mostrando o vídeo mais novo como
 * antes — voltar ao comportamento anterior é aceitável, esconder todo vídeo do
 * canal não é.
 */
export function lerPlayability(html: string): Reproduzivel {
	const status = html.match(/"playabilityStatus":\s*\{\s*"status":\s*"([A-Z_]+)"/)?.[1]
	if (!status) return 'indeterminado'
	return status === 'OK' ? 'sim' : 'nao'
}

/**
 * O primeiro vídeo da lista que não seja comprovadamente irreproduzível.
 *
 * `indeterminado` conta como bom, de propósito (ver `lerPlayability`). Se todos
 * os candidatos verificados forem estreias, cai no primeiro NÃO verificado —
 * vídeo antigo é publicado, e mostrar um vídeo velho é melhor que esconder a
 * coluna de vídeo do hero.
 *
 * Recebe o verificador por parâmetro para poder ser testada sem rede.
 */
export async function escolherReproduzivel(
	videos: YouTubeVideo[],
	verificar: (videoId: string) => Promise<Reproduzivel>,
	candidatos = CANDIDATOS,
): Promise<YouTubeVideo | null> {
	if (!videos.length) return null
	const aVerificar = videos.slice(0, candidatos)
	for (const video of aVerificar) {
		if ((await verificar(video.videoId)) !== 'nao') return video
	}
	return videos[candidatos] ?? videos[0]
}

async function verificarNoYouTube(videoId: string): Promise<Reproduzivel> {
	try {
		const resp = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
			signal: AbortSignal.timeout(TIMEOUT_MS),
			next: { revalidate: REVALIDATE_SECONDS },
		})
		if (!resp.ok) return 'indeterminado'
		return lerPlayability(await resp.text())
	} catch (e) {
		console.warn('[youtube-feed] não verifiquei', videoId, e)
		return 'indeterminado'
	}
}

/**
 * O vídeo do hero. Null em qualquer falha — o caller esconde a coluna de vídeo.
 */
export async function getLatestAttraVideo(): Promise<YouTubeVideo | null> {
	try {
		const resp = await fetch(RSS_URL, {
			// ISR: cacheia o resultado por 1h. Não martela o YouTube a cada request.
			signal: AbortSignal.timeout(TIMEOUT_MS),
			next: { revalidate: REVALIDATE_SECONDS },
		})
		if (!resp.ok) {
			console.error('[youtube-feed] RSS HTTP', resp.status)
			return null
		}
		return await escolherReproduzivel(parsearFeed(await resp.text()), verificarNoYouTube)
	} catch (error) {
		console.error('[youtube-feed] failed:', error)
		return null
	}
}
