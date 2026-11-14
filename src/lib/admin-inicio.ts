/**
 * Os blocos da tela inicial do admin, por perfil (14/11/2026).
 *
 * A tela era a mesma para todo mundo: três números e uma grade de atalhos.
 * Agora ela se monta a partir do que a pessoa pode abrir: quem faz criativos
 * vê os carros novos do estoque que ainda não têm peça; quem cuida do
 * comercial vê os leads esperando aceite e o mês; quem tem tarefas de
 * marketing vê as suas. A ordem é a dos sistemas grandes: primeiro o que
 * precisa de mim, depois como estamos, por último os atalhos.
 *
 * Cada bloco é independente e o que falhar devolve `null`: a tela mostra os
 * outros e não inventa zero no lugar do que não conseguiu ler.
 */
import { sql } from 'kysely'
import { db } from '@/lib/db'
import { getVehicles } from '@/lib/autoconf-api'
import { idsComCriativo } from '@/lib/criativos-gerados'
import { metaConfigurada, PAPEIS_COM_SALDO, saldoDaMeta, type SaldoDaMeta } from '@/lib/meta-ads'
import { canAccessRoute, isPrivileged, type AdminRole, type SecoesExtras } from '@/lib/auth/roles'
import { atrasoAceite, fmtHorasComerciais, inicioDoDiaBRT, type NivelAtraso } from '@/lib/crm-periodo'
import { dataAlerta, dataEncerramento, ETAPA_AGUARDANDO } from '@/lib/crm-datas'
import { cardSemInformacao, colunaDoCard, COLUNAS_KANBAN } from '@/app/admin/crm/crm-constants'

const DIA_MS = 24 * 60 * 60 * 1000

/** Carro "novo no estoque": publicado há no máximo estes dias. */
export const DIAS_DE_CARRO_NOVO = 15
const LIMITE_CARROS = 8

export interface CarroSemCriativo {
	id: string
	nome: string
	versao: string | null
	foto: string | null
	preco: number | null
	/** Dias desde a publicação na AutoConf; null se a data não veio. */
	dias: number | null
}

export interface BlocoCarros {
	carros: CarroSemCriativo[]
	/** Quantos carros novos estão sem criativo no total (a lista mostra só os primeiros). */
	total: number
	/** Quantos carros novos há no estoque, com ou sem peça. */
	novos: number
}

export interface LeadAguardando {
	id: string
	nome: string
	/** O que procurar no CRM para achar este lead: nome, telefone ou e-mail. */
	busca: string | null
	veiculo: string | null
	vendedor: string | null
	espera: string | null
	nivel: NivelAtraso
}

export interface BlocoComercial {
	aguardando: { total: number; criticos: number; leads: LeadAguardando[] }
	funil: { id: string; rotulo: string; total: number }[]
	mes: { nome: string; leads: number; vendas: number; valor: number }
	mesAnterior: { nome: string; leads: number; vendas: number; valor: number }
}

export interface CarroProcurado {
	slug: string
	nome: string
	sessoes: number
	whatsapp: number
}

export interface TarefaMinha {
	id: string
	titulo: string
	prazo: string | null
	atrasada: boolean
	prioridade: string | null
}

export interface BlocoMarketing {
	/** Peças do gerador esperando publicação no board. */
	fila: number
	tarefas: TarefaMinha[]
	tarefasEmAberto: number
}

export interface BlocoConteudo {
	rascunhos: { id: string; titulo: string }[]
	totalRascunhos: number
	campanhasPendentes: number
}

export interface DadosDoInicio {
	carros: BlocoCarros | null
	comercial: BlocoComercial | null
	procurados: CarroProcurado[] | null
	marketing: BlocoMarketing | null
	conteudo: BlocoConteudo | null
	/** Saldo da conta de anúncios da Meta. */
	saldo: SaldoDaMeta | null
	/** Quais blocos este perfil vê (o que não vê nem é consultado). */
	ve: { carros: boolean; comercial: boolean; procurados: boolean; marketing: boolean; conteudo: boolean; saldo: boolean }
}

