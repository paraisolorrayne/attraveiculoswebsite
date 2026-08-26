import { NextResponse } from 'next/server'
import { sql } from 'kysely'
import { db } from '@/lib/db'
import { getBlogPosts } from '@/lib/blog-api'
import { SITE_URL } from '@/lib/constants'
import { loadListedInventory } from '@/app/api/llm/_inventory'
import {
	assinaturaDoPost,
	assinaturaDoVeiculo,
	diffParaSubmeter,
	enviarIndexNow,
	type UrlAssinada,
} from '@/lib/indexnow'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const BASE = (process.env.NEXT_PUBLIC_SITE_URL ?? SITE_URL).replace(/\/$/, '')

/**
 * POST /api/indexnow/sync — avisa o IndexNow do que mudou desde a última rodada.
 *
 * Disparado de hora em hora por /etc/cron.d/attra-indexnow-sync (mesmo padrão
 * do embeddings-sync: CRON_SECRET no Authorization). Fluxo:
 *   1. monta URL + assinatura de cada veículo à venda e de cada post publicado;
 *   2. compara com indexnow_submissions (última assinatura enviada);
 *   3. envia alterados + removidos (o motor recrawla e vê o 404/vendido);
 *   4. quando o estoque mudou, envia também as páginas que o listam
 *      (/veiculos, /comprar, /llms.txt) — são elas que os assistentes citam;
 *   5. grava o novo estado.
 *
 * Sem INDEXNOW_KEY responde 200 com `desligado: true` — o cron não quebra,
 * mas o log deixa claro que nada foi enviado.
 */
export async function POST(request: Request) {
	const cronSecret = process.env.CRON_SECRET
	if (!cronSecret) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
	if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	}

	const chave = process.env.INDEXNOW_KEY
	if (!chave) return NextResponse.json({ desligado: true, motivo: 'INDEXNOW_KEY não configurada' })

	try {
		const [{ vehicles }, posts] = await Promise.all([loadListedInventory(), getBlogPosts()])

		const atual: UrlAssinada[] = [
			...vehicles.map(v => ({
				url: `${BASE}/veiculo/${v.slug}`,
				assinatura: assinaturaDoVeiculo(v),
			})),
			...posts.map(p => ({
				url: `${BASE}/blog/${p.slug}`,
				assinatura: assinaturaDoPost(p),
			})),
		]

		const linhas = await db.selectFrom('indexnow_submissions').select(['url', 'assinatura']).execute()
		const anterior = new Map(linhas.map(l => [l.url, l.assinatura]))
		const { alterados, removidos } = diffParaSubmeter(atual, anterior)

		const estoqueMudou = alterados.some(a => a.url.includes('/veiculo/')) || removidos.some(u => u.includes('/veiculo/'))
		const listagens = estoqueMudou ? [`${BASE}/veiculos`, `${BASE}/comprar`, `${BASE}/llms.txt`, BASE] : []

		const urls = [...alterados.map(a => a.url), ...removidos, ...listagens]
		const envio = await enviarIndexNow(urls, { chave, host: new URL(BASE).host })

		// Só grava o estado se o envio foi aceito; senão a próxima rodada tenta de novo.
		if (envio.falhas.length === 0 && urls.length > 0) {
			if (alterados.length) {
				await db.insertInto('indexnow_submissions')
					.values(alterados.map(a => ({ url: a.url, assinatura: a.assinatura })))
					.onConflict(oc => oc.column('url').doUpdateSet({
						assinatura: eb => eb.ref('excluded.assinatura'),
						submitted_at: sql`now()`,
					}))
					.execute()
			}
			if (removidos.length) {
				await db.deleteFrom('indexnow_submissions').where('url', 'in', removidos).execute()
			}
		}

		return NextResponse.json({
			veiculos: vehicles.length,
			posts: posts.length,
			alterados: alterados.length,
			removidos: removidos.length,
			listagens: listagens.length,
			...envio,
		})
	} catch (error) {
		console.error('[indexnow] sync falhou:', error)
		return NextResponse.json({ error: error instanceof Error ? error.message : 'sync failed' }, { status: 500 })
	}
}
