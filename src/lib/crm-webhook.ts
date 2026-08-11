// Lógica pura do contrato v2 do webhook do CRM (Fykos → site).
// Regras: upsert por id; evento com atualizado_em <= o salvo é IGNORADO;
// campo ausente mantém, campo null limpa; extras desconhecidos vão pro JSONB.
import { createHmac, timingSafeEqual } from 'node:crypto'

export const ETAPAS_V2 = ['novo', 'em_atendimento', 'em_negociacao', 'encerrado_ganho', 'encerrado_perdido'] as const

export function verifyCrmSignature(rawBody: string, signatureHex: string | null, secret: string): boolean {
	if (!signatureHex) return false
	const expected = createHmac('sha256', secret).update(rawBody).digest()
	let given: Buffer
	try {
		given = Buffer.from(signatureHex, 'hex')
	} catch {
		return false
	}
	if (given.length !== expected.length) return false
	return timingSafeEqual(given, expected)
}

/** Comparação de segredos em tempo constante (para o header legado v1). */
export function safeEquals(a: string, b: string): boolean {
	const ba = Buffer.from(a)
	const bb = Buffer.from(b)
	if (ba.length !== bb.length) return false
	return timingSafeEqual(ba, bb)
}

/**
 * Linha de log de requisição RECUSADA pelo receptor.
 *
 * Por que existe: até 11/08 o receptor devolvia 401/400/500 para o emissor e
 * não deixava rastro nenhum aqui. No caso do lead Ubiratan (card parado 10 dias
 * em "aguardando aceite") deu para provar que o evento não foi GRAVADO, mas não
 * que ele não tinha batido na porta e levado um "não" — e sem isso a conversa
 * com o emissor vira palavra contra palavra.
 *
 * O corpo NÃO entra no log: o payload traz nome e telefone de cliente. Vão só
 * os ids dos cards (que cruzam com o log do emissor), o tamanho do corpo e se
 * o header de assinatura veio.
 */
const MAX_IDS_LOG = 20
// Erro do Postgres às vezes embute o valor da coluna que violou a restrição —
// e aí vira telefone/e-mail de cliente no log. Não dá para higienizar sem
// perder o diagnóstico, então corta: o começo da mensagem é o que identifica
// a falha, o resto é onde os valores costumam aparecer.
const MAX_MOTIVO_LOG = 300

export function linhaRejeicao(ctx: {
	status: number
	motivo: string
	bytes: number
	assinatura: boolean
	ids?: string[]
}): string {
	const motivo = ctx.motivo.length > MAX_MOTIVO_LOG
		? `${ctx.motivo.slice(0, MAX_MOTIVO_LOG)}…[cortado]`
		: ctx.motivo
	const partes = [
		'[FykosCRM] REJEITADO',
		`status=${ctx.status}`,
		`motivo="${motivo}"`,
		`bytes=${ctx.bytes}`,
		`assinatura=${ctx.assinatura ? 'presente' : 'ausente'}`,
	]
	if (ctx.ids && ctx.ids.length > 0) {
		const mostrados = ctx.ids.slice(0, MAX_IDS_LOG)
		const sobra = ctx.ids.length - mostrados.length
		partes.push(`total=${ctx.ids.length}`)
		partes.push(`ids=${mostrados.join(',')}${sobra > 0 ? ` +${sobra}` : ''}`)
	}
	return partes.join(' ')
}

const ETAPA_V1_MAP: Record<string, { etapa: string; situacaoImplicita?: string }> = {
	aguardando_vendedor: { etapa: 'novo' },
	encerrado_sucesso: { etapa: 'encerrado_ganho' },
	sem_atualizacao: { etapa: 'em_atendimento', situacaoImplicita: 'sem_atualizacao' },
}

export function normalizeEtapa(etapa: string): { etapa: string; situacaoImplicita?: string } {
	return ETAPA_V1_MAP[etapa] ?? { etapa }
}

