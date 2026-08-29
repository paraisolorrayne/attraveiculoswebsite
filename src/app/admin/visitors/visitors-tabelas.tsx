'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { chaveCampanha } from '@/lib/traffic-channel'
import { rotuloDevice, rotuloMatchType, rotuloNetwork } from '@/lib/parametros-anuncio'
import { InfoDica } from '../crm/info-dica'
import { TabelaOrdenavel, type ColunaTabela } from './visitors-tabela'
import {
	corBarraTaxa,
	corTaxa,
	fmtDuracao,
	fmtMedia,
	fmtNum,
	fmtPct,
	larguraRelativa,
	nomeDoSlug,
	taxa,
	VOLUME_MINIMO,
	type LinhaCampanha,
	type LinhaCanal,
	type LinhaCidade,
	type LinhaVeiculo,
} from './visitors-metrics'

// Tabelas de leitura do painel de visitantes. Nenhuma delas escreve nada: o /admin/visitors
// é espelho de tráfego, não ferramenta de operação.

export function Secao({
	titulo,
	dica,
	acessorio,
	children,
}: {
	titulo: string
	dica: string
	acessorio?: ReactNode
	children: ReactNode
}) {
	return (
		<section className="bg-background-card border border-border rounded-xl overflow-hidden">
			<header className="flex items-center justify-between gap-3 flex-wrap px-4 py-3 border-b border-border">
				<h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
					{titulo}
					<InfoDica>{dica}</InfoDica>
				</h2>
				{acessorio}
			</header>
			{children}
		</section>
	)
}

function Vazio({ children }: { children: ReactNode }) {
	return <p className="px-4 py-8 text-center text-sm text-foreground-secondary">{children}</p>
}

