import { sql } from 'kysely'
import { db } from '@/lib/db'
import type { PlataformaCampanha } from '@/lib/db/types'
import { ETAPA_GANHO, ETAPA_PERDIDO, JANELA_ATRIBUICAO_DIAS, TOLERANCIA_APOS_CARD_HORAS } from '@/lib/atribuicao-receita'
import { veiculoDoLead, type TipoLead, type VeiculoDetalhe } from '@/lib/agencias/veiculo-lead'
import { ligarCardsASessoes } from '@/lib/visitors/ligacao-cards-db'
import { campanhaSql, periodoDaUrl } from '@/lib/visitors/sql-atribuicao'
import { naAgencia, plataformaDaSessaoSql, type Escopo } from '@/lib/visitors/escopo'

const LIMITE_CARDS = 5000
const LIMITE_LISTA = 200

export type StatusLead = 'com_vendedor' | 'vendido' | 'perdido'

/** Etapa do CRM → o que a agência vê. Fechado com ganho = vendido; com perda = perdido; o resto está com o vendedor. */
export function statusDoLead(etapa: string): StatusLead {
	if (etapa === ETAPA_GANHO) return 'vendido'
	if (etapa === ETAPA_PERDIDO) return 'perdido'
	return 'com_vendedor'
}

export interface ContagemLeads {
	entraram: number
	com_vendedor: number
	vendidos: number
	perdidos: number
}

export interface LeadDaAgencia {
	entrada: string
	campanha: string
	plataforma: PlataformaCampanha | null
	veiculo: string
	tipo: TipoLead
	status: StatusLead
	/** `clique`: a visita em que o lead nasceu veio da agência. `visita_anterior`: uma visita antes dela. */
	ligacao: 'clique' | 'visita_anterior'
}

function vazia(): ContagemLeads {
	return { entraram: 0, com_vendedor: 0, vendidos: 0, perdidos: 0 }
}

function somar(c: ContagemLeads, status: StatusLead) {
	c.entraram += 1
	if (status === 'vendido') c.vendidos += 1
	else if (status === 'perdido') c.perdidos += 1
	else c.com_vendedor += 1
}

/**
 * Leads da agência no período (pela ENTRADA do card, como na receita).
 *
 * Um card é dela quando: 1) está ligado a uma visita do site pela mesma regra
 * da receita do painel da Attra (identificador de sessão no card ou telefone ↔
 * perfil); e 2) QUALQUER visita daquela pessoa (mesmo aparelho) na janela de
 * atribuição antes do card tem o marcador da agência — decisão da usuária em
 * 02/10: quem chegou pela campanha e voltou direto para chamar conta. A
 * campanha do lead é a da visita do clique, se for da agência; senão a da
 * visita da agência mais recente antes dele.
 *
 * Sai só o que a agência pode ver: data, campanha, plataforma, veículo
 * normalizado, tipo e status. Nunca id do card, nome, telefone, vendedor,
 * valor ou motivo de perda.
 */
export async function consultarLeadsAgencia(endereco: string, escopo: Escopo) {
	const { dias, desde } = periodoDaUrl(endereco, escopo)

	let consulta = db
		.selectFrom('crm_cards')
		.select(['id', 'etapa', 'telefone', 'veiculo', 'criado_em', 'dados'])
		.orderBy('criado_em', 'desc')
		.limit(LIMITE_CARDS)
	if (desde) consulta = consulta.where('criado_em', '>=', desde)
	const cards = await consulta.execute()

	const { ligacoes } = await ligarCardsASessoes(cards)
	const ligados = cards.filter(c => ligacoes.get(c.id)?.sessao)

	const total = vazia()
	const porCampanha = new Map<string, ContagemLeads & { campanha: string; plataforma: PlataformaCampanha | null }>()
	const lista: LeadDaAgencia[] = []

	if (ligados.length > 0) {
		const { rows } = await sql<{
			card_id: string
			campanha: string
			plataforma: PlataformaCampanha | null
			eh_clique: boolean
		}>`
			with l (card_id, sessao_id, criado_em) as (
				select * from unnest(
					${ligados.map(c => c.id)}::text[],
					${ligados.map(c => ligacoes.get(c.id)!.sessao!.id)}::uuid[],
					${ligados.map(c => c.criado_em)}::timestamptz[]
				)
			)
			select distinct on (l.card_id)
				l.card_id,
				${campanhaSql} as campanha,
				${plataformaDaSessaoSql} as plataforma,
				(s.id = l.sessao_id) as eh_clique
			from l
			join visitor_sessions s0 on s0.id = l.sessao_id
			join visitor_sessions s on (
				s.id = s0.id
				or (s.fingerprint_id = s0.fingerprint_id
				    and s.started_at >= l.criado_em - make_interval(days => ${JANELA_ATRIBUICAO_DIAS})
				    and s.started_at <= l.criado_em + make_interval(hours => ${TOLERANCIA_APOS_CARD_HORAS}))
			)
			where ${naAgencia(escopo)}
			order by l.card_id, (s.id = l.sessao_id) desc, s.started_at desc
		`.execute(db)

		const daAgencia = new Map(rows.map(r => [r.card_id, r]))
		for (const card of ligados) {
			const toque = daAgencia.get(card.id)
			if (!toque) continue
			const status = statusDoLead(card.etapa)
			const dados = (card.dados && typeof card.dados === 'object' ? card.dados : {}) as Record<string, unknown>
			const { veiculo, tipo } = veiculoDoLead(card.veiculo, dados.veiculo_interesse_detalhe as VeiculoDetalhe | null)

			somar(total, status)
			const linha = porCampanha.get(toque.campanha) ?? { campanha: toque.campanha, plataforma: toque.plataforma, ...vazia() }
			somar(linha, status)
			porCampanha.set(toque.campanha, linha)

			if (lista.length < LIMITE_LISTA) {
				lista.push({
					entrada: new Date(card.criado_em).toISOString(),
					campanha: toque.campanha,
					plataforma: toque.plataforma,
					veiculo,
					tipo,
					status,
					ligacao: toque.eh_clique ? 'clique' : 'visita_anterior',
				})
			}
		}
	}

	return {
		periodo: { dias, desde: desde ? desde.toISOString() : null },
		total,
		porCampanha: [...porCampanha.values()].sort((a, b) => b.entraram - a.entraram || a.campanha.localeCompare(b.campanha)),
		lista,
	}
}
