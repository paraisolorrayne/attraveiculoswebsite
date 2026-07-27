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
const CAMPOS_CONHECIDOS = new Set<string>([...CAMPOS_TEXTO, ...CAMPOS_DATA, 'id', 'etapa', 'atualizado_em', 'veiculo_interesse', 'veiculo', 'valor'])

export type CrmCardRowV2 = { id: string; atualizado_em: Date } & Record<string, unknown>

export function mergeCardV2(
	existing: { atualizado_em: Date | string; dados: Record<string, unknown> | null } | null,
	payload: Record<string, unknown>,
): { action: 'skip' } | { action: 'insert' | 'update'; row: CrmCardRowV2 } {
	const atualizadoEm = typeof payload.atualizado_em === 'string' && !isNaN(Date.parse(payload.atualizado_em))
		? new Date(payload.atualizado_em)
		: new Date()

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
		row.valor = v === null || v === '' ? null : Number(v)
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

	// Extras desconhecidos → dados (merge com o existente; compatibilidade futura)
	const extras: Record<string, unknown> = {}
	for (const [k, v] of Object.entries(payload)) {
		if (!CAMPOS_CONHECIDOS.has(k)) extras[k] = v
	}
	if (Object.keys(extras).length > 0) {
		row.dados = { ...(existing?.dados ?? {}), ...extras }
	}

	return { action: existing ? 'update' : 'insert', row }
}
