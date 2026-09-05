import { describe, it, expect } from 'vitest'
import {
	escolherReproduzivel,
	lerPlayability,
	parsearFeed,
	type Reproduzivel,
	type YouTubeVideo,
} from '../youtube-feed'

/**
 * O hero da home mostrava o primeiro vídeo do RSS, e o RSS lista ESTREIAS
 * AGENDADAS junto dos publicados, sem nenhuma marca que as distinga. Em
 * 04/09/2026 o vídeo das Ferrari entrou no topo do feed marcado para estrear 30
 * horas depois: o embed carregava a capa e não tocava.
 *
 * Os trechos de XML e de HTML abaixo são recortes do que o YouTube devolveu de
 * verdade nos dois vídeos reais, medidos em 05/09/2026.
 */

const XML = `<?xml version="1.0" encoding="UTF-8"?>
<feed>
  <entry>
   <yt:videoId>MHrfLeOVz2I</yt:videoId>
   <title>O ESTOQUE MAIS EXCLUSIVO DE FERRARI'S</title>
   <published>2026-09-04T13:21:16+00:00</published>
   <media:group><media:title>O ESTOQUE MAIS EXCLUSIVO DE FERRARI'S</media:title></media:group>
  </entry>
  <entry>
   <yt:videoId>LVX2JylkQJY</yt:videoId>
   <title>Novidade na Attra</title>
   <published>2026-08-25T13:38:57+00:00</published>
   <media:group><media:title>Novidade na Attra</media:title></media:group>
  </entry>
  <entry>
   <yt:videoId>cLucRyCJXVU</yt:videoId>
   <title>QUATRO MERCEDES G63</title>
   <published>2026-08-12T12:13:13+00:00</published>
   <media:group><media:title>QUATRO MERCEDES G63</media:title></media:group>
  </entry>
</feed>`

describe('parsearFeed', () => {
	it('lê as entradas na ordem do feed, mais recente primeiro', () => {
		const v = parsearFeed(XML)
		expect(v.map(x => x.videoId)).toEqual(['MHrfLeOVz2I', 'LVX2JylkQJY', 'cLucRyCJXVU'])
		expect(v[0].title).toBe("O ESTOQUE MAIS EXCLUSIVO DE FERRARI'S")
		expect(v[0].publishedAt).toBe('2026-09-04T13:21:16+00:00')
	})

	it('ignora entrada sem videoId em vez de quebrar o feed inteiro', () => {
		expect(parsearFeed('<feed><entry><title>lixo</title></entry></feed>')).toEqual([])
	})

	it('devolve lista vazia para XML vazio', () => {
		expect(parsearFeed('')).toEqual([])
	})
})

describe('lerPlayability', () => {
	it('reconhece o vídeo publicado', () => {
		expect(lerPlayability('...{"playabilityStatus":{"status":"OK","playableInEmbed":true}...')).toBe('sim')
	})

	it('reconhece a estreia agendada — o caso que quebrou o hero', () => {
		const estreia = '...{"playabilityStatus":{"status":"LIVE_STREAM_OFFLINE","reason":"Estreia em 30 horas"}...'
		expect(lerPlayability(estreia)).toBe('nao')
	})

	it('trata qualquer outro status como não reproduzível', () => {
		expect(lerPlayability('{"playabilityStatus":{"status":"UNPLAYABLE"}')).toBe('nao')
		expect(lerPlayability('{"playabilityStatus":{"status":"LOGIN_REQUIRED"}')).toBe('nao')
	})

	/**
	 * Se o YouTube mudar a forma do JSON, o certo é voltar ao comportamento
	 * antigo (mostrar o mais novo), não esconder todo vídeo do canal.
	 */
	it('devolve indeterminado quando não acha o campo', () => {
		expect(lerPlayability('<html>página completamente diferente</html>')).toBe('indeterminado')
	})
})

describe('escolherReproduzivel', () => {
	const videos = parsearFeed(XML)
	const comVeredito = (mapa: Record<string, Reproduzivel>) => async (id: string) =>
		mapa[id] ?? 'sim'

	it('pula a estreia e devolve o próximo publicado', async () => {
		const escolhido = await escolherReproduzivel(
			videos,
			comVeredito({ MHrfLeOVz2I: 'nao' }),
		)
		expect(escolhido?.videoId).toBe('LVX2JylkQJY')
	})

	it('devolve o mais recente quando ele toca', async () => {
		const escolhido = await escolherReproduzivel(videos, comVeredito({}))
		expect(escolhido?.videoId).toBe('MHrfLeOVz2I')
	})

	it('pula quantas estreias houver em sequência', async () => {
		const escolhido = await escolherReproduzivel(
			videos,
			comVeredito({ MHrfLeOVz2I: 'nao', LVX2JylkQJY: 'nao' }),
		)
		expect(escolhido?.videoId).toBe('cLucRyCJXVU')
	})

	it('aceita o indeterminado em vez de descartá-lo', async () => {
		const escolhido = await escolherReproduzivel(
			videos,
			comVeredito({ MHrfLeOVz2I: 'indeterminado' }),
		)
		expect(escolhido?.videoId).toBe('MHrfLeOVz2I')
	})

	/**
	 * Vídeo velho é vídeo publicado. Mostrar um antigo é melhor que devolver
	 * null e sumir com a coluna de vídeo do hero.
	 */
	it('cai no primeiro não verificado se todos os candidatos forem estreias', async () => {
		const escolhido = await escolherReproduzivel(
			videos,
			comVeredito({ MHrfLeOVz2I: 'nao', LVX2JylkQJY: 'nao' }),
			2, // verifica só os dois primeiros
		)
		expect(escolhido?.videoId).toBe('cLucRyCJXVU')
	})

	it('não verifica além do necessário — para no primeiro que serve', async () => {
		const vistos: string[] = []
		await escolherReproduzivel(videos, async id => {
			vistos.push(id)
			return id === 'MHrfLeOVz2I' ? 'nao' : 'sim'
		})
		expect(vistos).toEqual(['MHrfLeOVz2I', 'LVX2JylkQJY'])
	})

	it('devolve null para feed vazio', async () => {
		const vazio: YouTubeVideo[] = []
		expect(await escolherReproduzivel(vazio, async () => 'sim')).toBeNull()
	})
})
