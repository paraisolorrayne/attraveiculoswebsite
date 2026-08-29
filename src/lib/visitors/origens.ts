/**
 * Aba Origens do painel de visitantes — as dobras em Node sobre os grupos
 * que o SQL devolve (uma linha por combinação crua de utm_source, utm_medium,
 * utm_campaign, click ids e referrer). Arquivo puro: sem I/O, testável.
 *
 * Três leituras saem do mesmo conjunto de grupos, de propósito — assim a soma
 * de cada tabela bate com o total do período:
 *   - Fonte × Meio: como o GA, mas com as grafias cruas agrupadas embaixo da
 *     fonte canônica ("google", "Google", "google_ads" → Google);
 *   - Referenciadores: de que domínio a visita veio quando não há UTM;
 *   - Auditoria de marcação: onde a UTM está errada ou faltando.
 */
import { ehMacroNaoSubstituida } from './marcacao-plataforma'
import {
	chaveCampanha,
	classificarCanal,
	corCanal,
	normalizarCampanha,
	normalizarFonte,
	rotuloCanal,
	rotuloFonte,
	SEM_CAMPANHA,
	SEM_FONTE,
	VALORES_NULOS_LISTA,
	type CanalTrafego,
} from '@/lib/traffic-channel'

export interface GrupoOrigem {
	/** Valores CRUS, só aparados (o saneamento de "(not set)" etc. acontece aqui). */
	utm_source: string | null
	utm_medium: string | null
	utm_campaign: string | null
	tem_gclid: boolean
	tem_fbclid: boolean
	tem_ttclid: boolean
	referrer_domain: string | null
	sessoes: number
	whatsapp: number
	formularios: number
	sessoes_com_veiculo: number
}

const NULOS = new Set(VALORES_NULOS_LISTA)

/** Mesma regra de `limpar()` da lib de canal: apara, minúsculas, nulos viram vazio. */
export function limparValor(valor: string | null | undefined): string {
	const v = (valor ?? '').trim().toLowerCase()
	return NULOS.has(v) ? '' : v
}

export const SEM_MEIO = '(sem meio)'

/**
 * Meios que a Attra e as plataformas usam de fato. Fora daqui não é erro
 * certo, mas merece olhar: "CPC ", "paid-social", "instagram" (fonte no lugar
 * do meio) são os casos reais que motivaram a auditoria.
 */
export const MEIOS_CONHECIDOS = new Set([
	'cpc', 'ppc', 'cpm', 'cpv', 'paid', 'paid_social', 'paidsocial', 'paid-social', 'social',
	'organic', 'email', 'e-mail', 'referral', 'display', 'video', 'bio', 'affiliate', 'qr',
	'sms', 'whatsapp', 'push', 'newsletter', 'pmax', 'performance_max', 'demandgen', 'stories',
	'reels', 'feed', 'story', 'post', 'link', 'profile',
])

function atribuicaoDe(g: GrupoOrigem) {
	return {
		utm_source: g.utm_source,
		utm_medium: g.utm_medium,
		utm_campaign: g.utm_campaign,
		gclid: g.tem_gclid ? '1' : null,
		fbclid: g.tem_fbclid ? '1' : null,
		ttclid: g.tem_ttclid ? '1' : null,
		referrer_domain: g.referrer_domain,
	}
}

interface Soma {
	sessoes: number
	whatsapp: number
	formularios: number
	sessoes_com_veiculo: number
}
function somar(alvo: Soma, g: GrupoOrigem) {
	alvo.sessoes += g.sessoes
	alvo.whatsapp += g.whatsapp
	alvo.formularios += g.formularios
	alvo.sessoes_com_veiculo += g.sessoes_com_veiculo
}
function maisFrequente<K>(contagem: Map<K, number>, padrao: K): K {
	let melhor = padrao
	let maior = -1
	for (const [k, n] of contagem) {
		if (n > maior) {
			melhor = k
			maior = n
		}
	}
	return melhor
}

export interface LinhaFonteMeio extends Soma {
	fonte: string
	rotulo_fonte: string
	meio: string
	/** Grafias cruas de utm_source que caíram nesta fonte, da mais usada para a menos. */
	grafias: string[]
	canal: CanalTrafego
	rotulo_canal: string
	cor_canal: string
}

type AcumFonteMeio = LinhaFonteMeio & { _grafias: Map<string, number>; _canais: Map<CanalTrafego, number> }

