/**
 * Boletos ↔ Fykos (18/11/2026). O painel não manda WhatsApp: quem manda é a
 * Ângela, no Fykos, por template da API oficial. Aqui ficam os dois sentidos
 * da conversa entre os sistemas.
 *
 *   painel → Fykos   "boleto cadastrado", "pago", "cancelado"... A Ângela
 *                    decide quando lembrar e para de lembrar quando o boleto
 *                    sai de aberto.
 *   Fykos → painel   "lembrete enviado", "cliente prometeu pagar dia tal",
 *                    "mandou o comprovante"... O painel atualiza o boleto.
 *
 * O aviso de saída entra numa fila (`boleto_eventos_saida`) na MESMA transação
 * da mudança: não existe boleto gravado sem aviso nem aviso de boleto que não
 * gravou. A fila sai em ordem, e o que falhar é tentado de novo pelo cron
 * (/api/cron/boletos-fykos). Mesmo desenho do retorno do CRM (crm-retorno.ts).
 *
 * Sem FYKOS_BOLETOS_WEBHOOK_URL e FYKOS_BOLETOS_WEBHOOK_SECRET nada entra na
 * fila e nada sai: o painel funciona sozinho, com o lembrete manual.
 *
 * O contrato inteiro, com exemplos, está em docs/boletos/handoff-fykos-angela.md.
 */
import { createHmac, randomUUID } from 'node:crypto'
import { sql, type Transaction } from 'kysely'
import { db } from '@/lib/db'
import type { Database } from '@/lib/db/types'
import { dataBR, lerData, type Boleto } from '@/lib/boletos'

/* ------------------------------------------------------------ painel → Fykos */

export type EventoDeSaida = 'boleto.cadastrado' | 'boleto.atualizado' | 'boleto.pago' | 'boleto.cancelado' | 'boleto.reaberto' | 'boleto.excluido'

export function configuracaoBoletosFykos(): { url: string; secret: string } | null {
	const url = process.env.FYKOS_BOLETOS_WEBHOOK_URL?.trim()
	const secret = process.env.FYKOS_BOLETOS_WEBHOOK_SECRET
	if (!url || !secret) return null
	try {
		const u = new URL(url)
		// http só para teste na própria máquina; em produção, sempre https.
		const local = u.hostname === 'localhost' || u.hostname === '127.0.0.1'
		if ((u.protocol !== 'https:' && !(local && u.protocol === 'http:')) || u.username || u.password) return null
		return { url, secret }
	} catch {
		return null
	}
}

export interface BoletoParaOFykos {
	id: string
	nome: string
	/** E.164: +5534999990000 */
	telefone: string
	email: string | null
	vencimento: string
	valor: number | null
	descricao: string | null
	status: string
	pago_em: string | null
	promessa_em: string | null
}

export function boletoParaOFykos(b: Boleto): BoletoParaOFykos {
	return {
		id: b.id,
		nome: b.nome,
		telefone: `+55${b.telefone}`,
		email: b.email,
		vencimento: b.vencimento,
		valor: b.valor,
		descricao: b.descricao,
		status: b.status,
		pago_em: b.pago_em,
		promessa_em: b.promessa_em,
	}
}

const POR_AVISO = 100

/** O corpo exato que vai ser assinado e enviado. */
export function corpoDoAviso(evento: EventoDeSaida, id: string, boletos: BoletoParaOFykos[], agora = new Date()): string {
	return JSON.stringify({ evento, id_evento: id, enviado_em: agora.toISOString(), boletos })
}

/**
 * Põe o aviso na fila, dentro da transação de quem mudou o boleto. Planilha
 * grande vira vários avisos de até 100 boletos. Sem a integração ligada, não
 * faz nada.
 */
export async function avisarOFykos(trx: Transaction<Database>, evento: EventoDeSaida, boletos: Boleto[]): Promise<void> {
	if (!configuracaoBoletosFykos() || boletos.length === 0) return
	for (let i = 0; i < boletos.length; i += POR_AVISO) {
		const id = randomUUID()
		await trx
			.insertInto('boleto_eventos_saida')
			.values({ id, evento, corpo: corpoDoAviso(evento, id, boletos.slice(i, i + POR_AVISO).map(boletoParaOFykos)) })
			.execute()
	}
}

async function enviar(aviso: { id: string; corpo: string }, config: { url: string; secret: string }): Promise<string | null> {
	try {
		const r = await fetch(config.url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Boletos-Event-Id': aviso.id,
				'Idempotency-Key': aviso.id,
				'X-Boletos-Signature': createHmac('sha256', config.secret).update(aviso.corpo).digest('hex'),
			},
			body: aviso.corpo,
			signal: AbortSignal.timeout(8_000),
			redirect: 'error',
		})
		await r.body?.cancel()
		return r.ok ? null : `HTTP ${r.status}`
	} catch {
		// Não registrar URL, corpo ou erro de rede: têm nome e telefone de cliente.
		return 'Falha de conexão ou tempo limite'
	}
}