async function tentar<T>(nome: string, consulta: () => Promise<T>): Promise<T | null> {
	try {
		return await consulta()
	} catch (e) {
		console.warn(`[admin/inicio] bloco "${nome}" falhou:`, e)
		return null
	}
}

const iso = (v: unknown): string | null => (v instanceof Date ? v.toISOString() : typeof v === 'string' ? v : null)

/* ------------------------------------------------ carros sem criativo */

async function carregarCarros(agora: number): Promise<BlocoCarros> {
	const [{ vehicles }, comCriativo] = await Promise.all([
		getVehicles({ tipo: 'carros', registros_por_pagina: 100, ordenar: 'publicacao', ordem: 'desc' }),
		idsComCriativo(),
	])
	const comData = vehicles
		.map(v => {
			const t = v.created_at ? Date.parse(v.created_at) : NaN
			return { v, dias: Number.isNaN(t) ? null : Math.max(0, Math.floor((agora - t) / DIA_MS)) }
		})
		.filter(x => x.dias === null || x.dias <= DIAS_DE_CARRO_NOVO)
		// Mais novo primeiro; sem data vai para o fim.
		.sort((a, b) => (a.dias ?? 1e9) - (b.dias ?? 1e9))
	const sem = comData.filter(x => !comCriativo.has(String(x.v.id)))
	return {
		novos: comData.length,
		total: sem.length,
		carros: sem.slice(0, LIMITE_CARROS).map(({ v, dias }) => ({
			id: String(v.id),
			nome: [v.brand, v.model, v.year_model].filter(Boolean).join(' '),
			versao: v.version || null,
			foto: v.photos?.[0] ?? null,
			preco: v.price > 0 ? v.price : null,
			dias,
		})),
	}
}

/* ------------------------------------------------------------ comercial */

function inicioDoMesBRT(agora: number, mesesAtras = 0): number {
	// Meia-noite de hoje em São Paulo, recuada até o dia 1 do mês pedido.
	const hoje = new Date(inicioDoDiaBRT(agora))
	const partes = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: 'numeric', day: 'numeric' })
		.formatToParts(hoje)
	const dia = Number(partes.find(p => p.type === 'day')?.value ?? 1)
	let t = hoje.getTime() - (dia - 1) * DIA_MS
	for (let i = 0; i < mesesAtras; i++) {
		// Um dia antes do dia 1 cai no mês anterior; recua até o dia 1 dele.
		const fim = new Date(t - DIA_MS)
		const d = Number(
			new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', day: 'numeric' }).format(fim),
		)
		t = fim.getTime() - (d - 1) * DIA_MS
	}
	return t
}

const nomeDoMes = (t: number) =>
	new Date(t + 12 * 60 * 60 * 1000).toLocaleDateString('pt-BR', { month: 'long', timeZone: 'America/Sao_Paulo' })

