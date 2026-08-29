'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, MessageCircle, Phone, FileText, Volume2 } from 'lucide-react'
import type { CanalTrafego } from '@/lib/traffic-channel'
import { papeisDaPlataforma, plataformaDaMarcacao } from '@/lib/visitors/marcacao-plataforma'
import { Secao } from '../../visitors-tabelas'
import { fmtDuracao, nomeDoSlug } from '../../visitors-metrics'
import { Badge, CRU, Erro, Vazio } from '../../visitors-ui'

interface Pagina {
	page_path: string
	page_title: string | null
	page_type: string | null
	viewed_at: string
	time_on_page_seconds: number | null
	scroll_depth_percent: number | null
	clicked_whatsapp: boolean
	clicked_phone: boolean
	clicked_form: boolean
	played_engine_sound: boolean
	vehicle_brand: string | null
	vehicle_model: string | null
}

interface OutraSessao {
	session_id: string
	started_at: string
	duration_seconds: number | null
	cidade: string | null
	canal: CanalTrafego
	rotulo_canal: string
	cor_canal: string
	rotulo_fonte: string
	campanha: string
	page_views_count: number
	contacted_whatsapp: boolean
	submitted_form: boolean
	atual: boolean
}

interface Dados {
	session_summary: {
		session_id: string
		session_start: string
		session_end: string | null
		duration_seconds: number | null
		city: string | null
		region: string | null
		country_code: string | null
		first_page_url: string
		referrer_url: string | null
		referrer_domain: string | null
		utm_source: string | null
		utm_medium: string | null
		utm_campaign: string | null
		utm_content: string | null
		utm_term: string | null
		gclid: string | null
		fbclid: string | null
		ttclid: string | null
		page_views_count: number
		vehicles_viewed: number
		contacted_whatsapp: boolean
		submitted_form: boolean
		used_calculator: boolean
	}
	navigation_timeline: Pagina[]
	events: { type: string; event_type?: string; event_name?: string; created_at: string; page_path?: string }[]
	outras_sessoes: OutraSessao[]
	veiculos: { slug: string; marca: string | null; modelo: string | null }[]
	likely_origin: { origin: string; confidence: string }
}

function dataHora(iso: string | null): string {
	if (!iso) return '—'
	const d = new Date(iso)
	if (Number.isNaN(d.getTime())) return '—'
	return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' })
}

function hora(iso: string): string {
	const d = new Date(iso)
	if (Number.isNaN(d.getTime())) return '—'
	return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
}