/**
 * Entrega os avisos pendentes, o mais antigo primeiro. Para no primeiro que
 * falhar ou que ainda está esperando a próxima tentativa: a ordem precisa ser
 * mantida ("cadastrado" antes de "pago"). Uma entrega por transação, com
 * trava, para o cron e o envio imediato não mandarem o mesmo aviso juntos.
 */
export async function entregarBoletosAoFykos(limite = 20): Promise<number> {
	const config = configuracaoBoletosFykos()
	if (!config) return 0
	let entregues = 0
	for (let i = 0; i < limite; i++) {
		const resultado = await db.transaction().execute(async trx => {
			const aviso = await trx
				.selectFrom('boleto_eventos_saida')
				.selectAll()
				.where('entregue_em', 'is', null)
				.orderBy('sequencia')
				.limit(1)
				.forUpdate()
				.skipLocked()
				.executeTakeFirst()
			if (!aviso || aviso.proxima_tentativa_em > new Date()) return 'parar'
			const erro = await enviar(aviso, config)
			const tentativas = aviso.tentativas + 1
			await trx
				.updateTable('boleto_eventos_saida')
				.set({
					tentativas,
					ultimo_erro: erro,
					entregue_em: erro ? null : new Date(),
					// 30 s, 1 min, 2 min... até 1 hora entre as tentativas.
					proxima_tentativa_em: new Date(Date.now() + Math.min(3_600_000, 30_000 * 2 ** Math.min(tentativas - 1, 7))),
				})
				.where('sequencia', '=', aviso.sequencia)
				.execute()
			return erro ? 'parar' : 'entregue'
		})
		if (resultado === 'parar') break
		entregues++
	}
	return entregues
}

export interface EstadoDoFykos {
	/** A integração está configurada neste servidor. */
	ligado: boolean
	/** Avisos na fila, esperando o Fykos aceitar. */
	pendentes: number
	ultimoErro: string | null
}

export async function estadoDoFykos(): Promise<EstadoDoFykos> {
	if (!configuracaoBoletosFykos()) return { ligado: false, pendentes: 0, ultimoErro: null }
	const l = await db
		.selectFrom('boleto_eventos_saida')
		.select([
			sql<string>`count(*)`.as('pendentes'),
			sql<string | null>`(array_agg(ultimo_erro order by sequencia) filter (where ultimo_erro is not null))[1]`.as('erro'),
		])
		.where('entregue_em', 'is', null)
		.executeTakeFirst()
	return { ligado: true, pendentes: Number(l?.pendentes ?? 0), ultimoErro: l?.erro ?? null }
}

/* ------------------------------------------------------------ Fykos → painel */

export const EVENTOS_DE_ENTRADA = [
	'lembrete.enviado',
	'lembrete.falhou',
	'cliente.respondeu',
	'promessa.pagamento',
	'comprovante.recebido',
	'pagamento.confirmado',
] as const
export type EventoDeEntrada = (typeof EVENTOS_DE_ENTRADA)[number]

export interface EventoLido {
	evento: EventoDeEntrada
	idEvento: string
	boletoId: string
	ocorridoEm: Date
	/** Texto do cliente ou do motivo, já cortado. */
	texto: string | null
	/** promessa.pagamento: o dia prometido. pagamento.confirmado e comprovante: o dia do pagamento, se veio. */
	data: string | null
	/** comprovante.recebido: link do arquivo. */
	url: string | null
	/** lembrete.enviado: nome do template. */
	template: string | null
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const texto = (v: unknown, max: number): string | null => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)

/**
 * Confere o corpo que o Fykos mandou e devolve o evento pronto, ou o erro que
 * explica a quem está integrando o que faltou. Não toca no banco.
 */
