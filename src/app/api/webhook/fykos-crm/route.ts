import { NextRequest, NextResponse } from 'next/server'
import type { Insertable, Updateable, Transaction } from 'kysely'
import { db } from '@/lib/db'
import type { Database } from '@/lib/db/types'
import { verifyCrmSignature, safeEquals, mergeCardV2, atualizadoEmInvalido, linhaRejeicao } from '@/lib/crm-webhook'
import { ligarCliqueAoCard } from '@/lib/whatsapp-correlacao-db'

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

// 'insert' e 'update' são distinguidos porque a correlação de clique só pode
// rodar em card NOVO: reprocessar a cada webhook faria o mesmo card consumir
// um clique novo a cada atualização de etapa.
type ResultadoCard = 'insert' | 'update' | 'skip' | 'retry'

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
		if (Number(ins.numInsertedOrUpdatedRows ?? 0) === 0) return 'retry'

		// Atribuição do lead que chegou por WhatsApp: o identificador da sessão
		// não viaja mais dentro da mensagem do cliente, então é aqui que a
		// conversa é ligada ao clique que a originou. Best-effort — o lead entra
		// mesmo que isto falhe.
		try {
			const ligacao = await ligarCliqueAoCard(trx, id, card)
			if (ligacao.tipo === 'ligado') {
				console.log(`[FykosCRM] card ${id} correlacionado à sessão ${ligacao.sessionId} (clique ${ligacao.cliqueId})`)
			} else if (ligacao.tipo === 'ambigua') {
				// Recusa deliberada: mais de uma sessão na janela. Atribuir a
				// errada contamina campanha e termo de um lead real.
				console.warn(`[FykosCRM] card ${id} sem atribuição: ${ligacao.candidatos} sessões candidatas`)
			}
		} catch (erro) {
			console.warn(`[FykosCRM] correlação falhou no card ${id}:`, erro instanceof Error ? erro.message : erro)
		}

		return 'insert'
	}

	const { id: _id, ...mudancas } = r.row
	void _id
	await trx.updateTable('crm_cards')
		.set(mudancas as unknown as Updateable<Database['crm_cards']>)
		.where('id', '=', id)
		.execute()
	return 'update'
}

export async function POST(request: NextRequest) {
	// Toda saída de erro daqui para baixo passa por `recusa`: antes de 11/08 o
	// receptor recusava calado, e no caso do lead Ubiratan não deu para provar
	// se o evento de aceite tinha sido rejeitado na porta ou nunca enviado.
	// Vai para stderr de propósito — é o fluxo que sobrevive no attra-error.log.
	// O que o emissor recebe NÃO muda: `motivo` é detalhado e vai só para o log;
	// `resposta` preserva o texto anterior. Enriquecer o corpo da resposta
	// atrapalharia o time do emissor no meio da correção deles, e dizer a um
	// chamador não autenticado se a credencial faltou ou estava errada entrega
	// informação a quem está sondando.
	const bytes = request.headers.get('content-length')
	const temAssinatura = !!request.headers.get('x-crm-signature')
	const recusa = (
		status: number,
		motivo: string,
		corpoLen: number,
		opts: { ids?: string[]; resposta?: string } = {},
	) => {
		console.error(linhaRejeicao({ status, motivo, bytes: corpoLen, assinatura: temAssinatura, ids: opts.ids }))
		return NextResponse.json({ error: opts.resposta ?? motivo }, { status })
	}

	const secretV2 = process.env.CRM_SITE_WEBHOOK_SECRET || process.env.FYKOS_CRM_SECRET
	const secretV1 = process.env.FYKOS_CRM_SECRET
	if (!secretV2 && !secretV1) {
		return recusa(500, 'Webhook sem secret configurado no servidor', Number(bytes ?? 0))
	}

	const rawBody = await request.text()
	const assinaturaOk = !!secretV2 && verifyCrmSignature(rawBody, request.headers.get('x-crm-signature'), secretV2)
	const headerLegado = request.headers.get('x-webhook-secret')
	const legadoOk = !!secretV1 && !!headerLegado && safeEquals(headerLegado, secretV1)
	if (!assinaturaOk && !legadoOk) {
		// Distingue "mandou credencial errada" de "não mandou credencial": um é
		// secret rotacionado, o outro é emissor mal configurado.
		const detalhe = temAssinatura || headerLegado ? 'credencial inválida' : 'sem credencial'
		return recusa(401, `Unauthorized (${detalhe})`, rawBody.length, { resposta: 'Unauthorized' })
	}

	let body: Record<string, unknown>
	try {
		const parsed: unknown = JSON.parse(rawBody)
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('não é objeto')
		body = parsed as Record<string, unknown>
	} catch {
		return recusa(400, 'JSON inválido', rawBody.length)
	}

	const remover = Array.isArray(body.remover) ? body.remover.map(String) : []
	const lista: Record<string, unknown>[] = Array.isArray(body.cards)
		? (body.cards as Record<string, unknown>[])
		: (body.id !== undefined ? [body] : [])

	// Ids da requisição: entram no log de recusa para cruzar com o log do emissor.
	const idsDaRequisicao = [...lista.map(c => (c.id === undefined || c.id === null ? '(sem-id)' : String(c.id))), ...remover]

	// Validação completa ANTES de qualquer escrita (inclusive remoções)
	if (lista.some(c => c.id === undefined || c.id === null || String(c.id) === '')) {
		return recusa(400, 'Todo card precisa de id', rawBody.length, { ids: idsDaRequisicao })
	}
	const cardInvalido = lista.find(c => atualizadoEmInvalido(c))
	if (cardInvalido) {
		return recusa(
			400,
			`Card ${String(cardInvalido.id)}: atualizado_em inválido (esperado ISO-8601)`,
			rawBody.length,
			{ ids: idsDaRequisicao },
		)
	}

	if (remover.length > 0) {
		try {
			await db.deleteFrom('crm_cards').where('id', 'in', remover).execute()
		} catch (error) {
			return recusa(500, `Falha ao remover: ${error instanceof Error ? error.message : error}`, rawBody.length, { ids: remover })
		}
	}

	let upserts = 0
	let ignorados = 0
	// Card em processamento: cada um commita na sua transação, então uma falha
	// no meio do lote deixa os anteriores GRAVADOS e devolve 500 assim mesmo.
	// Sem saber onde parou, o emissor reenvia o lote inteiro e nós não temos
	// como explicar por que metade entrou.
	let idEmCurso = '(nenhum)'
	try {
		for (const card of lista) {
			const id = String(card.id)
			idEmCurso = id
			let resultado = await db.transaction().execute(trx => aplicarCard(trx, id, card))
			if (resultado === 'retry') {
				resultado = await db.transaction().execute(trx => aplicarCard(trx, id, card))
			}
			// retry duplo só acontece se a linha foi removida no meio — trata como ignorado
			if (resultado === 'insert' || resultado === 'update') upserts++
			else ignorados++
		}
	} catch (error) {
		const erroStr = error instanceof Error ? error.message : String(error)
		const motivo = `Falha no upsert no card ${idEmCurso} (${upserts + ignorados} de ${lista.length} já processados, ${upserts} gravados): ${erroStr}`
		return recusa(500, motivo, rawBody.length, { ids: idsDaRequisicao, resposta: `Falha no upsert: ${erroStr}` })
	}

	console.log(`[FykosCRM] upserts=${upserts} ignorados=${ignorados} remoções=${remover.length} auth=${assinaturaOk ? 'hmac-v2' : 'legado-v1'}`)
	return NextResponse.json({ success: true, upserts, ignorados, remocoes: remover.length })
}
