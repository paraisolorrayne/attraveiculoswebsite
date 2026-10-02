'use client'

import { useCallback, useEffect, useState } from 'react'
import { useVisitantesApi } from '@/app/admin/visitors/visitantes-api'
import { TabelaCampanhasScore } from '@/app/admin/visitors/campanhas-score'
import { Secao } from '@/app/admin/visitors/visitors-tabelas'
import { Erro, Vazio } from '@/app/admin/visitors/visitors-ui'
import { fmtNum, fmtPct, taxa } from '@/app/admin/visitors/visitors-metrics'
import type { LinhaCampanhaScore } from '@/lib/visitors/score-clique'
import type { ContagemLeads } from '@/lib/visitors/consultas/leads-agencia'
import { AvisoImplantacao, NumerosLeads } from './leads/leads-agencia'

interface Numeros {
	sessoes: number
	whatsapp: number
	acidentais: number
}

interface Dados {
	resumo: { total: Numeros; porPlataforma: Array<Numeros & { plataforma: string }> }
	campanhas: { campanhas: LinhaCampanhaScore[]; score_desde: string }
	leads: { total: ContagemLeads; ligacao_ativa: boolean }
}

const ROTULO_PLATAFORMA: Record<string, string> = { google: 'Google', meta: 'Meta', webmotors: 'WebMotors', outra: 'Outra' }

/**
 * Resumo da área da agência: os números do período (visitas e leads), o funil por plataforma
 * (sessões → cliques no WhatsApp, com os toques acidentais à parte) e a tabela
 * de campanhas com conversão e score. Os filtros vêm do topo da área.
 */
export function ResumoAgencia() {
	const { api, periodo } = useVisitantesApi()
	const dias = periodo?.dias ?? 30
	const [dados, setDados] = useState<Dados | null>(null)
	const [erro, setErro] = useState<string | null>(null)

	const carregar = useCallback(async () => {
		setErro(null)
		try {
			const [r, c, l] = await Promise.all([fetch(api('resumo', { dias })), fetch(api('campanhas', { dias })), fetch(api('leads', { dias }))])
			if (!r.ok || !c.ok || !l.ok) throw new Error(`HTTP ${r.status}/${c.status}/${l.status}`)
			setDados({ resumo: await r.json(), campanhas: await c.json(), leads: await l.json() })
		} catch (e) {
			console.error('[Resumo agência] falha ao carregar:', e)
			setErro('Não foi possível carregar o resumo.')
		}
	}, [api, dias])

	useEffect(() => {
		carregar()
	}, [carregar])

	if (erro) return <Erro>{erro}</Erro>
	if (!dados) return <p className="py-10 text-center text-sm text-foreground-secondary">Carregando…</p>

	const { total, porPlataforma } = dados.resumo
	const maior = Math.max(1, ...porPlataforma.map(p => p.sessoes))

	return (
		<div className="space-y-6">
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
				<Numero rotulo="Sessões" valor={fmtNum(total.sessoes)} />
				<Numero
					rotulo="Clicaram no WhatsApp"
					valor={fmtNum(total.whatsapp)}
					nota={total.acidentais > 0 ? `+${fmtNum(total.acidentais)} acidentais (< 3 s)` : undefined}
				/>
				<Numero rotulo="Conversão" valor={fmtPct(taxa(total.whatsapp, total.sessoes))} destaque />
			</div>

			{dados.leads.ligacao_ativa ? <NumerosLeads total={dados.leads.total} /> : <AvisoImplantacao compacto />}

			<Secao
				titulo="Funil por plataforma"
				dica="Sessões que chegaram de cada plataforma e quantas clicaram no WhatsApp. Cliques acidentais (todos nos primeiros 3 segundos da visita) ficam fora da conversão e aparecem à parte."
			>
				{porPlataforma.length === 0 ? (
					<Vazio>Nenhuma visita das suas campanhas no período.</Vazio>
				) : (
					<ul className="divide-y divide-border">
						{porPlataforma.map(p => (
							<li key={p.plataforma} className="px-4 py-3">
								<div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
									<span className="text-sm font-medium text-foreground">{ROTULO_PLATAFORMA[p.plataforma] ?? p.plataforma}</span>
									<span className="text-xs text-foreground-secondary tabular-nums">
										{fmtNum(p.sessoes)} sessões · {fmtNum(p.whatsapp)} cliques · conversão{' '}
										<strong className="text-foreground">{fmtPct(taxa(p.whatsapp, p.sessoes))}</strong>
										{p.acidentais > 0 && <> · {fmtNum(p.acidentais)} acidentais</>}
									</span>
								</div>
								<div className="mt-2 h-2 w-full rounded-full bg-background-soft overflow-hidden">
									<div className="h-full rounded-full bg-foreground/25" style={{ width: `${(p.sessoes / maior) * 100}%` }}>
										<div
											className="h-full rounded-full bg-primary"
											style={{ width: `${p.sessoes > 0 ? Math.max(p.whatsapp > 0 ? 2 : 0, (p.whatsapp / p.sessoes) * 100) : 0}%` }}
										/>
									</div>
								</div>
							</li>
						))}
					</ul>
				)}
			</Secao>

			<TabelaCampanhasScore linhas={dados.campanhas.campanhas} scoreDesde={dados.campanhas.score_desde} />
		</div>
	)
}

function Numero({ rotulo, valor, nota, destaque }: { rotulo: string; valor: string; nota?: string; destaque?: boolean }) {
	return (
		<div className={`min-w-0 rounded-xl border bg-background-card px-4 py-3 ${destaque ? 'border-primary/40' : 'border-border'}`}>
			<div className="text-[11px] uppercase tracking-wide text-foreground-secondary">{rotulo}</div>
			<div className={`mt-1 text-xl font-semibold tabular-nums ${destaque ? 'text-primary' : 'text-foreground'}`}>{valor}</div>
			{nota && <div className="mt-0.5 text-xs text-foreground-secondary">{nota}</div>}
		</div>
	)
}
