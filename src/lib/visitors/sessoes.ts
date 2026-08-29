/**
 * Aba Sessões — a atribuição de cada sessão, uma a uma, e a jornada
 * primeira × última origem por visitante. Arquivo puro.
 *
 * O canal é calculado em TypeScript (`classificarCanal`), então filtrar por
 * canal não dá para fazer em SQL: a rota traz as sessões do período com as
 * colunas de atribuição e este módulo descreve, filtra e pagina.
 */
import {
	chaveCampanha,
	classificarCanal,
	corCanal,
	normalizarFonte,
	rotuloCampanha,
	rotuloCanal,
	rotuloFonte,
	SEM_CAMPANHA,
	type CanalTrafego,
} from '@/lib/traffic-channel'
import { limparValor, MEIOS_CONHECIDOS, SEM_MEIO, type TipoProblema } from './origens'
import { ordenarLinhas, type Ordenacao, type ValorDaCelula } from './tabela'

export interface SessaoCrua {
	session_id: string
	started_at: string
	duration_seconds: number | null
	city: string | null
	region: string | null
	device_type: string | null
	referrer_domain: string | null
	utm_source: string | null
	utm_medium: string | null
	utm_campaign: string | null
	utm_content: string | null
	utm_term: string | null
	utm_id: string | null
	gclid: string | null
	fbclid: string | null
	ttclid: string | null
	entrada: string | null
	entrada_veiculo: string | null
	veiculos: number
	contacted_whatsapp: boolean
	submitted_form: boolean
}

export interface SessaoDescrita extends SessaoCrua {
	canal: CanalTrafego
	rotulo_canal: string
	cor_canal: string
	fonte: string
	rotulo_fonte: string
	meio: string
	campanha: string
	/** Chave de agrupamento da campanha (a mesma da Visão geral) ou null. */
	chave_campanha: string | null
}

export function descreverSessao(s: SessaoCrua): SessaoDescrita {
	const canal = classificarCanal(s)
	const fonte = normalizarFonte(s)
	const campanha = rotuloCampanha(s.utm_campaign, s.utm_id)
	return {
		...s,
		canal,
		rotulo_canal: rotuloCanal(canal),
		cor_canal: corCanal(canal),
		fonte,
		rotulo_fonte: rotuloFonte(fonte),
		meio: limparValor(s.utm_medium) || SEM_MEIO,
		campanha,
		chave_campanha: campanha === SEM_CAMPANHA ? null : chaveCampanha(campanha),
	}
}

export type Conversao = 'qualquer' | 'whatsapp' | 'formulario' | 'nenhuma'

export interface FiltrosSessoes {
	canal?: string
	fonte?: string
	meio?: string
	campanha?: string
	referrer?: string
	entrada?: string
	conversao?: Conversao
	problema?: TipoProblema
	sessao?: string
	/** Filtros por coluna acrescentados em 29/08/2026, junto da ordenação. */
	cidade?: string
	aparelho?: string
	veiculos_min?: number
	veiculos_max?: number
	duracao_min?: number
	duracao_max?: number
}

const PAGO = new Set<CanalTrafego>(['busca_paga', 'social_pago', 'outra_midia_paga'])

/** O problema de marcação, visto por UMA sessão (mesmas regras da auditoria). */
export function temProblema(s: SessaoDescrita, tipo: TipoProblema): boolean {
	const fonte = limparValor(s.utm_source)
	const meio = limparValor(s.utm_medium)
	const temClick = !!(limparValor(s.gclid) || limparValor(s.fbclid) || limparValor(s.ttclid))
	switch (tipo) {
		case 'click_id_sem_utm':
			return temClick && !fonte
		case 'fonte_sem_meio':
			return !!fonte && !meio
		case 'meio_sem_fonte':
			return !!meio && !fonte
		case 'meio_desconhecido':
			return !!meio && !MEIOS_CONHECIDOS.has(meio)
		case 'paga_sem_campanha':
			return PAGO.has(s.canal) && s.chave_campanha === null
		case 'click_id_contradiz_fonte': {
			const canonica = fonte ? normalizarFonte({ utm_source: s.utm_source }) : ''
			return (!!limparValor(s.gclid) && !!fonte && canonica !== 'google') || (!!limparValor(s.fbclid) && canonica === 'google')
		}
		// Grafia múltipla é propriedade do conjunto, não da sessão: aqui vale
		// "tem campanha/fonte marcada", que é o universo em que ela pode ocorrer.
		case 'campanha_varias_grafias':
			return s.chave_campanha !== null
		case 'fonte_varias_grafias':
			return !!fonte
	}
}

