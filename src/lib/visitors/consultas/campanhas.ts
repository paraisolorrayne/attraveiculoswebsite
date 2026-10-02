import { periodoDaUrl } from '@/lib/visitors/sql-atribuicao'
import { CLIQUES_REGISTRADOS_DESDE } from '@/lib/visitors/score-clique'
import { carregarCampanhasComScore } from '@/lib/visitors/campanhas-score-db'
import type { Escopo } from '@/lib/visitors/escopo'

/**
 * GET /api/admin/visitors/campanhas?dias=
 *
 * Só a tabela de campanhas com conversão e score — o que a aba Estatísticas do
 * Marketing mostra, sem carregar o resto da aba Origens. Mesma permissão do
 * painel de visitantes: quem não vê Visitantes não vê isto, mesmo chamando a
 * rota direto.
 */
export async function consultarCampanhas(endereco: string, escopo: Escopo) {
	const { dias, desde, noPeriodo } = periodoDaUrl(endereco, escopo)
	return {
		periodo: { dias, desde: desde ? desde.toISOString() : null },
		campanhas: await carregarCampanhasComScore(noPeriodo),
		score_desde: CLIQUES_REGISTRADOS_DESDE.toISOString(),
	}
}
