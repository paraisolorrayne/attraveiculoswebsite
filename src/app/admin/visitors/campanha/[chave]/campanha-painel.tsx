'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import type { CanalTrafego } from '@/lib/traffic-channel'
import { papeisDaPlataforma, plataformaDominante } from '@/lib/visitors/marcacao-plataforma'
import { Secao } from '../../visitors-tabelas'
import { fmtDuracao, fmtNum, fmtPct, nomeDoSlug, taxa } from '../../visitors-metrics'
import { Badge, BarraControles, CRU, ConteudoVolume, Erro, Vazio, diaCurto, useValoresCrus } from '../../visitors-ui'
import { TabelaOrdenavel } from '../../visitors-tabela'

interface Dimensao {
	valor: string
	sessoes: number
	whatsapp: number
	formularios: number
}

interface Dados {
	chave: string
	rotulo: string
	grafias: string[]
	periodo: { dias: number; desde: string | null }
	resumo: {
		sessoes: number
		visitantes: number
		whatsapp: number
		formularios: number
		sessoes_com_veiculo: number
		primeira: string | null
		ultima: string | null
		duracao_media_segundos: number | null
	} | null
	canais: { canal: CanalTrafego; rotulo: string; cor: string; sessoes: number }[]
	fontes: { fonte: string; rotulo: string; sessoes: number }[]
	por_dia: { dia: string; sessoes: number; whatsapp: number }[]
	conteudos: Dimensao[]
	termos: Dimensao[]
	grupos_anuncio: Dimensao[]
	entradas: { page_path: string; vehicle_slug: string | null; sessoes: number; whatsapp: number }[]
	veiculos: { slug: string; marca: string | null; modelo: string | null; sessoes: number; whatsapp: number }[]
	cidades: { cidade: string; regiao: string | null; sessoes: number; whatsapp: number }[]
	contexto: { dimensao: string; valor: string; valor_cru: string | null; sessoes: number; whatsapp: number }[]
	leads: {
		session_id: string
		started_at: string
		city: string | null
		region: string | null
		utm_source: string | null
		utm_medium: string | null
		utm_content: string | null
		utm_term: string | null
		entrada: string | null
		veiculos: string[] | null
		contacted_whatsapp: boolean
		submitted_form: boolean
	}[]
}

const TITULO_DIMENSAO: Record<string, string> = {
	device: 'Dispositivo (plataforma)',
	match_type: 'Correspondência',
	network: 'Rede',
}

function dataHora(iso: string | null): string {
	if (!iso) return '—'
	const d = new Date(iso)
	if (Number.isNaN(d.getTime())) return '—'
	return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' })
}