export function filtrarSessoes(sessoes: SessaoDescrita[], f: FiltrosSessoes): SessaoDescrita[] {
	const referrer = (f.referrer ?? '').trim().toLowerCase()
	const entrada = (f.entrada ?? '').trim()
	const campanha = (f.campanha ?? '').trim().toLowerCase()
	const meio = (f.meio ?? '').trim().toLowerCase()
	const fonte = (f.fonte ?? '').trim().toLowerCase()
	const cidade = (f.cidade ?? '').trim().toLowerCase()
	const aparelho = (f.aparelho ?? '').trim().toLowerCase()
	return sessoes.filter(s => {
		if (f.sessao && s.session_id !== f.sessao) return false
		if (f.canal && s.canal !== f.canal) return false
		if (fonte && s.fonte !== fonte) return false
		if (meio && s.meio !== meio) return false
		if (campanha && (s.chave_campanha ?? '') !== campanha) return false
		if (referrer && !(s.referrer_domain ?? '').toLowerCase().replace(/^www\./, '').includes(referrer)) return false
		if (entrada && s.entrada !== entrada) return false
		if (f.conversao === 'whatsapp' && !s.contacted_whatsapp) return false
		if (f.conversao === 'formulario' && !s.submitted_form) return false
		if (f.conversao === 'qualquer' && !(s.contacted_whatsapp || s.submitted_form)) return false
		if (f.conversao === 'nenhuma' && (s.contacted_whatsapp || s.submitted_form)) return false
		if (f.problema && !temProblema(s, f.problema)) return false
		if (cidade && !`${s.city ?? ''} ${s.region ?? ''}`.toLowerCase().includes(cidade)) return false
		if (aparelho && (s.device_type ?? '').toLowerCase() !== aparelho) return false
		if (f.veiculos_min !== undefined && s.veiculos < f.veiculos_min) return false
		if (f.veiculos_max !== undefined && s.veiculos > f.veiculos_max) return false
		// Sessão sem duração registrada não passa em filtro de duração — nem no
		// mínimo nem no máximo: ausência de dado não é "durou 0 segundo" (a
		// coluna só existe para sessão encerrada).
		if (f.duracao_min !== undefined || f.duracao_max !== undefined) {
			if (s.duration_seconds === null) return false
			if (f.duracao_min !== undefined && s.duration_seconds < f.duracao_min) return false
			if (f.duracao_max !== undefined && s.duration_seconds > f.duracao_max) return false
		}
		return true
	})
}

/**
 * Valor bruto de cada coluna da lista de sessões, para ordenar no servidor
 * (a lista é paginada lá; ordenar só a página aberta mostraria "a maior
 * duração" que é a maior das 50 linhas à vista).
 */
export function valorDaSessao(s: SessaoDescrita, chave: string): ValorDaCelula {
	switch (chave) {
		case 'quando': return s.started_at
		case 'canal': return s.rotulo_canal
		case 'fonte': return `${s.rotulo_fonte} / ${s.meio}`
		case 'campanha': return s.campanha
		case 'referrer': return s.referrer_domain
		case 'entrada': return s.entrada
		case 'cidade': return [s.city, s.region].filter(Boolean).join(' · ')
		case 'aparelho': return s.device_type
		case 'veiculos': return s.veiculos
		case 'duracao': return s.duration_seconds
		case 'contato': return s.contacted_whatsapp ? 2 : s.submitted_form ? 1 : 0
		default: return null
	}
}

export const COLUNAS_ORDENAVEIS = [
	'quando', 'canal', 'fonte', 'campanha', 'referrer', 'entrada', 'cidade', 'aparelho', 'veiculos', 'duracao', 'contato',
] as const

