'use client'

import { useSyncExternalStore, type ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CanalTrafego } from '@/lib/traffic-channel'
import { PERIODOS } from '../crm/crm-constants'
import { fmtPct, larguraRelativa, taxa } from './visitors-metrics'

/**
 * Peças de tela compartilhadas pelas abas de origem (Origens, Entradas,
 * Campanha, Sessões). Existem para as quatro telas lerem igual — mesmo
 * cabeçalho de tabela, mesmo badge de canal, mesmo seletor de período — e
 * para o interruptor "valores crus" ser um só.
 */

export const TH = 'px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-foreground-secondary whitespace-nowrap'
export const TD = 'px-3 py-2.5 text-sm text-foreground whitespace-nowrap'
/** Valor cru de UTM/click id: monoespaçado e discreto, para não disputar com o rótulo. */
export const CRU = 'font-mono text-[11px] text-foreground-secondary'

export function Badge({ cor, children }: { cor: string; children: ReactNode }) {
	return <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${cor}`}>{children}</span>
}

export function Vazio({ children }: { children: ReactNode }) {
	return <p className="px-4 py-8 text-center text-sm text-foreground-secondary">{children}</p>
}

/** Sessões com barra proporcional ao maior da tabela e % do total. */
export function CelulaVolume({ valor, maximo, total }: { valor: number; maximo: number; total: number }) {
	return (
		<td className={`${TD} min-w-[140px]`}>
			<div className="flex items-baseline gap-2">
				<span className="font-medium tabular-nums">{valor.toLocaleString('pt-BR')}</span>
				{total > 0 && (
					<span className="text-xs text-foreground-secondary tabular-nums">{fmtPct(taxa(valor, total), 0)}</span>
				)}
			</div>
			<div className="mt-1 h-1.5 w-full rounded-full bg-background-soft overflow-hidden">
				<div className="h-full rounded-full bg-foreground/25" style={{ width: larguraRelativa(valor, maximo) }} />
			</div>
		</td>
	)
}

/** Cores dos canais em hexa, para SVG (as classes de badge não servem num <rect>). */
export const CANAL_HEX: Record<CanalTrafego, string> = {
	busca_paga: '#3b82f6',
	social_pago: '#6366f1',
	outra_midia_paga: '#0ea5e9',
	busca_organica: '#10b981',
	social_organico: '#14b8a6',
	assistente_ia: '#8b5cf6',
	direto: '#6b7280',
	referencia: '#f59e0b',
	outro: '#64748b',
}

export function SeletorPeriodo({ dias, onChange }: { dias: number; onChange: (d: number) => void }) {
	return (
		<select
			value={dias}
			onChange={e => onChange(Number(e.target.value))}
			className="rounded-lg border border-border bg-background-card px-3 py-2 text-sm text-foreground"
			aria-label="Período"
		>
			{PERIODOS.map(p => (
				<option key={p.dias} value={p.dias}>
					{p.label}
				</option>
			))}
		</select>
	)
}

export function BotaoAtualizar({ carregando, onClick }: { carregando: boolean; onClick: () => void }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-background-soft"
		>
			<RefreshCw className={cn('w-4 h-4', carregando && 'animate-spin')} />
			Atualizar
		</button>
	)
}

const CHAVE_CRUS = 'visitors:valores-crus'

/**
 * "Ver valores crus": o gestor de tráfego confere a marcação pelo valor exato
 * (utm_medium=cpc, gclid…); o time interno lê o rótulo traduzido. A escolha
 * fica no navegador de quem escolheu.
 */
const EVENTO_CRUS = 'visitors:valores-crus-mudou'

function lerCrus(): boolean {
	try {
		return localStorage.getItem(CHAVE_CRUS) === '1'
	} catch {
		return false
	}
}

function assinarCrus(avisar: () => void) {
	window.addEventListener(EVENTO_CRUS, avisar)
	window.addEventListener('storage', avisar)
	return () => {
		window.removeEventListener(EVENTO_CRUS, avisar)
		window.removeEventListener('storage', avisar)
	}
}

export function useValoresCrus(): [boolean, (v: boolean) => void] {
	// useSyncExternalStore em vez de useState+useEffect: o valor vive no
	// localStorage, e no servidor (snapshot `false`) a tela nasce sem valores
	// crus, sem hidratação divergente nem setState dentro de efeito.
	const crus = useSyncExternalStore(assinarCrus, lerCrus, () => false)
	const definir = (v: boolean) => {
		try {
			localStorage.setItem(CHAVE_CRUS, v ? '1' : '0')
		} catch {
			/* sem storage: a escolha não persiste */
		}
		window.dispatchEvent(new Event(EVENTO_CRUS))
	}
	return [crus, definir]
}

export function InterruptorCrus({ crus, onChange }: { crus: boolean; onChange: (v: boolean) => void }) {
	return (
		<label className="flex items-center gap-2 text-sm text-foreground-secondary cursor-pointer select-none">
			<input
				type="checkbox"
				checked={crus}
				onChange={e => onChange(e.target.checked)}
				className="h-4 w-4 accent-primary"
			/>
			Ver valores crus
		</label>
	)
}

/** Cabeçalho comum das abas: período, atualizar, valores crus. */
export function BarraControles({
	dias,
	onDias,
	carregando,
	onAtualizar,
	crus,
	onCrus,
	extra,
}: {
	dias: number
	onDias: (d: number) => void
	carregando: boolean
	onAtualizar: () => void
	crus?: boolean
	onCrus?: (v: boolean) => void
	extra?: ReactNode
}) {
	return (
		<div className="flex flex-wrap items-center gap-3">
			<SeletorPeriodo dias={dias} onChange={onDias} />
			<BotaoAtualizar carregando={carregando} onClick={onAtualizar} />
			{onCrus && crus !== undefined && <InterruptorCrus crus={crus} onChange={onCrus} />}
			{extra}
		</div>
	)
}

export function Erro({ children }: { children: ReactNode }) {
	return (
		<div className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-500">{children}</div>
	)
}

/** Formata YYYY-MM-DD como dd/mm. */
export function diaCurto(dia: string): string {
	const [, m, d] = dia.split('-')
	return `${d}/${m}`
}
