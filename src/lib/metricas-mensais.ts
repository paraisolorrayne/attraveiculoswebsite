/**
 * Resumo mensal de métricas — o que sobra de um mês depois que os dados brutos
 * são apagados pela política de retenção.
 *
 * A limpeza (`/api/cron/cleanup-tracking`) roda todo dia e remove sessões e
 * page views além da janela. Sem este resumo, um mês inteiro deixava de existir:
 * de 02/06/2026 para trás não há mais nada, nem bruto nem agregado.
 *
 * Este arquivo tem só a lógica pura de dobrar linhas cruas em linhas de resumo.
 * A leitura do banco e a gravação ficam na rota, para isto continuar testável
 * sem Postgres.
 */
import { classificarCanal, chaveCampanha, normalizarCampanha, type SessaoAtribuicao } from '@/lib/traffic-channel'

/** Linha crua vinda do banco: sessões já agrupadas por mês e pelos campos de origem. */
export interface LinhaCruaMes {
	mes: string
	utm_source: string | null
	utm_medium: string | null
	utm_campaign: string | null
	gclid: string | null
	fbclid: string | null
	ttclid: string | null
	referrer_domain: string | null
	sessoes: number
	visitantes: number
	page_views: number
	veiculos_vistos: number
	whatsapp_cliques: number
	formularios: number
	duracao_total_segundos: number
	sessoes_com_duracao: number
}

export interface LinhaResumo {
	mes: string
	canal: string
	campanha: string
	sessoes: number
	visitantes: number
	page_views: number
	veiculos_vistos: number
	whatsapp_cliques: number
	formularios: number
	duracao_total_segundos: number
	sessoes_com_duracao: number
}

const CAMPOS_SOMA = [
	'sessoes',
	'visitantes',
	'page_views',
	'veiculos_vistos',
	'whatsapp_cliques',
	'formularios',
	'duracao_total_segundos',
	'sessoes_com_duracao',
] as const

/**
 * Dobra as linhas cruas em (mês × canal × campanha).
 *
 * A classificação de canal é TypeScript e não SQL, então o banco agrupa pelos
 * campos crus e a dobra final acontece aqui — mesmo desenho já usado na rota de
 * métricas do painel, para as duas leituras nunca divergirem.
 *
 * A campanha é agrupada pela CHAVE normalizada (sem diferença de caixa), mas o
 * rótulo gravado preserva a grafia mais usada: "Black Friday" e "black friday"
 * viram uma linha só, exibida como veio do anúncio.
 */
export function resumirMes(linhas: LinhaCruaMes[]): LinhaResumo[] {
	const acumulado = new Map<string, LinhaResumo>()
	// Conta as grafias de cada campanha para escolher a mais frequente como rótulo.
	const grafias = new Map<string, Map<string, number>>()

	for (const linha of linhas) {
		const atribuicao: SessaoAtribuicao = {
			utm_source: linha.utm_source,
			utm_medium: linha.utm_medium,
			utm_campaign: linha.utm_campaign,
			gclid: linha.gclid,
			fbclid: linha.fbclid,
			ttclid: linha.ttclid,
			referrer_domain: linha.referrer_domain,
		}
		const canal = classificarCanal(atribuicao)
		const chave = chaveCampanha(linha.utm_campaign)
		const id = `${linha.mes}|${canal}|${chave}`

		const rotulos = grafias.get(id) ?? new Map<string, number>()
		const rotulo = normalizarCampanha(linha.utm_campaign)
		rotulos.set(rotulo, (rotulos.get(rotulo) ?? 0) + Number(linha.sessoes || 0))
		grafias.set(id, rotulos)

		const alvo = acumulado.get(id) ?? {
			mes: linha.mes,
			canal,
			campanha: rotulo,
			sessoes: 0,
			visitantes: 0,
			page_views: 0,
			veiculos_vistos: 0,
			whatsapp_cliques: 0,
			formularios: 0,
			duracao_total_segundos: 0,
			sessoes_com_duracao: 0,
		}
		for (const campo of CAMPOS_SOMA) {
			alvo[campo] += Number(linha[campo] || 0)
		}
		acumulado.set(id, alvo)
	}

	for (const [id, resumo] of acumulado) {
		const rotulos = grafias.get(id)
		if (!rotulos) continue
		let melhor = resumo.campanha
		let maior = -1
		for (const [rotulo, peso] of rotulos) {
			if (peso > maior) {
				melhor = rotulo
				maior = peso
			}
		}
		resumo.campanha = melhor
	}

	return [...acumulado.values()]
}

/**
 * Meses que ainda têm dado bruto e por isso precisam ser (re)resumidos.
 *
 * Inclui de propósito o mês corrente e todos os anteriores presentes: o mês
 * corrente ainda cresce, e reprocessar é barato porque a gravação é upsert.
 */
export function mesesParaResumir(datas: (string | Date)[]): string[] {
	const meses = new Set<string>()
	for (const data of datas) {
		const d = data instanceof Date ? data : new Date(data)
		if (Number.isNaN(d.getTime())) continue
		meses.add(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`)
	}
	return [...meses].sort()
}
