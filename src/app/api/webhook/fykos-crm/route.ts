import { NextRequest, NextResponse } from 'next/server'
import type { Insertable, Updateable } from 'kysely'
import { db } from '@/lib/db'
import type { Database } from '@/lib/db/types'
import { verifyCrmSignature, mergeCardV2 } from '@/lib/crm-webhook'

export const dynamic = 'force-dynamic'

// Receptor do CRM (Fykos) — contrato v2 (2026-07): upsert por id, ordenado por
// atualizado_em (evento atrasado é ignorado), campo ausente mantém / null limpa,
// extras vão pro JSONB `dados`. Lógica pura em src/lib/crm-webhook.ts.
//
// Auth (uma das duas):
//   1. v2: X-CRM-Signature = HMAC-SHA256(corpo bruto, CRM_SITE_WEBHOOK_SECRET)
//      (fallback de secret: FYKOS_CRM_SECRET, para emissor que já usa o mesmo)
//   2. v1 (transição): X-Webhook-Secret = FYKOS_CRM_SECRET
// Etapas v1 recebidas são normalizadas para v2 no ingest.
//
// Payload: um card no corpo, ou lote em `cards[]`. `{ "remover": [ids] }`
// continua suportado (lead saiu do funil no emissor).

export async function POST(request: NextRequest) {
	const secretV2 = process.env.CRM_SITE_WEBHOOK_SECRET || process.env.FYKOS_CRM_SECRET
	const secretV1 = process.env.FYKOS_CRM_SECRET
	if (!secretV2 && !secretV1) {
		return NextResponse.json({ error: 'Webhook sem secret configurado no servidor' }, { status: 500 })
	}

	const rawBody = await request.text()
	const assinaturaOk = !!secretV2 && verifyCrmSignature(rawBody, request.headers.get('x-crm-signature'), secretV2)
	const legadoOk = !!secretV1 && request.headers.get('x-webhook-secret') === secretV1
	if (!assinaturaOk && !legadoOk) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	}

	let body: Record<string, unknown>
	try {
		body = JSON.parse(rawBody)
	} catch {
		return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
	}

	// Remoções (legado; no v2 o lead é encerrado, não removido)
	const remover = Array.isArray(body.remover) ? body.remover.map(String) : []
	if (remover.length > 0) {
		try {
			await db.deleteFrom('crm_cards').where('id', 'in', remover).execute()
		} catch (error) {
			return NextResponse.json({ error: `Falha ao remover: ${error instanceof Error ? error.message : error}` }, { status: 500 })
		}
	}

	const lista: Record<string, unknown>[] = Array.isArray(body.cards)
		? (body.cards as Record<string, unknown>[])
		: (body.id !== undefined ? [body] : [])

	if (lista.some(c => c.id === undefined || c.id === null || String(c.id) === '')) {
		return NextResponse.json({ error: 'Todo card precisa de id' }, { status: 400 })
	}

	let upserts = 0
	let ignorados = 0
	try {
		for (const card of lista) {
			const id = String(card.id)
			const existing = await db.selectFrom('crm_cards')
				.select(['atualizado_em', 'dados'])
				.where('id', '=', id)
				.executeTakeFirst()

			const r = mergeCardV2(
				existing
					? { atualizado_em: existing.atualizado_em as Date, dados: existing.dados as Record<string, unknown> | null }
					: null,
				card,
			)
			if (r.action === 'skip') { ignorados++; continue }
			if (r.action === 'insert') {
				await db.insertInto('crm_cards')
					.values(r.row as unknown as Insertable<Database['crm_cards']>)
					.execute()
			} else {
				const { id: _id, ...mudancas } = r.row
				void _id
				await db.updateTable('crm_cards')
					.set(mudancas as unknown as Updateable<Database['crm_cards']>)
					.where('id', '=', id)
					.execute()
			}
			upserts++
		}
	} catch (error) {
		return NextResponse.json({ error: `Falha no upsert: ${error instanceof Error ? error.message : error}` }, { status: 500 })
	}

	console.log(`[FykosCRM] upserts=${upserts} ignorados=${ignorados} remoções=${remover.length} auth=${assinaturaOk ? 'hmac-v2' : 'legado-v1'}`)
	return NextResponse.json({ success: true, upserts, ignorados, remocoes: remover.length })
}
