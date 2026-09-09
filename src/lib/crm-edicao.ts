import type { Selectable, Updateable } from 'kysely'
import type { CrmCardsTable } from '@/lib/db/types'
import { COLUNAS_KANBAN, colunaDoCard, type ColunaKanban } from '@/app/admin/crm/crm-constants'

export type EdicaoCrm = {
	atualizado_em: string
	coluna?: ColunaKanban['id']
	vendedor?: string | null
	motivo_encerramento?: string
}

export function podeEditarCrm(role: string): boolean {
	return role === 'owner' || role === 'admin'
}

export function validarEdicaoCrm(body: unknown): EdicaoCrm {
	if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Alteração inválida.')
	const b = body as Record<string, unknown>
	if (Object.keys(b).some(k => !['atualizado_em', 'coluna', 'vendedor', 'motivo_encerramento'].includes(k))) {
		throw new Error('Campo de edição não permitido.')
	}
	if (typeof b.atualizado_em !== 'string' || !Number.isFinite(Date.parse(b.atualizado_em))) {
		throw new Error('Atualize o card antes de editar.')
	}
	if ('coluna' in b && !COLUNAS_KANBAN.some(c => c.id === b.coluna)) throw new Error('Coluna inválida.')
	if ('vendedor' in b && b.vendedor !== null && (typeof b.vendedor !== 'string' || !b.vendedor.trim() || b.vendedor.trim().length > 150)) {
		throw new Error('Informe um vendedor válido ou selecione sem vendedor.')
	}
	if ('motivo_encerramento' in b && (typeof b.motivo_encerramento !== 'string' || b.motivo_encerramento.trim().length > 2000)) {
		throw new Error('Motivo inválido (máximo de 2.000 caracteres).')
	}
	if (!('coluna' in b) && !('vendedor' in b)) throw new Error('Informe a coluna ou o vendedor.')
	return {
		atualizado_em: b.atualizado_em,
		...('coluna' in b ? { coluna: b.coluna as EdicaoCrm['coluna'] } : {}),
		...('vendedor' in b ? { vendedor: typeof b.vendedor === 'string' ? b.vendedor.trim() : null } : {}),
		...('motivo_encerramento' in b ? { motivo_encerramento: (b.motivo_encerramento as string).trim() } : {}),
	}
}

/** Só altera campos necessários; a troca de vendedor preserva a coluna atual. */
export function mudancasCrm(card: Selectable<CrmCardsTable>, edicao: EdicaoCrm, agora: Date): Updateable<CrmCardsTable> | null {
	const colunaMudou = !!edicao.coluna && edicao.coluna !== colunaDoCard(card)
	const vendedorMudou = 'vendedor' in edicao && edicao.vendedor !== card.vendedor
	if (!colunaMudou && !vendedorMudou) return null
	const mudancas: Updateable<CrmCardsTable> = { atualizado_em: agora }
	if (vendedorMudou) {
		mudancas.vendedor = edicao.vendedor
		mudancas.atribuido_em = edicao.vendedor ? agora : null
		// Remove o fallback legado da data de atribuição.
		mudancas.dados = { ...card.dados, atribuido_em: null }
	}
	if (colunaMudou) {
		const etapas = { aguardando: 'novo', assumido: 'em_atendimento', movimentando: 'em_negociacao', ganho: 'encerrado_ganho', perdido: 'encerrado_perdido' }
		const coluna = edicao.coluna!
		if (coluna === 'perdido' && !edicao.motivo_encerramento) throw new Error('Informe o motivo do encerramento sem venda.')
		mudancas.etapa = etapas[coluna]
		mudancas.fonte_evento = coluna === 'movimentando' ? 'movimentacao_manual' : 'correcao_manual'
		mudancas.situacao = { aguardando: 'aguardando_contato', assumido: 'assumido', movimentando: 'negociando', ganho: 'ganho', perdido: 'perdido' }[coluna]
		mudancas.encerrado_em = coluna === 'ganho' || coluna === 'perdido' ? agora : null
		mudancas.motivo_encerramento = coluna === 'perdido' ? edicao.motivo_encerramento! : null
		mudancas.dados = { ...card.dados, ...(mudancas.dados as object ?? {}), encerrado_em: null, resultado: null }
		if (coluna === 'aguardando') {
			mudancas.primeiro_contato_em = null
			mudancas.atribuido_em = (edicao.vendedor === undefined ? card.vendedor : edicao.vendedor) ? agora : null
			mudancas.dados = { ...(mudancas.dados as object), atribuido_em: null }
		}
	}
	return mudancas
}
