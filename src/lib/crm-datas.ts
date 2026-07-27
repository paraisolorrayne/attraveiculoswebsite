// Datas efetivas dos cards do CRM.
//
// Por que existe: o emissor v1 mandava lotes que carimbavam atualizado_em com o
// relógio do servidor — uma venda fechada em 12/07 podia chegar num lote de
// 22/07 e "virar ganho da semana" no filtro de período. Para card encerrado, a
// data que interessa é a do ENCERRAMENTO, que nos cards legados vive só no
// JSONB `dados.encerrado_em` (a coluna própria passou a existir no contrato v2).

interface CardComDatas {
	etapa: string
	atualizado_em: string
	encerrado_em: string | null
	dados: Record<string, unknown> | null
}

const ENCERRADAS = ['encerrado_ganho', 'encerrado_perdido']

function isoValida(v: unknown): v is string {
	return typeof v === 'string' && v.trim() !== '' && !isNaN(Date.parse(v))
}

/** Data efetiva de encerramento: coluna v2 → fallback dados.encerrado_em (v1) → null. */
export function dataEncerramento(card: CardComDatas): string | null {
	if (isoValida(card.encerrado_em)) return card.encerrado_em
	const legado = card.dados?.encerrado_em
	return isoValida(legado) ? legado : null
}

/**
 * Data usada no filtro de período e nos KPIs:
 * - etapa ativa → última movimentação (atualizado_em)
 * - encerrada → data efetiva de encerramento (fallback: atualizado_em)
 */
export function dataReferenciaPeriodo(card: CardComDatas): string {
	if (ENCERRADAS.includes(card.etapa)) {
		return dataEncerramento(card) ?? card.atualizado_em
	}
	return card.atualizado_em
}