async function carregarComercial(agora: number): Promise<BlocoComercial> {
	const inicioMes = inicioDoMesBRT(agora)
	const inicioAnterior = inicioDoMesBRT(agora, 1)

	// Abertos (qualquer data) + tudo que foi criado ou encerrado desde o mês passado.
	const linhas = await db
		.selectFrom('crm_cards')
		.select([
			'id', 'etapa', 'nome', 'telefone', 'email', 'veiculo', 'valor', 'vendedor', 'fonte_evento',
			'andamento', 'impedimento', 'proxima_acao', 'motivo_encerramento',
			'atribuido_em', 'encerrado_em', 'dados', 'criado_em', 'atualizado_em',
		])
		.where(eb =>
			eb.or([
				eb('etapa', 'not in', ['encerrado_ganho', 'encerrado_perdido']),
				eb('criado_em', '>=', new Date(inicioAnterior)),
				eb('atualizado_em', '>=', new Date(inicioAnterior)),
			]),
		)
		.limit(5000)
		.execute()

	const cards = linhas
		.map(l => ({
			...l,
			valor: l.valor === null ? null : Number(l.valor),
			atribuido_em: iso(l.atribuido_em),
			encerrado_em: iso(l.encerrado_em),
			criado_em: iso(l.criado_em) ?? '',
			atualizado_em: iso(l.atualizado_em) ?? '',
			dados: (l.dados ?? null) as Record<string, unknown> | null,
		}))
		.filter(c => !cardSemInformacao(c))

	const fila = cards
		.filter(c => c.etapa === ETAPA_AGUARDANDO)
		.map(c => ({ c, atraso: atrasoAceite(dataAlerta(c), agora) }))
		.sort((a, b) => (b.atraso?.ms ?? -1) - (a.atraso?.ms ?? -1))

	const funil = COLUNAS_KANBAN.filter(col => !col.encerrada).map(col => ({
		id: col.id,
		rotulo: col.label,
		total: cards.filter(c => colunaDoCard(c) === col.id).length,
	}))

	const doPeriodo = (de: number, ate: number, nome: string) => {
		const dentro = (t: string | null) => {
			const ms = t ? Date.parse(t) : NaN
			return !Number.isNaN(ms) && ms >= de && ms < ate
		}
		const ganhos = cards.filter(c => c.etapa === 'encerrado_ganho' && dentro(dataEncerramento(c) ?? c.atualizado_em))
		return {
			nome,
			leads: cards.filter(c => dentro(c.criado_em)).length,
			vendas: ganhos.length,
			valor: ganhos.reduce((s, c) => s + (c.valor ?? 0), 0),
		}
	}

	return {
		aguardando: {
			total: fila.length,
			criticos: fila.filter(f => f.atraso?.nivel === 'critico').length,
			leads: fila.slice(0, 5).map(({ c, atraso }) => ({
				id: c.id,
				nome: c.nome?.trim() || 'Sem nome',
				busca: c.nome?.trim() || c.telefone?.trim() || c.email?.trim() || null,
				veiculo: c.veiculo?.trim() || null,
				vendedor: c.vendedor?.trim() || null,
				espera: atraso ? fmtHorasComerciais(atraso.ms) : null,
				nivel: atraso?.nivel ?? 'ok',
			})),
		},
		funil,
		mes: doPeriodo(inicioMes, agora + 1, nomeDoMes(inicioMes)),
		mesAnterior: doPeriodo(inicioAnterior, inicioMes, nomeDoMes(inicioAnterior)),
	}
}

/* ------------------------------------------------- carros mais procurados */

async function carregarProcurados(agora: number): Promise<CarroProcurado[]> {
	const linhas = await db
		.selectFrom('visitor_page_views')
		.select([
			'vehicle_slug',
			sql<string>`max(vehicle_brand)`.as('marca'),
			sql<string>`max(vehicle_model)`.as('modelo'),
			sql<string>`count(distinct session_id)`.as('sessoes'),
			sql<string>`count(*) filter (where clicked_whatsapp)`.as('whatsapp'),
		])
		.where('page_type', '=', 'vehicle')
		.where('vehicle_slug', 'is not', null)
		.where(sql<boolean>`viewed_at >= ${new Date(agora - 7 * DIA_MS)}`)
		.groupBy('vehicle_slug')
		.orderBy(sql`count(distinct session_id)`, 'desc')
		.limit(5)
		.execute()
	return linhas.map(l => ({
		slug: String(l.vehicle_slug),
		nome: [l.marca, l.modelo].filter(Boolean).join(' ') || String(l.vehicle_slug),
		sessoes: Number(l.sessoes),
		whatsapp: Number(l.whatsapp),
	}))
}

/* ------------------------------------------------------------- marketing */