export function SessaoDetalhe({ sessionId }: { sessionId: string }) {
	const router = useRouter()
	const [dados, setDados] = useState<Dados | null>(null)
	const [erro, setErro] = useState<string | null>(null)

	useEffect(() => {
		let ativo = true
		fetch(`/api/admin/visitors/session-explore?session_id=${encodeURIComponent(sessionId)}`)
			.then(async r => {
				if (r.status === 404) throw new Error('nao-encontrada')
				if (!r.ok) throw new Error(`HTTP ${r.status}`)
				const j = await r.json()
				if (ativo) setDados(j.data as Dados)
			})
			.catch(e => {
				console.error('[Sessão] falha:', e)
				if (ativo) setErro(e.message === 'nao-encontrada' ? 'Sessão não encontrada.' : 'Não foi possível carregar a sessão.')
			})
		return () => {
			ativo = false
		}
	}, [sessionId])

	const s = dados?.session_summary
	// utm_content/utm_term significam coisas diferentes por plataforma: na Meta
	// são conjunto e anúncio; no Google, criativo e palavra-chave buscada.
	const papeis = papeisDaPlataforma(s ? plataformaDaMarcacao(s) : 'outra')
	const marcacao = s
		? ([
				['utm_source', s.utm_source],
				['utm_medium', s.utm_medium],
				['utm_campaign', s.utm_campaign],
				[`utm_content · ${papeis.conteudo.titulo}`, s.utm_content],
				[`utm_term · ${papeis.termo.titulo}`, s.utm_term],
				['gclid', s.gclid],
				['fbclid', s.fbclid],
				['ttclid', s.ttclid],
				['referrer', s.referrer_url ?? s.referrer_domain],
				['primeira URL', s.first_page_url],
			] as [string, string | null][])
		: []
	const preenchidos = marcacao.filter(([, v]) => v)

	return (
		<div className="space-y-6">
			<header className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<button
						type="button"
						onClick={() => router.back()}
						className="inline-flex items-center gap-1 text-xs text-foreground-secondary hover:text-foreground"
					>
						<ArrowLeft className="w-3.5 h-3.5" /> voltar para a lista
					</button>
					<h1 className="mt-1 text-2xl font-semibold text-foreground">
						Sessão de {s ? dataHora(s.session_start) : '…'}
					</h1>
					<p className={`${CRU} mt-1`}>{sessionId}</p>
				</div>
			</header>

			{erro && <Erro>{erro}</Erro>}
			{!dados && !erro && <Vazio>Carregando…</Vazio>}

			{dados && s && (
				<>
					<div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
						<Dado rotulo="Origem provável" valor={dados.likely_origin.origin} />
						<Dado rotulo="Local" valor={[s.city, s.region].filter(Boolean).join(' · ') || '—'} />
						<Dado rotulo="Páginas" valor={String(s.page_views_count)} />
						<Dado rotulo="Veículos abertos" valor={String(dados.veiculos.length)} />
						<Dado rotulo="Duração" valor={fmtDuracao(s.duration_seconds)} />
						<Dado
							rotulo="Contato"
							valor={s.contacted_whatsapp ? 'WhatsApp' : s.submitted_form ? 'Formulário' : '—'}
							destaque={s.contacted_whatsapp || s.submitted_form}
						/>
					</div>

					<div className="grid gap-6 xl:grid-cols-2">
						<Secao
							titulo="Marcação que chegou na URL"
							dica="Os parâmetros exatos com que esta visita entrou. É o que o painel usa para classificar canal, fonte e campanha — e é aqui que se confere se o anúncio está marcado como deveria."
						>
							{preenchidos.length === 0 ? (
								<Vazio>Nenhum parâmetro: visita direta, ou o navegador não informou a origem.</Vazio>
							) : (
								<dl className="divide-y divide-border">
									{preenchidos.map(([k, v]) => (
										<div key={k} className="flex gap-3 px-4 py-2 text-sm">
											<dt className="w-28 shrink-0 text-foreground-secondary">{k}</dt>
											<dd className={`${CRU} min-w-0 break-all`}>{v}</dd>
										</div>
									))}
								</dl>
							)}
						</Secao>

						<Secao
							titulo="Veículos abertos nesta visita"
							dica="Fichas de veículo que esta sessão abriu, sem repetir o mesmo carro."
						>
							{dados.veiculos.length === 0 ? (
								<Vazio>Nenhuma ficha de veículo aberta.</Vazio>
							) : (
								<ul className="divide-y divide-border">
									{dados.veiculos.map(v => (
										<li key={v.slug} className="px-4 py-2 text-sm">
											<a
												href={`https://attraveiculos.com.br/veiculo/${v.slug}`}
												target="_blank"
												rel="noopener noreferrer"
												className="hover:underline"
											>
												{[v.marca, v.modelo].filter(Boolean).join(' ') || nomeDoSlug(v.slug)}
											</a>
										</li>
									))}
								</ul>
							)}
						</Secao>
					</div>

					<Secao
						titulo={`Jornada da visita — ${dados.navigation_timeline.length} páginas`}
						dica="Cada página aberta na ordem, com o tempo de leitura, até onde a pessoa rolou e onde clicou. É a leitura de como a visita andou até (ou sem) virar conversa."
					>
						{dados.navigation_timeline.length === 0 ? (
							<Vazio>Nenhuma página registrada nesta sessão.</Vazio>
						) : (
							<ol className="divide-y divide-border">
								{dados.navigation_timeline.map((p, i) => (
									<li key={`${p.viewed_at}-${i}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 text-sm">
										<span className="w-12 shrink-0 tabular-nums text-foreground-secondary">{hora(p.viewed_at)}</span>
										<span className="min-w-0 flex-1">
											<span className="block truncate">
												{p.vehicle_brand || p.vehicle_model
													? [p.vehicle_brand, p.vehicle_model].filter(Boolean).join(' ')
													: (p.page_title ?? p.page_path)}
											</span>
											<span className={`${CRU} block truncate`}>{p.page_path}</span>
										</span>
										<span className="shrink-0 text-xs tabular-nums text-foreground-secondary">
											{p.time_on_page_seconds !== null ? `${p.time_on_page_seconds}s` : '—'}
											{p.scroll_depth_percent !== null && ` · rolou ${p.scroll_depth_percent}%`}
										</span>
										<span className="flex shrink-0 gap-1">
											{p.clicked_whatsapp && (
												<Badge cor="bg-emerald-500/10 text-emerald-500">
													<MessageCircle className="mr-1 inline w-3 h-3" />
													WhatsApp
												</Badge>
											)}
											{p.clicked_phone && (
												<Badge cor="bg-sky-500/10 text-sky-500">
													<Phone className="mr-1 inline w-3 h-3" />
													Telefone
												</Badge>
											)}
											{p.clicked_form && (
												<Badge cor="bg-blue-500/10 text-blue-500">
													<FileText className="mr-1 inline w-3 h-3" />
													Formulário
												</Badge>
											)}
											{p.played_engine_sound && (
												<Badge cor="bg-violet-500/10 text-violet-500">
													<Volume2 className="mr-1 inline w-3 h-3" />
													Som
												</Badge>
											)}
										</span>
									</li>
								))}
							</ol>
						)}
					</Secao>

					<Secao
						titulo={`Outras visitas desta mesma pessoa — ${dados.outras_sessoes.length}`}
						dica="Todas as sessões do mesmo aparelho, da primeira à última. É aqui que se vê o que trouxe a pessoa pela primeira vez, mesmo quando a conversa aconteceu semanas depois numa visita direta."
					>
						{dados.outras_sessoes.length <= 1 ? (
							<Vazio>Esta é a única visita registrada desta pessoa.</Vazio>
						) : (
							<ul className="divide-y divide-border">
								{dados.outras_sessoes.map((o, i) => (
									<li
										key={o.session_id}
										className={`flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm ${o.atual ? 'bg-background-soft' : ''}`}
									>
										<span className="w-6 shrink-0 text-xs tabular-nums text-foreground-secondary">{i + 1}º</span>
										{o.atual ? (
											<span className="tabular-nums font-medium">{dataHora(o.started_at)}</span>
										) : (
											<Link
												href={`/admin/visitors/sessoes/${encodeURIComponent(o.session_id)}`}
												className="tabular-nums hover:underline"
											>
												{dataHora(o.started_at)}
											</Link>
										)}
										<Badge cor={o.cor_canal}>{o.rotulo_canal}</Badge>
										<span className="text-xs text-foreground-secondary">
											{o.rotulo_fonte}
											{o.campanha !== '(sem campanha)' && ` · ${o.campanha}`}
										</span>
										<span className="text-xs tabular-nums text-foreground-secondary">
											{o.page_views_count} pág. · {fmtDuracao(o.duration_seconds)}
										</span>
										{o.cidade && <span className="text-xs text-foreground-secondary">{o.cidade}</span>}
										{o.contacted_whatsapp && <Badge cor="bg-emerald-500/10 text-emerald-500">WhatsApp</Badge>}
										{o.submitted_form && <Badge cor="bg-blue-500/10 text-blue-500">Formulário</Badge>}
										{o.atual && <span className="text-xs text-primary">esta visita</span>}
									</li>
								))}
							</ul>
						)}
					</Secao>
				</>
			)}
		</div>
	)
}

function Dado({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
	return (
		<div className={`rounded-xl border bg-background-card px-4 py-3 ${destaque ? 'border-emerald-500/40' : 'border-border'}`}>
			<div className="text-[11px] uppercase tracking-wide text-foreground-secondary">{rotulo}</div>
			<div className={`mt-1 truncate text-base font-semibold ${destaque ? 'text-emerald-500' : 'text-foreground'}`} title={valor}>
				{valor}
			</div>
		</div>
	)
}
