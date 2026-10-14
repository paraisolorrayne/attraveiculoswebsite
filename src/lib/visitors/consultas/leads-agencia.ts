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
	/**
	 * `clique`: a visita em que o lead nasceu veio da agência. `visita_anterior`: uma visita antes dela.
	 * `anuncio`: anúncio da Meta que abre o WhatsApp direto, sem visita ao site; a campanha vem do CRM.
	 */
	ligacao: 'clique' | 'visita_anterior' | 'anuncio'
}

/** Marcadores da agência que valem para a campanha informada pelo CRM (`agencias`). */
export interface MarcadoresDaAgencia {
	prefixos: string[] | null
	ids_campanha: string[] | null
}

export interface CampanhaDoCard {
	nome: string | null
	id: string | null
}

const texto = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null)

/**
 * Campanha que o CRM (Fykos) informa no card, em `dados.origem_detalhe`.
 *
 * É o caminho 2 da atribuição de leads do spec da área da agência (02/10): o
 * lead do anúncio que abre o WhatsApp direto nunca visita o site, então não há
 * sessão para ligar; quem sabe a campanha é o CRM, pelo id do anúncio. Sem
 * nome nem id, o card não tem campanha informada.
 */
export function campanhaDoCard(dados: Record<string, unknown> | null | undefined): CampanhaDoCard | null {
	const origem = dados?.origem_detalhe
	if (!origem || typeof origem !== 'object') return null
	const o = origem as Record<string, unknown>
	const nome = texto(o.campanha_nome)
	const id = texto(o.campanha_id)
	return nome || id ? { nome, id } : null
}

/**
 * A campanha é da agência pelos MESMOS marcadores das visitas (`escopo.ts`):
 * o nome começa com um prefixo, ou o id está na lista. Sem diferenciar caixa
 * nem espaço; item vazio na lista é ignorado (senão abriria tudo).
 */
export function campanhaEhDaAgencia(campanha: CampanhaDoCard, ag: MarcadoresDaAgencia): boolean {
	const nome = (campanha.nome ?? '').trim().toLowerCase()
	const id = (campanha.id ?? '').trim().toLowerCase()
	const prefixos = (ag.prefixos ?? []).map(p => p.trim().toLowerCase()).filter(Boolean)
	const ids = (ag.ids_campanha ?? []).map(i => i.trim().toLowerCase()).filter(Boolean)
	return (nome !== '' && prefixos.some(p => nome.startsWith(p))) || (id !== '' && ids.includes(id))
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
 * Card que não liga a nenhuma visita da agência ainda entra pela campanha que
 * o CRM informa (`campanhaDoCard`): é o lead do anúncio da Meta que abre o
 * WhatsApp direto. Caso real (14/10): o Nilton Blaese veio do anúncio da Media
 * House, foi ao vendedor e foi encerrado, e o painel dizia "Ainda não há lead
 * com vendedor para relacionar".
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

	const contar = (card: (typeof cards)[number], campanha: string, plataforma: PlataformaCampanha | null, ligacao: LeadDaAgencia['ligacao']) => {
		const status = statusDoLead(card.etapa)
		const dados = (card.dados && typeof card.dados === 'object' ? card.dados : {}) as Record<string, unknown>
		const { veiculo, tipo } = veiculoDoLead(card.veiculo, dados.veiculo_interesse_detalhe as VeiculoDetalhe | null)

		somar(total, status)
		const linha = porCampanha.get(campanha) ?? { campanha, plataforma, ...vazia() }
		somar(linha, status)
		porCampanha.set(campanha, linha)

		if (lista.length < LIMITE_LISTA) {
			lista.push({ entrada: new Date(card.criado_em).toISOString(), campanha, plataforma, veiculo, tipo, status, ligacao })
		}
	}
	const contados = new Set<string>()

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
			contar(card, toque.campanha, toque.plataforma, toque.eh_clique ? 'clique' : 'visita_anterior')
			contados.add(card.id)
		}
	}

	// Caminho 2 do spec: campanha informada pelo CRM, para o card que não ligou
	// a uma visita da agência. É sempre Meta (anúncio que abre o WhatsApp).
	const comCampanha = cards
		.filter(c => !contados.has(c.id))
		.map(c => ({ card: c, campanha: campanhaDoCard(c.dados as Record<string, unknown> | null) }))
		.filter((c): c is { card: (typeof cards)[number]; campanha: CampanhaDoCard } => c.campanha !== null)
	if (comCampanha.length > 0) {
		const marcadores = escopo.tipo === 'agencia'
			? await db.selectFrom('agencias').select(['prefixos', 'ids_campanha']).where('id', '=', escopo.agenciaId).executeTakeFirst()
			: null
		const plataformaOk = escopo.tipo === 'tudo' || !escopo.plataforma || escopo.plataforma === 'meta'
		const filtroCampanhas = escopo.tipo === 'agencia' && escopo.campanhas && escopo.campanhas.length > 0
			? escopo.campanhas.map(c => c.trim().toLowerCase())
			: null
		for (const { card, campanha } of comCampanha) {
			if (!plataformaOk) break
			if (escopo.tipo === 'agencia' && (!marcadores || !campanhaEhDaAgencia(campanha, marcadores))) continue
			const nome = campanha.nome ?? campanha.id ?? ''
			if (filtroCampanhas && !filtroCampanhas.includes(nome.trim().toLowerCase())) continue
			contar(card, nome, 'meta', 'anuncio')
			contados.add(card.id)
		}
	}

	return {
		periodo: { dias, desde: desde ? desde.toISOString() : null },
		/**
		 * Algum card do período (de qualquer origem) está ligado a uma visita do
		 * site ou traz a campanha informada pelo CRM? Se não, zero leads não quer
		 * dizer "a campanha não gerou lead", e a tela mostra o aviso de
		 * implantação em vez dos zeros. Só sim/não: o total de leads da loja não
		 * é da conta da agência.
		 */
		ligacao_ativa: ligados.length > 0 || comCampanha.length > 0,
		total,
		porCampanha: [...porCampanha.values()].sort((a, b) => b.entraram - a.entraram || a.campanha.localeCompare(b.campanha)),
		lista,
	}
}
