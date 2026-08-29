'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { CANAIS_ORDEM, CANAL_ROTULOS, type CanalTrafego } from '@/lib/traffic-channel'
import type { LinhaFonteMeio, LinhaReferenciador, PontoTendencia, Problema } from '@/lib/visitors/origens'
import { Secao } from '../visitors-tabelas'
import { fmtNum, fmtPct, taxa } from '../visitors-metrics'
import {
	Badge,
	BarraControles,
	CANAL_HEX,
	ConteudoVolume,
	CRU,
	Erro,
	Vazio,
	diaCurto,
	useValoresCrus,
} from '../visitors-ui'
import { TabelaOrdenavel, type ColunaTabela } from '../visitors-tabela'

interface Dados {
	periodo: { dias: number; desde: string | null }
	total_sessoes: number
	fonte_meio: LinhaFonteMeio[]
	referenciadores: LinhaReferenciador[]
	auditoria: Problema[]
	tendencia: { dias: number; pontos: PontoTendencia[] }
}

export function OrigensPainel() {
	const [dados, setDados] = useState<Dados | null>(null)
	const [dias, setDias] = useState(30)
	const [carregando, setCarregando] = useState(true)
	const [erro, setErro] = useState<string | null>(null)
	const [crus, setCrus] = useValoresCrus()

	const carregar = useCallback(async () => {
		setCarregando(true)
		setErro(null)
		try {
			const r = await fetch(`/api/admin/visitors/origens?dias=${dias}`)
			if (!r.ok) throw new Error(`HTTP ${r.status}`)
			setDados(await r.json())
		} catch (e) {
			console.error('[Origens] falha ao carregar:', e)
			setErro('Não foi possível carregar as origens.')
		} finally {
			setCarregando(false)
		}
	}, [dias])

	useEffect(() => {
		carregar()
	}, [carregar])

	const total = dados?.total_sessoes ?? 0

	return (
		<div className="space-y-6">
			<BarraControles
				dias={dias}
				onDias={setDias}
				carregando={carregando}
				onAtualizar={carregar}
				crus={crus}
				onCrus={setCrus}
				extra={
					dados && (
						<span className="text-sm text-foreground-secondary">
							<strong className="text-foreground">{fmtNum(total)}</strong> sessões no período
						</span>
					)
				}
			/>

			{erro && <Erro>{erro}</Erro>}

			{dados && (
				<>
					<Tendencia tendencia={dados.tendencia} />
					<TabelaFonteMeio linhas={dados.fonte_meio} total={total} crus={crus} dias={dias} />
					<TabelaReferenciadores linhas={dados.referenciadores} total={total} dias={dias} />
					<Auditoria problemas={dados.auditoria} total={total} dias={dias} />
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

function TabelaFonteMeio({
	linhas,
	total,
	crus,
	dias,
}: {
	linhas: LinhaFonteMeio[]
	total: number
	crus: boolean
	dias: number
}) {
	const maior = Math.max(0, ...linhas.map(l => l.sessoes))
	const media = taxa(
		linhas.reduce((s, l) => s + l.whatsapp, 0),
		total,
	)
	const colunas: ColunaTabela<LinhaFonteMeio>[] = [
		{
			chave: 'fonte',
			titulo: 'Fonte',
			filtro: 'texto',
			valor: l => `${l.rotulo_fonte} ${l.grafias.join(' ')}`,
			render: l => (
				<>
					<Link href={linkSessoes({ dias, fonte: l.fonte, meio: l.meio })} className="hover:underline" onClick={e => e.stopPropagation()}>
						<span className="font-medium">{l.rotulo_fonte}</span>
					</Link>
					{crus && l.grafias.length > 0 && (
						<div className={`${CRU} mt-0.5 max-w-[320px] truncate`} title={l.grafias.join(' · ')}>
							{l.grafias.join(' · ')}
						</div>
					)}
				</>
			),
		},
		{
			chave: 'meio',
			titulo: 'Meio',
			filtro: 'opcoes',
			valor: l => l.meio,
			render: l => <span className={crus ? CRU : 'text-sm'}>{l.meio}</span>,
		},
		{
			chave: 'canal',
			titulo: 'Canal',
			filtro: 'opcoes',
			valor: l => l.rotulo_canal,
			render: l => <Badge cor={l.cor_canal}>{l.rotulo_canal}</Badge>,
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
			chave: 'sessoes_com_veiculo',
			titulo: 'Viu veículo',
			filtro: 'numero',
			valor: l => l.sessoes_com_veiculo,
			alinhar: 'dir',
			classe: 'tabular-nums',
			render: l => (
				<>
					{fmtNum(l.sessoes_com_veiculo)}
					<span className="ml-1 text-xs text-foreground-secondary">{fmtPct(taxa(l.sessoes_com_veiculo, l.sessoes), 0)}</span>
				</>
			),
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
			render: l => {
				const conv = taxa(l.whatsapp, l.sessoes)
				return <span className={conv >= media && l.whatsapp > 0 ? 'text-emerald-500' : ''}>{fmtPct(conv)}</span>
			},
		},
		{
			chave: 'formularios',
			titulo: 'Formulários',
			filtro: 'numero',
			valor: l => l.formularios,
			alinhar: 'dir',
			classe: 'tabular-nums',
			render: l => fmtNum(l.formularios),
		},
	]

	return (
		<Secao
			titulo="Fonte × Meio — como cada visita foi marcada"
			dica="Fonte é de onde veio (utm_source, ou o referrer quando não há UTM); meio é como (utm_medium: cpc, social, bio…). A fonte aparece unificada — Google, google e google_ads na mesma linha — e as grafias cruas ficam embaixo quando 'Ver valores crus' está ligado. Clique no cabeçalho para ordenar e em 'Filtrar' para restringir por coluna."
			acessorio={
				<span className="text-xs text-foreground-secondary">
					Conversão média: <strong className="text-foreground">{fmtPct(media)}</strong>
				</span>
			}
		>
			<TabelaOrdenavel
				colunas={colunas}
				linhas={linhas}
				chaveLinha={l => `${l.fonte} ${l.meio}`}
				vazio="Nenhuma sessão no período."
			/>
		</Secao>
	)
}

function TabelaReferenciadores({ linhas, total, dias }: { linhas: LinhaReferenciador[]; total: number; dias: number }) {
	const maior = Math.max(0, ...linhas.map(l => l.sessoes))
	const colunas: ColunaTabela<LinhaReferenciador>[] = [
		{
			chave: 'dominio',
			titulo: 'Domínio',
			filtro: 'texto',
			valor: l => l.dominio,
			render: l => (
				<Link href={linkSessoes({ dias, referrer: l.dominio })} className="font-mono text-xs hover:underline">
					{l.dominio}
				</Link>
			),
		},
		{ chave: 'fonte', titulo: 'Fonte', filtro: 'opcoes', valor: l => l.rotulo_fonte, render: l => l.rotulo_fonte },
		{
			chave: 'canal',
			titulo: 'Canal',
			filtro: 'opcoes',
			valor: l => l.rotulo_canal,
			render: l => <Badge cor={l.cor_canal}>{l.rotulo_canal}</Badge>,
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
			chave: 'com_utm',
			titulo: 'Com UTM',
			filtro: 'numero',
			valor: l => l.com_utm,
			alinhar: 'dir',
			classe: 'tabular-nums text-foreground-secondary',
			render: l => fmtNum(l.com_utm),
		},
		{
			chave: 'sessoes_com_veiculo',
			titulo: 'Viu veículo',
			filtro: 'numero',
			valor: l => l.sessoes_com_veiculo,
			alinhar: 'dir',
			classe: 'tabular-nums',
			render: l => fmtNum(l.sessoes_com_veiculo),
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
	]

	return (
		<Secao
			titulo="Referenciadores — os sites que mandam visita"
			dica="Domínio de onde a pessoa clicou, quando o navegador informa. Cada assistente de IA e o Linktree da bio do Instagram aparecem separados. 'Com UTM' mostra quantas dessas sessões também traziam marcação — nesse caso é a UTM, não o referrer, que decide o canal."
		>
			<TabelaOrdenavel
				colunas={colunas}
				linhas={linhas}
				chaveLinha={l => l.dominio}
				vazio="Nenhuma sessão com referenciador externo no período."
			/>
		</Secao>
	)
}

function Tendencia({ tendencia }: { tendencia: { dias: number; pontos: PontoTendencia[] } }) {
	const { pontos } = tendencia
	const maximo = Math.max(1, ...pontos.map(p => p.sessoes))
	const canaisPresentes = CANAIS_ORDEM.filter(c => pontos.some(p => (p.por_canal[c] ?? 0) > 0))
	const W = 1000
	const H = 220
	const margemBaixo = 28
	const alturaUtil = H - margemBaixo - 8
	const larguraBarra = pontos.length > 0 ? W / pontos.length : 0
	const passoRotulo = Math.max(1, Math.ceil(pontos.length / 12))

	return (
		<Secao
			titulo={`Sessões por dia e por canal — últimos ${tendencia.dias} dias`}
			dica="Cada barra é um dia (fuso de Brasília), empilhada por canal. Serve para ver o efeito de ligar ou desligar uma campanha, e dias sem tráfego pago aparecem como buraco na cor do canal. O número em cima da barra é a contagem de cliques no WhatsApp do dia."
		>
			{pontos.length === 0 ? (
				<Vazio>Sem sessões no período.</Vazio>
			) : (
				<div className="p-4 space-y-3">
					<div className="overflow-x-auto">
						<svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[640px] h-[220px]" role="img" aria-label="Sessões por dia por canal">
							{pontos.map((p, i) => {
								let y = H - margemBaixo
								const x = i * larguraBarra
								const largura = Math.max(1, larguraBarra - 2)
								return (
									<g key={p.dia}>
										<title>{`${diaCurto(p.dia)}: ${p.sessoes} sessões, ${p.whatsapp} WhatsApp`}</title>
										{canaisPresentes.map(c => {
											const v = p.por_canal[c] ?? 0
											if (v === 0) return null
											const h = (v / maximo) * alturaUtil
											y -= h
											return <rect key={c} x={x + 1} y={y} width={largura} height={h} fill={CANAL_HEX[c]} />
										})}
										{p.whatsapp > 0 && (
											<text x={x + larguraBarra / 2} y={y - 4} textAnchor="middle" fontSize="10" className="fill-foreground">
												{p.whatsapp}
											</text>
										)}
										{i % passoRotulo === 0 && (
											<text x={x + larguraBarra / 2} y={H - 8} textAnchor="middle" fontSize="11" className="fill-foreground-secondary">
												{diaCurto(p.dia)}
											</text>
										)}
									</g>
								)
							})}
						</svg>
					</div>
					<div className="flex flex-wrap gap-x-4 gap-y-1">
						{canaisPresentes.map(c => (
							<span key={c} className="inline-flex items-center gap-1.5 text-xs text-foreground-secondary">
								<span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: CANAL_HEX[c] }} />
								{CANAL_ROTULOS[c as CanalTrafego]}
							</span>
						))}
					</div>
				</div>
			)}
		</Secao>
	)
}

function Auditoria({ problemas, total, dias }: { problemas: Problema[]; total: number; dias: number }) {
	return (
		<Secao
			titulo="Auditoria de marcação — o que está errado na UTM"
			dica="O painel corrige silenciosamente vários erros de marcação (grafia, valores vazios, click id sem UTM). Aqui eles ficam visíveis, com o número de sessões afetadas, para serem corrigidos na origem — na plataforma de anúncio ou no link publicado. Quanto menos linhas aqui, mais confiáveis as outras tabelas."
		>
			{problemas.length === 0 ? (
				<Vazio>Nenhum problema de marcação encontrado no período.</Vazio>
			) : (
				<ul className="divide-y divide-border">
					{problemas.map(p => (
						<li key={p.tipo} className="px-4 py-3">
							<div className="flex flex-wrap items-baseline justify-between gap-2">
								<h3 className="flex items-center gap-1.5 text-sm font-medium text-foreground">
									<AlertTriangle className="w-4 h-4 text-amber-500" />
									{p.titulo}
								</h3>
								<span className="text-sm tabular-nums text-foreground">
									{fmtNum(p.sessoes)} sessões
									<span className="ml-1 text-xs text-foreground-secondary">{fmtPct(taxa(p.sessoes, total), 1)}</span>
								</span>
							</div>
							<p className="mt-1 text-sm text-foreground-secondary max-w-3xl">{p.explicacao}</p>
							{p.exemplos.length > 0 && (
								<div className="mt-2 flex flex-wrap gap-1.5">
									{p.exemplos.map(e => (
										<span key={e} className={`${CRU} rounded bg-background-soft px-1.5 py-0.5`}>
											{e}
										</span>
									))}
								</div>
							)}
							<Link href={linkSessoes({ dias, problema: p.tipo })} className="mt-2 inline-block text-xs text-primary hover:underline">
								Ver essas sessões →
							</Link>
						</li>
					))}
				</ul>
			)}
		</Secao>
	)
}
