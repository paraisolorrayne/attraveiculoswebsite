// Contrato de leitura do /api/admin/visitors/metrics + formatadores do painel.
//
// Arquivo puro (sem React) para poder ser importado tanto pelas tabelas quanto pelo
// dashboard sem duplicar tipo nem regra de formatação.

import type { CanalTrafego } from '@/lib/traffic-channel'

export interface LinhaCanal {
	canal: CanalTrafego
	rotulo: string
	/** Token de classe do badge (vem da lib de canal, funciona em tema claro e escuro). */
	cor: string
	sessoes: number
	whatsapp: number
	formularios: number
	sessoes_com_veiculo: number
	/** Soma dos veículos DIFERENTES abertos em cada sessão: abrir o mesmo carro 4x conta 1. */
	veiculos_distintos: number
	sessoes_com_duracao: number
	duracao_media_segundos: number | null
}

export interface LinhaCampanha {
	campanha: string
	canal: CanalTrafego
	rotulo_canal: string
	cor_canal: string
	fonte: string
	sessoes: number
	whatsapp: number
	formularios: number
	sessoes_com_veiculo: number
}

export interface LinhaVeiculo {
	slug: string
	marca: string | null
	modelo: string | null
	views: number
	sessoes: number
}

export interface LinhaCidade {
	cidade: string
	regiao: string | null
	sessoes: number
	whatsapp: number
}

export interface MetricasVisitantes {
	periodo: { dias: number; desde: string | null }
	resumo: {
		sessoes: number
		visitantes: number
		page_views: number
		whatsapp: number
		formularios: number
		sessoes_com_veiculo: number
		veiculos_distintos: number
		sessoes_com_duracao: number
		duracao_media_segundos: number | null
	}
	canais: LinhaCanal[]
	campanhas: LinhaCampanha[]
	campanhas_total: number
	sessoes_sem_campanha: number
	veiculos: LinhaVeiculo[]
	veiculos_cobertura: { com_slug: number; sem_slug: number }
	cidades: LinhaCidade[]
}

/** Volume mínimo para tratar uma taxa como sinal, e não como ruído estatístico. */
export const VOLUME_MINIMO = 30

export function taxa(parte: number, total: number): number {
	return total > 0 ? (parte / total) * 100 : 0
}

export function fmtNum(n: number): string {
	return n.toLocaleString('pt-BR')
}

export function fmtPct(valor: number, casas = 1): string {
	return `${valor.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`
}

/** Média com uma casa; usada em "veículos diferentes por sessão". */
export function fmtMedia(parte: number, total: number): string {
	if (total <= 0) return '—'
	return (parte / total).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

/**
 * Travessão quando não há duração encerrada. O histórico inteiro tem `duration_seconds` nulo,
 * então exibir 0 min seria inventar dado.
 */
export function fmtDuracao(segundos: number | null): string {
	if (segundos === null || !Number.isFinite(segundos) || segundos <= 0) return '—'
	const min = Math.floor(segundos / 60)
	const seg = Math.round(segundos % 60)
	return min > 0 ? `${min}min ${seg}s` : `${seg}s`
}

/**
 * Cor da taxa de conversão comparada à média do período — é o que faz a tabela "gritar" que
 * um canal traz volume sem conversa. Abaixo do volume mínimo fica neutro de propósito.
 */
export function corTaxa(valor: number, media: number, volume: number): string {
	if (volume < VOLUME_MINIMO) return 'text-foreground-secondary'
	if (media <= 0) return 'text-foreground'
	if (valor >= media * 1.25) return 'text-emerald-600 dark:text-emerald-400'
	if (valor >= media * 0.75) return 'text-foreground'
	if (valor >= media * 0.4) return 'text-amber-600 dark:text-amber-400'
	return 'text-red-600 dark:text-red-400'
}

export function corBarraTaxa(valor: number, media: number, volume: number): string {
	if (volume < VOLUME_MINIMO) return 'bg-foreground-secondary/40'
	if (media <= 0) return 'bg-foreground-secondary/40'
	if (valor >= media * 1.25) return 'bg-emerald-500'
	if (valor >= media * 0.75) return 'bg-foreground-secondary'
	if (valor >= media * 0.4) return 'bg-amber-500'
	return 'bg-red-500'
}

/** Largura da barra em %, sempre relativa ao maior valor da tabela. */
export function larguraRelativa(valor: number, maximo: number): string {
	if (maximo <= 0 || valor <= 0) return '0%'
	return `${Math.max(2, Math.min(100, (valor / maximo) * 100))}%`
}