export function lerEventoDoFykos(corpo: unknown, hoje: string, agora = new Date()): { evento: EventoLido } | { erro: string } {
	if (!corpo || typeof corpo !== 'object' || Array.isArray(corpo)) return { erro: 'corpo precisa ser um objeto JSON' }
	const c = corpo as Record<string, unknown>
	if (!EVENTOS_DE_ENTRADA.includes(c.evento as EventoDeEntrada)) return { erro: `evento desconhecido; use um de: ${EVENTOS_DE_ENTRADA.join(', ')}` }
	const evento = c.evento as EventoDeEntrada
	const idEvento = texto(c.id_evento, 200)
	if (!idEvento) return { erro: 'id_evento é obrigatório (identifica o evento para não repetir)' }
	if (typeof c.boleto_id !== 'string' || !UUID.test(c.boleto_id)) return { erro: 'boleto_id precisa ser o id (uuid) que o painel enviou' }

	const dados = c.dados && typeof c.dados === 'object' && !Array.isArray(c.dados) ? (c.dados as Record<string, unknown>) : {}
	let ocorridoEm = agora
	if (typeof c.ocorrido_em === 'string') {
		const t = Date.parse(c.ocorrido_em)
		if (Number.isNaN(t)) return { erro: 'ocorrido_em precisa ser data e hora em ISO 8601' }
		// Relógio adiantado do outro lado não empurra o evento para o futuro.
		ocorridoEm = new Date(Math.min(t, agora.getTime()))
	}

	let data: string | null = null
	const lerDia = (v: unknown, campo: string): string | { erro: string } => {
		const lida = lerData(v, hoje)
		return 'data' in lida ? lida.data : { erro: `dados.${campo} precisa ser uma data AAAA-MM-DD` }
	}
	if (evento === 'promessa.pagamento') {
		const d = lerDia(dados.data, 'data')
		if (typeof d !== 'string') return d
		data = d
	} else if ((evento === 'pagamento.confirmado' || evento === 'comprovante.recebido') && dados.pago_em !== undefined && dados.pago_em !== null) {
		const d = lerDia(dados.pago_em, 'pago_em')
		if (typeof d !== 'string') return d
		if (d > hoje) return { erro: 'dados.pago_em não pode ser no futuro' }
		data = d
	}

	let url: string | null = null
	if (evento === 'comprovante.recebido' && dados.url !== undefined && dados.url !== null) {
		try {
			const u = new URL(String(dados.url))
			if (u.protocol !== 'https:') throw new Error()
			url = u.toString().slice(0, 2000)
		} catch {
			return { erro: 'dados.url precisa ser um link https' }
		}
	}

	return {
		evento: {
			evento,
			idEvento,
			boletoId: c.boleto_id.toLowerCase(),
			ocorridoEm,
			texto: texto(evento === 'lembrete.falhou' ? dados.motivo : dados.mensagem, 1000),
			data,
			url,
			template: texto(dados.template, 120),
		},
	}
}

export type ResultadoDoEvento = 'aplicado' | 'repetido' | 'boleto-nao-existe'

/**
 * Aplica no boleto o que o Fykos informou e grava no histórico. O mesmo
 * `id_evento` entregue de novo não muda nada ('repetido').
 */
export async function aplicarEventoDoFykos(e: EventoLido): Promise<ResultadoDoEvento> {
	return db.transaction().execute(async trx => {
		const boleto = await trx.selectFrom('boletos').select(['id', 'status']).where('id', '=', e.boletoId).forUpdate().executeTakeFirst()
		if (!boleto) return 'boleto-nao-existe'
		const jaVeio = await trx.selectFrom('boleto_eventos').select('id').where('id_externo', '=', e.idEvento).executeTakeFirst()
		if (jaVeio) return 'repetido'

		const aberto = boleto.status === 'aberto' || boleto.status === 'em_negociacao'
		let tipo: string
		let descricao: string
		let mudancas: Record<string, unknown> = {}
		switch (e.evento) {
			case 'lembrete.enviado':
				tipo = 'lembrete'
				descricao = `Enviado pela Ângela${e.template ? ` (modelo ${e.template})` : ''}`
				mudancas = { lembretes: sql`lembretes + 1`, ultimo_lembrete_em: e.ocorridoEm, falha_envio: null }
				break
			case 'lembrete.falhou':
				tipo = 'falha_envio'
				descricao = e.texto ?? 'O WhatsApp não entregou o lembrete'
				mudancas = { falha_envio: descricao.slice(0, 300) }
				break
			case 'cliente.respondeu':
				tipo = 'resposta'
				descricao = e.texto ?? 'O cliente respondeu'
				break
			case 'promessa.pagamento':
				tipo = 'promessa'
				descricao = `Disse que paga em ${dataBR(e.data as string)}${e.texto ? `: "${e.texto}"` : ''}`
				// Promessa em boleto já pago ou cancelado fica só no histórico.
				if (aberto) mudancas = { promessa_em: e.data }
				break
			case 'comprovante.recebido':
				tipo = 'comprovante'
				descricao = `Mandou o comprovante${e.data ? `, com pagamento em ${dataBR(e.data)}` : ''}${e.texto ? `: "${e.texto}"` : ''}`
				// O comprovante NÃO marca como pago: alguém do financeiro confere e confirma.
				if (aberto) mudancas = { comprovante_em: e.ocorridoEm, comprovante_url: e.url }
				break
			case 'pagamento.confirmado':
				tipo = 'pago'
				descricao = 'Pagamento confirmado pelo Fykos'
				if (aberto) mudancas = { status: 'pago', pago_em: e.data ?? sql`(now() at time zone 'America/Sao_Paulo')::date` }
				break
		}

		await trx
			.insertInto('boleto_eventos')
			.values({ boleto_id: e.boletoId, tipo, descricao, por: 'fykos', por_nome: 'Ângela (Fykos)', id_externo: e.idEvento, criado_em: e.ocorridoEm })
			.execute()
		await trx.updateTable('boletos').set({ ...mudancas, atualizado_em: new Date() }).where('id', '=', e.boletoId).execute()
		return 'aplicado'
	})
}
