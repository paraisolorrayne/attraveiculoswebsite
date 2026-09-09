import { createHmac } from 'node:crypto'
import { sql } from 'kysely'
import { db } from '@/lib/db'

export function configuracaoRetornoCrm(): { url: string; secret: string } | null {
	const url = process.env.CRM_RETURN_WEBHOOK_URL?.trim()
	const secret = process.env.CRM_RETURN_WEBHOOK_SECRET
	if (!url || !secret) return null
	try {
		const parsed = new URL(url)
		if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return null
		return { url, secret }
	} catch { return null }
}

export async function enviarRetornoCrm(evento: { id: string; corpo: string }, config: { url: string; secret: string }): Promise<string | null> {
	try {
		const response = await fetch(config.url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-CRM-Event-Id': evento.id,
				'Idempotency-Key': evento.id,
				'X-CRM-Signature': createHmac('sha256', config.secret).update(evento.corpo).digest('hex'),
			},
			body: evento.corpo,
			signal: AbortSignal.timeout(8_000),
			redirect: 'error',
		})
		await response.body?.cancel()
		return response.ok ? null : `HTTP ${response.status}`
	} catch {
		// Não registrar URL, corpo ou erro de rede: podem conter credenciais/PII.
		return 'Falha de conexão ou tempo limite'
	}
}

/** Uma entrega por transação. Lock impede envios simultâneos; ordem por card. */
export async function entregarRetornosCrm(limite = 5, eventoId?: string): Promise<number> {
	const config = configuracaoRetornoCrm()
	if (!config) return 0
	let entregues = 0
	for (let i = 0; i < limite; i++) {
		const resultado = await db.transaction().execute(async trx => {
			const evento = await trx.selectFrom('crm_eventos_saida as e').selectAll('e')
				.where('e.entregue_em', 'is', null)
				.where('e.proxima_tentativa_em', '<=', new Date())
				.$if(!!eventoId, q => q.where('e.id', '=', eventoId!))
				.where(sql<boolean>`not exists (
					select 1 from crm_eventos_saida anterior
					where anterior.card_id = e.card_id and anterior.sequencia < e.sequencia
					and anterior.entregue_em is null
				)`)
				.orderBy('e.sequencia').forUpdate().skipLocked().executeTakeFirst()
			if (!evento) return 'vazio'
			const erro = await enviarRetornoCrm(evento, config)
			const tentativas = evento.tentativas + 1
			await trx.updateTable('crm_eventos_saida').set({
				tentativas,
				ultimo_erro: erro,
				entregue_em: erro ? null : new Date(),
				proxima_tentativa_em: new Date(Date.now() + Math.min(3_600_000, 30_000 * 2 ** Math.min(tentativas - 1, 7))),
			}).where('id', '=', evento.id).execute()
			return erro ? 'pendente' : 'entregue'
		})
		if (resultado === 'vazio') break
		if (resultado === 'entregue') entregues++
	}
	return entregues
}
