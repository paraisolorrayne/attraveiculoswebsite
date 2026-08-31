/**
 * Esvazia o board de criativos do Marketing (/admin/marketing).
 *
 * Roda na VPS (precisa de DATABASE_URL no ambiente):
 *   npx tsx scripts/limpar-criativos-marketing.ts            # dry-run: só lista
 *   npx tsx scripts/limpar-criativos-marketing.ts --apagar   # apaga de verdade
 *
 * APAGA O ARQUIVO TAMBÉM, não só a linha.
 *
 * Cada criativo é um par: uma linha em `marketing_creatives` e um PNG no bucket
 * `creatives` do disco. Um `DELETE FROM marketing_creatives` limparia o board e
 * deixaria os arquivos órfãos ocupando disco para sempre, sem nada no banco
 * apontando para eles — ninguém encontraria depois. Este script repete o que a
 * rota DELETE /api/admin/marketing/creatives/[id] faz, uma linha por vez.
 *
 * NÃO TEM DESFAZER. Por isso o padrão é dry-run: sem `--apagar` ele só mostra o
 * que sairia, e o total em disco.
 */
import { db } from '../src/lib/db'
import { deleteObject, objectPathFromUrl } from '../src/lib/storage/disk'

const BUCKET = 'creatives'

async function main() {
	const apagar = process.argv.includes('--apagar')

	if (!process.env.DATABASE_URL) {
		console.error('DATABASE_URL ausente — rode este script na VPS.')
		process.exit(1)
	}

	const criativos = await db
		.selectFrom('marketing_creatives')
		.select(['id', 'image_url', 'vehicle_name', 'format', 'status', 'created_at'])
		.orderBy('created_at', 'desc')
		.execute()

	if (criativos.length === 0) {
		console.log('O board já está vazio — nada a fazer.')
		await db.destroy()
		return
	}

	console.log(`${criativos.length} criativo(s) no board:\n`)
	for (const c of criativos) {
		const quando = new Date(c.created_at as unknown as string).toLocaleString('pt-BR')
		const nome = c.vehicle_name ?? '(sem nome)'
		console.log(`  ${quando}  ${String(c.format).padEnd(7)}  ${String(c.status).padEnd(10)}  ${nome}`)
	}

	if (!apagar) {
		console.log(
			`\nDRY-RUN — nada foi apagado.\n` +
				`Para apagar os ${criativos.length} de verdade (linha + arquivo, sem desfazer):\n` +
				`  npx tsx scripts/limpar-criativos-marketing.ts --apagar`,
		)
		await db.destroy()
		return
	}

	console.log(`\nApagando ${criativos.length}…`)
	let linhas = 0
	let arquivos = 0
	const semArquivo: string[] = []

	for (const c of criativos) {
		// Arquivo primeiro, best-effort: se ele já não existir, a linha ainda
		// precisa sair, senão o board fica com um card apontando para o vazio.
		const caminho = objectPathFromUrl(c.image_url, BUCKET)
		if (caminho) {
			try {
				await deleteObject(BUCKET, caminho)
				arquivos++
			} catch (e) {
				semArquivo.push(`${c.id}: ${e instanceof Error ? e.message : String(e)}`)
			}
		} else {
			semArquivo.push(`${c.id}: URL fora do bucket ${BUCKET} (${c.image_url})`)
		}
		await db.deleteFrom('marketing_creatives').where('id', '=', c.id).execute()
		linhas++
	}

	console.log(`\n${linhas} linha(s) apagada(s), ${arquivos} arquivo(s) removido(s) do disco.`)
	if (semArquivo.length) {
		console.log(`\n${semArquivo.length} arquivo(s) não saíram (a linha saiu mesmo assim):`)
		for (const m of semArquivo) console.log(`  ${m}`)
	}

	const restam = await db
		.selectFrom('marketing_creatives')
		.select(db.fn.countAll().as('n'))
		.executeTakeFirst()
	console.log(`\nRestam no board: ${restam?.n ?? '?'}`)

	await db.destroy()
}

main().catch(async e => {
	console.error(e)
	await db.destroy().catch(() => {})
	process.exit(1)
})
