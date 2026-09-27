/**
 * Autenticação das rotas de atribuição, num lugar só porque são duas rotas com
 * a mesma regra.
 *
 * Sem `SITE_ATRIBUICAO_API_KEY` definida, a rota responde 503 e NÃO atende.
 * Falhar fechado é deliberado: o alternativo — atender sem chave quando a
 * variável falta — deixaria dados de campanha de leads reais abertos na
 * internet no dia em que alguém esquecesse de configurar a VPS, e ninguém
 * perceberia, porque tudo continuaria funcionando.
 */
import { safeEquals } from '@/lib/crm-webhook'

export type ResultadoDaChave = 'ok' | 'sem_chave_configurada' | 'recusada'

export function conferirChave(recebida: string | null): ResultadoDaChave {
	const esperada = process.env.SITE_ATRIBUICAO_API_KEY?.trim()
	if (!esperada) return 'sem_chave_configurada'
	if (!recebida) return 'recusada'
	// Comparação em tempo constante: a checagem ingênua vaza o prefixo correto
	// pelo tempo de resposta, e uma chave de API é adivinhável assim.
	return safeEquals(recebida, esperada) ? 'ok' : 'recusada'
}

/** A resposta de erro correspondente, ou `null` quando a chave passou. */
export function respostaDeErroDaChave(resultado: ResultadoDaChave): Response | null {
	if (resultado === 'ok') return null
	if (resultado === 'sem_chave_configurada') {
		return Response.json(
			{ erro: 'rota de atribuição sem chave configurada no servidor' },
			{ status: 503 },
		)
	}
	return Response.json({ erro: 'chave inválida' }, { status: 401 })
}
