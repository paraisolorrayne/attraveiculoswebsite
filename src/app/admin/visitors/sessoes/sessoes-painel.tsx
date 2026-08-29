'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ChevronRight, X } from 'lucide-react'
import { CANAIS_ORDEM, CANAL_ROTULOS, type CanalTrafego } from '@/lib/traffic-channel'
import type { CelulaMatriz, Jornada, SessaoDescrita } from '@/lib/visitors/sessoes'
import type { Filtro, Ordenacao } from '@/lib/visitors/tabela'
import { Secao } from '../visitors-tabelas'
import { fmtDuracao, fmtNum, fmtPct, nomeDoSlug, taxa } from '../visitors-metrics'
import { Badge, BarraControles, CANAL_HEX, CRU, Erro, TD, TH, Vazio, useValoresCrus } from '../visitors-ui'
import { TabelaOrdenavel, type ColunaTabela } from '../visitors-tabela'

interface Resposta {
	periodo: { dias: number }
	truncado: boolean
	teto: number
	total_periodo: number
	total_filtrado: number
	whatsapp_filtrado: number
	formularios_filtrado: number
	pagina: number
	paginas: number
	por_pagina: number
	ordenacao: Ordenacao | null
	opcoes: Record<string, string[]>
	sessoes: SessaoDescrita[]
}

interface Jornadas {
	visitantes_convertidos: number
	visitantes_uma_sessao: number
	matriz: CelulaMatriz[]
	jornadas_total: number
	jornadas: Jornada[]
}

/**
 * Cada coluna da tabela e o parâmetro de URL que ela filtra. A URL é a fonte
 * de verdade: os links das outras abas (Origens, Entradas, Campanha) chegam
 * com esses mesmos nomes, e a tela filtrada pode ser copiada e mandada para
 * alguém.
 *
 * `numero` vira um par min/max porque o comparador do filtro (≥ ou ≤) escolhe
 * qual dos dois lados preencher.
 */
const PARAMS_NUMERICOS: Record<string, { min: string; max: string }> = {
	veiculos: { min: 'veiculos_min', max: 'veiculos_max' },
	duracao: { min: 'duracao_min', max: 'duracao_max' },
}

const CHAVES_FILTRO = [
	'canal', 'fonte', 'meio', 'campanha', 'referrer', 'entrada', 'conversao', 'problema', 'sessao',
	'cidade', 'aparelho', 'veiculos_min', 'veiculos_max', 'duracao_min', 'duracao_max',
] as const

const ROTULO_PROBLEMA: Record<string, string> = {
	click_id_sem_utm: 'Clique de anúncio sem UTM',
	fonte_sem_meio: 'utm_source sem utm_medium',
	meio_sem_fonte: 'utm_medium sem utm_source',
	meio_desconhecido: 'utm_medium fora do vocabulário',
	campanha_varias_grafias: 'Campanha com várias grafias (tem campanha)',
	fonte_varias_grafias: 'Fonte com várias grafias (tem fonte)',
	paga_sem_campanha: 'Sessão paga sem campanha',
	click_id_contradiz_fonte: 'Click id contradiz a fonte',
}

const ROTULO_CONVERSAO: Record<string, string> = {
	qualquer: 'Com contato',
	whatsapp: 'Clicou no WhatsApp',
	formulario: 'Enviou formulário',
	nenhuma: 'Sem contato',
}

function dataHora(iso: string | null): string {
	if (!iso) return '—'
	const d = new Date(iso)
	if (Number.isNaN(d.getTime())) return '—'
	return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' })
}

const APARELHO: Record<string, string> = { mobile: 'Celular', desktop: 'Computador', tablet: 'Tablet' }

function crusDe(s: SessaoDescrita): string {
	return [
		s.utm_source && `source=${s.utm_source}`,
		s.utm_medium && `medium=${s.utm_medium}`,
		s.gclid && 'gclid',
		s.fbclid && 'fbclid',
		s.ttclid && 'ttclid',
	]
		.filter(Boolean)
		.join(' · ')
}