export function ordenarSessoes(sessoes: SessaoDescrita[], ordenacao: Ordenacao | null): SessaoDescrita[] {
	if (!ordenacao || !(COLUNAS_ORDENAVEIS as readonly string[]).includes(ordenacao.chave)) return sessoes
	return ordenarLinhas(sessoes, valorDaSessao, ordenacao)
}

export function paginar<T>(itens: T[], pagina: number, porPagina: number): { pagina: number; paginas: number; itens: T[] } {
	const paginas = Math.max(1, Math.ceil(itens.length / porPagina))
	const p = Math.min(Math.max(1, pagina), paginas)
	return { pagina: p, paginas, itens: itens.slice((p - 1) * porPagina, p * porPagina) }
}

// ---------------------------------------------------------------------------
// Primeira × última origem
// ---------------------------------------------------------------------------

export interface ToqueCru {
	fingerprint_id: string
	session_id: string
	started_at: string
	utm_source: string | null
	utm_medium: string | null
	utm_campaign: string | null
	utm_id: string | null
	gclid: string | null
	fbclid: string | null
	ttclid: string | null
	referrer_domain: string | null
	contacted_whatsapp: boolean
	submitted_form: boolean
}

export interface Toque {
	session_id: string
	started_at: string
	canal: CanalTrafego
	rotulo_canal: string
	cor_canal: string
	fonte: string
	rotulo_fonte: string
	campanha: string
}

export interface Jornada {
	fingerprint_id: string
	sessoes: number
	primeira: Toque
	conversao: Toque
	/** Dias entre o primeiro toque e a conversão. */
	dias: number
}

export interface CelulaMatriz {
	primeira: CanalTrafego
	conversao: CanalTrafego
	jornadas: number
}

function toque(t: ToqueCru): Toque {
	const canal = classificarCanal(t)
	const fonte = normalizarFonte(t)
	return {
		session_id: t.session_id,
		started_at: t.started_at,
		canal,
		rotulo_canal: rotuloCanal(canal),
		cor_canal: corCanal(canal),
		fonte,
		rotulo_fonte: rotuloFonte(fonte),
		campanha: rotuloCampanha(t.utm_campaign, t.utm_id),
	}
}

/**
 * Junta o primeiro toque de cada visitante com a sessão em que ele converteu.
 * Só entram visitantes com 2+ sessões — com uma só, primeira e última são a
 * mesma coisa e não há o que comparar.
 */
export function montarJornadas(
	convertidas: ToqueCru[],
	primeiras: ToqueCru[],
	sessoesPorVisitante: Record<string, number>,
): { jornadas: Jornada[]; matriz: CelulaMatriz[]; visitantes_uma_sessao: number } {
	const primeiraDe = new Map(primeiras.map(p => [p.fingerprint_id, p]))
	const jornadas: Jornada[] = []
	let umaSessao = 0
	const vistos = new Set<string>()
	for (const c of convertidas) {
		if (vistos.has(c.fingerprint_id)) continue // uma jornada por visitante: a primeira conversão
		vistos.add(c.fingerprint_id)
		const total = sessoesPorVisitante[c.fingerprint_id] ?? 1
		const p = primeiraDe.get(c.fingerprint_id)
		if (!p || total < 2 || p.session_id === c.session_id) {
			umaSessao++
			continue
		}
		const t0 = new Date(p.started_at).getTime()
		const t1 = new Date(c.started_at).getTime()
		jornadas.push({
			fingerprint_id: c.fingerprint_id,
			sessoes: total,
			primeira: toque(p),
			conversao: toque(c),
			dias: Math.max(0, Math.round((t1 - t0) / 86_400_000)),
		})
	}
	const celulas = new Map<string, CelulaMatriz>()
	for (const j of jornadas) {
		const k = `${j.primeira.canal}>${j.conversao.canal}`
		const cel = celulas.get(k) ?? { primeira: j.primeira.canal, conversao: j.conversao.canal, jornadas: 0 }
		cel.jornadas++
		celulas.set(k, cel)
	}
	return {
		jornadas: jornadas.sort((a, b) => new Date(b.conversao.started_at).getTime() - new Date(a.conversao.started_at).getTime()),
		matriz: [...celulas.values()].sort((a, b) => b.jornadas - a.jornadas),
		visitantes_uma_sessao: umaSessao,
	}
}
