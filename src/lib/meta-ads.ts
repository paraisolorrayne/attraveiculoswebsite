/**
 * Leitura da Marketing API da Meta: saldo da conta de anúncios e os anúncios
 * no ar (14/11/2026).
 *
 * O mesmo desenho do cliente do attra-py (integrations/meta_ads): token SEMPRE
 * no header `Authorization: Bearer` (query string vaza em log de acesso), só
 * leitura, e as mesmas variáveis de ambiente:
 *
 *   META_ADS_TOKEN        token de usuário do sistema com `ads_read` na conta
 *   META_AD_ACCOUNT_ID    id da conta, com ou sem `act_`
 *   META_ADS_API_VERSION  versão do Graph (padrão v21.0)
 *   META_ADS_BASE_URL     só para teste local com servidor simulado
 *
 * Nada aqui grava no banco nem guarda imagem. As respostas ficam em memória
 * por alguns minutos para a tela inicial não bater na Meta a cada abertura.
 */

const BASE_PADRAO = 'https://graph.facebook.com'
const TEMPO_LIMITE_MS = 15_000
const CACHE_MS = 10 * 60 * 1000

export class ErroDaMeta extends Error {
	constructor(mensagem: string, public status?: number) {
		super(mensagem)
	}
}

/** Quem vê o saldo da conta de anúncios: sócios, admin, quem faz criativos e o marketing. */
export const PAPEIS_COM_SALDO: readonly string[] = ['admin', 'owner', 'operador', 'marketing']

export function metaConfigurada(): boolean {
	return !!(process.env.META_ADS_TOKEN?.trim() && process.env.META_AD_ACCOUNT_ID?.trim())
}

function conta(): string {
	const cru = (process.env.META_AD_ACCOUNT_ID ?? '').trim()
	if (!/^(act_)?\d+$/.test(cru)) throw new ErroDaMeta('META_AD_ACCOUNT_ID vazio ou inválido')
	return cru.startsWith('act_') ? cru : `act_${cru}`
}

async function pedir(caminho: string, params: Record<string, string>, metodo: 'GET' | 'POST' = 'GET'): Promise<Record<string, unknown>> {
	const token = process.env.META_ADS_TOKEN?.trim()
	if (!token) throw new ErroDaMeta('META_ADS_TOKEN vazio')
	const versao = process.env.META_ADS_API_VERSION?.trim() || 'v21.0'
	const base = process.env.META_ADS_BASE_URL?.trim() || BASE_PADRAO
	// Escrita vai no corpo; leitura, na query. O token nunca vai em nenhum dos dois.
	const url = metodo === 'GET' ? `${base}/${versao}${caminho}?${new URLSearchParams(params)}` : `${base}/${versao}${caminho}`
	let r: Response
	try {
		r = await fetch(url, {
			method: metodo,
			body: metodo === 'POST' ? new URLSearchParams(params) : undefined,
			headers: { Authorization: `Bearer ${token}` },
			cache: 'no-store',
			signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
		})
	} catch (e) {
		throw new ErroDaMeta(`Meta fora do ar ou lenta (${(e as Error).name})`)
	}
	const corpo = (await r.json().catch(() => null)) as Record<string, unknown> | null
	if (!r.ok) {
		// A mensagem da Meta não traz o token (ele vai no header), só o motivo.
		const erro = (corpo?.error ?? {}) as { message?: string; code?: number }
		throw new ErroDaMeta(`Meta recusou (${r.status}${erro.code ? `, código ${erro.code}` : ''}): ${String(erro.message ?? '').slice(0, 200)}`, r.status)
	}
	return corpo ?? {}
}

/* ------------------------------------------------------------------ saldo */

export interface SaldoDaMeta {
	nomeDaConta: string
	moeda: string
	/** account_status da Meta: 1 = ativa. Outro valor = conta com problema. */
	ativa: boolean
	prePaga: boolean
	/** Crédito disponível, quando a conta é pré-paga e a Meta informa. */
	disponivel: number | null
	/** Valor em aberto a pagar (conta pós-paga, cartão). */
	aPagar: number | null
	/** Gasto do mês corrente. */
	gastoNoMes: number | null
	/** Quanto falta para o limite de gastos da conta, se houver limite. */
	restanteDoLimite: number | null
	formaDePagamento: string | null
	lidoEm: string
}