export function CampanhaPainel({ chave }: { chave: string }) {
	const [dados, setDados] = useState<Dados | null>(null)
	const [dias, setDias] = useState(30)
	const [carregando, setCarregando] = useState(true)
	const [erro, setErro] = useState<string | null>(null)
	const [crus, setCrus] = useValoresCrus()

	const carregar = useCallback(async () => {
		setCarregando(true)
		setErro(null)
		try {
			const r = await fetch(`/api/admin/visitors/campanha?chave=${encodeURIComponent(chave)}&dias=${dias}`)
			if (!r.ok) throw new Error(`HTTP ${r.status}`)
			setDados(await r.json())
		} catch (e) {
			console.error('[Campanha] falha ao carregar:', e)
			setErro('Não foi possível carregar a campanha.')
		} finally {
			setCarregando(false)
		}
	}, [chave, dias])

	useEffect(() => {
		carregar()
	}, [carregar])

	const r = dados?.resumo
	const sessoes = r?.sessoes ?? 0
	// O mesmo utm_content é "conjunto" na Meta e "criativo" no Google; sem isso
	// a tela dizia "Criativos" para o que é conjunto de anúncios.
	const plataforma = plataformaDominante(dados?.fontes.map(f => ({ fonte: f.fonte, sessoes: f.sessoes })) ?? [])
	const papeis = papeisDaPlataforma(plataforma)

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div>
					<h2 className="text-xl font-semibold text-foreground">{dados?.rotulo ?? chave}</h2>
					{dados && dados.grafias.length > 1 && (
						<p className={`${CRU} mt-1`} title="Grafias com que esta campanha chegou">
							também como: {dados.grafias.slice(1).join(' · ')}
						</p>
					)}
					{dados && r && (
						<p className="mt-1 text-xs text-foreground-secondary">
							Primeira sessão {dataHora(r.primeira)} · última {dataHora(r.ultima)}
						</p>
					)}
				</div>
				<BarraControles dias={dias} onDias={setDias} carregando={carregando} onAtualizar={carregar} crus={crus} onCrus={setCrus} />
			</div>

			{erro && <Erro>{erro}</Erro>}

			{dados && r && sessoes === 0 && <Vazio>Nenhuma sessão desta campanha no período.</Vazio>}

			{dados && r && sessoes > 0 && (
				<>
					<div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
						<Kpi rotulo="Sessões" valor={fmtNum(r.sessoes)} />
						<Kpi rotulo="Visitantes" valor={fmtNum(r.visitantes)} />
						<Kpi rotulo="Viram veículo" valor={`${fmtNum(r.sessoes_com_veiculo)} · ${fmtPct(taxa(r.sessoes_com_veiculo, r.sessoes), 0)}`} />
						<Kpi rotulo="Cliques no WhatsApp" valor={fmtNum(r.whatsapp)} />
						<Kpi rotulo="Taxa de conversão" valor={fmtPct(taxa(r.whatsapp, r.sessoes))} destaque />
						<Kpi rotulo="Formulários" valor={fmtNum(r.formularios)} />
					</div>

					<div className="flex flex-wrap gap-2">
						{dados.canais.map(c => (
							<span key={c.canal} className="inline-flex items-center gap-1.5 text-xs text-foreground-secondary">
								<Badge cor={c.cor}>{c.rotulo}</Badge>
								{fmtPct(taxa(c.sessoes, sessoes), 0)}
							</span>
						))}
						<span className="text-xs text-foreground-secondary">
							· fontes: {dados.fontes.map(f => `${f.rotulo} ${fmtPct(taxa(f.sessoes, sessoes), 0)}`).join(', ')}
						</span>
						{r.duracao_media_segundos !== null && (
							<span className="text-xs text-foreground-secondary">· duração média {fmtDuracao(r.duracao_media_segundos)}</span>
						)}
					</div>

					<PorDia pontos={dados.por_dia} />

					<div className="grid gap-6 xl:grid-cols-2">
						<TabelaDimensao
							titulo={`${papeis.conteudo.titulo} — utm_content`}
							dica={`${papeis.conteudo.dica} Compare a conversão entre eles, não o volume.`}
							linhas={dados.conteudos}
							total={sessoes}
							crus={crus}
						/>
						<TabelaDimensao
							titulo={`${papeis.termo.titulo} — utm_term`}
							dica={`${papeis.termo.dica} '(sem utm_term)' numa campanha de busca indica modelo de rastreamento sem {keyword}.`}
							linhas={dados.termos}
							total={sessoes}
							crus={crus}
						/>
						{/* Só aparece quando o link traz o ID: com o padrão de nomes da Meta,
						    o conjunto vem em utm_content e este bloco seria uma coluna
						    inteira de "(sem grupo)". */}
						{dados.grupos_anuncio.some(g => g.valor !== '(sem grupo)') && (
							<TabelaDimensao
								titulo={`${papeis.grupo.titulo} — adset_id`}
								dica={papeis.grupo.dica}
								linhas={dados.grupos_anuncio}
								total={sessoes}
								crus={crus}
							/>
						)}
						<Lista
							titulo="Páginas de entrada"
							dica="Onde as visitas desta campanha caíram. Anúncio de carro específico deveria cair na ficha dele."
							linhas={dados.entradas.map(e => ({ chave: e.page_path, rotulo: e.vehicle_slug ? nomeDoSlug(e.vehicle_slug) : e.page_path === '/' ? 'Home' : e.page_path, cru: e.page_path, sessoes: e.sessoes, whatsapp: e.whatsapp }))}
							total={sessoes}
							crus={crus}
						/>
						<Lista
							titulo="Veículos abertos"
							dica="Fichas de veículo abertas por sessões desta campanha (uma sessão conta uma vez por carro)."
							linhas={dados.veiculos.map(v => ({ chave: v.slug, rotulo: [v.marca, v.modelo].filter(Boolean).join(' ') || nomeDoSlug(v.slug), cru: v.slug, sessoes: v.sessoes, whatsapp: v.whatsapp }))}
							total={sessoes}
							crus={crus}
						/>
						<Lista
							titulo="Cidades"
							dica="Cidade da sessão pelo IP. Útil para conferir se a segmentação geográfica da campanha está valendo."
							linhas={dados.cidades.map(c => ({ chave: c.cidade, rotulo: c.regiao ? `${c.cidade} · ${c.regiao}` : c.cidade, cru: c.cidade, sessoes: c.sessoes, whatsapp: c.whatsapp }))}
							total={sessoes}
							crus={crus}
						/>
					</div>

					<Contexto linhas={dados.contexto} total={sessoes} crus={crus} />
					<Leads leads={dados.leads} crus={crus} />
				</>
			)}
		</div>
	)
}

