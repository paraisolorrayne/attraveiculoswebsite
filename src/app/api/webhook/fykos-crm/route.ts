import { NextRequest, NextResponse } from 'next/server'
import type { Insertable, Updateable, Transaction } from 'kysely'
import { db } from '@/lib/db'
import type { Database } from '@/lib/db/types'
import { verifyCrmSignature, safeEquals, mergeCardV2, atualizadoEmInvalido } from '@/lib/crm-webhook'

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
//
// Concorrência: cada card roda numa transação com SELECT ... FOR UPDATE, então
// dois webhooks simultâneos do mesmo lead se serializam e a regra de ordenação
// vale mesmo sob corrida. Insert simultâneo de id novo cai num retry único.

type ResultadoCard = 'upsert' | 'skip' | 'retry'

async function aplicarCard(trx: Transaction<Database>, id: string, card: Record<string, unknown>): Promise<ResultadoCard> {
	const existing = await trx.selectFrom('crm_cards')
		.select(['atualizado_em', 'dados'])
		.where('id', '=', id)
		.forUpdate()
		.executeTakeFirst()

	const r = mergeCardV2(
		existing
			? { atualizado_em: existing.atualizado_em as Date, dados: existing.dados as Record<string, unknown> | null }
			: null,
		card,
	)
	if (r.action === 'skip') return 'skip'
	if (r.action === 'invalid') throw new Error(r.motivo) // pré-validado no handler; não deve acontecer

	if (r.action === 'insert') {
		const ins = await trx.insertInto('crm_cards')
			.values(r.row as unknown as Insertable<Database['crm_cards']>)
			.onConflict(oc => oc.column('id').doNothing())
			.executeTakeFirst()
		// 0 linhas = outro request inseriu este id entre o SELECT e o INSERT —
		// reprocessa uma vez como update (a linha agora existe e será lockada)
		return Number(ins.numInsertedOrUpdatedRows ?? 0) > 0 ? 'upsert' : 'retry'
	}

	const { id: _id, ...mudancas } = r.row
	void _id
	await trx.updateTable('crm_cards')
		.set(mudancas as unknown as Updateable<Database['crm_cards']>)
		.where('id', '=', id)
		.execute()
	return 'upsert'
}

export async function POST(request: NextRequest) {
	const secretV2 = process.env.CRM_SITE_WEBHOOK_SECRET || process.env.FYKOS_CRM_SECRET
	const secretV1 = process.env.FYKOS_CRM_SECRET
	if (!secretV2 && !secretV1) {
		return NextResponse.json({ error: 'Webhook sem secret configurado no servidor' }, { status: 500 })
	}

	const rawBody = await request.text()
	const assinaturaOk = !!secretV2 && verifyCrmSignature(rawBody, request.headers.get('x-crm-signature'), secretV2)
	const headerLegado = request.headers.get('x-webhook-secret')
	const legadoOk = !!secretV1 && !!headerLegado && safeEquals(headerLegado, secretV1)
	if (!assinaturaOk && !legadoOk) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	}

	let body: Record<string, unknown>
	try {
		const parsed: unknown = JSON.parse(rawBody)
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('não é objeto')
		body = parsed as Record<string, unknown>
	} catch {
		return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
	}

	const remover = Array.isArray(body.remover) ? body.remover.map(String) : []
	const lista: Record<string, unknown>[] = Array.isArray(body.cards)
		? (body.cards as Record<string, unknown>[])
		: (body.id !== undefined ? [body] : [])

	// Validação completa ANTES de qualquer escrita (inclusive remoções)
	if (lista.some(c => c.id === undefined || c.id === null || String(c.id) === '')) {
		return NextResponse.json({ error: 'Todo card precisa de id' }, { status: 400 })
	}
	const cardInvalido = lista.find(c => atualizadoEmInvalido(c))
	if (cardInvalido) {
		return NextResponse.json(
			{ error: `Card ${String(cardInvalido.id)}: atualizado_em inválido (esperado ISO-8601)` },
			{ status: 400 },
		)
	}

	if (remover.length > 0) {
		try {
			await db.deleteFrom('crm_cards').where('id', 'in', remover).execute()
		} catch (error) {
			return NextResponse.json({ error: `Falha ao remover: ${error instanceof Error ? error.message : error}` }, { status: 500 })
		}
	}

	let upserts = 0
	let ignorados = 0
	try {
		for (const card of lista) {
			const id = String(card.id)
			let resultado = await db.transaction().execute(trx => aplicarCard(trx, id, card))
			if (resultado === 'retry') {
				resultado = await db.transaction().execute(trx => aplicarCard(trx, id, card))
			}
			// retry duplo só acontece se a linha foi removida no meio — trata como ignorado
			if (resultado === 'upsert') upserts++
			else ignorados++
		}
	} catch (error) {
		return NextResponse.json({ error: `Falha no upsert: ${error instanceof Error ? error.message : error}` }, { status: 500 })
	}

	console.log(`[FykosCRM] upserts=${upserts} ignorados=${ignorados} remoções=${remover.length} auth=${assinaturaOk ? 'hmac-v2' : 'legado-v1'}`)
	return NextResponse.json({ success: true, upserts, ignorados, remocoes: remover.length })
}
