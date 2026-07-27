/**
 * Backfill de links internos no acervo do blog (Fase -1 do canal editorial).
 *
 * Roda na VPS (precisa de DATABASE_URL no ambiente):
 *   npx tsx scripts/backfill-internal-links.ts          # dry-run: só reporta
 *   npx tsx scripts/backfill-internal-links.ts --apply  # grava no banco
 *
 * Regras:
 * - Só toca posts do banco (dual_blog_posts). Os 42 posts importados do
 *   WordPress vivem em src/lib/imported-blog-posts.ts e ficam de fora.
 * - Cap TOTAL de 5 links internos por post: desconta os que o post já tem
 *   (class="blog-internal-link"), então re-rodar é seguro.
 */
import fs from 'node:fs'
import { db } from '../src/lib/db'
import { getBlogPosts } from '../src/lib/blog-api'
import { buildLinkIndex, linkifyHtml } from '../src/lib/blog-ai/internal-linker'

const MAX_TOTAL_LINKS = 5
const REPORT_FILE = 'backfill-internal-links.report.txt'

async function main() {
	const apply = process.argv.includes('--apply')
	if (!process.env.DATABASE_URL) {
		console.error('DATABASE_URL ausente — rode este script na VPS (ver src/lib/db/index.ts).')
		process.exit(1)
	}

	const allPosts = await getBlogPosts({ type: 'all' })
	const dbPosts = await db.selectFrom('dual_blog_posts').selectAll().where('is_published', '=', true).execute()
	console.log(`Acervo: ${allPosts.length} posts no índice de termos; ${dbPosts.length} posts do banco elegíveis.`)

	let touched = 0
	let totalAdded = 0
	const report: string[] = []
	for (const row of dbPosts) {
		const slug = row.slug as string
		const content = row.content as string
		const existing = (content.match(/class="blog-internal-link"/g) || []).length
		const budget = MAX_TOTAL_LINKS - existing
		if (budget <= 0) continue

		// Priority-first: no backfill, o conteúdo âncora leva os slots antes
		// de termos meramente mais longos (na geração diária o sort padrão
		// longest-first do linkifyHtml continua valendo)
		const targets = buildLinkIndex(allPosts, slug)
			.sort((a, b) => b.priority - a.priority || b.term.length - a.term.length)
		const { html, linksAdded } = linkifyHtml(content, targets, budget)
		if (linksAdded === 0) continue

		touched++
		totalAdded += linksAdded
		console.log(`${apply ? 'APLICANDO' : 'dry-run'}: ${slug} +${linksAdded} links (já tinha ${existing})`)
		// Registro de cada link inserido, pra revisão antes do --apply
		const inserted = [...html.matchAll(/<a href="([^"]+)" class="blog-internal-link">([^<]+)<\/a>/g)]
			.filter(m => !content.includes(m[0]))
			.map(m => `  "${m[2]}" -> ${m[1]}`)
		report.push(`${slug} (+${linksAdded}, já tinha ${existing})\n${inserted.join('\n')}`)
		if (apply) {
			await db.updateTable('dual_blog_posts')
				.set({ content: html, updated_date: new Date() })
				.where('id', '=', row.id)
				.execute()
		}
	}

	fs.writeFileSync(REPORT_FILE, report.join('\n\n') + '\n')
	console.log(`\n${apply ? 'Gravado' : 'Dry-run'}: ${touched} posts, ${totalAdded} links novos.`)
	console.log(`Relatório link a link em ${REPORT_FILE}`)
}

main()
	.catch((err) => {
		console.error(err)
		process.exitCode = 1
	})
	.finally(() => db.destroy().catch(() => {}))