/** A Meta manda dinheiro da conta em centavos, como texto. */
export function centavos(v: unknown): number | null {
	const n = typeof v === 'string' || typeof v === 'number' ? Number(v) : NaN
	return Number.isFinite(n) ? n / 100 : null
}

/**
 * Tira o valor de textos como "Saldo disponível (R$1.234,56 BRL)" ou
 * "Available balance (R$1,234.56 BRL)". O último separador com dois dígitos
 * depois dele é o decimal, seja vírgula ou ponto.
 */
export function valorNoTexto(texto: unknown): number | null {
	if (typeof texto !== 'string') return null
	const m = texto.match(/\d[\d.,]*/)
	if (!m) return null
	let s = m[0].replace(/[.,]$/, '')
	const decimal = s.match(/[.,](\d{2})$/)
	s = decimal ? `${s.slice(0, -3).replace(/[.,]/g, '')}.${decimal[1]}` : s.replace(/[.,]/g, '')
	const n = Number(s)
	return Number.isFinite(n) ? n : null
}

export function saldoDoPayload(c: Record<string, unknown>, gastoNoMes: number | null, agora = new Date()): SaldoDaMeta {
	const fonte = (c.funding_source_details ?? {}) as { display_string?: string }
	const prePaga = c.is_prepay_account === true
	const limite = centavos(c.spend_cap)
	const gastoTotal = centavos(c.amount_spent)
	return {
		nomeDaConta: String(c.name ?? ''),
		moeda: String(c.currency ?? 'BRL'),
		ativa: Number(c.account_status) === 1,
		prePaga,
		disponivel: prePaga ? valorNoTexto(fonte.display_string) : null,
		aPagar: prePaga ? null : centavos(c.balance),
		gastoNoMes,
		restanteDoLimite: limite && limite > 0 && gastoTotal !== null ? Math.max(0, limite - gastoTotal) : null,
		formaDePagamento: fonte.display_string?.trim() || null,
		lidoEm: agora.toISOString(),
	}
}

const CAMPOS_DA_CONTA = 'name,account_status,currency,balance,amount_spent,spend_cap,is_prepay_account'

async function lerSaldo(): Promise<SaldoDaMeta> {
	const act = conta()
	const lerConta = async () => {
		try {
			return await pedir(`/${act}`, { fields: `${CAMPOS_DA_CONTA},funding_source_details`, locale: 'pt_BR' })
		} catch (e) {
			// A forma de pagamento pede permissão que o token de leitura pode não
			// ter. Sem ela ainda dá para mostrar o gasto e o valor em aberto.
			if (e instanceof ErroDaMeta && e.status && e.status < 500) return pedir(`/${act}`, { fields: CAMPOS_DA_CONTA })
			throw e
		}
	}
	const [dados, mes] = await Promise.all([
		lerConta(),
		pedir(`/${act}/insights`, { fields: 'spend', date_preset: 'this_month' }).catch(() => null),
	])
	const linha = (Array.isArray(mes?.data) ? mes.data[0] : null) as { spend?: string } | null
	// Mês sem gasto vem como lista vazia: é zero, não "não sei".
	const gasto = mes === null ? null : linha?.spend !== undefined ? Number(linha.spend) : 0
	return saldoDoPayload(dados, Number.isFinite(gasto as number) ? gasto : null)
}

let saldoGuardado: { em: number; valor: SaldoDaMeta } | null = null

/** Saldo da conta de anúncios, com cache de 10 minutos. Levanta `ErroDaMeta`. */
export async function saldoDaMeta({ forcar = false } = {}): Promise<SaldoDaMeta> {
	if (!forcar && saldoGuardado && Date.now() - saldoGuardado.em < CACHE_MS) return saldoGuardado.valor
	const valor = await lerSaldo()
	saldoGuardado = { em: Date.now(), valor }
	return valor
}

/* --------------------------------------------------------------- anúncios */

export interface AnuncioDaMeta {
	id: string
	nome: string
	/** ACTIVE = no ar. O resto (PAUSED, CAMPAIGN_PAUSED...) = fora do ar. */
	noAr: boolean
	criadoEm: string | null
	campanhaId: string
	campanhaNome: string
	/** Gasto dos últimos 30 dias; null se a Meta não informou. */
	gasto30d: number | null
}

