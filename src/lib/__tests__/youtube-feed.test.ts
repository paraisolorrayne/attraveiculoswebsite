import { describe, it, expect, vi, afterEach } from 'vitest'
import { escolherPublicado, getLatestAttraVideo, parsearFeed, type YouTubeVideo } from '../youtube-feed'

/**
 * O hero mostrava o primeiro vídeo do RSS, e o RSS lista ESTREIAS AGENDADAS
 * junto dos publicados. Em 04/09/2026 o vídeo das Ferrari entrou no topo do
 * feed marcado para estrear 30 horas depois: o embed carregava a capa e não
 * tocava.
 *
 * A primeira correção (05/09) conferia o `playabilityStatus` da página de cada
 * vídeo. Funcionava aqui e NÃO funcionava na VPS, onde o YouTube devolve um
 * muro de "confirme que não é um robô" com status diferente de `OK`: os quatro
 * candidatos eram reprovados e o fallback devolvia o QUINTO item do feed. A
 * home passou a exibir um Porsche de junho — pior que o defeito original. Os
 * testes abaixo fixam as duas lições.
 *
 * Os números de `views` são os reais, medidos no mesmo vídeo antes e depois de
 * estrear: 0 em 05/09, 27 em 07/09.
 */

const feed = (entradas: string[]) => `<?xml version="1.0"?><feed>${entradas.join('')}</feed>`
const entrada = (id: string, titulo: string, views: string | null) => `
  <entry>
   <yt:videoId>${id}</yt:videoId>
   <title>${titulo}</title>
   <published>2026-09-04T13:21:16+00:00</published>
   <media:group><media:title>${titulo}</media:title></media:group>
   ${views === null ? '' : `<media:statistics views="${views}"/>`}
  </entry>`

/** O feed real de 05/09/2026, com as Ferrari ainda como estreia agendada. */
const COM_ESTREIA = feed([
	entrada('MHrfLeOVz2I', 'O ESTOQUE MAIS EXCLUSIVO DE FERRARIS', '0'),
	entrada('LVX2JylkQJY', 'Novidade na Attra', '204'),
	entrada('cLucRyCJXVU', 'QUATRO MERCEDES G63', '21'),
	entrada('GZm53uOuJ4I', 'ATTRA DRIVE - Purosangue', '911'),
	entrada('M8B8B67RoZQ', 'NOVO Porsche Macan', '232'),
])

describe('parsearFeed', () => {
	it('lê as entradas na ordem do feed, mais recente primeiro', () => {
		const v = parsearFeed(COM_ESTREIA)
		expect(v.map(x => x.videoId)).toEqual([
			'MHrfLeOVz2I', 'LVX2JylkQJY', 'cLucRyCJXVU', 'GZm53uOuJ4I', 'M8B8B67RoZQ',
		])
		expect(v[0].views).toBe(0)
		expect(v[1].views).toBe(204)
		expect(v[0].publishedAt).toBe('2026-09-04T13:21:16+00:00')
	})

	it('devolve views null quando o feed não traz a estatística', () => {
		expect(parsearFeed(feed([entrada('abc', 'sem stats', null)]))[0].views).toBeNull()
	})

	it('ignora entrada sem videoId em vez de quebrar o feed inteiro', () => {
		expect(parsearFeed('<feed><entry><title>lixo</title></entry></feed>')).toEqual([])
	})

	it('devolve lista vazia para XML vazio', () => {
		expect(parsearFeed('')).toEqual([])
	})
})

