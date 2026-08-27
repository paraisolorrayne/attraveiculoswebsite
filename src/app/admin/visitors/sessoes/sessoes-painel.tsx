'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { X } from 'lucide-react'
import { CANAIS_ORDEM, CANAL_ROTULOS, type CanalTrafego } from '@/lib/traffic-channel'
import type { CelulaMatriz, Jornada, SessaoDescrita } from '@/lib/visitors/sessoes'
import { Secao } from '../visitors-tabelas'
import { fmtDuracao, fmtNum, fmtPct, nomeDoSlug, taxa } from '../visitors-metrics'
import { Badge, BarraControles, CANAL_HEX, CRU, Erro, TD, TH, Vazio, useValoresCrus } from '../visitors-ui'

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
	sessoes: SessaoDescrita[]
}

interface Jornadas {
	visitantes_convertidos: number
	visitantes_uma_sessao: number
	matriz: CelulaMatriz[]
	jornadas_total: number
	jornadas: Jornada[]
}

const CHAVES_FILTRO = ['canal', 'fonte', 'meio', 'campanha', 'referrer', 'entrada', 'conversao', 'problema', 'sessao'] as const
type ChaveFiltro = (typeof CHAVES_FILTRO)[number]

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

function dataHora(iso: string | null): string {
	if (!iso) return '—'
	const d = new Date(iso)
	if (Number.isNaN(d.getTime())) return '—'
	return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' })
}

const APARELHO: Record<string, string> = { mobile: 'Celular', desktop: 'Computador', tablet: 'Tablet' }

