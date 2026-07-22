import { NextResponse } from 'next/server'
import { sql } from 'kysely'
import { db } from '@/lib/db'
// Migrado de supabase-js → Kysely (ver docs/MIGRACAO_POSTGRES_PURO.md).
import { getVehicles } from '@/lib/autoconf-api'
import { generateEmbeddings, buildVehiclePassage } from '@/lib/jina'

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

		for (let i = 0; i < vehicles.length; i += batchSize) {
			const batch = vehicles.slice(i, i + batchSize)
			const passages = batch.map(v => buildVehiclePassage(v))

			try {
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