export function SessoesPainel() {
	const params = useSearchParams()
	const router = useRouter()
	const pathname = usePathname()

	const dias = Number(params.get('dias')) || 30
	const pagina = Number(params.get('pagina')) || 1

	const [dados, setDados] = useState<Resposta | null>(null)
	const [carregando, setCarregando] = useState(true)
	const [erro, setErro] = useState<string | null>(null)
	const [crus, setCrus] = useValoresCrus()

	// A URL é a fonte de verdade: mudar filtro ou ordem reescreve a query e a
	// busca refaz — inclusive a paginação, que volta para a página 1 (continuar
	// na 7 depois de filtrar mostraria uma lista vazia sem explicação).
	const definir = useCallback(
		(mudancas: Record<string, string | number | undefined>) => {
			const q = new URLSearchParams(params.toString())
			for (const [k, v] of Object.entries(mudancas)) {
				if (v === undefined || v === '' || v === null) q.delete(k)
				else q.set(k, String(v))
			}
			if (!('pagina' in mudancas)) q.delete('pagina')
			router.replace(`${pathname}?${q.toString()}`)
		},
		[params, pathname, router],
	)

	const carregar = useCallback(async () => {
		setCarregando(true)
		setErro(null)
		try {
			const q = new URLSearchParams(params.toString())
			q.set('dias', String(dias))
			const r = await fetch(`/api/admin/visitors/sessoes?${q.toString()}`)
			if (!r.ok) throw new Error(`HTTP ${r.status}`)
			setDados(await r.json())
		} catch (e) {
			console.error('[Sessoes] falha ao carregar:', e)
			setErro('Não foi possível carregar as sessões.')
		} finally {
			setCarregando(false)
		}
	}, [params, dias])

	useEffect(() => {
		carregar()
	}, [carregar])

	// Estado dos filtros lido da URL, no formato que a tabela entende.
	const filtros = useMemo(() => {
		const f: Record<string, Filtro> = {}
		for (const chave of ['canal', 'aparelho', 'conversao'] as const) {
			const v = params.get(chave)
			if (v) f[chave] = { tipo: 'opcoes', valor: v }
		}
		for (const chave of ['fonte', 'meio', 'campanha', 'referrer', 'entrada', 'cidade'] as const) {
			const v = params.get(chave)
			if (v) f[chave] = { tipo: 'texto', valor: v }
		}
		for (const [chave, par] of Object.entries(PARAMS_NUMERICOS)) {
			const min = params.get(par.min)
			const max = params.get(par.max)
			if (min) f[chave] = { tipo: 'numero', valor: min, operador: 'maior' }
			else if (max) f[chave] = { tipo: 'numero', valor: max, operador: 'menor' }
		}
		return f
	}, [params])

	const aoFiltrar = useCallback(
		(chave: string, patch: Partial<Filtro>) => {
			const par = PARAMS_NUMERICOS[chave]
			if (!par) {
				definir({ [chave]: patch.valor })
				return
			}
			// Trocar o comparador sem valor digitado só troca o lado; com valor,
			// move o número para o lado novo e limpa o antigo.
			const atual = filtros[chave]
			const operador = patch.operador ?? atual?.operador ?? 'maior'
			const valor = patch.valor ?? atual?.valor ?? ''
			definir({
				[par.min]: operador === 'maior' ? valor : undefined,
				[par.max]: operador === 'menor' ? valor : undefined,
			})
		},
		[definir, filtros],
	)

	const limparFiltros = useCallback(() => {
		definir(Object.fromEntries(CHAVES_FILTRO.map(k => [k, undefined])))
	}, [definir])

	const ativos = useMemo(
		() => CHAVES_FILTRO.map(k => [k, params.get(k)] as const).filter(([, v]) => v),
		[params],
	)

	const colunas: ColunaTabela<SessaoDescrita>[] = useMemo(
		() => [
			{
				chave: 'quando',
				titulo: 'Quando',
				valor: s => s.started_at,
				classe: 'tabular-nums',
				render: s => (
					<span className="inline-flex items-center gap-1 group">
						{dataHora(s.started_at)}
						<ChevronRight className="w-3.5 h-3.5 text-foreground-secondary opacity-0 group-hover:opacity-100" />
					</span>
				),
			},
			{
				chave: 'canal',
				titulo: 'Canal',
				filtro: 'opcoes',
				valor: s => s.rotulo_canal,
				render: s => <Badge cor={s.cor_canal}>{s.rotulo_canal}</Badge>,
			},
			{
				chave: 'fonte',
				titulo: 'Fonte / meio',
				filtro: 'texto',
				valor: s => s.fonte,
				rotuloFiltro: 'Fonte',
				classe: 'max-w-[220px]',
				render: s => (
					<>
						<div className="truncate">
							{s.rotulo_fonte} <span className="text-foreground-secondary">/ {s.meio}</span>
						</div>
						{crus && crusDe(s) && (
							<div className={`${CRU} truncate`} title={crusDe(s)}>
								{crusDe(s)}
							</div>
						)}
					</>
				),
			},
			{
				chave: 'campanha',
				titulo: 'Campanha',
				filtro: 'texto',
				valor: s => s.campanha,
				classe: 'max-w-[200px]',
				render: s =>
					s.chave_campanha ? (
						<Link
							href={`/admin/visitors/campanha/${encodeURIComponent(s.chave_campanha)}`}
							className="block truncate hover:underline"
							title={s.campanha}
							onClick={e => e.stopPropagation()}
						>
							{s.campanha}
						</Link>
					) : (
						<span className="text-foreground-secondary">—</span>
					),
			},
			{
				chave: 'referrer',
				titulo: 'Referenciador',
				filtro: 'texto',
				valor: s => s.referrer_domain,
				classe: 'max-w-[160px] truncate font-mono text-xs',
				render: s => s.referrer_domain?.replace(/^www\./, '') || <span className="font-sans text-foreground-secondary">—</span>,
			},
			{
				chave: 'entrada',
				titulo: 'Entrada',
				filtro: 'texto',
				valor: s => s.entrada,
				classe: 'max-w-[200px] truncate',
				render: s => (s.entrada_veiculo ? nomeDoSlug(s.entrada_veiculo) : s.entrada === '/' ? 'Home' : (s.entrada ?? '—')),
			},
			{
				chave: 'cidade',
				titulo: 'Cidade',
				filtro: 'texto',
				valor: s => [s.city, s.region].filter(Boolean).join(' · '),
				classe: 'max-w-[160px] truncate',
				render: s => [s.city, s.region].filter(Boolean).join(' · ') || '—',
			},
			{
				chave: 'aparelho',
				titulo: 'Aparelho',
				filtro: 'opcoes',
				valor: s => s.device_type,
				render: s => (s.device_type ? (APARELHO[s.device_type] ?? s.device_type) : '—'),
			},
			{
				chave: 'veiculos',
				titulo: 'Veíc.',
				filtro: 'numero',
				valor: s => s.veiculos,
				alinhar: 'dir',
				classe: 'tabular-nums',
				rotuloFiltro: 'Veículos',
				render: s => s.veiculos || '—',
			},
			{
				chave: 'duracao',
				titulo: 'Duração',
				filtro: 'numero',
				valor: s => s.duration_seconds,
				alinhar: 'dir',
				classe: 'tabular-nums text-foreground-secondary',
				rotuloFiltro: 'Duração em segundos',
				render: s => fmtDuracao(s.duration_seconds),
			},
			{
				chave: 'conversao',
				titulo: 'Contato',
				filtro: 'opcoes',
				valor: s => (s.contacted_whatsapp ? 'whatsapp' : s.submitted_form ? 'formulario' : 'nenhuma'),
				render: s => (
					<>
						{s.contacted_whatsapp && <Badge cor="bg-emerald-500/10 text-emerald-500">WhatsApp</Badge>}{' '}
						{s.submitted_form && <Badge cor="bg-blue-500/10 text-blue-500">Formulário</Badge>}
					</>
				),
			},
		],
		[crus],
	)

	return (
		<div className="space-y-6">
			<BarraControles
				dias={dias}
				onDias={d => definir({ dias: d })}
				carregando={carregando}
				onAtualizar={carregar}
				crus={crus}
				onCrus={setCrus}
				extra={
					dados && (
						<span className="text-sm text-foreground-secondary">
							<strong className="text-foreground">{fmtNum(dados.total_filtrado)}</strong>
							{ativos.length > 0 && <> de {fmtNum(dados.total_periodo)}</>} sessões ·{' '}
							{fmtNum(dados.whatsapp_filtrado)} WhatsApp ({fmtPct(taxa(dados.whatsapp_filtrado, dados.total_filtrado))}) ·{' '}
							{fmtNum(dados.formularios_filtrado)} formulários
							{dados.truncado && (
								<span
									className="ml-2 text-amber-500"
									title={`O período tem mais de ${fmtNum(dados.teto)} sessões; só as ${fmtNum(dados.teto)} mais recentes entram aqui. Encurte o período.`}
								>
									(parcial)
								</span>
							)}
						</span>
					)
				}
			/>

			{ativos.length > 0 && (
				<div className="flex flex-wrap items-center gap-1.5 text-xs">
					{ativos.map(([k, v]) => (
						<button
							key={k}
							type="button"
							onClick={() => definir({ [k]: undefined })}
							className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-foreground-secondary hover:text-foreground"
							title="Remover filtro"
						>
							<span className="font-mono">{k}</span>=
							{k === 'problema' ? (ROTULO_PROBLEMA[v!] ?? v) : k === 'conversao' ? (ROTULO_CONVERSAO[v!] ?? v) : v}
							<X className="w-3 h-3" />
						</button>
					))}
					<button type="button" onClick={limparFiltros} className="text-primary hover:underline">
						limpar tudo
					</button>
				</div>
			)}

			{erro && <Erro>{erro}</Erro>}

			{dados && (
				<Secao
					titulo="Sessões"
					dica="Cada linha é uma visita: clique nela para abrir a jornada completa. Os cabeçalhos ordenam e o botão Filtrar abre um filtro por coluna — ambos valem para o período inteiro, não só para a página aberta. Com 'Ver valores crus' a marcação exata (utm_source, utm_medium, click id) aparece embaixo da fonte."
					acessorio={
						<select
							value={params.get('problema') ?? ''}
							onChange={e => definir({ problema: e.target.value })}
							className="rounded-lg border border-border bg-background-card px-2.5 py-1.5 text-xs text-foreground"
							aria-label="Problema de marcação"
						>
							<option value="">Qualquer marcação</option>
							{Object.entries(ROTULO_PROBLEMA).map(([k, v]) => (
								<option key={k} value={k}>
									{v}
								</option>
							))}
						</select>
					}
				>
					<TabelaOrdenavel
						colunas={colunas}
						linhas={dados.sessoes}
						chaveLinha={s => s.session_id}
						vazio="Nenhuma sessão com esses filtros."
						aoClicarLinha={s => router.push(`/admin/visitors/sessoes/${encodeURIComponent(s.session_id)}`)}
						controlado={{
							ordenacao: dados.ordenacao,
							aoOrdenar: o => definir({ ordenar: o?.chave, direcao: o?.direcao }),
							filtros,
							aoFiltrar,
							aoLimpar: limparFiltros,
							totalFiltrado: dados.total_filtrado,
							totalGeral: dados.total_periodo,
							opcoes: {
								canal: dados.opcoes.canal ?? [],
								aparelho: (dados.opcoes.aparelho ?? []).map(a => APARELHO[a] ?? a),
								conversao: ['whatsapp', 'formulario', 'nenhuma'],
							},
						}}
						rodape={
							<div className="flex items-center justify-between gap-3 border-t border-border px-4 py-2 text-sm text-foreground-secondary">
								<span>
									Página {dados.pagina} de {dados.paginas}
								</span>
								<div className="flex gap-2">
									<button
										type="button"
										disabled={dados.pagina <= 1}
										onClick={() => definir({ pagina: pagina - 1 })}
										className="rounded border border-border px-3 py-1 disabled:opacity-40"
									>
										Anterior
									</button>
									<button
										type="button"
										disabled={dados.pagina >= dados.paginas}
										onClick={() => definir({ pagina: pagina + 1 })}
										className="rounded border border-border px-3 py-1 disabled:opacity-40"
									>
										Próxima
									</button>
								</div>
							</div>
						}
					/>
				</Secao>
			)}

			<PrimeiraUltima dias={dias} />
		</div>
	)
}

