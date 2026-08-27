'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { CANAIS_ORDEM, CANAL_ROTULOS } from '@/lib/traffic-channel'
import type { LinhaCanalEntrada, LinhaPaginaEntrada } from '@/lib/visitors/entradas'
import { Secao } from '../visitors-tabelas'
import { fmtNum, fmtPct, nomeDoSlug, taxa } from '../visitors-metrics'
import { Badge, BarraControles, CANAL_HEX, CelulaVolume, Erro, TD, TH, Vazio } from '../visitors-ui'

interface Dados {
	periodo: { dias: number; desde: string | null }
	total_sessoes: number
	sem_entrada: number
	por_pagina: LinhaPaginaEntrada[]
	por_canal: LinhaCanalEntrada[]
}

/** Rótulo curto da página: ficha de veículo vira o nome do carro; o resto é o caminho. */
function nomeDaPagina(p: { page_path: string; page_type: string | null; vehicle_slug: string | null }): string {
	if (p.vehicle_slug) return nomeDoSlug(p.vehicle_slug)
	if (p.page_path === '/') return 'Home'
	return p.page_path
}

export function EntradasPainel() {
	const [dados, setDados] = useState<Dados | null>(null)
	const [dias, setDias] = useState(30)
	const [carregando, setCarregando] = useState(true)
	const [erro, setErro] = useState<string | null>(null)

	const carregar = useCallback(async () => {
		setCarregando(true)
		setErro(null)
		try {
			const r = await fetch(`/api/admin/visitors/entradas?dias=${dias}`)
			if (!r.ok) throw new Error(`HTTP ${r.status}`)
			setDados(await r.json())
		} catch (e) {
			console.error('[Entradas] falha ao carregar:', e)
			setErro('Não foi possível carregar as páginas de entrada.')
		} finally {
			setCarregando(false)
		}
	}, [dias])

	useEffect(() => {
		carregar()
	}, [carregar])

	const total = dados?.total_sessoes ?? 0
	const comEntrada = total - (dados?.sem_entrada ?? 0)

	return (
		<div className="space-y-6">
			<BarraControles
				dias={dias}
				onDias={setDias}
				carregando={carregando}
				onAtualizar={carregar}
				extra={
					dados && (
						<span className="text-sm text-foreground-secondary">
							<strong className="text-foreground">{fmtNum(comEntrada)}</strong> de {fmtNum(total)} sessões com página de
							entrada registrada
							{dados.sem_entrada > 0 && (
								<span title="Sessões sem nenhum page view gravado — normalmente bloqueio de script ou saída antes de carregar. Ficam fora das tabelas.">
									{' '}
									({fmtNum(dados.sem_entrada)} sem)
								</span>
							)}
						</span>
					)
				}
			/>

			{erro && <Erro>{erro}</Erro>}

			{dados && (
				<>
					<PorCanal canais={dados.por_canal} dias={dias} />
					<PorPagina paginas={dados.por_pagina} total={comEntrada} dias={dias} />
				</>
			)}
		</div>
	)
}

function linkSessoes(params: Record<string, string | number | undefined>): string {
	const q = new URLSearchParams()
	for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') q.set(k, String(v))
	return `/admin/visitors/sessoes?${q.toString()}`
}