function Badge({ cor, children }: { cor: string; children: ReactNode }) {
	return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cor}`}>{children}</span>
}

/**
 * Coluna da taxa de conversão: é a métrica que decide investimento, então ganha número grande,
 * cor comparada à média do período e barra proporcional ao melhor canal da tabela.
 */
function ConteudoTaxa({
	parte,
	total,
	media,
	maximo,
}: {
	parte: number
	total: number
	media: number
	maximo: number
}) {
	const valor = taxa(parte, total)
	const baixoVolume = total < VOLUME_MINIMO
	return (
		<>
			<div className="flex items-center gap-2">
				<span className={`text-base font-semibold tabular-nums ${corTaxa(valor, media, total)}`}>{fmtPct(valor)}</span>
				{baixoVolume && (
					<span
						className="text-[10px] text-foreground-secondary"
						title={`Menos de ${VOLUME_MINIMO} sessões no período: com tão pouca gente essa taxa oscila muito e não sustenta decisão de verba.`}
					>
						poucos dados
					</span>
				)}
			</div>
			<div className="mt-1 h-1.5 w-full rounded-full bg-background-soft overflow-hidden">
				<div className={`h-full rounded-full ${corBarraTaxa(valor, media, total)}`} style={{ width: larguraRelativa(valor, maximo) }} />
			</div>
		</>
	)
}

/** Barra de volume com o número e o % do total. */
function ConteudoVolumeBarra({ valor, maximo, total, cor = 'bg-foreground/25' }: { valor: number; maximo: number; total: number; cor?: string }) {
	return (
		<>
			<div className="flex items-baseline gap-2">
				<span className="font-medium tabular-nums">{fmtNum(valor)}</span>
				{total > 0 && <span className="text-xs text-foreground-secondary tabular-nums">{fmtPct(taxa(valor, total), 0)}</span>}
			</div>
			<div className="mt-1 h-1.5 w-full rounded-full bg-background-soft overflow-hidden">
				<div className={`h-full rounded-full ${cor}`} style={{ width: larguraRelativa(valor, maximo) }} />
			</div>
		</>
	)
}

export function TabelaCanais({
	canais,
	totalSessoes,
	temDuracao,
}: {
	canais: LinhaCanal[]
	totalSessoes: number
	temDuracao: boolean
}) {
	const mediaConversao = taxa(
		canais.reduce((s, c) => s + c.whatsapp, 0),
		totalSessoes,
	)
	const maiorTaxa = Math.max(0, ...canais.map(c => taxa(c.whatsapp, c.sessoes)))
	const maiorVolume = Math.max(0, ...canais.map(c => c.sessoes))

	const colunas: ColunaTabela<LinhaCanal>[] = [
		{
			chave: 'canal',
			titulo: 'Canal',
			filtro: 'opcoes',
			valor: c => c.rotulo,
			render: c => <Badge cor={c.cor}>{c.rotulo}</Badge>,
		},
		{
			chave: 'sessoes',
			titulo: 'Sessões',
			filtro: 'numero',
			valor: c => c.sessoes,
			classe: 'min-w-[140px]',
			render: c => <ConteudoVolumeBarra valor={c.sessoes} maximo={maiorVolume} total={totalSessoes} />,
		},
		{
			chave: 'viu_veiculo',
			titulo: 'Viu veículo',
			filtro: 'numero',
			valor: c => c.sessoes_com_veiculo,
			alinhar: 'dir',
			classe: 'tabular-nums',
			render: c => (
				<>
					{fmtNum(c.sessoes_com_veiculo)}
					<span className="ml-1 text-xs text-foreground-secondary">{fmtPct(taxa(c.sessoes_com_veiculo, c.sessoes), 0)}</span>
				</>
			),
		},
		{
			chave: 'whatsapp',
			titulo: 'Cliques no WhatsApp',
			filtro: 'numero',
			valor: c => c.whatsapp,
			alinhar: 'dir',
			classe: 'tabular-nums',
			render: c => fmtNum(c.whatsapp),
		},
		{
			chave: 'conversao',
			titulo: 'Taxa de conversão',
			filtro: 'numero',
			valor: c => taxa(c.whatsapp, c.sessoes),
			classe: 'min-w-[140px]',
			render: c => <ConteudoTaxa parte={c.whatsapp} total={c.sessoes} media={mediaConversao} maximo={maiorTaxa} />,
		},
		{
			chave: 'formularios',
			titulo: 'Formulários',
			filtro: 'numero',
			valor: c => c.formularios,
			alinhar: 'dir',
			classe: 'tabular-nums',
			render: c => fmtNum(c.formularios),
		},
		{
			chave: 'veiculos_por_sessao',
			titulo: 'Veículos diferentes por sessão',
			filtro: 'numero',
			valor: c => (c.sessoes > 0 ? c.veiculos_distintos / c.sessoes : 0),
			alinhar: 'dir',
			classe: 'tabular-nums',
			rotuloFiltro: 'Veículos por sessão',
			render: c => fmtMedia(c.veiculos_distintos, c.sessoes),
		},
		{
			chave: 'duracao',
			titulo: 'Duração média',
			filtro: 'numero',
			valor: c => c.duracao_media_segundos,
			alinhar: 'dir',
			classe: 'tabular-nums text-foreground-secondary',
			rotuloFiltro: 'Duração em segundos',
			render: c => (temDuracao ? fmtDuracao(c.duracao_media_segundos) : '—'),
		},
	]

	return (
		<Secao
			titulo="Canais de tráfego — onde colocar verba"
			dica="Compare pela coluna Taxa de conversão, não pelo volume de sessões: o canal que traz mais gente costuma não ser o que traz mais conversa. Verde converte acima da média do período; vermelho, abaixo. Clique no cabeçalho para ordenar."
			acessorio={
				<span className="text-xs text-foreground-secondary">
					Conversão média do período: <strong className="text-foreground">{fmtPct(mediaConversao)}</strong>
				</span>
			}
		>
			<TabelaOrdenavel
				colunas={colunas}
				linhas={canais}
				chaveLinha={c => c.canal}
				vazio="Nenhuma sessão no período selecionado."
			/>
		</Secao>
	)
}

export function TabelaCampanhas({
	campanhas,
	totalCampanhas,
	sessoesSemCampanha,
	mediaConversao,
}: {
	campanhas: LinhaCampanha[]
	totalCampanhas: number
	sessoesSemCampanha: number
	mediaConversao: number
}) {
	const maiorTaxa = Math.max(0, ...campanhas.map(c => taxa(c.whatsapp, c.sessoes)))

	return (
		<Secao
			titulo="Campanhas"
			dica="O nome da campanha é o que vem marcado no link do anúncio — se a campanha não foi marcada na plataforma, a visita não aparece aqui. Ordenadas por volume; o canal ao lado é o que responde pela maior parte das visitas daquela campanha. Compare pela taxa de conversão."
			acessorio={
				// A cor da taxa desta tabela é comparada com a mesma média do período usada na tabela
				// de canais — então a régua precisa aparecer aqui também, senão a cor não tem
				// referência nenhuma nesta seção.
				<span className="text-xs text-foreground-secondary text-right">
					{totalCampanhas > campanhas.length
						? `${fmtNum(campanhas.length)} de ${fmtNum(totalCampanhas)} campanhas · `
						: ''}
					{fmtNum(sessoesSemCampanha)} sessões sem campanha marcada
					<br />
					Conversão média do período: <strong className="text-foreground">{fmtPct(mediaConversao)}</strong>
				</span>
			}
		>
			<TabelaOrdenavel
				colunas={[
					{
						chave: 'campanha',
						titulo: 'Campanha',
						filtro: 'texto',
						valor: c => `${c.campanha} ${c.fonte}`,
						classe: 'max-w-[280px]',
						render: c => (
							<>
								{/* Link para a página da campanha (criativos, termos, entradas, leads). */}
								<Link
									href={`/admin/visitors/campanha/${encodeURIComponent(chaveCampanha(c.campanha))}`}
									className="block truncate font-medium hover:underline"
									title={c.campanha}
								>
									{c.campanha}
								</Link>
								{c.fonte && <p className="truncate text-xs text-foreground-secondary">{c.fonte}</p>}
							</>
						),
					},
					{
						chave: 'canal',
						titulo: 'Canal',
						filtro: 'opcoes',
						valor: c => c.rotulo_canal,
						render: c => <Badge cor={c.cor_canal}>{c.rotulo_canal}</Badge>,
					},
					{
						chave: 'sessoes',
						titulo: 'Sessões',
						filtro: 'numero',
						valor: c => c.sessoes,
						alinhar: 'dir',
						classe: 'tabular-nums font-medium',
						render: c => fmtNum(c.sessoes),
					},
					{
						chave: 'viu_veiculo',
						titulo: 'Viu veículo',
						filtro: 'numero',
						valor: c => c.sessoes_com_veiculo,
						alinhar: 'dir',
						classe: 'tabular-nums',
						render: c => fmtNum(c.sessoes_com_veiculo),
					},
					{
						chave: 'whatsapp',
						titulo: 'Cliques no WhatsApp',
						filtro: 'numero',
						valor: c => c.whatsapp,
						alinhar: 'dir',
						classe: 'tabular-nums',
						render: c => fmtNum(c.whatsapp),
					},
					{
						chave: 'conversao',
						titulo: 'Taxa de conversão',
						filtro: 'numero',
						valor: c => taxa(c.whatsapp, c.sessoes),
						classe: 'min-w-[140px]',
						render: c => <ConteudoTaxa parte={c.whatsapp} total={c.sessoes} media={mediaConversao} maximo={maiorTaxa} />,
					},
					{
						chave: 'formularios',
						titulo: 'Formulários',
						filtro: 'numero',
						valor: c => c.formularios,
						alinhar: 'dir',
						classe: 'tabular-nums',
						render: c => fmtNum(c.formularios),
					},
				]}
				linhas={campanhas}
				chaveLinha={c => c.campanha}
				vazio="Nenhuma visita do período chegou com nome de campanha no link. Sem essa marcação nos anúncios, dá para ler o canal, mas não qual campanha trouxe cada visita."
			/>
		</Secao>
	)
}

export function ListaVeiculos({ veiculos }: { veiculos: LinhaVeiculo[] }) {
	const maximo = Math.max(0, ...veiculos.map(v => v.views))
	const total = veiculos.reduce((s, v) => s + v.views, 0)

	return (
		<Secao
			titulo="Veículos mais vistos"
			dica="Quantas vezes a página de cada veículo foi aberta no período. Só entram os acessos em que o site conseguiu registrar de qual veículo se tratava."
		>
			<TabelaOrdenavel
				colunas={[
					{
						chave: 'veiculo',
						titulo: 'Veículo',
						filtro: 'texto',
						valor: v => `${v.marca ?? ''} ${v.modelo ?? ''} ${v.slug}`,
						classe: 'max-w-[280px] truncate',
						render: v => (
							<span title={v.slug}>
								{v.marca || v.modelo ? `${v.marca ?? ''} ${v.modelo ?? ''}`.trim() : nomeDoSlug(v.slug)}
							</span>
						),
					},
					{
						chave: 'views',
						titulo: 'Aberturas',
						filtro: 'numero',
						valor: v => v.views,
						classe: 'min-w-[140px]',
						render: v => <ConteudoVolumeBarra valor={v.views} maximo={maximo} total={total} cor="bg-primary" />,
					},
					{
						chave: 'sessoes',
						titulo: 'Sessões',
						filtro: 'numero',
						valor: v => v.sessoes,
						alinhar: 'dir',
						classe: 'tabular-nums text-foreground-secondary',
						render: v => fmtNum(v.sessoes),
					},
				]}
				linhas={veiculos}
				chaveLinha={v => v.slug}
				vazio="Nenhuma abertura de página de veículo com o veículo identificado neste período."
			/>
		</Secao>
	)
}

export function ListaCidades({ cidades }: { cidades: LinhaCidade[] }) {
	const maximo = Math.max(0, ...cidades.map(c => c.sessoes))
	const total = cidades.reduce((s, c) => s + c.sessoes, 0)

	return (
		<Secao
			titulo="Cidades"
			dica="Cidade estimada pelo IP da sessão. Serve para ler alcance geográfico da mídia, não como endereço do cliente."
		>
			<TabelaOrdenavel
				colunas={[
					{
						chave: 'cidade',
						titulo: 'Cidade',
						filtro: 'texto',
						valor: c => `${c.cidade} ${c.regiao ?? ''}`,
						classe: 'max-w-[240px] truncate',
						render: c => (
							<>
								{c.cidade}
								{c.regiao && <span className="text-foreground-secondary"> · {c.regiao}</span>}
							</>
						),
					},
					{
						chave: 'sessoes',
						titulo: 'Sessões',
						filtro: 'numero',
						valor: c => c.sessoes,
						classe: 'min-w-[140px]',
						render: c => <ConteudoVolumeBarra valor={c.sessoes} maximo={maximo} total={total} />,
					},
					{
						chave: 'whatsapp',
						titulo: 'Cliques no WhatsApp',
						filtro: 'numero',
						valor: c => c.whatsapp,
						alinhar: 'dir',
						classe: 'tabular-nums',
						render: c => fmtNum(c.whatsapp),
					},
					{
						chave: 'conversao',
						titulo: 'Conversão',
						filtro: 'numero',
						valor: c => taxa(c.whatsapp, c.sessoes),
						alinhar: 'dir',
						classe: 'tabular-nums text-foreground-secondary',
						render: c => fmtPct(taxa(c.whatsapp, c.sessoes)),
					},
				]}
				linhas={cidades}
				chaveLinha={c => c.cidade}
				vazio="Nenhuma sessão no período selecionado."
			/>
		</Secao>
	)
}

export interface LinhaMidiaPaga {
	canal_fonte: string
	campanha: string
	grupo: string
	conteudo: string
	termo: string
	sessoes: number
	whatsapp: number
}

export interface LinhaMarcacao {
	fonte: string
	sessoes: number
	com_campanha: number
	com_conteudo: number
	com_termo: number
	com_id: number
}

/**
 * Detalhe da mídia paga: campanha → grupo/anúncio → termo.
 *
 * O nível de campanha sozinho não responde "qual anúncio traz conversa", que é a
 * pergunta de quem decide o que pausar. Vem acompanhado do diagnóstico de
 * marcação, porque uma linha "(não marcada)" grande quase nunca é ausência de
 * investimento — é modelo de rastreamento mal configurado na plataforma.
 */
export function MidiaPaga({
	linhas,
	marcacao,
}: {
	linhas: LinhaMidiaPaga[]
	marcacao: LinhaMarcacao[]
}) {
	const media = taxa(
		linhas.reduce((s, l) => s + l.whatsapp, 0),
		linhas.reduce((s, l) => s + l.sessoes, 0),
	)
	// Plataforma cuja marcação de campanha falha na maioria das visitas pagas.
	const comFalha = marcacao.filter(m => m.sessoes >= 50 && m.com_campanha / m.sessoes < 0.5)

	return (
		<Secao
			titulo="Anúncios pagos — campanha, grupo e termo"
			dica="Só visitas de mídia paga. «Grupo» é o adgroup_id do Google ou o conjunto do Meta; «anúncio» é o utm_content (criativo); «termo» é a palavra-chave que acionou. Compare pela taxa, não pelo volume."
		>
			{comFalha.length > 0 && (
				<div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs leading-snug">
					{comFalha.map(m => (
						<div key={m.fonte}>
							<strong className="font-medium">{m.fonte}</strong>: {fmtPct(taxa(m.sessoes - m.com_campanha, m.sessoes))} das
							visitas pagas chegam sem nome de campanha ({fmtNum(m.sessoes - m.com_campanha)} de {fmtNum(m.sessoes)}).
							O link do anúncio precisa enviar o nome da campanha — sem isso, o investimento aparece agrupado em
							&ldquo;(não marcada)&rdquo; e não dá para comparar campanha com campanha.
						</div>
					))}
				</div>
			)}

			<TabelaOrdenavel
				colunas={[
					{
						chave: 'campanha',
						titulo: 'Campanha',
						filtro: 'texto',
						valor: l => `${l.campanha} ${l.canal_fonte}`,
						classe: 'max-w-[16rem]',
						render: l => (
							<>
								<div className="truncate text-foreground" title={l.campanha}>
									{l.campanha}
								</div>
								<div className="text-[10px] uppercase tracking-wide text-foreground-secondary">{l.canal_fonte || '—'}</div>
							</>
						),
					},
					{
						chave: 'grupo',
						titulo: 'Grupo',
						filtro: 'texto',
						valor: l => l.grupo,
						classe: 'max-w-[10rem] truncate text-foreground-secondary',
						render: l => <span title={l.grupo}>{l.grupo}</span>,
					},
					{
						chave: 'conteudo',
						titulo: 'Anúncio',
						filtro: 'texto',
						valor: l => l.conteudo,
						classe: 'max-w-[12rem] truncate text-foreground-secondary',
						render: l => <span title={l.conteudo}>{l.conteudo}</span>,
					},
					{
						chave: 'termo',
						titulo: 'Termo',
						filtro: 'texto',
						valor: l => l.termo,
						classe: 'max-w-[12rem] truncate text-foreground-secondary',
						render: l => <span title={l.termo}>{l.termo}</span>,
					},
					{
						chave: 'sessoes',
						titulo: 'Visitas',
						filtro: 'numero',
						valor: l => l.sessoes,
						alinhar: 'dir',
						classe: 'tabular-nums text-foreground-secondary',
						render: l => fmtNum(l.sessoes),
					},
					{
						chave: 'whatsapp',
						titulo: 'Cliques no WhatsApp',
						filtro: 'numero',
						valor: l => l.whatsapp,
						alinhar: 'dir',
						classe: 'tabular-nums text-foreground-secondary',
						render: l => fmtNum(l.whatsapp),
					},
					{
						chave: 'taxa',
						titulo: 'Taxa',
						filtro: 'numero',
						valor: l => taxa(l.whatsapp, l.sessoes),
						alinhar: 'dir',
						classe: 'tabular-nums font-medium',
						render: l => {
							const t = taxa(l.whatsapp, l.sessoes)
							return <span className={corTaxa(t, media, l.sessoes)}>{fmtPct(t)}</span>
						},
					},
				]}
				linhas={linhas}
				chaveLinha={l => `${l.campanha}|${l.grupo}|${l.conteudo}|${l.termo}`}
				vazio="Nenhuma visita de mídia paga no período selecionado."
			/>
		</Secao>
	)
}

export interface LinhaContextoClique {
	dimensao: string
	valor: string
	sessoes: number
	whatsapp: number
}

const TITULO_DIMENSAO: Record<string, string> = {
	device: 'Dispositivo',
	matchtype: 'Correspondência da palavra-chave',
	network: 'Rede',
}

const EXPLICACAO_DIMENSAO: Record<string, string> = {
	device: 'Em qual aparelho o anúncio foi clicado, segundo o Google Ads.',
	matchtype: 'Quão livre foi a associação entre a busca da pessoa e a palavra-chave comprada. Ampla alcança mais gente e costuma converter menos.',
	network: 'Onde o clique aconteceu: na busca do Google ou em sites parceiros.',
}

/**
 * Contexto do clique pago — três recortes independentes.
 *
 * Não é o cruzamento das três dimensões: cruzado, viraria dezenas de linhas com
 * duas sessões cada, onde nenhuma taxa sustenta decisão. Separado, cada bloco
 * responde uma pergunta que muda verba.
 */
export function ContextoClique({ linhas }: { linhas: LinhaContextoClique[] }) {
	const dimensoes = ['device', 'matchtype', 'network'].filter(d => linhas.some(l => l.dimensao === d))

	const media = taxa(
		linhas.filter(l => l.dimensao === 'device').reduce((s, l) => s + l.whatsapp, 0),
		linhas.filter(l => l.dimensao === 'device').reduce((s, l) => s + l.sessoes, 0),
	)

	return (
		<Secao
			titulo="Contexto do clique pago — dispositivo, correspondência e rede"
			dica="Vem do modelo de rastreamento do Google Ads. Se uma linha inteira aparecer como «(não informado)», o parâmetro correspondente não está no link do anúncio."
		>
			{dimensoes.length === 0 ? (
				<Vazio>Nenhuma visita paga com esses parâmetros no período.</Vazio>
			) : (
				<div className="divide-y divide-border/60">
					{dimensoes.map(dim => {
						const doGrupo = linhas.filter(l => l.dimensao === dim)
						const total = doGrupo.reduce((s, l) => s + l.sessoes, 0)
						const semDado = doGrupo.find(l => l.valor === '(não informado)')
						const naoMarcado = semDado && total > 0 && semDado.sessoes === total

						return (
							<div key={dim} className="px-4 py-3">
								<div className="mb-1 flex items-baseline gap-2">
									<h3 className="text-sm font-medium text-foreground">{TITULO_DIMENSAO[dim] ?? dim}</h3>
									<span className="text-[11px] text-foreground-secondary">{EXPLICACAO_DIMENSAO[dim]}</span>
								</div>

								{naoMarcado ? (
									<p className="text-xs text-amber-600 dark:text-amber-400">
										Nenhuma visita paga trouxe este parâmetro. Falta <code>{dim}={'{'}{dim}{'}'}</code> no
										modelo de rastreamento da campanha — sem ele esta leitura não existe.
									</p>
								) : (
									<table className="w-full text-sm">
										<tbody>
											{doGrupo.map(l => {
												const t = taxa(l.whatsapp, l.sessoes)
												return (
													<tr key={l.valor} className="border-b border-border/40 last:border-0">
														<td className="py-1.5 pr-4 text-foreground">
															{dim === 'device'
																? rotuloDevice(l.valor)
																: dim === 'matchtype'
																	? rotuloMatchType(l.valor)
																	: rotuloNetwork(l.valor)}
														</td>
														<td className="py-1.5 pr-4 text-right tabular-nums text-foreground-secondary w-24">
															{fmtNum(l.sessoes)}
														</td>
														<td className="py-1.5 pr-4 text-right tabular-nums text-foreground-secondary w-28">
															{fmtNum(l.whatsapp)}
														</td>
														<td className={`py-1.5 text-right tabular-nums font-medium w-20 ${corTaxa(t, media, l.sessoes)}`}>
															{fmtPct(t)}
														</td>
													</tr>
												)
											})}
										</tbody>
									</table>
								)}
							</div>
						)
					})}
				</div>
			)}
		</Secao>
	)
}
