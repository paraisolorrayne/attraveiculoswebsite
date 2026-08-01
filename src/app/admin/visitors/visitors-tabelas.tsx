'use client'

import type { ReactNode } from 'react'
import { InfoDica } from '../crm/info-dica'
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

const TH = 'px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-foreground-secondary whitespace-nowrap'
const TD = 'px-3 py-2.5 text-sm text-foreground whitespace-nowrap'

function Badge({ cor, children }: { cor: string; children: ReactNode }) {
	return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cor}`}>{children}</span>
}

/**
 * Coluna da taxa de conversão: é a métrica que decide investimento, então ganha número grande,
 * cor comparada à média do período e barra proporcional ao melhor canal da tabela.
 */
function CelulaTaxa({
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
		<td className={`${TD} min-w-[140px]`}>
			<div className="flex items-center gap-2">
				<span className={`text-base font-semibold tabular-nums ${corTaxa(valor, media, total)}`}>
					{fmtPct(valor)}
				</span>
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
				<div
					className={`h-full rounded-full ${corBarraTaxa(valor, media, total)}`}
					style={{ width: larguraRelativa(valor, maximo) }}
				/>
			</div>
		</td>
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

	return (
		<Secao
			titulo="Canais de tráfego — onde colocar verba"
			dica="Compare pela coluna Taxa de conversão, não pelo volume de sessões: o canal que traz mais gente costuma não ser o que traz mais conversa. Verde converte acima da média do período; vermelho, bem abaixo. A origem de cada visita vem da marcação do anúncio ou do site de onde a pessoa veio, e a soma das linhas é o total do período. «Veículos diferentes por sessão» conta quantos carros distintos a mesma visita abriu — abrir o mesmo carro quatro vezes conta como um."
			acessorio={
				<span className="text-xs text-foreground-secondary">
					Conversão média do período: <strong className="text-foreground">{fmtPct(mediaConversao)}</strong>
				</span>
			}
		>
			{canais.length === 0 ? (
				<Vazio>Nenhuma sessão no período selecionado.</Vazio>
			) : (
				<div className="overflow-x-auto">
					<table className="w-full">
						<thead className="bg-background-soft">
							<tr>
								<th className={`${TH} text-left`}>Canal</th>
								<th className={`${TH} text-left`}>Sessões</th>
								<th className={`${TH} text-right`}>Viu veículo</th>
								<th className={`${TH} text-right`}>Cliques no WhatsApp</th>
								<th className={`${TH} text-left`}>Taxa de conversão</th>
								<th className={`${TH} text-right`}>Formulários</th>
								<th className={`${TH} text-right`}>Veículos diferentes por sessão</th>
								<th className={`${TH} text-right`}>Duração média</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{canais.map(c => (
								<tr key={c.canal} className="hover:bg-background-soft/60">
									<td className={TD}>
										<Badge cor={c.cor}>{c.rotulo}</Badge>
									</td>
									<td className={`${TD} min-w-[140px]`}>
										<div className="flex items-baseline gap-2">
											<span className="font-medium tabular-nums">{fmtNum(c.sessoes)}</span>
											<span className="text-xs text-foreground-secondary tabular-nums">
												{fmtPct(taxa(c.sessoes, totalSessoes), 0)}
											</span>
										</div>
										<div className="mt-1 h-1.5 w-full rounded-full bg-background-soft overflow-hidden">
											<div
												className="h-full rounded-full bg-foreground/25"
												style={{ width: larguraRelativa(c.sessoes, maiorVolume) }}
											/>
										</div>
									</td>
									<td className={`${TD} text-right tabular-nums`}>
										{fmtNum(c.sessoes_com_veiculo)}
										<span className="ml-1 text-xs text-foreground-secondary">
											{fmtPct(taxa(c.sessoes_com_veiculo, c.sessoes), 0)}
										</span>
									</td>
									<td className={`${TD} text-right tabular-nums`}>{fmtNum(c.whatsapp)}</td>
									<CelulaTaxa parte={c.whatsapp} total={c.sessoes} media={mediaConversao} maximo={maiorTaxa} />
									<td className={`${TD} text-right tabular-nums`}>{fmtNum(c.formularios)}</td>
									<td className={`${TD} text-right tabular-nums`}>{fmtMedia(c.veiculos_distintos, c.sessoes)}</td>
									<td className={`${TD} text-right tabular-nums text-foreground-secondary`}>
										{temDuracao ? fmtDuracao(c.duracao_media_segundos) : '—'}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
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
			{campanhas.length === 0 ? (
				<Vazio>
					Nenhuma visita do período chegou com nome de campanha no link. Sem essa marcação nos
					anúncios, dá para ler o canal, mas não qual campanha trouxe cada visita.
				</Vazio>
			) : (
				<div className="overflow-x-auto">
					<table className="w-full">
						<thead className="bg-background-soft">
							<tr>
								<th className={`${TH} text-left`}>Campanha</th>
								<th className={`${TH} text-left`}>Canal</th>
								<th className={`${TH} text-right`}>Sessões</th>
								<th className={`${TH} text-right`}>Viu veículo</th>
								<th className={`${TH} text-right`}>Cliques no WhatsApp</th>
								<th className={`${TH} text-left`}>Taxa de conversão</th>
								<th className={`${TH} text-right`}>Formulários</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{campanhas.map(c => (
								<tr key={c.campanha} className="hover:bg-background-soft/60">
									<td className={`${TD} max-w-[280px]`}>
										<p className="truncate font-medium" title={c.campanha}>{c.campanha}</p>
										{c.fonte && <p className="text-xs text-foreground-secondary truncate">{c.fonte}</p>}
									</td>
									<td className={TD}>
										<Badge cor={c.cor_canal}>{c.rotulo_canal}</Badge>
									</td>
									<td className={`${TD} text-right tabular-nums font-medium`}>{fmtNum(c.sessoes)}</td>
									<td className={`${TD} text-right tabular-nums`}>{fmtNum(c.sessoes_com_veiculo)}</td>
									<td className={`${TD} text-right tabular-nums`}>{fmtNum(c.whatsapp)}</td>
									<CelulaTaxa parte={c.whatsapp} total={c.sessoes} media={mediaConversao} maximo={maiorTaxa} />
									<td className={`${TD} text-right tabular-nums`}>{fmtNum(c.formularios)}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</Secao>
	)
}

export function ListaVeiculos({ veiculos }: { veiculos: LinhaVeiculo[] }) {
	const maximo = Math.max(0, ...veiculos.map(v => v.views))

	return (
		<Secao
			titulo="Veículos mais vistos"
			dica="Quantas vezes a página de cada veículo foi aberta no período. Só entram os acessos em que o site conseguiu registrar de qual veículo se tratava."
		>
			{veiculos.length === 0 ? (
				<Vazio>
					Nenhuma abertura de página de veículo com o veículo identificado neste período.
				</Vazio>
			) : (
				<ul className="p-4 space-y-2">
					{veiculos.map(v => (
						<li key={v.slug}>
							<div className="flex items-baseline justify-between gap-3">
								<span className="text-sm text-foreground truncate" title={v.slug}>
									{v.marca || v.modelo ? `${v.marca ?? ''} ${v.modelo ?? ''}`.trim() : nomeDoSlug(v.slug)}
								</span>
								<span className="text-sm tabular-nums text-foreground-secondary shrink-0">
									{fmtNum(v.views)} <span className="text-xs">aberturas</span>
								</span>
							</div>
							<div className="mt-1 h-1.5 w-full rounded-full bg-background-soft overflow-hidden">
								<div
									className="h-full rounded-full bg-primary"
									style={{ width: larguraRelativa(v.views, maximo) }}
								/>
							</div>
						</li>
					))}
				</ul>
			)}
		</Secao>
	)
}

export function ListaCidades({ cidades }: { cidades: LinhaCidade[] }) {
	const maximo = Math.max(0, ...cidades.map(c => c.sessoes))

	return (
		<Secao
			titulo="Cidades"
			dica="Cidade estimada pelo IP da sessão. Serve para ler alcance geográfico da mídia, não como endereço do cliente."
		>
			{cidades.length === 0 ? (
				<Vazio>Nenhuma sessão no período selecionado.</Vazio>
			) : (
				<ul className="p-4 space-y-2">
					{cidades.map(c => (
						<li key={c.cidade}>
							<div className="flex items-baseline justify-between gap-3">
								<span className="text-sm text-foreground truncate">
									{c.cidade}
									{c.regiao && <span className="text-foreground-secondary"> · {c.regiao}</span>}
								</span>
								<span className="text-sm tabular-nums text-foreground-secondary shrink-0">
									{fmtNum(c.sessoes)}
									<span className="text-xs"> sessões · {fmtNum(c.whatsapp)} clicaram no WhatsApp</span>
								</span>
							</div>
							<div className="mt-1 h-1.5 w-full rounded-full bg-background-soft overflow-hidden">
								<div
									className="h-full rounded-full bg-foreground/25"
									style={{ width: larguraRelativa(c.sessoes, maximo) }}
								/>
							</div>
						</li>
					))}
				</ul>
			)}
		</Secao>
	)
}

export interface LinhaMidiaPaga {
	canal_fonte: string
	campanha: string
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
			dica="Só visitas de mídia paga. «Grupo/anúncio» e «termo» vêm da marcação do link do anúncio: no Google Ads são os parâmetros de conteúdo e a palavra-chave; no Meta, o conjunto e o criativo. Compare pela taxa, não pelo volume."
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

			{linhas.length === 0 ? (
				<Vazio>Nenhuma visita de mídia paga no período selecionado.</Vazio>
			) : (
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="text-left text-[11px] uppercase tracking-wide text-foreground-secondary border-b border-border">
								<th className="px-4 py-2 font-medium">Campanha</th>
								<th className="px-4 py-2 font-medium">Grupo / anúncio</th>
								<th className="px-4 py-2 font-medium">Termo</th>
								<th className="px-4 py-2 font-medium text-right">Visitas</th>
								<th className="px-4 py-2 font-medium text-right">Cliques no WhatsApp</th>
								<th className="px-4 py-2 font-medium text-right">Taxa</th>
							</tr>
						</thead>
						<tbody>
							{linhas.map((l, i) => {
								const t = taxa(l.whatsapp, l.sessoes)
								return (
									<tr key={`${l.campanha}|${l.conteudo}|${l.termo}|${i}`} className="border-b border-border/60 last:border-0">
										<td className="px-4 py-2 max-w-[16rem]">
											<div className="truncate text-foreground" title={l.campanha}>{l.campanha}</div>
											<div className="text-[10px] uppercase tracking-wide text-foreground-secondary">{l.canal_fonte || '—'}</div>
										</td>
										<td className="px-4 py-2 max-w-[14rem]">
											<span className="block truncate text-foreground-secondary" title={l.conteudo}>{l.conteudo}</span>
										</td>
										<td className="px-4 py-2 max-w-[12rem]">
											<span className="block truncate text-foreground-secondary" title={l.termo}>{l.termo}</span>
										</td>
										<td className="px-4 py-2 text-right tabular-nums text-foreground-secondary">{fmtNum(l.sessoes)}</td>
										<td className="px-4 py-2 text-right tabular-nums text-foreground-secondary">{fmtNum(l.whatsapp)}</td>
										<td className={`px-4 py-2 text-right tabular-nums font-medium ${corTaxa(t, media, l.sessoes)}`}>
											{fmtPct(t)}
										</td>
									</tr>
								)
							})}
						</tbody>
					</table>
				</div>
			)}
		</Secao>
	)
}
