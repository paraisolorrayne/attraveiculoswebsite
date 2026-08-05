'use client'

import { useCallback, useEffect, useState } from 'react'
import { Car, Loader2, Mail, Phone, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { VisitorProfileWithDetails } from '@/types/database'
import { PERIODOS } from '../crm/crm-constants'
import { InfoDica } from '../crm/info-dica'
import { ListaCidades, ListaVeiculos, MidiaPaga, Secao, TabelaCampanhas, TabelaCanais } from './visitors-tabelas'
import { SecaoReceitaPorCanal } from './visitors-receita'
import { SecaoTermosDeConversao } from './visitors-termos'
import { fmtDuracao, fmtNum, fmtPct, taxa, type MetricasVisitantes } from './visitors-metrics'

// Painel de visitantes — SOMENTE LEITURA.
//
// A pergunta que este painel responde não é "quantas visitas tivemos", e sim "qual canal traz
// conversa e qual só traz volume". Por isso a ordem da tela é: período → KPIs → canais →
// campanhas → veículos/cidades, e a tabela de canais é a única com destaque visual na taxa
// de conversão.

interface Props {
	adminId: string
}

type FiltroPerfil = 'all' | 'identified' | 'enriched'

const ROTULO_PERFIL: Record<FiltroPerfil, string> = {
	all: 'Todos',
	identified: 'Identificados',
	enriched: 'Enriquecidos',
}

export function VisitorsDashboard(props: Props) {
	// `adminId` continua no contrato porque o page.tsx o envia, mas o painel é somente leitura:
	// não há autoria a registrar nem dado a filtrar por admin.
	void props.adminId

	const [metricas, setMetricas] = useState<MetricasVisitantes | null>(null)
	const [visitantes, setVisitantes] = useState<VisitorProfileWithDetails[]>([])
	const [dias, setDias] = useState<number>(30)
	const [filtroPerfil, setFiltroPerfil] = useState<FiltroPerfil>('all')
	const [carregando, setCarregando] = useState(true)
	const [erro, setErro] = useState<string | null>(null)

	const carregarMetricas = useCallback(async () => {
		setCarregando(true)
		setErro(null)
		try {
			const resposta = await fetch(`/api/admin/visitors/metrics?dias=${dias}`)
			if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`)
			setMetricas(await resposta.json())
		} catch (e) {
			console.error('[Visitors] Falha ao carregar métricas:', e)
			setErro('Não foi possível carregar as métricas de tráfego.')
		} finally {
			setCarregando(false)
		}
	}, [dias])

	const carregarVisitantes = useCallback(async () => {
		try {
			const resposta = await fetch(`/api/admin/visitors?status=${filtroPerfil}`)
			if (resposta.ok) setVisitantes(await resposta.json())
		} catch (e) {
			console.error('[Visitors] Falha ao carregar visitantes:', e)
		}
	}, [filtroPerfil])

	useEffect(() => {
		carregarMetricas()
	}, [carregarMetricas])

	useEffect(() => {
		carregarVisitantes()
	}, [carregarVisitantes])

	// Enquanto a primeira resposta não chega, `resumo` é undefined e todo KPI cairia no `?? 0`,
	// exibindo "0" e "0,0%" — que a leitora lê como resultado real ("não veio ninguém"). Nada de
	// número antes de haver número: travessão até os dados chegarem.
	const resumo = metricas?.resumo
	const carregado = resumo !== undefined
	const totalSessoes = resumo?.sessoes ?? 0
	const conversaoGeral = taxa(resumo?.whatsapp ?? 0, totalSessoes)
	// Duração só passa a existir quando a sessão é encerrada; sem isso, travessão.
	const temDuracao = (resumo?.sessoes_com_duracao ?? 0) > 0

	const kpis: { rotulo: string; valor: string; dica: string; destaque?: boolean }[] = [
		{
			rotulo: 'Sessões',
			valor: fmtNum(totalSessoes),
			dica: 'Visitas iniciadas no período. Uma pessoa que volta outro dia gera uma nova sessão.',
		},
		{
			rotulo: 'Visitantes',
			valor: fmtNum(resumo?.visitantes ?? 0),
			dica: 'Pessoas diferentes que visitaram no período, contadas por aparelho. Quem entra pelo celular e depois pelo computador conta como dois.',
		},
		{
			rotulo: 'Viram veículo',
			valor: fmtNum(resumo?.sessoes_com_veiculo ?? 0),
			dica: 'Sessões que abriram pelo menos uma página de veículo — o passo do meio do funil, antes do contato.',
		},
		{
			rotulo: 'Cliques no WhatsApp',
			valor: fmtNum(resumo?.whatsapp ?? 0),
			dica: 'Visitas em que alguém clicou no botão do WhatsApp. É o clique que sai do site — quem de fato mandou mensagem só o CRM sabe.',
		},
		{
			rotulo: 'Taxa de conversão',
			valor: fmtPct(conversaoGeral),
			dica: 'Cliques no WhatsApp divididos pelas visitas do período. É a régua para comparar os canais na tabela abaixo: canal acima dela puxa a média para cima, abaixo dela puxa para baixo.',
			destaque: true,
		},
		{
			rotulo: 'Duração média',
			valor: temDuracao ? fmtDuracao(resumo?.duracao_media_segundos ?? null) : '—',
			dica: !carregado
				? 'Tempo médio de permanência no período.'
				: temDuracao
					? 'Tempo médio de permanência, contando só as visitas que já foram encerradas.'
					: 'Nenhuma visita encerrada no período selecionado ainda. O traço evita mostrar uma média que não existe.',
		},
	]

	return (
		<div className="max-w-full px-4 sm:px-6 py-8">
			<div className="max-w-7xl mx-auto space-y-6">
				{/* Cabeçalho + período */}
				<div className="flex items-start justify-between gap-3 flex-wrap">
					<div>
						<h1 className="text-2xl font-bold text-foreground">Visitantes por canal</h1>
						<p className="text-sm text-foreground-secondary mt-1">
							De onde vêm as visitas e quanta conversa cada origem devolve. Compare os canais pela
							taxa de conversão, não pelo volume.
						</p>
					</div>
					<div className="flex items-center gap-3 flex-wrap justify-end">
						<span className="flex items-center gap-1.5">
							<select
								value={dias}
								onChange={e => setDias(Number(e.target.value))}
								aria-label="Período"
								className="px-3 py-2 bg-background-card border border-border rounded-lg text-sm text-foreground hover:bg-background transition-colors"
							>
								{PERIODOS.map(p => (
									<option key={p.dias} value={p.dias}>{p.label}</option>
								))}
							</select>
							<InfoDica>
								Filtra pela data de início da sessão. &ldquo;Hoje&rdquo; = últimas 24h; Semana = 7
								dias; Quinzena = 15; Mês = 30; Tudo = toda a base.
							</InfoDica>
						</span>
						<button
							onClick={carregarMetricas}
							disabled={carregando}
							className="flex items-center gap-2 px-4 py-2 bg-background-card border border-border rounded-lg text-sm text-foreground hover:bg-background transition-colors disabled:opacity-50"
						>
							<RefreshCw className={cn('w-4 h-4', carregando && 'animate-spin')} />
							Atualizar
						</button>
					</div>
				</div>

				{erro && (
					<div className="px-4 py-3 rounded-lg text-sm bg-red-500/10 text-red-500 border border-red-500/30">
						{erro}
					</div>
				)}

				{/* KPIs do período */}
				<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
					{kpis.map(k => (
						<div
							key={k.rotulo}
							className={cn(
								'p-3 bg-background-card border rounded-xl',
								k.destaque ? 'border-primary/50' : 'border-border',
							)}
						>
							<div className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-foreground-secondary">
								{k.rotulo}
								<InfoDica>{k.dica}</InfoDica>
							</div>
							<div
								className={cn(
									'mt-1 text-xl font-semibold truncate',
									!carregado
										? 'text-foreground-secondary'
										: k.destaque
											? 'text-primary'
											: 'text-foreground',
								)}
							>
								{carregado ? k.valor : '—'}
							</div>
						</div>
					))}
				</div>

				{carregando && !metricas ? (
					<div className="p-12 text-center text-foreground-secondary">
						<Loader2 className="w-6 h-6 animate-spin mx-auto" />
					</div>
				) : metricas ? (
					<>
						<TabelaCanais
							canais={metricas.canais}
							totalSessoes={totalSessoes}
							temDuracao={temDuracao}
						/>

						<TabelaCampanhas
							campanhas={metricas.campanhas}
							totalCampanhas={metricas.campanhas_total}
							sessoesSemCampanha={metricas.sessoes_sem_campanha}
							mediaConversao={conversaoGeral}
						/>

						{/* Ciclo fechado: o que o tráfego acima virou de venda no CRM. Busca a própria
						    rota (o período é o mesmo seletor), por isso fica fora do fetch de métricas. */}
						<SecaoReceitaPorCanal dias={dias} />

						{/* Termos por conversão: qual busca traz gente que fala com a loja.
						    Rota própria porque calcula o piso de confiança no servidor. */}
						<SecaoTermosDeConversao dias={dias} />

						<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
							<MidiaPaga linhas={metricas.midia_paga ?? []} marcacao={metricas.marcacao_paga ?? []} />
							<ListaVeiculos veiculos={metricas.veiculos} />
							<ListaCidades cidades={metricas.cidades} />
						</div>
					</>
				) : null}

				{/* Visitantes identificados — lista de perfis, independente do período acima */}
				<Secao
					titulo="Visitantes identificados"
					dica="Pessoas que deixaram e-mail ou telefone no site em algum momento, com os dados de empresa que conseguimos completar. Atenção: esta lista mostra sempre a base inteira — o seletor de período no topo não se aplica a ela."
					acessorio={
						<div className="flex gap-1">
							{(Object.keys(ROTULO_PERFIL) as FiltroPerfil[]).map(f => (
								<button
									key={f}
									onClick={() => setFiltroPerfil(f)}
									className={cn(
										'px-3 py-1 text-xs rounded-lg border transition-colors',
										filtroPerfil === f
											? 'border-primary text-primary'
											: 'border-border text-foreground-secondary hover:text-foreground',
									)}
								>
									{ROTULO_PERFIL[f]}
								</button>
							))}
						</div>
					}
				>
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead className="bg-background-soft">
								<tr>
									<th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-foreground-secondary">Visitante</th>
									<th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-foreground-secondary">Empresa</th>
									<th className="px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wide text-foreground-secondary">Sessões</th>
									<th className="px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wide text-foreground-secondary">Veículos</th>
									<th className="px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wide text-foreground-secondary">Score</th>
									<th className="px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wide text-foreground-secondary">Atualizado</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-border">
								{visitantes.length === 0 ? (
									<tr>
										<td colSpan={6} className="px-3 py-8 text-center text-sm text-foreground-secondary">
											Nenhum visitante encontrado.
										</td>
									</tr>
								) : (
									visitantes.map(v => (
										<tr key={v.id} className="hover:bg-background-soft/60">
											<td className="px-3 py-2.5 text-sm">
												<p className="font-medium text-foreground">
													{v.full_name || v.email || 'Anônimo'}
												</p>
												<div className="flex flex-wrap gap-3 text-xs text-foreground-secondary">
													{v.email && (
														<span className="flex items-center gap-1">
															<Mail className="w-3 h-3" />
															{v.email}
														</span>
													)}
													{v.phone && (
														<span className="flex items-center gap-1">
															<Phone className="w-3 h-3" />
															{v.phone}
														</span>
													)}
												</div>
											</td>
											<td className="px-3 py-2.5 text-sm text-foreground">
												{v.company_name ? (
													<>
														<p>{v.company_name}</p>
														{v.job_title && (
															<p className="text-xs text-foreground-secondary">{v.job_title}</p>
														)}
													</>
												) : (
													<span className="text-foreground-secondary">—</span>
												)}
											</td>
											<td className="px-3 py-2.5 text-sm text-right tabular-nums text-foreground">
												{v.total_sessions || 0}
											</td>
											<td className="px-3 py-2.5 text-sm text-right tabular-nums text-foreground">
												{v.vehicles_interested?.length ? (
													<span className="inline-flex items-center gap-1">
														<Car className="w-3.5 h-3.5 text-foreground-secondary" />
														{v.vehicles_interested.length}
													</span>
												) : (
													<span className="text-foreground-secondary">—</span>
												)}
											</td>
											<td className="px-3 py-2.5 text-sm text-right tabular-nums text-foreground">
												{v.lead_score}
											</td>
											<td className="px-3 py-2.5 text-xs text-right text-foreground-secondary whitespace-nowrap">
												{new Date(v.updated_at).toLocaleDateString('pt-BR')}
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</Secao>

				<p className="text-center text-xs text-foreground-secondary">
					O canal de cada visita é deduzido na hora da leitura, a partir da origem já gravada quando
					a pessoa entrou no site — por isso o histórico inteiro também aparece por canal. Esta tela
					só lê: nada aqui altera dado nenhum.
				</p>
			</div>
		</div>
	)
}
