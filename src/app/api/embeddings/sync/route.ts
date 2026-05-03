import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
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

		const supabase = createAdminClient()
		const batchSize = 20
		let synced = 0
		const errors: string[] = []

		for (let i = 0; i < vehicles.length; i += batchSize) {
			const batch = vehicles.slice(i, i + batchSize)
			const passages = batch.map(v => buildVehiclePassage(v))

			try {
				const embeddingResponse = await generateEmbeddings(passages, 'retrieval.passage')

				const rows = batch.map((v, idx) => ({
					vehicle_id: v.id,
					vehicle_slug: v.slug,
					passage_text: passages[idx],
					embedding: JSON.stringify(embeddingResponse.data[idx].embedding),
					updated_at: new Date().toISOString(),
				}))

				const { error: upsertError } = await supabase
					.from('vehicle_embeddings')
					.upsert(rows, { onConflict: 'vehicle_id' })

				if (upsertError) {
					errors.push(`Batch ${i}: ${upsertError.message}`)
				} else {
					synced += batch.length
				}
			} catch (batchErr) {
				errors.push(`Batch ${i}: ${batchErr instanceof Error ? batchErr.message : String(batchErr)}`)
			}
		}

		// Remove embeddings for vehicles no longer in stock
		const activeIds = vehicles.map(v => v.id)
		await supabase
			.from('vehicle_embeddings')
			.delete()
			.not('vehicle_id', 'in', `(${activeIds.join(',')})`)

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