async function carregarMarketing(usuarioId: string, agora: number): Promise<BlocoMarketing> {
	const abertas = ['completed', 'failed']
	const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date(agora))
	const [fila, minhas, emAberto] = await Promise.all([
		db.selectFrom('marketing_creatives').select(sql<string>`count(*)`.as('total')).where('status', '=', 'pendente').executeTakeFirst(),
		db
			.selectFrom('marketing_tasks as t')
			.innerJoin('task_assignments as a', 'a.task_id', 't.id')
			.select(['t.id', 't.title', 't.due_date', 't.priority'])
			.where('a.user_id', '=', usuarioId)
			.where('t.status', 'not in', abertas)
			.orderBy(sql`t.due_date asc nulls last`)
			.limit(6)
			.execute(),
		db.selectFrom('marketing_tasks').select(sql<string>`count(*)`.as('total')).where('status', 'not in', abertas).executeTakeFirst(),
	])
	return {
		fila: Number(fila?.total ?? 0),
		tarefasEmAberto: Number(emAberto?.total ?? 0),
		tarefas: minhas.map(t => {
			// O prazo é um DIA, gravado como meia-noite UTC. Vai para a tela como
			// "aaaa-mm-dd" e só atrasa quando o dia inteiro passou em São Paulo.
			const prazo = iso(t.due_date)?.slice(0, 10) ?? null
			return {
				id: String(t.id),
				titulo: t.title,
				prazo,
				atrasada: !!prazo && prazo < hoje,
				prioridade: t.priority ?? null,
			}
		}),
	}
}

/* -------------------------------------------------------------- conteúdo */

async function carregarConteudo(comNewsletter: boolean): Promise<BlocoConteudo> {
	const [rascunhos, total, campanhas] = await Promise.all([
		db.selectFrom('dual_blog_posts').select(['id', 'title']).where('is_published', '=', false).orderBy('updated_at', 'desc').limit(4).execute(),
		db.selectFrom('dual_blog_posts').select(sql<string>`count(*)`.as('total')).where('is_published', '=', false).executeTakeFirst(),
		// Quem não abre a Newsletter não recebe o número dela.
		comNewsletter
			? db.selectFrom('newsletter_campaigns').select(sql<string>`count(*)`.as('total')).where('status', 'in', ['draft', 'scheduled']).executeTakeFirst()
			: null,
	])
	return {
		rascunhos: rascunhos.map(r => ({ id: String(r.id), titulo: r.title })),
		totalRascunhos: Number(total?.total ?? 0),
		campanhasPendentes: Number(campanhas?.total ?? 0),
	}
}

/* --------------------------------------------------------------- entrada */

export async function carregarInicio(admin: { id: string; role: AdminRole; secoes?: SecoesExtras | null }): Promise<DadosDoInicio> {
	const pode = (rota: string) => canAccessRoute(admin.role, rota, admin.secoes)
	const ve = {
		carros: pode('/admin/gerador-criativos'),
		// O CRM abre só para admin e owner (regra da própria página, crm/page.tsx):
		// a tela inicial não mostra nome e valor de lead a quem não abre o CRM.
		comercial: isPrivileged(admin.role) && pode('/admin/crm'),
		procurados: pode('/admin/visitors'),
		marketing: pode('/admin/marketing'),
		conteudo: pode('/admin/blog'),
		// Sem token gravado no servidor o bloco nem aparece.
		saldo: PAPEIS_COM_SALDO.includes(admin.role) && metaConfigurada(),
	}
	const agora = Date.now()
	const [carros, comercial, procurados, marketing, conteudo, saldo] = await Promise.all([
		ve.carros ? tentar('carros', () => carregarCarros(agora)) : null,
		ve.comercial ? tentar('comercial', () => carregarComercial(agora)) : null,
		ve.procurados ? tentar('procurados', () => carregarProcurados(agora)) : null,
		ve.marketing ? tentar('marketing', () => carregarMarketing(admin.id, agora)) : null,
		ve.conteudo ? tentar('conteudo', () => carregarConteudo(pode('/admin/newsletter'))) : null,
		ve.saldo ? tentar('saldo', () => saldoDaMeta()) : null,
	])
	return { carros, comercial, procurados, marketing, conteudo, saldo, ve }
}