export function agruparFonteMeio(grupos: GrupoOrigem[]): LinhaFonteMeio[] {
	const mapa = new Map<string, AcumFonteMeio>()
	for (const g of grupos) {
		const atrib = atribuicaoDe(g)
		const fonte = normalizarFonte(atrib)
		const meio = limparValor(g.utm_medium) || SEM_MEIO
		const chave = `${fonte} ${meio}`
		const linha: AcumFonteMeio = mapa.get(chave) ?? {
			fonte,
			rotulo_fonte: rotuloFonte(fonte),
			meio,
			grafias: [],
			canal: 'outro',
			rotulo_canal: '',
			cor_canal: '',
			sessoes: 0,
			whatsapp: 0,
			formularios: 0,
			sessoes_com_veiculo: 0,
			_grafias: new Map(),
			_canais: new Map(),
		}
		somar(linha, g)
		const grafia = (g.utm_source ?? '').trim()
		if (grafia && !NULOS.has(grafia.toLowerCase())) {
			linha._grafias.set(grafia, (linha._grafias.get(grafia) ?? 0) + g.sessoes)
		}
		const canal = classificarCanal(atrib)
		linha._canais.set(canal, (linha._canais.get(canal) ?? 0) + g.sessoes)
		mapa.set(chave, linha)
	}
	return [...mapa.values()]
		.map(({ _grafias, _canais, ...l }) => {
			const canal = maisFrequente<CanalTrafego>(_canais, 'outro')
			return {
				...l,
				grafias: [..._grafias.entries()].sort((a, b) => b[1] - a[1]).map(([gr]) => gr),
				canal,
				rotulo_canal: rotuloCanal(canal),
				cor_canal: corCanal(canal),
			}
		})
		.sort((a, b) => b.sessoes - a.sessoes)
}

export interface LinhaReferenciador extends Soma {
	dominio: string
	fonte: string
	rotulo_fonte: string
	canal: CanalTrafego
	rotulo_canal: string
	cor_canal: string
	/** Quantas dessas sessões também traziam UTM (o referrer não decidiu o canal). */
	com_utm: number
}

function hostDe(valor: string | null): string {
	const bruto = limparValor(valor)
	if (!bruto) return ''
	try {
		return new URL(bruto.includes('://') ? bruto : `https://${bruto}`).hostname.replace(/^www\./, '')
	} catch {
		return bruto.replace(/^www\./, '')
	}
}

type AcumReferenciador = LinhaReferenciador & { _canais: Map<CanalTrafego, number> }

/** Só sessões com referrer externo; o domínio próprio não é referência. */
export function agruparReferenciadores(grupos: GrupoOrigem[]): LinhaReferenciador[] {
	const mapa = new Map<string, AcumReferenciador>()
	for (const g of grupos) {
		const host = hostDe(g.referrer_domain)
		if (!host || host === 'attraveiculos.com.br' || host.endsWith('.attraveiculos.com.br')) continue
		const atrib = atribuicaoDe(g)
		// Fonte do REFERRER em si (sem a UTM), para o domínio ler sempre igual.
		const fonte = normalizarFonte({ referrer_domain: g.referrer_domain })
		const linha: AcumReferenciador = mapa.get(host) ?? {
			dominio: host,
			fonte,
			rotulo_fonte: rotuloFonte(fonte),
			canal: 'referencia',
			rotulo_canal: '',
			cor_canal: '',
			sessoes: 0,
			whatsapp: 0,
			formularios: 0,
			sessoes_com_veiculo: 0,
			com_utm: 0,
			_canais: new Map(),
		}
		somar(linha, g)
		if (limparValor(g.utm_source) || limparValor(g.utm_medium)) linha.com_utm += g.sessoes
		const canal = classificarCanal(atrib)
		linha._canais.set(canal, (linha._canais.get(canal) ?? 0) + g.sessoes)
		mapa.set(host, linha)
	}
	return [...mapa.values()]
		.map(({ _canais, ...l }) => {
			const canal = maisFrequente<CanalTrafego>(_canais, 'referencia')
			return { ...l, canal, rotulo_canal: rotuloCanal(canal), cor_canal: corCanal(canal) }
		})
		.sort((a, b) => b.sessoes - a.sessoes)
}