export function anuncioDoPayload(o: unknown): Omit<AnuncioDaMeta, 'gasto30d'> | null {
	if (!o || typeof o !== 'object') return null
	const a = o as { id?: unknown; name?: unknown; effective_status?: unknown; created_time?: unknown; campaign?: { id?: unknown; name?: unknown } }
	const id = String(a.id ?? '')
	const campanhaId = String(a.campaign?.id ?? '')
	if (!/^\d+$/.test(id) || !/^\d+$/.test(campanhaId)) return null
	return {
		id,
		nome: String(a.name ?? '').trim(),
		noAr: a.effective_status === 'ACTIVE',
		criadoEm: typeof a.created_time === 'string' ? a.created_time : null,
		campanhaId,
		campanhaNome: String(a.campaign?.name ?? '').trim() || 'Campanha sem nome',
	}
}

async function paginar(caminho: string, params: Record<string, string>, maxPaginas = 20): Promise<unknown[]> {
	const itens: unknown[] = []
	const vistos = new Set<string>()
	let atual = params
	for (let i = 0; i < maxPaginas; i++) {
		const d = await pedir(caminho, atual)
		if (Array.isArray(d.data)) itens.push(...d.data)
		const paging = (d.paging ?? {}) as { next?: string; cursors?: { after?: string } }
		const depois = paging.cursors?.after
		// Cursor repetido = trava contra laço infinito.
		if (!paging.next || !depois || vistos.has(depois)) break
		vistos.add(depois)
		atual = { ...params, after: depois }
	}
	return itens
}

/**
 * Anúncios da conta que estão no ar ou pausados (arquivado e apagado ficam de
 * fora), com o gasto dos últimos 30 dias. Sem cache: quem chama decide.
 */
export async function anunciosDaMeta(): Promise<AnuncioDaMeta[]> {
	const act = conta()
	const [anuncios, gastos] = await Promise.all([
		paginar(`/${act}/ads`, {
			fields: 'id,name,effective_status,created_time,campaign{id,name}',
			effective_status: JSON.stringify(['ACTIVE', 'PAUSED', 'CAMPAIGN_PAUSED', 'ADSET_PAUSED']),
			limit: '200',
		}),
		// O gasto é um extra do card: se falhar, os anúncios entram sem ele.
		paginar(`/${act}/insights`, { level: 'ad', fields: 'ad_id,spend', date_preset: 'last_30d', limit: '500' }).catch(() => null),
	])
	const gastoPorAnuncio = new Map<string, number>()
	for (const g of gastos ?? []) {
		const { ad_id, spend } = g as { ad_id?: string; spend?: string }
		const n = Number(spend)
		if (ad_id && Number.isFinite(n)) gastoPorAnuncio.set(ad_id, n)
	}
	return anuncios
		.map(anuncioDoPayload)
		.filter((a): a is Omit<AnuncioDaMeta, 'gasto30d'> => a !== null)
		.map(a => ({ ...a, gasto30d: gastos === null ? null : (gastoPorAnuncio.get(a.id) ?? 0) }))
}

/* --------------------------------------------------- métricas do anúncio */

export const PERIODOS_DA_META = { '7d': 'last_7d', '30d': 'last_30d', total: 'maximum' } as const
export type PeriodoDaMeta = keyof typeof PERIODOS_DA_META

export interface Metricas {
	gasto: number
	impressoes: number
	cliquesNoLink: number
	/** Conversas iniciadas (WhatsApp, Direct, Messenger). */
	conversas: number
	leads: number
	visitasNaPagina: number
	/** Vídeo: inícios e quantos chegaram a cada ponto. */
	video: { inicios: number; p25: number; p50: number; p75: number; p100: number }
}

export interface MetricasDoAnuncio extends Metricas {
	id: string
	nome: string
	/** Pessoas alcançadas. Só existe por anúncio: somar entre anúncios contaria a mesma pessoa duas vezes. */
	alcance: number
}

export interface MetricasDoCard {
	periodo: PeriodoDaMeta
	total: Metricas
	anuncios: MetricasDoAnuncio[]
	porDia: { dia: string; gasto: number; conversas: number; cliquesNoLink: number }[]
	porPosicionamento: { nome: string; gasto: number; impressoes: number; cliquesNoLink: number; conversas: number }[]
	/** Por faixa de idade, com a parte de cada gênero no gasto. */
	porPublico: { faixa: string; gasto: number; impressoes: number; cliquesNoLink: number; conversas: number; mulheres: number; homens: number }[]
	lidoEm: string
}

