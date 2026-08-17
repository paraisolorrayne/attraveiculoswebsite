import { NextResponse } from 'next/server'
import { sql } from 'kysely'
import { db } from '@/lib/db'
// Migrado de supabase-js → Kysely (ver docs/MIGRACAO_POSTGRES_PURO.md).
import { getVehicles } from '@/lib/autoconf-api'
import { generateEmbeddings } from '@/lib/jina'
import { passagemDoVeiculo } from '@/lib/mcp/passagem-do-veiculo'
import { derivarRotulos } from '@/lib/mcp/rotulos'
import { gerarProsa } from '@/lib/mcp/prosa'
import { lerRotulos, gravarRotulosDerivados } from '@/lib/mcp/repositorio-rotulos'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * POST /api/embeddings/sync
 *
 * Generates Jina embeddings for all available vehicles and upserts them into
 * the `vehicle_embeddings` table in Supabase (pgvector).
 *
 * Auth: requires CRON_SECRET header or admin session to prevent abuse.
 */
export async function POST(request: Request) {
	const authHeader = request.headers.get('authorization')
	const cronSecret = process.env.CRON_SECRET
	if (!cronSecret) {
		return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
	}
	if (authHeader !== `Bearer ${cronSecret}`) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	}

	if (!process.env.JINA_API_KEY) {
		return NextResponse.json({ error: 'JINA_API_KEY not configured' }, { status: 500 })
	}

	try {
		const result = await getVehicles({ tipo: 'carros', registros_por_pagina: 200 })
		const vehicles = result.vehicles.filter(v => v.status === 'available' || v.status === 'highlight')

		if (vehicles.length === 0) {
			return NextResponse.json({ synced: 0, message: 'No available vehicles' })
		}

		const batchSize = 20
		let synced = 0
		const errors: string[] = []
		const anoAtual = new Date().getFullYear()
		// Único sinal de saúde da camada de prosa: `gerarProsa` pode falhar 100%
		// (chave ausente, modelo com nome errado, cota, timeout, trava) e o
		// único indício antes disto era um `console.warn` que o build de
		// produção apaga (`removeConsole: true` em next.config.ts). `cacheadas`
		// inclui sobrescrita humana — nenhuma chamada ao gerador acontece nos
		// dois casos, ver `passagem-do-veiculo.ts`.
		const prosa = { geradas: 0, cacheadas: 0, reprovadas: 0, falhas: 0 }

		for (let i = 0; i < vehicles.length; i += batchSize) {
			const batch = vehicles.slice(i, i + batchSize)

			// Lote inteiro (rótulos + passagem + embedding) sob o mesmo catch de
			// batchErr: uma falha ao ler `vehicle_semantic_labels` ou ao montar a
			// passagem não pode derrubar a sincronização — vira erro acumulado
			// no array `errors` e o próximo lote segue normalmente.
			try {
				const gravados = await lerRotulos(batch.map(v => Number(v.id)))
				const resultados = await Promise.all(
					batch.map(v => passagemDoVeiculo(v, gravados.get(Number(v.id)), anoAtual, gerarProsa)),
				)
				const passages = resultados.map(r => r.passagem)

				for (const r of resultados) {
					if (r.origemProsa === 'gerada') prosa.geradas++
					else if (r.origemProsa === 'cache' || r.origemProsa === 'sobrescrita') prosa.cacheadas++
					else if (r.origemProsa === 'reprovada') prosa.reprovadas++
					else prosa.falhas++
				}

				const embeddingResponse = await generateEmbeddings(passages, 'retrieval.passage')

				const rows = batch.map((v, idx) => ({
					vehicle_id: Number(v.id),
					vehicle_slug: v.slug,
					passage_text: passages[idx],
					embedding: sql<string>`${JSON.stringify(embeddingResponse.data[idx].embedding)}::vector`,
					updated_at: new Date(),
				}))

				try {
					await db.insertInto('vehicle_embeddings').values(rows)
						.onConflict((oc) => oc.column('vehicle_id').doUpdateSet({
							vehicle_slug: (eb) => eb.ref('excluded.vehicle_slug'),
							passage_text: (eb) => eb.ref('excluded.passage_text'),
							embedding: (eb) => eb.ref('excluded.embedding'),
							updated_at: (eb) => eb.ref('excluded.updated_at'),
						}))
						.execute()
					synced += batch.length
				} catch (upsertError) {
					errors.push(`Batch ${i}: ${upsertError instanceof Error ? upsertError.message : String(upsertError)}`)
				}

				// Grava os rótulos derivados por regra E a prosa que `passagemDoVeiculo`
				// efetivamente usou (cache, sobrescrita ou recém-gerada) — não `null`
				// fixo, senão toda sincronização perderia o cache e regeraria a prosa
				// do zero (cron de 6 em 6 horas × ~77 veículos = ~300 chamadas/dia ao
				// modelo por nada, e o texto indexado mudando sem o carro mudar). O
				// `where sobrescrito_por is null` dentro de `gravarRotulosDerivados`
				// protege a correção manual da Attra. Erro aqui não pode apagar o que
				// já sincronizou nesta chamada.
				try {
					await gravarRotulosDerivados(
						batch.map((v, idx) => ({
							vehicle_id: Number(v.id),
							rotulos: derivarRotulos(v, anoAtual),
							prosa: resultados[idx].prosa,
						})),
					)
				} catch (labelErr) {
					errors.push(`Batch ${i} rótulos: ${labelErr instanceof Error ? labelErr.message : String(labelErr)}`)
				}
			} catch (batchErr) {
				errors.push(`Batch ${i}: ${batchErr instanceof Error ? batchErr.message : String(batchErr)}`)
			}
		}

		// Remove embeddings for vehicles no longer in stock.
		// GUARD: if AutoConf is down or returns an empty list, activeIds will be
		// empty and the DELETE below would wipe ALL embeddings. Skip the cleanup
		// in that scenario to avoid data loss.
		const activeIds = vehicles.map(v => Number(v.id))
		if (activeIds.length > 0) {
			await db.deleteFrom('vehicle_embeddings')
				.where('vehicle_id', 'not in', activeIds)
				.execute()
		} else {
			console.warn('[embeddings/sync] activeIds is empty — skipping stale-embedding cleanup to prevent data loss (AutoConf may be down)')
		}

		return NextResponse.json({
			synced,
			total: vehicles.length,
			prosa,
			errors: errors.length > 0 ? errors : undefined,
		})
	} catch (err) {
		console.error('Embedding sync failed:', err)
		return NextResponse.json(
			{ error: err instanceof Error ? err.message : 'Unknown error' },
			{ status: 500 },
		)
	}
}