export type TipoProblema =
	| 'click_id_sem_utm'
	| 'fonte_sem_meio'
	| 'meio_sem_fonte'
	| 'meio_desconhecido'
	| 'campanha_varias_grafias'
	| 'fonte_varias_grafias'
	| 'paga_sem_campanha'
	| 'click_id_contradiz_fonte'
	| 'macro_nao_substituida'

export interface Problema {
	tipo: TipoProblema
	titulo: string
	explicacao: string
	sessoes: number
	/** Até 8 exemplos crus, do mais frequente ao menos. */
	exemplos: string[]
}

const TITULOS: Record<TipoProblema, [string, string]> = {
	click_id_sem_utm: [
		'Clique de anúncio sem UTM',
		'A sessão chegou com gclid/fbclid/ttclid mas sem utm_source. O canal é inferido pelo click id; campanha, conteúdo e termo se perdem. Ative o modelo de rastreamento na plataforma.',
	],
	fonte_sem_meio: [
		'utm_source sem utm_medium',
		'Sem o meio não dá para separar pago de orgânico da mesma fonte. Padrão: cpc para anúncio, social/bio para orgânico, email para newsletter.',
	],
	meio_sem_fonte: [
		'utm_medium sem utm_source',
		'O meio existe, a fonte não — a sessão cai em "outro". Sempre marcar os dois.',
	],
	meio_desconhecido: [
		'utm_medium fora do vocabulário',
		'Valores que nenhuma regra reconhece. Se for pago e não contiver cpc/paid/ads, o painel classifica como orgânico. Padronize.',
	],
	campanha_varias_grafias: [
		'Campanha com mais de uma grafia',
		'O painel agrupa por minúsculas, mas as plataformas não: "Black Friday" e "black friday" são duas campanhas no Google Ads. Unifique na origem.',
	],
	fonte_varias_grafias: [
		'Fonte com mais de uma grafia',
		'Google, google e google_ads são a mesma fonte aqui, mas só porque o painel corrige. Padronize para minúsculas.',
	],
	paga_sem_campanha: [
		'Sessão paga sem campanha',
		'Canal pago (cpc/paid ou click id) sem utm_campaign nem utm_id: o gasto existe, mas não dá para saber de qual campanha. No Google, use utm_id={campaignid}.',
	],
	click_id_contradiz_fonte: [
		'Click id contradiz a fonte',
		'gclid com utm_source que não é Google, ou fbclid com fonte Google. Um dos dois está errado — normalmente o modelo de rastreamento foi copiado de outra plataforma.',
	],
	macro_nao_substituida: [
		'Macro do anúncio não substituída',
		'O link chegou com a macro literal — {{campaign.name}} da Meta, {keyword} do Google — em vez do valor. Acontece quando o link é publicado onde a plataforma não expande a macro (story à mão, encurtador, teste). Essas visitas ficam sem campanha identificável.',
	],
}