export function SessoesPainel() {
	const params = useSearchParams()
	const router = useRouter()
	const pathname = usePathname()

	const dias = Number(params.get('dias')) || 30
	const pagina = Number(params.get('pagina')) || 1
	const filtros = useMemo(() => {
		const f: Partial<Record<ChaveFiltro, string>> = {}
		for (const k of CHAVES_FILTRO) {
			const v = params.get(k)
			if (v) f[k] = v
		}
		return f
	}, [params])

	const [dados, setDados] = useState<Resposta | null>(null)
	const [carregando, setCarregando] = useState(true)
	const [erro, setErro] = useState<string | null>(null)
	const [crus, setCrus] = useValoresCrus()
	const [aberta, setAberta] = useState<string | null>(params.get('sessao'))

	// A URL é a fonte de verdade dos filtros: links das outras abas chegam
	// prontos e a tela filtrada pode ser copiada e mandada para alguém.
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

	const temFiltro = Object.keys(filtros).length > 0

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
							{temFiltro && <> de {fmtNum(dados.total_periodo)}</>} sessões ·{' '}
							{fmtNum(dados.whatsapp_filtrado)} WhatsApp ({fmtPct(taxa(dados.whatsapp_filtrado, dados.total_filtrado))}) ·{' '}
							{fmtNum(dados.formularios_filtrado)} formulários
							{dados.truncado && (
								<span className="ml-2 text-amber-500" title={`O período tem mais de ${fmtNum(dados.teto)} sessões; só as ${fmtNum(dados.teto)} mais recentes entram aqui. Encurte o período.`}>
									(parcial)
								</span>
							)}
						</span>
					)
				}
			/>

			<Filtros filtros={filtros} onChange={definir} />

			{erro && <Erro>{erro}</Erro>}

			{dados && (
				<Secao
					titulo="Sessões"
					dica="Cada linha é uma visita. Fonte, meio e campanha aparecem traduzidos; com 'Ver valores crus' a marcação exata (utm_source, utm_medium, click id) fica embaixo. Clique na data para abrir a linha do tempo da sessão."
				>
					{dados.sessoes.length === 0 ? (
						<Vazio>Nenhuma sessão com esses filtros.</Vazio>
					) : (
						<>
							<div className="overflow-x-auto">
								<table className="w-full">
									<thead className="bg-background-soft">
										<tr>
											<th className={`${TH} text-left`}>Quando</th>
											<th className={`${TH} text-left`}>Canal</th>
											<th className={`${TH} text-left`}>Fonte / meio</th>
											<th className={`${TH} text-left`}>Campanha</th>
											<th className={`${TH} text-left`}>Referenciador</th>
											<th className={`${TH} text-left`}>Entrada</th>
											<th className={`${TH} text-left`}>Cidade</th>
											<th className={`${TH} text-left`}>Aparelho</th>
											<th className={`${TH} text-right`}>Veíc.</th>
											<th className={`${TH} text-right`}>Duração</th>
											<th className={`${TH} text-left`}>Contato</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-border">
										{dados.sessoes.map(s => (
											<tr key={s.session_id} className={`hover:bg-background-soft/60 ${aberta === s.session_id ? 'bg-background-soft' : ''}`}>
												<td className={TD}>
													<button type="button" onClick={() => setAberta(s.session_id)} className="tabular-nums hover:underline">
														{dataHora(s.started_at)}
													</button>
												</td>
												<td className={TD}>
													<Badge cor={s.cor_canal}>{s.rotulo_canal}</Badge>
												</td>
												<td className={`${TD} max-w-[220px]`}>
													<div className="truncate">
														{s.rotulo_fonte} <span className="text-foreground-secondary">/ {s.meio}</span>
													</div>
													{crus && (s.utm_source || s.utm_medium || s.gclid || s.fbclid || s.ttclid) && (
														<div className={`${CRU} truncate`} title={crusDe(s)}>
															{crusDe(s)}
														</div>
													)}
												</td>
												<td className={`${TD} max-w-[200px]`}>
													{s.chave_campanha ? (
														<Link href={`/admin/visitors/campanha/${encodeURIComponent(s.chave_campanha)}`} className="block truncate hover:underline" title={s.campanha}>
															{s.campanha}
														</Link>
													) : (
														<span className="text-foreground-secondary">—</span>
													)}
													{crus && (s.utm_content || s.utm_term) && (
														<div className={`${CRU} truncate`} title={[s.utm_content, s.utm_term].filter(Boolean).join(' / ')}>
															{[s.utm_content, s.utm_term].filter(Boolean).join(' / ')}
														</div>
													)}
												</td>
												<td className={`${TD} max-w-[160px] truncate font-mono text-xs`} title={s.referrer_domain ?? ''}>
													{s.referrer_domain?.replace(/^www\./, '') || <span className="text-foreground-secondary font-sans">—</span>}
												</td>
												<td className={`${TD} max-w-[200px] truncate`} title={s.entrada ?? ''}>
													{s.entrada_veiculo ? nomeDoSlug(s.entrada_veiculo) : s.entrada === '/' ? 'Home' : (s.entrada ?? '—')}
												</td>
												<td className={`${TD} max-w-[160px] truncate`}>{[s.city, s.region].filter(Boolean).join(' · ') || '—'}</td>
												<td className={TD}>{s.device_type ? (APARELHO[s.device_type] ?? s.device_type) : '—'}</td>
												<td className={`${TD} text-right tabular-nums`}>{s.veiculos || '—'}</td>
												<td className={`${TD} text-right tabular-nums text-foreground-secondary`}>{fmtDuracao(s.duration_seconds)}</td>
												<td className={TD}>
													{s.contacted_whatsapp && <Badge cor="bg-emerald-500/10 text-emerald-500">WhatsApp</Badge>}{' '}
													{s.submitted_form && <Badge cor="bg-blue-500/10 text-blue-500">Formulário</Badge>}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
							<div className="flex items-center justify-between gap-3 border-t border-border px-4 py-2 text-sm text-foreground-secondary">
								<span>
									Página {dados.pagina} de {dados.paginas}
								</span>
								<div className="flex gap-2">
									<button type="button" disabled={dados.pagina <= 1} onClick={() => definir({ pagina: pagina - 1 })} className="rounded border border-border px-3 py-1 disabled:opacity-40">
										Anterior
									</button>
									<button type="button" disabled={dados.pagina >= dados.paginas} onClick={() => definir({ pagina: pagina + 1 })} className="rounded border border-border px-3 py-1 disabled:opacity-40">
										Próxima
									</button>
								</div>
							</div>
						</>
					)}
				</Secao>
			)}

			{aberta && <DetalheSessao key={aberta} sessionId={aberta} onFechar={() => setAberta(null)} />}

			<PrimeiraUltima dias={dias} />
		</div>
	)
}

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

const CAMPO = 'rounded-lg border border-border bg-background-card px-2.5 py-1.5 text-sm text-foreground'

/**
 * Campo de texto que só aplica o filtro no Enter ou ao sair — aplicar a cada
 * tecla recarregaria a lista a cada letra. Componente de topo (não criado
 * dentro do render): recriado a cada render, o input remontava e perdia o
 * foco no meio da digitação.
 */
function CampoTexto({
	chave,
	valor,
	placeholder,
	onChange,
}: {
	chave: ChaveFiltro
	valor: string
	placeholder: string
	onChange: (m: Record<string, string | undefined>) => void
}) {
	return (
		<input
			key={`${chave}:${valor}`}
			type="text"
			defaultValue={valor}
			placeholder={placeholder}
			onKeyDown={e => {
				if (e.key === 'Enter') onChange({ [chave]: (e.target as HTMLInputElement).value })
			}}
			onBlur={e => {
				if (e.target.value !== valor) onChange({ [chave]: e.target.value })
			}}
			className={`${CAMPO} w-40`}
			aria-label={placeholder}
		/>
	)
}

function Filtros({ filtros, onChange }: { filtros: Partial<Record<ChaveFiltro, string>>; onChange: (m: Record<string, string | undefined>) => void }) {
	const campo = CAMPO
	const ativos = Object.entries(filtros)
	return (
		<div className="space-y-2">
			<div className="flex flex-wrap items-center gap-2">
				<select value={filtros.canal ?? ''} onChange={e => onChange({ canal: e.target.value })} className={campo} aria-label="Canal">
					<option value="">Todos os canais</option>
					{CANAIS_ORDEM.map(c => (
						<option key={c} value={c}>
							{CANAL_ROTULOS[c]}
						</option>
					))}
				</select>
				<CampoTexto chave="fonte" valor={filtros.fonte ?? ''} placeholder="Fonte (google, meta…)" onChange={onChange} />
				<CampoTexto chave="meio" valor={filtros.meio ?? ''} placeholder="Meio (cpc, bio…)" onChange={onChange} />
				<CampoTexto chave="campanha" valor={filtros.campanha ?? ''} placeholder="Campanha" onChange={onChange} />
				<CampoTexto chave="referrer" valor={filtros.referrer ?? ''} placeholder="Referenciador" onChange={onChange} />
				<CampoTexto chave="entrada" valor={filtros.entrada ?? ''} placeholder="Página de entrada" onChange={onChange} />
				<select value={filtros.conversao ?? ''} onChange={e => onChange({ conversao: e.target.value })} className={campo} aria-label="Conversão">
					<option value="">Com ou sem contato</option>
					<option value="qualquer">Com contato</option>
					<option value="whatsapp">Clicou no WhatsApp</option>
					<option value="formulario">Enviou formulário</option>
					<option value="nenhuma">Sem contato</option>
				</select>
				<select value={filtros.problema ?? ''} onChange={e => onChange({ problema: e.target.value })} className={campo} aria-label="Problema de marcação">
					<option value="">Qualquer marcação</option>
					{Object.entries(ROTULO_PROBLEMA).map(([k, v]) => (
						<option key={k} value={k}>
							{v}
						</option>
					))}
				</select>
			</div>
			{ativos.length > 0 && (
				<div className="flex flex-wrap items-center gap-1.5 text-xs">
					{ativos.map(([k, v]) => (
						<button
							key={k}
							type="button"
							onClick={() => onChange({ [k]: undefined })}
							className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-foreground-secondary hover:text-foreground"
							title="Remover filtro"
						>
							<span className="font-mono">{k}</span>={k === 'problema' ? ROTULO_PROBLEMA[v] ?? v : v}
							<X className="w-3 h-3" />
						</button>
					))}
					<button type="button" onClick={() => onChange(Object.fromEntries(CHAVES_FILTRO.map(k => [k, undefined])))} className="text-primary hover:underline">
						limpar tudo
					</button>
				</div>
			)}
		</div>
	)
}

interface Detalhe {
	session_summary: Record<string, unknown> & {
		session_id: string
		session_start: string
		duration_seconds: number | null
		city: string | null
		region: string | null
		first_page_url: string
		referrer_url: string | null
		utm_source: string | null
		utm_medium: string | null
		utm_campaign: string | null
		utm_content: string | null
		utm_term: string | null
		gclid: string | null
		fbclid: string | null
		ttclid: string | null
		page_views_count: number
	}
	navigation_timeline: {
		page_path: string
		page_title: string | null
		viewed_at: string
		time_on_page_seconds: number | null
		scroll_depth_percent: number | null
		clicked_whatsapp: boolean
		clicked_phone: boolean
		clicked_form: boolean
		vehicle_brand: string | null
		vehicle_model: string | null
	}[]
	likely_origin: { origin: string; confidence: string }
}

function DetalheSessao({ sessionId, onFechar }: { sessionId: string; onFechar: () => void }) {
	const [detalhe, setDetalhe] = useState<Detalhe | null>(null)
	const [erro, setErro] = useState<string | null>(null)

	// Sem reset aqui: o pai monta este componente com `key={sessionId}`, então
	// trocar de sessão remonta o estado do zero.
	useEffect(() => {
		let ativo = true
		fetch(`/api/admin/visitors/session-explore?session_id=${encodeURIComponent(sessionId)}`)
			.then(async r => {
				if (!r.ok) throw new Error(`HTTP ${r.status}`)
				const j = await r.json()
				if (ativo) setDetalhe(j.data as Detalhe)
			})
			.catch(e => {
				console.error('[Sessoes] detalhe falhou:', e)
				if (ativo) setErro('Não foi possível abrir a sessão.')
			})
		return () => {
			ativo = false
		}
	}, [sessionId])

	const s = detalhe?.session_summary
	const crusLinhas = s
		? (
				[
					['utm_source', s.utm_source],
					['utm_medium', s.utm_medium],
					['utm_campaign', s.utm_campaign],
					['utm_content', s.utm_content],
					['utm_term', s.utm_term],
					['gclid', s.gclid],
					['fbclid', s.fbclid],
					['ttclid', s.ttclid],
					['referrer', s.referrer_url],
					['primeira url', s.first_page_url],
				] as [string, string | null][]
			).filter(([, v]) => v)
		: []

	return (
		<Secao
			titulo={`Sessão ${sessionId}`}
			dica="Linha do tempo da sessão: cada página aberta, quanto tempo ficou, até onde rolou e onde clicou. Os valores crus de marcação são os que chegaram na URL da primeira página."
			acessorio={
				<button type="button" onClick={onFechar} className="inline-flex items-center gap-1 text-xs text-foreground-secondary hover:text-foreground">
					<X className="w-3.5 h-3.5" /> fechar
				</button>
			}
		>
			{erro && <Erro>{erro}</Erro>}
			{!detalhe && !erro && <Vazio>Carregando…</Vazio>}
			{detalhe && s && (
				<div className="space-y-4 p-4">
					<div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
						<span>
							<span className="text-foreground-secondary">Início:</span> {dataHora(s.session_start)}
						</span>
						<span>
							<span className="text-foreground-secondary">Duração:</span> {fmtDuracao(s.duration_seconds)}
						</span>
						<span>
							<span className="text-foreground-secondary">Local:</span> {[s.city, s.region].filter(Boolean).join(' · ') || '—'}
						</span>
						<span>
							<span className="text-foreground-secondary">Páginas:</span> {s.page_views_count}
						</span>
						<span>
							<span className="text-foreground-secondary">Origem provável:</span> {detalhe.likely_origin.origin}
						</span>
					</div>
					{crusLinhas.length > 0 && (
						<dl className="grid gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
							{crusLinhas.map(([k, v]) => (
								<div key={k} className="flex gap-2 min-w-0">
									<dt className="shrink-0 text-foreground-secondary">{k}</dt>
									<dd className={`${CRU} truncate`} title={v ?? ''}>
										{v}
									</dd>
								</div>
							))}
						</dl>
					)}
					<ol className="divide-y divide-border rounded-lg border border-border">
						{detalhe.navigation_timeline.map((p, i) => (
							<li key={`${p.viewed_at}-${i}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 text-sm">
								<span className="w-12 shrink-0 tabular-nums text-foreground-secondary">
									{new Date(p.viewed_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}
								</span>
								<span className="min-w-0 flex-1 truncate" title={p.page_path}>
									{p.vehicle_brand || p.vehicle_model ? [p.vehicle_brand, p.vehicle_model].filter(Boolean).join(' ') : (p.page_title ?? p.page_path)}
									<span className="ml-2 font-mono text-[11px] text-foreground-secondary">{p.page_path}</span>
								</span>
								<span className="shrink-0 text-xs text-foreground-secondary tabular-nums">
									{p.time_on_page_seconds !== null ? `${p.time_on_page_seconds}s` : '—'}
									{p.scroll_depth_percent !== null && ` · ${p.scroll_depth_percent}%`}
								</span>
								<span className="shrink-0">
									{p.clicked_whatsapp && <Badge cor="bg-emerald-500/10 text-emerald-500">WhatsApp</Badge>}{' '}
									{p.clicked_phone && <Badge cor="bg-sky-500/10 text-sky-500">Telefone</Badge>}{' '}
									{p.clicked_form && <Badge cor="bg-blue-500/10 text-blue-500">Formulário</Badge>}
								</span>
							</li>
						))}
					</ol>
				</div>
			)}
		</Secao>
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
							<div className="overflow-x-auto">
								<table className="w-full">
									<thead className="bg-background-soft">
										<tr>
											<th className={`${TH} text-left`}>Converteu em</th>
											<th className={`${TH} text-left`}>Primeira visita</th>
											<th className={`${TH} text-left`}>Sessão da conversão</th>
											<th className={`${TH} text-right`}>Dias</th>
											<th className={`${TH} text-right`}>Sessões</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-border">
										{dados.jornadas.map(j => (
											<tr key={j.fingerprint_id} className="hover:bg-background-soft/60">
												<td className={`${TD} tabular-nums`}>
													<Link href={`/admin/visitors/sessoes?sessao=${encodeURIComponent(j.conversao.session_id)}&dias=0`} className="hover:underline">
														{dataHora(j.conversao.started_at)}
													</Link>
												</td>
												<td className={TD}>
													<Badge cor={j.primeira.cor_canal}>{j.primeira.rotulo_canal}</Badge>
													<span className="ml-2 text-xs text-foreground-secondary">
														{j.primeira.rotulo_fonte}
														{j.primeira.campanha !== '(sem campanha)' && ` · ${j.primeira.campanha}`}
													</span>
												</td>
												<td className={TD}>
													<Badge cor={j.conversao.cor_canal}>{j.conversao.rotulo_canal}</Badge>
													<span className="ml-2 text-xs text-foreground-secondary">
														{j.conversao.rotulo_fonte}
														{j.conversao.campanha !== '(sem campanha)' && ` · ${j.conversao.campanha}`}
													</span>
												</td>
												<td className={`${TD} text-right tabular-nums`}>{j.dias}</td>
												<td className={`${TD} text-right tabular-nums`}>{j.sessoes}</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</>
					)}
				</div>
			)}
		</Secao>
	)
}
