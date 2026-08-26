/**
 * IndexNow — avisa Bing (e quem bebe do índice dele: Copilot e a busca do
 * ChatGPT) que uma URL mudou, em vez de esperar o crawler voltar.
 *
 * Existe porque o estoque da Attra muda todo dia e as respostas "à venda" de
 * assistentes de IA dependem de índice fresco. Sem o ping, um carro vendido
 * continua sendo citado com preço até o Bingbot decidir recrawlar.
 *
 * Protocolo (https://www.indexnow.org/documentation): POST JSON em
 * api.indexnow.org com `host`, `key`, `keyLocation` e até 10.000 URLs. A chave
 * é um texto público servido em /indexnow/{chave}.txt — o motor confere que
 * quem avisa controla o host. Um ping por dia por URL basta; o diff abaixo
 * garante que só o que mudou é enviado.
 *
 * Este módulo é puro (recebe fetch por injeção) para ser testável; a rota
 * /api/indexnow/sync é quem lê o estoque, o banco e chama `enviarIndexNow`.
 */

export const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow'
export const INDEXNOW_LOTE_MAXIMO = 10_000

export interface UrlAssinada {
	url: string
	/** Resumo do que importa na página; se mudar, a URL é reenviada. */
	assinatura: string
}

/** Veículo: preço, disponibilidade e data de publicação. Foto e texto não contam. */
export function assinaturaDoVeiculo(v: {
	slug: string; price: number | null | undefined; status: string; updated_at?: string | null
}): string {
	return [v.slug, v.price ?? '', v.status, v.updated_at ?? ''].join('|')
}

export function assinaturaDoPost(p: {
	slug: string; published_date: string; updated_date?: string | null
}): string {
	return [p.slug, p.published_date, p.updated_date ?? ''].join('|')
}

export interface Diff {
	/** Novas ou com assinatura diferente da última submissão. */
	alterados: UrlAssinada[]
	/** Estavam na última submissão e não estão mais — o motor precisa recrawlar e ver o 404/vendido. */
	removidos: string[]
}

export function diffParaSubmeter(atual: UrlAssinada[], anterior: Map<string, string>): Diff {
	const alterados = atual.filter(a => anterior.get(a.url) !== a.assinatura)
	const atuais = new Set(atual.map(a => a.url))
	const removidos = [...anterior.keys()].filter(u => !atuais.has(u))
	return { alterados, removidos }
}

export function montarLotes(urls: string[]): string[][] {
	const lotes: string[][] = []
	for (let i = 0; i < urls.length; i += INDEXNOW_LOTE_MAXIMO) {
		lotes.push(urls.slice(i, i + INDEXNOW_LOTE_MAXIMO))
	}
	return lotes
}

export function urlDaChave(base: string, chave: string): string {
	return `${base.replace(/\/$/, '')}/indexnow/${chave}.txt`
}

export interface ResultadoEnvio {
	enviados: number
	lotes: number
	falhas: string[]
}

export async function enviarIndexNow(
	urls: string[],
	opts: { chave: string; host: string; fetchImpl?: typeof fetch },
): Promise<ResultadoEnvio> {
	const fetchImpl = opts.fetchImpl ?? fetch
	const resultado: ResultadoEnvio = { enviados: 0, lotes: 0, falhas: [] }
	for (const lote of montarLotes(urls)) {
		resultado.lotes++
		try {
			const r = await fetchImpl(INDEXNOW_ENDPOINT, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json; charset=utf-8' },
				body: JSON.stringify({
					host: opts.host,
					key: opts.chave,
					keyLocation: urlDaChave(`https://${opts.host}`, opts.chave),
					urlList: lote,
				}),
			})
			// 200 = ok, 202 = aceito (chave ainda a validar). O resto é erro.
			if (r.status === 200 || r.status === 202) resultado.enviados += lote.length
			else resultado.falhas.push(`HTTP ${r.status}: ${(await r.text().catch(() => '')).slice(0, 200)}`)
		} catch (e) {
			resultado.falhas.push(e instanceof Error ? e.message : String(e))
		}
	}
	return resultado
}
