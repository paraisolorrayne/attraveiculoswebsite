import { sql } from 'kysely'
import { db } from '@/lib/db'
import { formaDaLigacao, ligacaoCerta, type FormaDaLigacao } from '@/lib/atribuicao-receita'
import { veiculoDoLead, type VeiculoDetalhe } from '@/lib/agencias/veiculo-lead'
import { statusDoLead } from '@/lib/visitors/consultas/leads-agencia'

/**
 * Do clique à conversa no CRM, para a tela de uma sessão (29/10/2026).
 *
 * Responde, para uma visita: os cliques no WhatsApp levaram o código invisível
 * (codigo-whatsapp.ts)? E a visita virou lead no CRM, ligada como? Antes a tela
 * só mostrava que houve clique, sem dizer se ele virou conversa.
 *
 * Sai o mesmo que a lista de leads da agência já mostra (entrada, veículo,
 * situação), nunca id do card, nome, telefone ou vendedor: a tela da sessão
 * também abre na área da agência.
 */

export interface CliqueDaSessao {
	clicked_at: string
	page_path: string | null
	/** O clique levou o código invisível na mensagem (cliques de antes de 29/10/2026 não). */
	com_codigo: boolean
	/** Posição em `leads` do lead que este clique originou; null se nenhum. */
	lead: number | null
}

export interface LeadDaSessao {
	entrada: string
	veiculo: string
	situacao: string
	ligacao: FormaDaLigacao
	certa: boolean
}

export interface ConversasDaSessao {
	cliques: CliqueDaSessao[]
	leads: LeadDaSessao[]
}

const ROTULO_ETAPA: Record<string, string> = {
	novo: 'Novo',
	em_atendimento: 'Em atendimento',
	em_negociacao: 'Em negociação',
	encerrado_ganho: 'Vendido',
	encerrado_perdido: 'Perdido',
}

const ROTULO_STATUS = { com_vendedor: 'Com o vendedor', vendido: 'Vendido', perdido: 'Perdido' } as const

export interface LinhaClique {
	clicked_at: Date | string
	page_path: string | null
	codigo_whatsapp: string | number | null
	card_id: string | null
}

export interface LinhaCard {
	id: string
	criado_em: Date | string
	etapa: string
	veiculo: string | null
	dados: Record<string, unknown> | null
}

/** Parte pura: junta cliques e cards. A agência vê a situação resumida, como na lista de leads dela. */
export function montarConversas(cliques: LinhaClique[], cards: LinhaCard[], ehAgencia: boolean): ConversasDaSessao {
	const ordenados = [...cards].sort((a, b) => new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime())
	const posicao = new Map(ordenados.map((c, i) => [c.id, i]))

	return {
		cliques: cliques.map(c => ({
			clicked_at: new Date(c.clicked_at).toISOString(),
			page_path: c.page_path,
			com_codigo: c.codigo_whatsapp !== null,
			lead: c.card_id !== null ? (posicao.get(c.card_id) ?? null) : null,
		})),
		leads: ordenados.map(card => {
			const dados = card.dados ?? {}
			const ligacao = formaDaLigacao(dados) ?? 'identificador'
			return {
				entrada: new Date(card.criado_em).toISOString(),
				veiculo: veiculoDoLead(card.veiculo, dados.veiculo_interesse_detalhe as VeiculoDetalhe | null).veiculo,
				situacao: ehAgencia ? ROTULO_STATUS[statusDoLead(card.etapa)] : (ROTULO_ETAPA[card.etapa] ?? card.etapa),
				ligacao,
				certa: ligacaoCerta(ligacao),
			}
		}),
	}
}

/**
 * Os cliques de WhatsApp da sessão e os cards do CRM ligados a ela. O card guarda a sessão em
 * `dados.site_session_id`, pelo uuid (correlação e código) ou pelo token (formulário).
 */
export async function conversasDaSessao(
	sessionDbId: string,
	sessionToken: string,
	ehAgencia: boolean,
): Promise<ConversasDaSessao> {
	const cliques = await sql<LinhaClique>`
		select w.clicked_at, w.page_path, w.codigo_whatsapp, w.card_id
		from whatsapp_clicks w
		where w.session_db_id = ${sessionDbId}::uuid
		order by w.clicked_at asc
		limit 50
	`.execute(db)

	const cards = await sql<LinhaCard>`
		select c.id, c.criado_em, c.etapa, c.veiculo, c.dados
		from crm_cards c
		where c.dados->>'site_session_id' in (${sessionDbId}, ${sessionToken})
		limit 20
	`.execute(db)

	return montarConversas(cliques.rows, cards.rows, ehAgencia)
}