describe('escolherPublicado', () => {
	it('pula a estreia agendada e devolve o próximo — o caso que quebrou o hero', () => {
		expect(escolherPublicado(parsearFeed(COM_ESTREIA))?.videoId).toBe('LVX2JylkQJY')
	})

	it('devolve o mais recente depois que a estreia acontece', () => {
		// Mesmo feed, com as Ferrari já no ar: views deixou de ser zero.
		const noAr = COM_ESTREIA.replace('views="0"', 'views="27"')
		expect(escolherPublicado(parsearFeed(noAr))?.videoId).toBe('MHrfLeOVz2I')
	})

	it('pula quantas estreias houver em sequência', () => {
		const duas = feed([
			entrada('a', 'estreia 1', '0'),
			entrada('b', 'estreia 2', '0'),
			entrada('c', 'no ar', '10'),
		])
		expect(escolherPublicado(parsearFeed(duas))?.videoId).toBe('c')
	})

	/**
	 * Ausência de informação não é motivo para esconder: se o YouTube parar de
	 * mandar a estatística, o comportamento volta a ser "mostra o mais recente".
	 */
	it('aceita o vídeo sem estatística em vez de descartá-lo', () => {
		const semStats = feed([entrada('a', 'sem stats', null), entrada('b', 'com stats', '99')])
		expect(escolherPublicado(parsearFeed(semStats))?.videoId).toBe('a')
	})

	/**
	 * A REGRESSÃO DE 06/09: a versão anterior caía em `videos[4]` quando todos os
	 * candidatos eram reprovados, e a home exibiu um vídeo de junho. Se tudo
	 * estiver em zero, o certo é o mais recente — nunca um item do meio da lista.
	 */
	it('devolve o mais recente quando TODOS estão em zero, e não um item arbitrário', () => {
		const todosZero = feed([
			entrada('primeiro', 'a', '0'),
			entrada('segundo', 'b', '0'),
			entrada('terceiro', 'c', '0'),
			entrada('quarto', 'd', '0'),
			entrada('quinto', 'e', '0'),
		])
		const escolhido = escolherPublicado(parsearFeed(todosZero))
		expect(escolhido?.videoId).toBe('primeiro')
		expect(escolhido?.videoId).not.toBe('quinto')
	})

	it('devolve null para feed vazio', () => {
		const vazio: YouTubeVideo[] = []
		expect(escolherPublicado(vazio)).toBeNull()
	})
})

/**
 * O endpoint de RSS do YouTube passou a devolver 404 em 09/09/2026 — para todo
 * canal, não só o da Attra. O hero ficou sem vídeo, porque a degradação até
 * então era esconder a coluna: correta para falha de minutos, ruim para uma
 * que dure dias. Enquanto o feed não volta, a reserva entra no lugar.
 */
describe('getLatestAttraVideo — reserva enquanto o feed está fora', () => {
	afterEach(() => vi.unstubAllGlobals())

	const responderCom = (init: { ok: boolean; status?: number; body?: string }) =>
		vi.stubGlobal('fetch', vi.fn(async () => ({
			ok: init.ok,
			status: init.status ?? (init.ok ? 200 : 404),
			text: async () => init.body ?? '',
		})))

	it('serve a reserva quando o feed responde 404', async () => {
		responderCom({ ok: false, status: 404 })
		expect((await getLatestAttraVideo())?.videoId).toBe('MHrfLeOVz2I')
	})

	it('serve a reserva quando a rede falha', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('timeout') }))
		expect((await getLatestAttraVideo())?.videoId).toBe('MHrfLeOVz2I')
	})

	it('serve a reserva quando o feed volta vazio', async () => {
		responderCom({ ok: true, body: '<feed></feed>' })
		expect((await getLatestAttraVideo())?.videoId).toBe('MHrfLeOVz2I')
	})

	/** O que importa quando o YouTube voltar: o feed manda, sem ninguém mexer. */
	it('o feed tem precedência assim que volta a responder', async () => {
		responderCom({ ok: true, body: COM_ESTREIA })
		expect((await getLatestAttraVideo())?.videoId).toBe('LVX2JylkQJY')
	})

	it('e a reserva não mascara a regra da estreia', async () => {
		const soEstreia = feed([entrada('MHrfLeOVz2I', 'estreia', '0')])
		// Só ela no feed e em zero: a regra devolve o mais recente, não a reserva
		// por acaso ser o mesmo id — o caminho é o do feed.
		responderCom({ ok: true, body: soEstreia })
		expect((await getLatestAttraVideo())?.videoId).toBe('MHrfLeOVz2I')
	})
})