export function auditarMarcacao(grupos: GrupoOrigem[]): Problema[] {
	const contagens = new Map<TipoProblema, { sessoes: number; exemplos: Map<string, number> }>()
	const registrar = (tipo: TipoProblema, sessoes: number, exemplo: string) => {
		const c = contagens.get(tipo) ?? { sessoes: 0, exemplos: new Map() }
		c.sessoes += sessoes
		if (exemplo) c.exemplos.set(exemplo, (c.exemplos.get(exemplo) ?? 0) + sessoes)
		contagens.set(tipo, c)
	}

	const grafiasCampanha = new Map<string, Map<string, number>>()
	const grafiasFonte = new Map<string, Map<string, number>>()

	for (const g of grupos) {
		const fonte = limparValor(g.utm_source)
		const meio = limparValor(g.utm_medium)
		const fonteCrua = (g.utm_source ?? '').trim()
		const temClick = g.tem_gclid || g.tem_fbclid || g.tem_ttclid
		const canal = classificarCanal(atribuicaoDe(g))
		const pago = canal === 'busca_paga' || canal === 'social_pago' || canal === 'outra_midia_paga'
		const campanha = chaveCampanha(g.utm_campaign)

		for (const [campo, valor] of [
			['utm_source', g.utm_source],
			['utm_medium', g.utm_medium],
			['utm_campaign', g.utm_campaign],
		] as const) {
			if (ehMacroNaoSubstituida(valor)) registrar('macro_nao_substituida', g.sessoes, `${campo}=${String(valor).trim()}`)
		}
		if (temClick && !fonte) {
			registrar('click_id_sem_utm', g.sessoes, g.tem_gclid ? 'gclid' : g.tem_fbclid ? 'fbclid' : 'ttclid')
		}
		if (fonte && !meio) registrar('fonte_sem_meio', g.sessoes, fonteCrua)
		if (meio && !fonte) registrar('meio_sem_fonte', g.sessoes, (g.utm_medium ?? '').trim())
		if (meio && !MEIOS_CONHECIDOS.has(meio)) registrar('meio_desconhecido', g.sessoes, (g.utm_medium ?? '').trim())
		if (pago && campanha === SEM_CAMPANHA) registrar('paga_sem_campanha', g.sessoes, fonte || (g.tem_gclid ? 'gclid' : 'fbclid'))
		if (fonte && g.tem_gclid && normalizarFonte({ utm_source: g.utm_source }) !== 'google') {
			registrar('click_id_contradiz_fonte', g.sessoes, `gclid + ${fonteCrua}`)
		}
		if (fonte && g.tem_fbclid && normalizarFonte({ utm_source: g.utm_source }) === 'google') {
			registrar('click_id_contradiz_fonte', g.sessoes, `fbclid + ${fonteCrua}`)
		}

		if (campanha !== SEM_CAMPANHA) {
			const rotulo = normalizarCampanha(g.utm_campaign)
			const m = grafiasCampanha.get(campanha) ?? new Map<string, number>()
			m.set(rotulo, (m.get(rotulo) ?? 0) + g.sessoes)
			grafiasCampanha.set(campanha, m)
		}
		if (fonte) {
			const canonica = normalizarFonte({ utm_source: g.utm_source })
			if (canonica !== SEM_FONTE) {
				const m = grafiasFonte.get(canonica) ?? new Map<string, number>()
				m.set(fonteCrua, (m.get(fonteCrua) ?? 0) + g.sessoes)
				grafiasFonte.set(canonica, m)
			}
		}
	}

	for (const [, grafias] of grafiasCampanha) {
		if (grafias.size < 2) continue
		const total = [...grafias.values()].reduce((a, b) => a + b, 0)
		registrar('campanha_varias_grafias', total, [...grafias.keys()].join(' / '))
	}
	for (const [, grafias] of grafiasFonte) {
		if (grafias.size < 2) continue
		const total = [...grafias.values()].reduce((a, b) => a + b, 0)
		registrar('fonte_varias_grafias', total, [...grafias.keys()].join(' / '))
	}

	return [...contagens.entries()]
		.map(([tipo, c]) => ({
			tipo,
			titulo: TITULOS[tipo][0],
			explicacao: TITULOS[tipo][1],
			sessoes: c.sessoes,
			exemplos: [...c.exemplos.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([e]) => e),
		}))
		.sort((a, b) => b.sessoes - a.sessoes)
}

export interface GrupoDia extends GrupoOrigem {
	/** YYYY-MM-DD no fuso de Brasília. */
	dia: string
}

export interface PontoTendencia {
	dia: string
	sessoes: number
	whatsapp: number
	por_canal: Partial<Record<CanalTrafego, number>>
}

/** Sessões por dia por canal, com dias vazios preenchidos entre o primeiro e o último. */
export function tendenciaPorCanal(grupos: GrupoDia[]): PontoTendencia[] {
	const porDia = new Map<string, PontoTendencia>()
	for (const g of grupos) {
		const p = porDia.get(g.dia) ?? { dia: g.dia, sessoes: 0, whatsapp: 0, por_canal: {} }
		const canal = classificarCanal(atribuicaoDe(g))
		p.sessoes += g.sessoes
		p.whatsapp += g.whatsapp
		p.por_canal[canal] = (p.por_canal[canal] ?? 0) + g.sessoes
		porDia.set(g.dia, p)
	}
	const dias = [...porDia.keys()].sort()
	if (dias.length === 0) return []
	const saida: PontoTendencia[] = []
	const cursor = new Date(`${dias[0]}T00:00:00Z`)
	const fim = new Date(`${dias[dias.length - 1]}T00:00:00Z`)
	while (cursor <= fim) {
		const chave = cursor.toISOString().slice(0, 10)
		saida.push(porDia.get(chave) ?? { dia: chave, sessoes: 0, whatsapp: 0, por_canal: {} })
		cursor.setUTCDate(cursor.getUTCDate() + 1)
	}
	return saida
}