function PrimeiraUltima({ dias }: { dias: number }) {
	const [dados, setDados] = useState<Jornadas | null>(null)
	const [erro, setErro] = useState<string | null>(null)

	useEffect(() => {
		let ativo = true
		fetch(`/api/admin/visitors/jornadas?dias=${dias}`)
			.then(async r => {
				if (!r.ok) throw new Error(`HTTP ${r.status}`)
				const j = await r.json()
				if (ativo) setDados(j)
			})
			.catch(e => {
				console.error('[Sessoes] jornadas falhou:', e)
				if (ativo) setErro('Não foi possível carregar as jornadas.')
			})
		return () => {
			ativo = false
		}
	}, [dias])

	const canaisLinha = dados ? CANAIS_ORDEM.filter(c => dados.matriz.some(m => m.primeira === c)) : []
	const canaisColuna = dados ? CANAIS_ORDEM.filter(c => dados.matriz.some(m => m.conversao === c)) : []
	const celula = (p: CanalTrafego, c: CanalTrafego) => dados?.matriz.find(m => m.primeira === p && m.conversao === c)?.jornadas ?? 0
	const maximo = Math.max(1, ...(dados?.matriz.map(m => m.jornadas) ?? [0]))

	return (
		<Secao
			titulo="Primeira × última origem — o que trouxe quem converteu"
			dica="Para cada visitante que clicou no WhatsApp ou enviou formulário no período e já tinha visitado antes: o canal que o trouxe pela PRIMEIRA vez (em toda a história) na linha, e o canal da sessão em que converteu na coluna. Quem converteu na primeira visita não entra — não há o que comparar. Serve para não cortar o canal que apresenta a Attra só porque a conversa acontece dias depois, em 'direto'."
		>
			{erro && <Erro>{erro}</Erro>}
			{!dados && !erro && <Vazio>Carregando…</Vazio>}
			{dados && (
				<div className="space-y-4 p-4">
					<p className="text-sm text-foreground-secondary">
						<strong className="text-foreground">{fmtNum(dados.visitantes_convertidos)}</strong> visitantes converteram no período;{' '}
						<strong className="text-foreground">{fmtNum(dados.jornadas_total)}</strong> já tinham visitado antes e entram na matriz;{' '}
						{fmtNum(dados.visitantes_uma_sessao)} converteram na primeira visita.
					</p>
					{dados.matriz.length === 0 ? (
						<Vazio>Nenhuma jornada com mais de uma sessão no período.</Vazio>
					) : (
						<>
							<div className="overflow-x-auto">
								<table className="w-auto text-sm">
									<thead>
										<tr>
											<th className={`${TH} text-left`}>Primeira visita ↓ / converteu em →</th>
											{canaisColuna.map(c => (
												<th key={c} className={`${TH} text-center`}>
													{CANAL_ROTULOS[c]}
												</th>
											))}
											<th className={`${TH} text-right`}>Total</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-border">
										{canaisLinha.map(p => {
											const total = canaisColuna.reduce((n, c) => n + celula(p, c), 0)
											return (
												<tr key={p}>
													<td className={TD}>
														<Badge cor={`bg-transparent`}>
															<span className="inline-block h-2.5 w-2.5 rounded-sm mr-1.5 align-middle" style={{ backgroundColor: CANAL_HEX[p] }} />
															{CANAL_ROTULOS[p]}
														</Badge>
													</td>
													{canaisColuna.map(c => {
														const v = celula(p, c)
														return (
															<td key={c} className={`${TD} text-center tabular-nums`} style={{ backgroundColor: v ? `rgba(154,28,28,${0.08 + (v / maximo) * 0.35})` : undefined }}>
																{v || <span className="text-foreground-secondary">·</span>}
															</td>
														)
													})}
													<td className={`${TD} text-right tabular-nums font-medium`}>{total}</td>
												</tr>
											)
										})}
									</tbody>
								</table>
							</div>
							<TabelaOrdenavel
								colunas={[
									{
										chave: 'converteu',
										titulo: 'Converteu em',
										valor: j => j.conversao.started_at,
										classe: 'tabular-nums',
										render: j => (
											<Link
												href={`/admin/visitors/sessoes/${encodeURIComponent(j.conversao.session_id)}`}
												className="hover:underline"
											>
												{dataHora(j.conversao.started_at)}
											</Link>
										),
									},
									{
										chave: 'primeira',
										titulo: 'Primeira visita',
										filtro: 'opcoes',
										valor: j => j.primeira.rotulo_canal,
										render: j => (
											<>
												<Badge cor={j.primeira.cor_canal}>{j.primeira.rotulo_canal}</Badge>
												<span className="ml-2 text-xs text-foreground-secondary">
													{j.primeira.rotulo_fonte}
													{j.primeira.campanha !== '(sem campanha)' && ` · ${j.primeira.campanha}`}
												</span>
											</>
										),
									},
									{
										chave: 'conversao',
										titulo: 'Sessão da conversão',
										filtro: 'opcoes',
										valor: j => j.conversao.rotulo_canal,
										render: j => (
											<>
												<Badge cor={j.conversao.cor_canal}>{j.conversao.rotulo_canal}</Badge>
												<span className="ml-2 text-xs text-foreground-secondary">
													{j.conversao.rotulo_fonte}
													{j.conversao.campanha !== '(sem campanha)' && ` · ${j.conversao.campanha}`}
												</span>
											</>
										),
									},
									{
										chave: 'dias',
										titulo: 'Dias',
										filtro: 'numero',
										valor: j => j.dias,
										alinhar: 'dir',
										classe: 'tabular-nums',
										render: j => j.dias,
									},
									{
										chave: 'sessoes',
										titulo: 'Sessões',
										filtro: 'numero',
										valor: j => j.sessoes,
										alinhar: 'dir',
										classe: 'tabular-nums',
										render: j => j.sessoes,
									},
								]}
								linhas={dados.jornadas}
								chaveLinha={j => j.fingerprint_id}
								vazio="Nenhuma jornada no período."
							/>
						</>
					)}
				</div>
			)}
		</Secao>
	)
}