type Acao = { action_type?: string; value?: string }
type LinhaDeInsight = Record<string, unknown>

const num = (v: unknown): number => {
	const n = Number(v)
	return Number.isFinite(n) ? n : 0
}

/** Soma os valores de `actions` cujo tipo está na lista. */
function acao(lista: unknown, tipos: string[]): number {
	if (!Array.isArray(lista)) return 0
	return (lista as Acao[]).reduce((s, a) => (a.action_type && tipos.includes(a.action_type) ? s + num(a.value) : s), 0)
}

const primeiro = (lista: unknown): number => (Array.isArray(lista) ? num((lista[0] as Acao | undefined)?.value) : 0)

export function metricasDaLinha(l: LinhaDeInsight): Metricas {
	return {
		gasto: num(l.spend),
		impressoes: num(l.impressions),
		cliquesNoLink: num(l.inline_link_clicks),
		conversas: acao(l.actions, ['onsite_conversion.messaging_conversation_started_7d']),
		leads: acao(l.actions, ['lead']),
		visitasNaPagina: acao(l.actions, ['landing_page_view']),
		video: {
			inicios: primeiro(l.video_play_actions),
			p25: primeiro(l.video_p25_watched_actions),
			p50: primeiro(l.video_p50_watched_actions),
			p75: primeiro(l.video_p75_watched_actions),
			p100: primeiro(l.video_p100_watched_actions),
		},
	}
}

const ZERO: Metricas = { gasto: 0, impressoes: 0, cliquesNoLink: 0, conversas: 0, leads: 0, visitasNaPagina: 0, video: { inicios: 0, p25: 0, p50: 0, p75: 0, p100: 0 } }

export function somar(a: Metricas, b: Metricas): Metricas {
	return {
		gasto: a.gasto + b.gasto,
		impressoes: a.impressoes + b.impressoes,
		cliquesNoLink: a.cliquesNoLink + b.cliquesNoLink,
		conversas: a.conversas + b.conversas,
		leads: a.leads + b.leads,
		visitasNaPagina: a.visitasNaPagina + b.visitasNaPagina,
		video: {
			inicios: a.video.inicios + b.video.inicios,
			p25: a.video.p25 + b.video.p25,
			p50: a.video.p50 + b.video.p50,
			p75: a.video.p75 + b.video.p75,
			p100: a.video.p100 + b.video.p100,
		},
	}
}

const POSICOES: Record<string, string> = {
	'instagram/feed': 'Instagram Feed',
	'instagram/instagram_stories': 'Instagram Stories',
	'instagram/instagram_reels': 'Instagram Reels',
	'instagram/instagram_explore': 'Instagram Explorar',
	'instagram/instagram_explore_grid_home': 'Instagram Explorar',
	'instagram/instagram_profile_feed': 'Instagram Perfil',
	'facebook/feed': 'Facebook Feed',
	'facebook/facebook_stories': 'Facebook Stories',
	'facebook/facebook_reels': 'Facebook Reels',
	'facebook/marketplace': 'Facebook Marketplace',
	'facebook/video_feeds': 'Facebook Vídeos',
}

export function nomeDaPosicao(plataforma: unknown, posicao: unknown): string {
	const chave = `${String(plataforma ?? '')}/${String(posicao ?? '')}`
	if (POSICOES[chave]) return POSICOES[chave]
	const texto = `${String(plataforma ?? '')} ${String(posicao ?? '')}`.replace(/_/g, ' ').trim()
	return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : 'Outros'
}

