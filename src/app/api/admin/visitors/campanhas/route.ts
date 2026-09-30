import { NextRequest, NextResponse } from 'next/server'
import { adminComAcessoA } from '@/lib/auth/guard-api'
import { periodoDaUrl } from '@/lib/visitors/sql-atribuicao'
import { CLIQUES_REGISTRADOS_DESDE } from '@/lib/visitors/score-clique'
import { carregarCampanhasComScore } from '@/lib/visitors/campanhas-score-db'

/**
 * GET /api/admin/visitors/campanhas?dias=
 *
 * Só a tabela de campanhas com conversão e score — o que a aba Estatísticas do
 * Marketing mostra, sem carregar o resto da aba Origens. Mesma permissão do
 * painel de visitantes: quem não vê Visitantes não vê isto, mesmo chamando a
 * rota direto.
 */
export async function GET(request: NextRequest) {
	try {
		const admin = await adminComAcessoA('/admin/visitors')
		if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

		const { dias, desde, noPeriodo } = periodoDaUrl(request.url)
		return NextResponse.json({
			periodo: { dias, desde: desde ? desde.toISOString() : null },
			campanhas: await carregarCampanhasComScore(noPeriodo),
			score_desde: CLIQUES_REGISTRADOS_DESDE.toISOString(),
		})
	} catch (error) {
		console.error('[Visitors Campanhas API] Error:', error)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}