function PorCanal({ canais, dias }: { canais: LinhaCanalEntrada[]; dias: number }) {
	return (
		<Secao
			titulo="Onde cada canal cai"
			dica="Para cada canal, as páginas em que as visitas dele começam. Anúncio de um carro que cai na home em vez da ficha é o erro clássico que aparece aqui. A conversão é medida na sessão inteira, não só na página de entrada."
		>
			{canais.length === 0 ? (
				<Vazio>Sem sessões com página de entrada no período.</Vazio>
			) : (
				<div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
					{canais.map(c => (
						<div key={c.canal} className="rounded-lg border border-border">
							<div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
								<Badge cor={c.cor}>{c.rotulo}</Badge>
								<span className="text-xs text-foreground-secondary tabular-nums">
									{fmtNum(c.sessoes)} sessões · {fmtPct(taxa(c.whatsapp, c.sessoes))} WhatsApp
								</span>
							</div>
							<ul className="divide-y divide-border">
								{c.paginas.map(p => (
									<li key={p.page_path} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
										<Link
											href={linkSessoes({ dias, canal: c.canal, entrada: p.page_path })}
											className="min-w-0 truncate hover:underline"
											title={p.page_path}
										>
											{nomeDaPagina(p)}
										</Link>
										<span className="shrink-0 tabular-nums text-foreground-secondary">
											{fmtNum(p.sessoes)}
											<span className="ml-1 text-xs">{fmtPct(taxa(p.sessoes, c.sessoes), 0)}</span>
										</span>
									</li>
								))}
							</ul>
						</div>
					))}
				</div>
			)}
		</Secao>
	)
}

function PorPagina({ paginas, total, dias }: { paginas: LinhaPaginaEntrada[]; total: number; dias: number }) {
	const maior = Math.max(0, ...paginas.map(p => p.sessoes))
	return (
		<Secao
			titulo="Páginas de entrada — quem chega por elas"
			dica="Cada linha é uma página em que sessões começaram. A barra colorida mostra a mistura de canais dessa página; 'Fontes' são as três origens que mais trazem gente para ela. Página com muita entrada e pouca conversa é candidata a revisão."
		>
			{paginas.length === 0 ? (
				<Vazio>Sem páginas de entrada no período.</Vazio>
			) : (
				<div className="overflow-x-auto">
					<table className="w-full">
						<thead className="bg-background-soft">
							<tr>
								<th className={`${TH} text-left`}>Página</th>
								<th className={`${TH} text-left`}>Sessões</th>
								<th className={`${TH} text-left`}>Mistura de canais</th>
								<th className={`${TH} text-left`}>Fontes</th>
								<th className={`${TH} text-right`}>WhatsApp</th>
								<th className={`${TH} text-right`}>Conversão</th>
								<th className={`${TH} text-right`}>Formulários</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{paginas.map(p => (
								<tr key={p.page_path} className="hover:bg-background-soft/60">
									<td className={`${TD} max-w-[320px]`}>
										<Link href={linkSessoes({ dias, entrada: p.page_path })} className="block truncate hover:underline" title={p.page_path}>
											{nomeDaPagina(p)}
										</Link>
										{p.vehicle_slug && <div className="truncate font-mono text-[11px] text-foreground-secondary">{p.page_path}</div>}
									</td>
									<CelulaVolume valor={p.sessoes} maximo={maior} total={total} />
									<td className={`${TD} min-w-[160px]`}>
										<div className="flex h-2.5 w-full overflow-hidden rounded-full bg-background-soft" title={mistura(p)}>
											{CANAIS_ORDEM.map(c => {
												const v = p.por_canal[c] ?? 0
												if (!v) return null
												return <div key={c} style={{ width: `${(v / p.sessoes) * 100}%`, backgroundColor: CANAL_HEX[c] }} />
											})}
										</div>
									</td>
									<td className={`${TD} text-xs text-foreground-secondary`}>
										{p.fontes.map(f => `${f.rotulo_fonte} ${fmtPct(taxa(f.sessoes, p.sessoes), 0)}`).join(' · ')}
									</td>
									<td className={`${TD} text-right tabular-nums`}>{fmtNum(p.whatsapp)}</td>
									<td className={`${TD} text-right tabular-nums`}>{fmtPct(taxa(p.whatsapp, p.sessoes))}</td>
									<td className={`${TD} text-right tabular-nums`}>{fmtNum(p.formularios)}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</Secao>
	)
}

function mistura(p: LinhaPaginaEntrada): string {
	return CANAIS_ORDEM.filter(c => (p.por_canal[c] ?? 0) > 0)
		.map(c => `${CANAL_ROTULOS[c]}: ${p.por_canal[c]}`)
		.join(' · ')
}