/** Junta as três leituras (por anúncio, por dia, por posicionamento) no que a tela mostra. */
export function montarMetricas(
	periodo: PeriodoDaMeta,
	porAnuncio: LinhaDeInsight[],
	porDia: LinhaDeInsight[],
	porPosicao: LinhaDeInsight[],
	agora = new Date(),
	porPublico: LinhaDeInsight[] = [],
): MetricasDoCard {
	const anuncios = porAnuncio.map(l => ({
		id: String(l.ad_id ?? ''),
		nome: String(l.ad_name ?? '').trim(),
		alcance: num(l.reach),
		...metricasDaLinha(l),
	}))
	const dias = new Map<string, { gasto: number; conversas: number; cliquesNoLink: number }>()
	for (const l of porDia) {
		const dia = String(l.date_start ?? '')
		if (!dia) continue
		const m = metricasDaLinha(l)
		const a = dias.get(dia) ?? { gasto: 0, conversas: 0, cliquesNoLink: 0 }
		dias.set(dia, { gasto: a.gasto + m.gasto, conversas: a.conversas + m.conversas, cliquesNoLink: a.cliquesNoLink + m.cliquesNoLink })
	}
	const posicoes = new Map<string, { gasto: number; impressoes: number; cliquesNoLink: number; conversas: number }>()
	for (const l of porPosicao) {
		const nome = nomeDaPosicao(l.publisher_platform, l.platform_position)
		const m = metricasDaLinha(l)
		const a = posicoes.get(nome) ?? { gasto: 0, impressoes: 0, cliquesNoLink: 0, conversas: 0 }
		posicoes.set(nome, { gasto: a.gasto + m.gasto, impressoes: a.impressoes + m.impressoes, cliquesNoLink: a.cliquesNoLink + m.cliquesNoLink, conversas: a.conversas + m.conversas })
	}
	const publico = new Map<string, MetricasDoCard['porPublico'][number]>()
	for (const l of porPublico) {
		const faixa = String(l.age ?? '') || 'Sem idade'
		const m = metricasDaLinha(l)
		const a = publico.get(faixa) ?? { faixa, gasto: 0, impressoes: 0, cliquesNoLink: 0, conversas: 0, mulheres: 0, homens: 0 }
		publico.set(faixa, {
			faixa,
			gasto: a.gasto + m.gasto,
			impressoes: a.impressoes + m.impressoes,
			cliquesNoLink: a.cliquesNoLink + m.cliquesNoLink,
			conversas: a.conversas + m.conversas,
			mulheres: a.mulheres + (l.gender === 'female' ? m.gasto : 0),
			homens: a.homens + (l.gender === 'male' ? m.gasto : 0),
		})
	}
	return {
		periodo,
		porPublico: [...publico.values()].sort((a, b) => a.faixa.localeCompare(b.faixa)),
		total: anuncios.reduce<Metricas>((s, a) => somar(s, a), ZERO),
		anuncios,
		porDia: [...dias.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([dia, v]) => ({ dia, ...v })),
		porPosicionamento: [...posicoes.entries()].map(([nome, v]) => ({ nome, ...v })).sort((a, b) => b.gasto - a.gasto),
		lidoEm: agora.toISOString(),
	}
}

const CAMPOS_DE_METRICA =
	'ad_id,ad_name,spend,impressions,reach,inline_link_clicks,actions,video_play_actions,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p100_watched_actions'

const metricasGuardadas = new Map<string, { em: number; valor: MetricasDoCard }>()
const CACHE_METRICAS_MS = 5 * 60 * 1000

/**
 * Métricas de um grupo de anúncios (os do mesmo carro), lidas na hora. Nada é
 * gravado: fica só 5 minutos em memória para trocar de período sem esperar.
 */
export async function metricasDosAnuncios(ids: string[], periodo: PeriodoDaMeta): Promise<MetricasDoCard> {
	const limpos = [...new Set(ids.filter(id => /^\d+$/.test(id)))].sort()
	if (limpos.length === 0) throw new ErroDaMeta('Card sem anúncio da Meta')
	const chave = `${periodo}:${limpos.join(',')}`
	const guardado = metricasGuardadas.get(chave)
	if (guardado && Date.now() - guardado.em < CACHE_METRICAS_MS) return guardado.valor

	const act = conta()
	const base = {
		level: 'ad',
		date_preset: PERIODOS_DA_META[periodo],
		filtering: JSON.stringify([{ field: 'ad.id', operator: 'IN', value: limpos }]),
		limit: '500',
	}
	const [porAnuncio, porDia, porPosicao, porPublico] = await Promise.all([
		paginar(`/${act}/insights`, { ...base, fields: CAMPOS_DE_METRICA }),
		// As quebras são um extra: se uma falhar, os números principais aparecem.
		paginar(`/${act}/insights`, { ...base, fields: 'spend,inline_link_clicks,actions', time_increment: '1' }, 5).catch(() => []),
		paginar(`/${act}/insights`, { ...base, fields: 'spend,impressions,inline_link_clicks,actions', breakdowns: 'publisher_platform,platform_position' }, 5).catch(() => []),
		paginar(`/${act}/insights`, { ...base, fields: 'spend,impressions,inline_link_clicks,actions', breakdowns: 'age,gender' }, 5).catch(() => []),
	])
	const valor = montarMetricas(periodo, porAnuncio as LinhaDeInsight[], porDia as LinhaDeInsight[], porPosicao as LinhaDeInsight[], new Date(), porPublico as LinhaDeInsight[])
	if (metricasGuardadas.size > 200) metricasGuardadas.clear()
	metricasGuardadas.set(chave, { em: Date.now(), valor })
	return valor
}