function Kpi({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
	return (
		<div className={`rounded-xl border bg-background-card px-4 py-3 ${destaque ? 'border-primary/40' : 'border-border'}`}>
			<div className="text-[11px] uppercase tracking-wide text-foreground-secondary">{rotulo}</div>
			<div className={`mt-1 text-xl font-semibold tabular-nums ${destaque ? 'text-primary' : 'text-foreground'}`}>{valor}</div>
		</div>
	)
}

function PorDia({ pontos }: { pontos: { dia: string; sessoes: number; whatsapp: number }[] }) {
	const maximo = Math.max(1, ...pontos.map(p => p.sessoes))
	const W = 1000
	const H = 160
	const base = H - 24
	const largura = pontos.length ? W / pontos.length : 0
	const passo = Math.max(1, Math.ceil(pontos.length / 12))
	return (
		<Secao titulo="Sessões por dia" dica="Cada barra é um dia (fuso de Brasília); o número em cima é a contagem de cliques no WhatsApp naquele dia.">
			{pontos.length === 0 ? (
				<Vazio>Sem sessões.</Vazio>
			) : (
				<div className="overflow-x-auto p-4">
					<svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[640px] h-[160px]" role="img" aria-label="Sessões por dia">
						{pontos.map((p, i) => {
							const h = (p.sessoes / maximo) * (base - 16)
							const x = i * largura
							return (
								<g key={p.dia}>
									<title>{`${diaCurto(p.dia)}: ${p.sessoes} sessões, ${p.whatsapp} WhatsApp`}</title>
									<rect x={x + 1} y={base - h} width={Math.max(1, largura - 2)} height={h} className="fill-primary/70" />
									{p.whatsapp > 0 && (
										<text x={x + largura / 2} y={base - h - 4} textAnchor="middle" fontSize="10" className="fill-foreground">
											{p.whatsapp}
										</text>
									)}
									{i % passo === 0 && (
										<text x={x + largura / 2} y={H - 6} textAnchor="middle" fontSize="11" className="fill-foreground-secondary">
											{diaCurto(p.dia)}
										</text>
									)}
								</g>
							)
						})}
					</svg>
				</div>
			)}
		</Secao>
	)
}

function TabelaDimensao({ titulo, dica, linhas, total, crus }: { titulo: string; dica: string; linhas: Dimensao[]; total: number; crus: boolean }) {
	return (
		<Lista
			titulo={titulo}
			dica={dica}
			linhas={linhas.map(l => ({ chave: l.valor, rotulo: l.valor, cru: l.valor, sessoes: l.sessoes, whatsapp: l.whatsapp }))}
			total={total}
			crus={crus}
		/>
	)
}

function Lista({
	titulo,
	dica,
	linhas,
	total,
	crus,
}: {
	titulo: string
	dica: string
	linhas: { chave: string; rotulo: string; cru: string; sessoes: number; whatsapp: number }[]
	total: number
	crus: boolean
}) {
	const maior = Math.max(0, ...linhas.map(l => l.sessoes))
	return (
		<Secao titulo={titulo} dica={dica}>
			<TabelaOrdenavel
				colunas={[
					{
						chave: 'valor',
						titulo: 'Valor',
						filtro: 'texto',
						valor: l => `${l.rotulo} ${l.cru}`,
						classe: 'max-w-[320px]',
						render: l => (
							<>
								<div className="truncate" title={l.cru}>
									{l.rotulo}
								</div>
								{crus && l.cru !== l.rotulo && <div className={`${CRU} truncate`}>{l.cru}</div>}
							</>
						),
					},
					{
						chave: 'sessoes',
						titulo: 'Sessões',
						filtro: 'numero',
						valor: l => l.sessoes,
						classe: 'min-w-[140px]',
						render: l => <ConteudoVolume valor={l.sessoes} maximo={maior} total={total} />,
					},
					{
						chave: 'whatsapp',
						titulo: 'WhatsApp',
						filtro: 'numero',
						valor: l => l.whatsapp,
						alinhar: 'dir',
						classe: 'tabular-nums',
						render: l => fmtNum(l.whatsapp),
					},
					{
						chave: 'conversao',
						titulo: 'Conversão',
						filtro: 'numero',
						valor: l => taxa(l.whatsapp, l.sessoes),
						alinhar: 'dir',
						classe: 'tabular-nums',
						render: l => fmtPct(taxa(l.whatsapp, l.sessoes)),
					},
				]}
				linhas={linhas}
				chaveLinha={l => l.chave}
				vazio="Sem dados."
			/>
		</Secao>
	)
}

function Contexto({ linhas, total, crus }: { linhas: Dados['contexto']; total: number; crus: boolean }) {
	const dimensoes = ['device', 'match_type', 'network'].filter(d => linhas.some(l => l.dimensao === d && l.valor_cru))
	if (dimensoes.length === 0) return null
	return (
		<Secao
			titulo="Contexto do clique — Google Ads"
			dica="Dispositivo, tipo de correspondência e rede informados pela plataforma no clique (parâmetros device, matchtype e network do modelo de rastreamento). Só existe para sessões que trouxeram esses parâmetros."
		>
			<div className="grid gap-4 p-4 md:grid-cols-3">
				{dimensoes.map(d => (
					<div key={d}>
						<h3 className="mb-2 text-sm font-medium text-foreground">{TITULO_DIMENSAO[d] ?? d}</h3>
						<ul className="space-y-1">
							{linhas
								.filter(l => l.dimensao === d)
								.sort((a, b) => b.sessoes - a.sessoes)
								.map(l => (
									<li key={`${d}-${l.valor_cru ?? 'null'}`} className="flex items-center justify-between gap-2 text-sm">
										<span>
											{l.valor}
											{crus && l.valor_cru && <span className={`${CRU} ml-1`}>{l.valor_cru}</span>}
										</span>
										<span className="tabular-nums text-foreground-secondary">
											{fmtNum(l.sessoes)} · {fmtPct(taxa(l.sessoes, total), 0)} · {fmtPct(taxa(l.whatsapp, l.sessoes))} conv.
										</span>
									</li>
								))}
						</ul>
					</div>
				))}
			</div>
		</Secao>
	)
}

function Leads({ leads, crus }: { leads: Dados['leads']; crus: boolean }) {
	return (
		<Secao
			titulo={`Leads — ${leads.length} sessões que clicaram no WhatsApp ou enviaram formulário`}
			dica="As sessões desta campanha que viraram conversa, da mais recente para a mais antiga (até 100). Clique na sessão para abrir a jornada inteira."
		>
			<TabelaOrdenavel
				colunas={[
					{
						chave: 'quando',
						titulo: 'Quando',
						valor: l => l.started_at,
						classe: 'tabular-nums',
						render: l => (
							<Link href={`/admin/visitors/sessoes/${encodeURIComponent(l.session_id)}`} className="hover:underline">
								{dataHora(l.started_at)}
							</Link>
						),
					},
					{
						chave: 'cidade',
						titulo: 'Cidade',
						filtro: 'texto',
						valor: l => [l.city, l.region].filter(Boolean).join(' · '),
						render: l => [l.city, l.region].filter(Boolean).join(' · ') || '—',
					},
					{
						chave: 'entrada',
						titulo: 'Entrada',
						filtro: 'texto',
						valor: l => l.entrada,
						classe: 'max-w-[220px] truncate',
						render: l => <span title={l.entrada ?? ''}>{l.entrada ?? '—'}</span>,
					},
					{
						chave: 'veiculos',
						titulo: 'Veículos',
						filtro: 'texto',
						valor: l => (l.veiculos ?? []).join(' '),
						classe: 'max-w-[260px] truncate',
						render: l => (
							<span title={(l.veiculos ?? []).join(', ')}>{(l.veiculos ?? []).map(nomeDoSlug).join(', ') || '—'}</span>
						),
					},
					{
						chave: 'criativo',
						titulo: 'Criativo / termo',
						filtro: 'texto',
						valor: l => [l.utm_content, l.utm_term].filter(Boolean).join(' / '),
						classe: 'max-w-[240px]',
						render: l => (
							<>
								<div className="truncate" title={[l.utm_content, l.utm_term].filter(Boolean).join(' / ')}>
									{[l.utm_content, l.utm_term].filter(Boolean).join(' / ') || '—'}
								</div>
								{crus && <div className={`${CRU} truncate`}>{[l.utm_source, l.utm_medium].filter(Boolean).join(' / ')}</div>}
							</>
						),
					},
					{
						chave: 'contato',
						titulo: 'Contato',
						filtro: 'opcoes',
						valor: l => (l.contacted_whatsapp ? 'WhatsApp' : l.submitted_form ? 'Formulário' : '—'),
						render: l => (
							<>
								{l.contacted_whatsapp && <Badge cor="bg-emerald-500/10 text-emerald-500">WhatsApp</Badge>}{' '}
								{l.submitted_form && <Badge cor="bg-blue-500/10 text-blue-500">Formulário</Badge>}
							</>
						),
					},
				]}
				linhas={leads}
				chaveLinha={l => l.session_id}
				vazio="Nenhum lead desta campanha no período."
			/>
		</Secao>
	)
}
