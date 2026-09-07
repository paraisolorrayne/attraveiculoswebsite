/**
 * YouTube feed da Attra — o vídeo mais recente do canal que REALMENTE TOCA.
 *
 * O feed RSS não aceita @handle, só channel_id. O ID do @attraveiculos foi
 * resolvido uma vez (extraído do HTML da página do canal) e fixado aqui —
 * channel_id não muda.
 *
 * Usado no hero da home pra mostrar o último vídeo em autoplay mudo.
 *
 * POR QUE NÃO BASTA PEGAR O PRIMEIRO DO FEED. O RSS lista ESTREIAS AGENDADAS
 * junto dos publicados, sem nenhuma marca óbvia que as distinga: mesma
 * estrutura, mesma thumbnail, `<published>` no passado (é a data em que o vídeo
 * foi criado, não a da estreia). O hero então carregava um embed que mostra a
 * capa e não toca — foi o que aconteceu em 04/09/2026 com o vídeo das Ferrari,
 * marcado para estrear 30 horas depois.
 *
 * O SINAL É `views="0"` NO PRÓPRIO RSS. Estreia agendada não tem exibição
 * nenhuma; publicado tem. Medido no mesmo vídeo, antes e depois de estrear:
 * `views=0` em 05/09 (agendado) e `views=27` em 07/09 (no ar).
 *
 * É HEURÍSTICA E ESSA ESCOLHA É DELIBERADA. Um vídeo recém-publicado também
 * pode estar em zero por alguns minutos, e nesse intervalo o hero mostra o
 * anterior. A troca é boa: perder o vídeo novo por minutos vale menos que
 * exibir uma capa que não toca por 30 horas.
 *
 * POR QUE NÃO CONFERIR NA PÁGINA DO VÍDEO — já tentamos, e quebrou pior.
 * A versão de 05/09 lia o `playabilityStatus` da página de cada candidato
 * (`OK` no publicado, `LIVE_STREAM_OFFLINE` na estreia). Funciona da máquina
 * de desenvolvimento e NÃO funciona da VPS: o YouTube serve ao IP de datacenter
 * um muro de "confirme que não é um robô", cujo status também é diferente de
 * `OK`. O código leu isso como "vídeo não toca", reprovou os quatro candidatos
 * e caiu num fallback que devolvia o quinto item do feed — a home passou a
 * exibir um vídeo de junho, pior que o problema original. O RSS, esse sim,
 * a VPS busca sem obstáculo: é onde o sinal tem que morar.
 */

const ATTRA_CHANNEL_ID = 'UCkjTjmzoOvIZJR-Ze0hNVDg'
const RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${ATTRA_CHANNEL_ID}`
const REVALIDATE_SECONDS = 3600 // 1h — não precisa checar vídeo novo com mais frequência
const TIMEOUT_MS = 4000

export interface YouTubeVideo {
	videoId: string
	title: string
	publishedAt: string
	/** Exibições segundo o RSS. `null` quando o feed não traz a tag. */
	views: number | null
}

/**
 * Lê as entradas do XML. Função pura — o primeiro `<entry>` é sempre o vídeo
 * mais recente, e a ordem do feed é preservada.
 */
export function parsearFeed(xml: string): YouTubeVideo[] {
	const videos: YouTubeVideo[] = []
	for (const [, entry] of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
		const videoId = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1]
		if (!videoId) continue
		const title =
			entry.match(/<media:title>([^<]+)<\/media:title>/)?.[1] ??
			entry.match(/<title>([^<]+)<\/title>/)?.[1]
		const views = entry.match(/<media:statistics[^>]*\bviews="(\d+)"/)?.[1]
		videos.push({
			videoId,
			title: title ?? 'Attra Veículos',
			publishedAt: entry.match(/<published>([^<]+)<\/published>/)?.[1] ?? '',
			views: views === undefined ? null : Number(views),
		})
	}
	return videos
}

/**
 * O vídeo mais recente que já está no ar.
 *
 * Pula só o que tem `views` EXATAMENTE zero. Sem a tag (`null`) o vídeo passa:
 * ausência de informação não é motivo para esconder — se o YouTube parar de
 * mandar a estatística, o comportamento volta a ser "mostra o mais recente",
 * que é o de antes desta correção, e não "não mostra nada".
 *
 * Se TODOS estiverem em zero — canal novo, ou uma leva inteira agendada —
 * devolve o mais recente. Nunca um item arbitrário do meio da lista: foi
 * exatamente esse fallback que pôs um vídeo de junho na home.
 */
export function escolherPublicado(videos: YouTubeVideo[]): YouTubeVideo | null {
	if (!videos.length) return null
	return videos.find(v => v.views !== 0) ?? videos[0]
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
		return escolherPublicado(parsearFeed(await resp.text()))
	} catch (error) {
		console.error('[youtube-feed] failed:', error)
		return null
	}
}