/* ------------------------------------------------- resultados da conta */

export interface ResultadosDaConta {
	periodo: PeriodoDaMeta
	total: Metricas
	/** Uma linha por anúncio que teve entrega no período. */
	anuncios: MetricasDoAnuncio[]
	porDia: MetricasDoCard['porDia']
	lidoEm: string
}

let resultadosGuardados = new Map<string, { em: number; valor: ResultadosDaConta }>()

/** Todos os anúncios da conta com entrega no período, mais o dia a dia da conta. Cache de 5 minutos. */
export async function resultadosDaConta(periodo: PeriodoDaMeta): Promise<ResultadosDaConta> {
	const guardado = resultadosGuardados.get(periodo)
	if (guardado && Date.now() - guardado.em < CACHE_METRICAS_MS) return guardado.valor
	const act = conta()
	const base = { date_preset: PERIODOS_DA_META[periodo], limit: '500' }
	const [porAnuncio, porDia] = await Promise.all([
		paginar(`/${act}/insights`, { ...base, level: 'ad', fields: CAMPOS_DE_METRICA }),
		paginar(`/${act}/insights`, { ...base, fields: 'spend,inline_link_clicks,actions', time_increment: '1' }, 10).catch(() => []),
	])
	const m = montarMetricas(periodo, porAnuncio as LinhaDeInsight[], porDia as LinhaDeInsight[], [])
	const valor = { periodo, total: m.total, anuncios: m.anuncios, porDia: m.porDia, lidoEm: m.lidoEm }
	if (resultadosGuardados.size > 10) resultadosGuardados = new Map()
	resultadosGuardados.set(periodo, { em: Date.now(), valor })
	return valor
}

/* ------------------------------------------------------ pausar e reativar */

/**
 * Pausa ou reativa anúncios na Meta. É a ÚNICA escrita deste arquivo e mexe só
 * no status do anúncio: campanha, conjunto e orçamento ficam como estão.
 * Precisa de token com `ads_management`; com `ads_read` a Meta recusa.
 *
 * Um anúncio de cada vez, para saber qual falhou. Não levanta: devolve os que
 * mudaram e os que não mudaram, com o motivo.
 */
export async function mudarStatusDosAnuncios(ids: string[], status: 'PAUSED' | 'ACTIVE'): Promise<{ ok: string[]; falhas: { id: string; erro: string }[] }> {
	const ok: string[] = []
	const falhas: { id: string; erro: string }[] = []
	for (const id of [...new Set(ids)]) {
		if (!/^\d+$/.test(id)) {
			falhas.push({ id, erro: 'id inválido' })
			continue
		}
		try {
			const r = await pedir(`/${id}`, { status }, 'POST')
			if (r.success === true) ok.push(id)
			else falhas.push({ id, erro: 'a Meta não confirmou a mudança' })
		} catch (e) {
			falhas.push({ id, erro: e instanceof Error ? e.message : 'falha' })
		}
	}
	// O que estava guardado em memória deixou de valer.
	metricasGuardadas.clear()
	return { ok, falhas }
}

/**
 * Quais destes anúncios estão ativos agora. Serve para pausar só o que está
 * no ar: um card pode guardar o anúncio antigo (já pausado numa troca de
 * criativo) junto do novo. Devolve null se a Meta não respondeu.
 */
export async function anunciosAtivos(ids: string[]): Promise<Set<string> | null> {
	const limpos = [...new Set(ids.filter(id => /^\d+$/.test(id)))]
	if (limpos.length === 0) return new Set()
	try {
		const r = await pedir('/', { ids: limpos.join(','), fields: 'effective_status' })
		return new Set(limpos.filter(id => (r[id] as { effective_status?: string } | undefined)?.effective_status === 'ACTIVE'))
	} catch {
		return null
	}
}
