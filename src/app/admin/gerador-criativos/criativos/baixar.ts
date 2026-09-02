'use client'

/**
 * Exportação da peça: dois PNGs no computador e dois cards no board do Marketing.
 *
 * Não há opção de "enviar ao marketing". Havia um checkbox, e ele precisava ser
 * marcado a cada peça; quando o operador esquecia, a peça era gerada e nunca
 * chegava ao board — sem aviso nenhum. Agora gerou, foi.
 */

import {
	ALTURA_FEED,
	ALTURA_STORIES,
	LARGURA,
	render,
	renderFeed,
	type Assets,
	type EstadoCriativo,
	type ImagensDoOperador,
} from '@content/admin/creative/gerador'

/** Nome do arquivo a partir dos campos — o mesmo esquema do HTML. */
export function nomeDaPeca(estado: EstadoCriativo): string {
	const limpar = (s: string) =>
		s.replace(/\s+/g, '-').replace(/[^\w\-.]/g, '').replace(/-+/g, '-')
	if (estado.tipo === 'estoque') return 'Attra-Estoque'
	const nome =
		[estado.marca, estado.modelo, estado.ano]
			.map(s => s.trim())
			.filter(Boolean)
			.map(limpar)
			.join('-') || 'criativo-attra'
	return estado.tipo === 'destaque' ? nome + '-DESTAQUE' : nome
}

/**
 * toBlob em vez de toDataURL: no Safari o dataURL de um PNG com textura passa
 * do teto e falha CALADO — devolve string truncada e o download sai corrompido.
 */
function gerarPng(canvas: HTMLCanvasElement): Promise<Blob> {
	return new Promise((ok, erro) => {
		try {
			canvas.toBlob(b => (b ? ok(b) : erro(new Error('Falha ao gerar o PNG — tente novamente.'))), 'image/png')
		} catch (e) {
			erro(e)
		}
	})
}

/** Espera n milissegundos. */
const esperar = (ms: number) => new Promise<void>(ok => setTimeout(ok, ms))

/**
 * Baixa um blob — e só volta quando o navegador já assumiu o download.
 *
 * POR QUE ESPERAR, se `a.click()` é síncrono. Ele dispara o download, mas quem
 * o conclui é o navegador, num passo próprio. A versão anterior fazia
 * `a.click(); a.remove()` na mesma linha e chamava os dois arquivos em
 * sequência imediata — os dois cliques saíam com 2ms de diferença. Dava certo
 * quase sempre, e quando não dava, o que faltava era sempre o STORIES: ele é o
 * primeiro da fila e o maior dos dois (2,7 MB contra 1,7 MB do Feed), então é
 * o que ainda não tinha sido assumido quando o elemento sumia embaixo dele. O
 * operador recebia só o Feed e não tinha como saber que faltou metade.
 *
 * Duas correções, porque são duas causas somadas: o elemento só sai um tique
 * depois do clique, e os dois downloads passaram a ocorrer em tarefas
 * separadas (ver `exportarPeca`) — dois downloads no mesmo tique também
 * esbarram na heurística de "múltiplos downloads automáticos" do Chrome.
 */
async function baixarBlob(blob: Blob, arquivo: string): Promise<void> {
	const url = URL.createObjectURL(blob)
	const a = document.createElement('a')
	a.href = url
	a.download = arquivo
	a.rel = 'noopener'
	document.body.appendChild(a)
	a.click()
	await esperar(400)
	a.remove()
	// Generoso de propósito: revogar cedo demais aborta um download que o
	// navegador ainda esteja gravando em disco.
	setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

async function enviarAoMarketing(blob: Blob, nome: string, formato: 'stories' | 'feed') {
	const fd = new FormData()
	fd.append('file', blob, `${nome}-${formato.toUpperCase()}.png`)
	fd.append('vehicle_name', nome)
	fd.append('format', formato)
	const r = await fetch('/api/admin/marketing/creatives', { method: 'POST', body: fd })
	if (r.ok) return
	const d = await r.json().catch(() => null)
	throw new Error(d?.error || `HTTP ${r.status}`)
}

export interface ResultadoExportacao {
	/** Mensagem pronta para a tela. */
	mensagem: string
	/** Baixou os dois arquivos, mesmo que o envio ao board tenha falhado. */
	baixou: boolean
}

/**
 * Gera Stories e Feed, baixa os dois e envia os dois ao board.
 *
 * O Feed nasce num canvas fora da tela: renderizá-lo junto da prévia deixaria
 * cada movimento de slider duas vezes mais lento, e ninguém olha para ele
 * enquanto ajusta.
 */
export async function exportarPeca(
	canvasStories: HTMLCanvasElement,
	estado: EstadoCriativo,
	imagens: ImagensDoOperador,
	assets: Assets,
	aoAndar?: (m: string) => void,
): Promise<ResultadoExportacao> {
	const nome = nomeDaPeca(estado)
	aoAndar?.('Gerando Stories e Feed…')

	// A prévia pode estar num quadro atrasado; redesenha o Stories para garantir
	// que o arquivo é o que está na tela AGORA.
	const ctx = canvasStories.getContext('2d')
	if (!ctx) throw new Error('Canvas indisponível.')
	render(ctx, estado, imagens, assets, ALTURA_STORIES)

	const canvasFeed = renderFeed(estado, imagens, assets)
	const [stories, feed] = await Promise.all([gerarPng(canvasStories), gerarPng(canvasFeed)])

	// Um de cada vez, e não os dois em sequência imediata — ver `baixarBlob`.
	await baixarBlob(stories, `${nome}-STORIES-v1.png`)
	await baixarBlob(feed, `${nome}-FEED-v1.png`)

	aoAndar?.('Enviando os dois ao Marketing…')
	const envios = await Promise.allSettled([
		enviarAoMarketing(stories, nome, 'stories'),
		enviarAoMarketing(feed, nome, 'feed'),
	])
	const falhas = envios
		.map((e, i) =>
			e.status === 'rejected' ? `${i ? 'Feed' : 'Stories'} (${(e.reason as Error).message})` : null,
		)
		.filter(Boolean)

	return {
		baixou: true,
		mensagem: falhas.length
			? `Baixados, mas não chegaram ao Marketing: ${falhas.join('; ')}`
			: 'Stories 9:16 e Feed 4:5 baixados e enviados ao board do Marketing.',
	}
}

export { ALTURA_FEED, ALTURA_STORIES, LARGURA }