const CAMPOS_TEXTO = ['situacao', 'fonte_evento', 'nome', 'telefone', 'email', 'veiculo_troca', 'origem', 'vendedor', 'andamento', 'impedimento', 'proxima_acao', 'motivo_encerramento'] as const
const CAMPOS_DATA = ['proxima_acao_em', 'atribuido_em', 'primeiro_contato_em', 'encerrado_em'] as const
// 'dados', 'cards' e 'remover' são envelope/coluna interna — nunca viram extras
const CAMPOS_CONHECIDOS = new Set<string>([...CAMPOS_TEXTO, ...CAMPOS_DATA, 'id', 'etapa', 'atualizado_em', 'veiculo_interesse', 'veiculo', 'valor', 'dados', 'cards', 'remover'])

export type CrmCardRowV2 = { id: string; atualizado_em: Date } & Record<string, unknown>

/** true se o payload traz atualizado_em presente porém inválido (deve virar 400). */
export function atualizadoEmInvalido(payload: Record<string, unknown>): boolean {
	if (!('atualizado_em' in payload)) return false
	return typeof payload.atualizado_em !== 'string' || isNaN(Date.parse(payload.atualizado_em))
}

export function mergeCardV2(
	existing: { atualizado_em: Date | string; dados: Record<string, unknown> | null } | null,
	payload: Record<string, unknown>,
): { action: 'skip' } | { action: 'invalid'; motivo: string } | { action: 'insert' | 'update'; row: CrmCardRowV2 } {
	// atualizado_em presente mas imprestável NÃO pode virar "agora": promoveria
	// um evento quebrado a mais novo que todos e bloquearia os legítimos.
	if (atualizadoEmInvalido(payload)) {
		return { action: 'invalid', motivo: 'atualizado_em inválido (esperado ISO-8601)' }
	}
	// Ausente (emissor v1 da transição): usa o relógio do servidor, como o v1 fazia.
	const atualizadoEm = 'atualizado_em' in payload ? new Date(payload.atualizado_em as string) : new Date()

	if (existing && atualizadoEm.getTime() <= new Date(existing.atualizado_em).getTime()) {
		return { action: 'skip' }
	}

	const row: CrmCardRowV2 = { id: String(payload.id), atualizado_em: atualizadoEm }

	// etapa (com normalização v1→v2)
	if (typeof payload.etapa === 'string' && payload.etapa !== '') {
		const norm = normalizeEtapa(payload.etapa)
		row.etapa = norm.etapa
		if (norm.situacaoImplicita && payload.situacao === undefined) row.situacao = norm.situacaoImplicita
	} else if (!existing) {
		row.etapa = 'novo'
	}

	// veiculo_interesse (v2) / veiculo (v1) → coluna veiculo
	const veiculoIn = 'veiculo_interesse' in payload ? payload.veiculo_interesse : ('veiculo' in payload ? payload.veiculo : undefined)
	if (veiculoIn !== undefined) row.veiculo = veiculoIn === null ? null : String(veiculoIn)

	if ('valor' in payload) {
		const v = payload.valor
		const n = v === null || v === '' ? null : Number(v)
		// NaN entraria como 'NaN' na coluna NUMERIC e envenenaria os KPIs
		row.valor = n !== null && Number.isFinite(n) ? n : null
	}

	for (const campo of CAMPOS_TEXTO) {
		if (campo in payload) {
			const v = payload[campo]
			row[campo] = v === null ? null : String(v)
		}
	}
	for (const campo of CAMPOS_DATA) {
		if (campo in payload) {
			const v = payload[campo]
			row[campo] = v === null || typeof v !== 'string' || isNaN(Date.parse(v)) ? null : new Date(v)
		}
	}

	// Extras desconhecidos → dados (merge com o existente; compatibilidade
	// futura). "null limpa" vale também aqui: remove a chave do JSONB.
	const extras: Record<string, unknown> = {}
	for (const [k, v] of Object.entries(payload)) {
		if (!CAMPOS_CONHECIDOS.has(k)) extras[k] = v
	}
	if (Object.keys(extras).length > 0) {
		const merged: Record<string, unknown> = { ...(existing?.dados ?? {}) }
		for (const [k, v] of Object.entries(extras)) {
			if (v === null) delete merged[k]
			else merged[k] = v
		}
		row.dados = Object.keys(merged).length > 0 ? merged : null
	}

	return { action: existing ? 'update' : 'insert', row }
}
