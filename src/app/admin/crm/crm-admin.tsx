'use client'

import { useState, useEffect, useCallback } from 'react'
import {
	Loader2, RefreshCw, Phone, Car, X,
	AlertTriangle, CalendarClock, ArrowLeftRight, MessageSquareQuote,
} from 'lucide-react'
import { ETAPAS_KANBAN, ETAPA_DESCONHECIDA, situacaoInfo, FONTES_EVENTO, PERIODOS } from './crm-constants'
import { InfoDica } from './info-dica'
import { dataEncerramento, dataReferenciaPeriodo } from '@/lib/crm-datas'

interface CrmCard {
	id: string
	etapa: string
	nome: string | null
	telefone: string | null
	email: string | null
	veiculo: string | null
	valor: number | null
	origem: string | null
	vendedor: string | null
	fonte_evento: string | null
	situacao: string | null
	andamento: string | null
	impedimento: string | null
	proxima_acao: string | null
	proxima_acao_em: string | null
	motivo_encerramento: string | null
	veiculo_troca: string | null
	atribuido_em: string | null
	primeiro_contato_em: string | null
	encerrado_em: string | null
	criado_em: string | null
	atualizado_em: string
	dados: Record<string, unknown> | null
}

const etapaLabel = (e: string) => {
	const fixa = ETAPAS_KANBAN.find(f => f.id === e)
	if (fixa) return fixa.label
	return e.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

const etapaEstilo = (e: string) =>
	ETAPAS_KANBAN.find(f => f.id === e) ?? ETAPA_DESCONHECIDA

const ENCERRADAS = ['encerrado_ganho', 'encerrado_perdido']

const fmtValor = (v: number | null) =>
	v === null ? null : 'R$ ' + Number(v).toLocaleString('pt-BR')

const fmtQuando = (iso: string) => {
	const diffMs = Date.now() - new Date(iso).getTime()
	const min = Math.floor(diffMs / 60_000)
	if (min < 60) return `${min}min`
	const h = Math.floor(min / 60)
	if (h < 48) return `${h}h`
	return `${Math.floor(h / 24)}d`
}

const fmtDataHora = (iso: string) => {
	const d = new Date(iso)
	if (isNaN(d.getTime())) return iso
	return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

const fmtDataCurta = (iso: string) => {
	const d = new Date(iso)
	if (isNaN(d.getTime())) return iso
	return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

// Leitura defensiva do JSONB `dados` (campos legados do contrato v1)
const dadoStr = (dados: Record<string, unknown> | null, chave: string): string | null => {
	const v = dados?.[chave]
	return typeof v === 'string' && v.trim() !== '' ? v : null
}

// Enquanto o emissor não envia motivo_encerramento (v2), a maioria dos
// encerrados traz só o enum legado `resultado` nos extras — humanizado aqui.
// Nota ao emissor: docs/crm/nota-emissor-webhook-2026-07-31.md
const RESULTADOS_LEGADO: Record<string, string> = {
	encerrado_por_inatividade: 'Encerrado por inatividade',
	corrigido_auto_atribuicao_indevida: 'Correção do gestor: atribuição indevida',
	fechado_sem_venda_vendedor: 'Fechado sem venda pelo vendedor',
	perdido_proposta_muito_baixa: 'Proposta muito baixa',
	descartado_invalido_vendedor: 'Lead inválido (descartado pelo vendedor)',
	alerta_rejeitado: 'Alerta rejeitado',
	nao_genuino_crianca: 'Lead não genuíno',
	venda: 'Venda concluída',
}

const motivoDoCard = (c: CrmCard): string | null => {
	if (c.motivo_encerramento) return c.motivo_encerramento
	const r = dadoStr(c.dados, 'resultado')
	if (!r) return null
	return RESULTADOS_LEGADO[r] ?? r.replace(/_/g, ' ')
}

const ultimaResposta = (
	dados: Record<string, unknown> | null,
): { texto: string; em: string | null } | null => {
	const v = dados?.ultima_resposta_vendedor
	if (!v || typeof v !== 'object') return null
	const o = v as Record<string, unknown>
	if (typeof o.texto !== 'string' || o.texto.trim() === '') return null
	return { texto: o.texto, em: typeof o.em === 'string' ? o.em : null }
}

function BadgeSituacao({ situacao }: { situacao: string }) {
	const s = situacaoInfo(situacao)
	return (
		<span className={`inline-flex text-[10px] border rounded-full px-2 py-0.5 whitespace-nowrap ${s.classe}`}>
			{s.label}
		</span>
	)
}

export function CrmAdmin() {
	const [cards, setCards] = useState<CrmCard[]>([])
	const [loading, setLoading] = useState(true)
	const [erro, setErro] = useState<string | null>(null)
	const [selecionado, setSelecionado] = useState<CrmCard | null>(null)
	const [filtroVendedor, setFiltroVendedor] = useState<string>('') // '' = todos
	const [filtroDias, setFiltroDias] = useState<number>(0) // 0 = tudo

	const load = useCallback(async () => {
		setLoading(true)
		setErro(null)
		try {
			const r = await fetch('/api/admin/crm/cards')
			const d = await r.json()
			if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`)
			setCards(d.cards || [])
		} catch (e) {
			setErro(e instanceof Error ? e.message : 'Falha ao carregar')
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		load()
		// o CRM empurra mudanças a qualquer momento — atualiza a cada 60s
		const t = setInterval(load, 60_000)
		return () => clearInterval(t)
	}, [load])

	// Esc fecha o modal de detalhes
	useEffect(() => {
		if (!selecionado) return
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') setSelecionado(null)
		}
		window.addEventListener('keydown', onKey)
		return () => window.removeEventListener('keydown', onKey)
	}, [selecionado])

	// Colunas fixas sempre visíveis, na ordem do contrato; desconhecidas no fim
	const etapas: string[] = ETAPAS_KANBAN.map(f => f.id)
	for (const c of cards) if (!etapas.includes(c.etapa)) etapas.push(c.etapa)

	// Vendedores únicos (pro filtro). Alguns nomes não são vendedores — ocultos.
	const VENDEDORES_OCULTOS = ['guilherme']
	const vendedorOculto = (v: string) => VENDEDORES_OCULTOS.some(o => v.toLowerCase().includes(o))
	const vendedores = [...new Set(cards.map(c => c.vendedor).filter((v): v is string => !!v))]
		.filter(v => !vendedorOculto(v))
		.sort()

	const agora = Date.now()
	const cardsFiltrados = cards.filter(c => {
		if (filtroVendedor && c.vendedor !== filtroVendedor) return false
		if (filtroDias > 0) {
			// Ativos: movimentação (atualizado_em). Encerrados: data EFETIVA do
			// encerramento — o lote v1 carimbava atualizado_em e fazia venda de
			// semanas atrás aparecer como "ganho do período".
			const t = new Date(dataReferenciaPeriodo(c)).getTime()
			if (Number.isNaN(t) || agora - t > filtroDias * 86_400_000) return false
		}
		return true
	})

	// KPIs sobre o conjunto filtrado
	const kpiTotal = cardsFiltrados.length
	const kpiNovos = cardsFiltrados.filter(c => c.etapa === 'novo').length
	const kpiNegociacao = cardsFiltrados.filter(c => c.etapa === 'em_negociacao').length
	const kpiGanhos = cardsFiltrados.filter(c => c.etapa === 'encerrado_ganho').length
	const kpiPerdidos = cardsFiltrados.filter(c => c.etapa === 'encerrado_perdido').length
	const kpiValorAberto = cardsFiltrados
		.filter(c => !ENCERRADAS.includes(c.etapa) && c.valor !== null)
		.reduce((s, c) => s + Number(c.valor), 0)

	const kpis: { rotulo: string; valor: string; dica: string }[] = [
		{ rotulo: 'Leads', valor: String(kpiTotal), dica: 'Total de leads que se movimentaram no período selecionado (todas as colunas), já com o filtro de vendedor aplicado.' },
		{ rotulo: 'Novos', valor: String(kpiNovos), dica: 'Leads na coluna Novo: chegaram e ainda não foram assumidos por um vendedor.' },
		{ rotulo: 'Em negociação', valor: String(kpiNegociacao), dica: 'Leads com proposta, valores ou troca em discussão — os mais quentes do funil.' },
		{ rotulo: 'Ganhos', valor: String(kpiGanhos), dica: 'Vendas concluídas no período (coluna Encerrado — Ganho).' },
		{ rotulo: 'Perdidos', valor: String(kpiPerdidos), dica: 'Leads encerrados sem venda no período. O motivo aparece em cada card.' },
		{ rotulo: 'R$ em aberto', valor: kpiValorAberto > 0 ? 'R$ ' + kpiValorAberto.toLocaleString('pt-BR') : '—', dica: 'Soma dos valores dos leads ainda ativos (Novo + Em atendimento + Em negociação). É o potencial de venda na mesa.' },
	]

	return (
		<div className="max-w-full px-4 sm:px-6 py-8">
			<div className="flex items-center justify-between mb-4 max-w-7xl mx-auto flex-wrap gap-3">
				<div>
					<h1 className="text-2xl font-bold text-foreground">CRM</h1>
					<p className="text-sm text-foreground-secondary mt-1">
						Espelho do funil de vendas — somente leitura. As atualizações dos
						vendedores aparecem aqui automaticamente.
					</p>
				</div>
				<div className="flex items-center gap-3 flex-wrap justify-end">
					<span className="flex items-center gap-1.5">
						<select
							value={filtroDias}
							onChange={e => setFiltroDias(Number(e.target.value))}
							className="px-3 py-2 bg-background-card border border-border rounded-lg text-sm text-foreground hover:bg-background transition-colors"
						>
							{PERIODOS.map(p => (
								<option key={p.dias} value={p.dias}>{p.label}</option>
							))}
						</select>
						<InfoDica>
							Leads ativos: filtra pela última movimentação. Encerrados: pela data em que
							foram ganhos/perdidos de fato. &ldquo;Hoje&rdquo; = últimas 24h; Semana = 7 dias;
							Quinzena = 15; Mês = 30.
						</InfoDica>
					</span>
					{vendedores.length > 0 && (
						<select
							value={filtroVendedor}
							onChange={e => setFiltroVendedor(e.target.value)}
							className="px-3 py-2 bg-background-card border border-border rounded-lg text-sm text-foreground hover:bg-background transition-colors max-w-[200px]"
							title="Filtrar por vendedor"
						>
							<option value="">Todos os vendedores</option>
							{vendedores.map(v => (
								<option key={v} value={v}>{v}</option>
							))}
						</select>
					)}
					<button
						onClick={load}
						disabled={loading}
						className="flex items-center gap-2 px-4 py-2 bg-background-card border border-border rounded-lg text-sm text-foreground hover:bg-background transition-colors disabled:opacity-50"
					>
						<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
						Atualizar
					</button>
				</div>
			</div>

			{/* KPIs do período */}
			{cards.length > 0 && (
				<div className="max-w-7xl mx-auto mb-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
					{kpis.map(k => (
						<div key={k.rotulo} className="p-3 bg-background-card border border-border rounded-xl">
							<div className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-foreground-secondary">
								{k.rotulo}
								<InfoDica>{k.dica}</InfoDica>
							</div>
							<div className="mt-1 text-xl font-semibold text-foreground truncate">{k.valor}</div>
						</div>
					))}
				</div>
			)}

			{erro && (
				<div className="max-w-7xl mx-auto mb-4 px-4 py-3 rounded-lg text-sm bg-red-500/10 text-red-500 border border-red-500/30">
					{erro} — confira se a migration <code>20260727_crm_v2.sql</code> foi aplicada.
				</div>
			)}

			{loading && cards.length === 0 ? (
				<div className="p-12 text-center text-foreground-secondary">
					<Loader2 className="w-6 h-6 animate-spin mx-auto" />
				</div>
			) : cards.length === 0 && !erro ? (
				<div className="max-w-7xl mx-auto p-12 text-center bg-background-card border border-border rounded-xl">
					<p className="text-foreground font-medium">Nenhum lead ainda</p>
					<p className="text-sm text-foreground-secondary mt-2">
						Este painel é alimentado automaticamente. Assim que o primeiro
						lead for enviado, ele aparece aqui.
					</p>
				</div>
			) : cardsFiltrados.length === 0 ? (
				<div className="max-w-7xl mx-auto p-12 text-center bg-background-card border border-border rounded-xl">
					<p className="text-foreground font-medium">Nenhum lead para os filtros selecionados</p>
					<p className="text-sm text-foreground-secondary mt-2">Ajuste o período ou o vendedor no topo.</p>
				</div>
			) : (
				<div className="flex gap-4 overflow-x-auto pb-4 max-w-7xl mx-auto">
					{etapas.map(etapa => {
						const daEtapa = cardsFiltrados.filter(c => c.etapa === etapa)
						const estilo = etapaEstilo(etapa)
						const encerrada = ENCERRADAS.includes(etapa)
						return (
							<div key={etapa} className="flex-shrink-0 w-80">
								<div className="flex items-center justify-between px-1 mb-3">
									<h2 className="flex items-center gap-2 text-sm font-semibold text-foreground uppercase tracking-wide">
										<span className={`w-2 h-2 rounded-full flex-shrink-0 ${estilo.dot}`} />
										{etapaLabel(etapa)}
										<InfoDica>{estilo.descricao}</InfoDica>
									</h2>
									<span className={`text-xs border rounded-full px-2 py-0.5 ${estilo.badge}`}>
										{daEtapa.length}
									</span>
								</div>
								<div className="space-y-3">
									{daEtapa.map(c => {
										const proximaAtrasada = !!c.proxima_acao_em && new Date(c.proxima_acao_em).getTime() < agora
										return (
											<div
												key={c.id}
												role="button"
												tabIndex={0}
												onClick={() => setSelecionado(c)}
												onKeyDown={e => {
													if (e.key === 'Enter' || e.key === ' ') {
														e.preventDefault()
														setSelecionado(c)
													}
												}}
												className="p-4 bg-background-card border border-border rounded-xl cursor-pointer hover:border-foreground-secondary/40 transition-colors"
											>
												{/* Nome + situação */}
												<div className="flex items-start justify-between gap-2">
													<div className="font-medium text-foreground text-sm truncate">
														{c.nome || 'Sem nome'}
													</div>
													{c.situacao && <BadgeSituacao situacao={c.situacao} />}
												</div>
												{/* Valor + tempo */}
												<div className="mt-1 flex items-center justify-between gap-2">
													{c.valor !== null ? (
														<span className="text-base font-semibold text-foreground whitespace-nowrap">
															{fmtValor(c.valor)}
														</span>
													) : <span />}
													<span className="text-[11px] text-foreground-secondary">{fmtQuando(dataReferenciaPeriodo(c))}</span>
												</div>
												{/* Veículo de interesse + troca */}
												{c.veiculo && (
													<div className="mt-2 flex items-center gap-1.5 text-xs text-foreground-secondary">
														<Car className="w-3.5 h-3.5 flex-shrink-0" />
														<span className="truncate">{c.veiculo}</span>
													</div>
												)}
												{c.veiculo_troca && (
													<div className="mt-1 flex items-center gap-1.5 text-xs text-foreground-secondary">
														<ArrowLeftRight className="w-3.5 h-3.5 flex-shrink-0" />
														<span className="truncate">Na troca: {c.veiculo_troca}</span>
													</div>
												)}
												{/* Andamento — a última fala do vendedor */}
												{c.andamento && (
													<div className="mt-2 border-l-2 border-blue-400/60 pl-2 text-xs italic text-foreground line-clamp-3">
														{c.andamento}
													</div>
												)}
												{/* Impedimento */}
												{c.impedimento && (
													<div className="mt-2 flex items-start gap-1.5 bg-red-500/10 text-red-600 dark:text-red-400 rounded px-2 py-1 text-xs">
														<AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
														<span className="line-clamp-2">{c.impedimento}</span>
													</div>
												)}
												{/* Próxima ação (mostra também quando só a data veio) */}
												{(c.proxima_acao || c.proxima_acao_em) && (
													<div className={`mt-2 flex items-start gap-1.5 text-xs ${proximaAtrasada ? 'text-amber-600 dark:text-amber-400' : 'text-foreground-secondary'}`}>
														<CalendarClock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
														<span className="line-clamp-2">
															{c.proxima_acao || 'Próxima ação'}
															{c.proxima_acao_em && ` · ${fmtDataCurta(c.proxima_acao_em)}`}
															{proximaAtrasada && ' (atrasada)'}
														</span>
													</div>
												)}
												{/* Motivo do encerramento (com fallback pro resultado legado) */}
												{encerrada && motivoDoCard(c) && (
													<div className="mt-2 text-xs text-foreground-secondary">
														<span className="font-medium text-foreground">Motivo:</span> {motivoDoCard(c)}
													</div>
												)}
												{/* Rodapé: contato + vendedor + origem */}
												<div className="mt-2 flex items-center justify-between">
													{c.telefone ? (
														<a
															href={`https://wa.me/55${c.telefone.replace(/\D/g, '')}`}
															target="_blank"
															rel="noopener noreferrer"
															onClick={e => e.stopPropagation()}
															className="flex items-center gap-1 text-xs text-green-600 hover:underline"
														>
															<Phone className="w-3 h-3" />
															{c.telefone}
														</a>
													) : <span />}
													{c.origem && (
														<span className="text-[10px] uppercase tracking-wide text-foreground-secondary">
															{c.origem}
														</span>
													)}
												</div>
												{c.vendedor && (
													<div className="mt-1.5 text-[11px] text-foreground-secondary">
														Vendedor: {c.vendedor}
													</div>
												)}
											</div>
										)
									})}
								</div>
							</div>
						)
					})}
				</div>
			)}

			{selecionado && (
				<DetalhesModal card={selecionado} onClose={() => setSelecionado(null)} />
			)}

			<p className="max-w-7xl mx-auto mt-6 text-xs text-foreground-secondary">
				Atualização automática a cada 60s
			</p>
		</div>
	)
}

// Modal de detalhes — 100% somente leitura (nenhuma ação/edição)
function DetalhesModal({ card, onClose }: { card: CrmCard; onClose: () => void }) {
	const estilo = etapaEstilo(card.etapa)
	// Campos legados do v1, mantidos se ainda vierem no JSONB
	const observacoes = dadoStr(card.dados, 'observacoes_alerta')
	const resposta = ultimaResposta(card.dados)
	const fonte = card.fonte_evento ? (FONTES_EVENTO[card.fonte_evento] ?? card.fonte_evento) : null

	const infos: { rotulo: string; valor: string | null }[] = [
		{ rotulo: 'Telefone', valor: card.telefone },
		{ rotulo: 'E-mail', valor: card.email },
		{ rotulo: 'Veículo de interesse', valor: card.veiculo },
		{ rotulo: 'Na troca', valor: card.veiculo_troca },
		{ rotulo: 'Vendedor', valor: card.vendedor },
		{ rotulo: 'Origem', valor: card.origem },
	]

	const linhaDoTempo: { rotulo: string; valor: string | null }[] = [
		{ rotulo: 'Atribuído em', valor: (card.atribuido_em || dadoStr(card.dados, 'atribuido_em')) ? fmtDataHora(card.atribuido_em || dadoStr(card.dados, 'atribuido_em')!) : null },
		{ rotulo: 'Primeiro contato', valor: card.primeiro_contato_em ? fmtDataHora(card.primeiro_contato_em) : null },
		{ rotulo: 'Atualizado em', valor: fmtDataHora(card.atualizado_em) },
		{ rotulo: 'Encerrado em', valor: dataEncerramento(card) ? fmtDataHora(dataEncerramento(card)!) : null },
	]

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
			onClick={onClose}
		>
			<div
				className="bg-background-card border border-border rounded-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
				onClick={e => e.stopPropagation()}
			>
				{/* Header */}
				<div className="flex items-start justify-between gap-3 p-4 border-b border-border">
					<div className="min-w-0">
						<h2 className="text-lg font-semibold text-foreground truncate">
							{card.nome || 'Sem nome'}
						</h2>
						<div className="flex items-center gap-2 mt-1.5 flex-wrap">
							<span className={`inline-flex items-center gap-1.5 text-xs border rounded-full px-2 py-0.5 ${estilo.badge}`}>
								<span className={`w-1.5 h-1.5 rounded-full ${estilo.dot}`} />
								{etapaLabel(card.etapa)}
							</span>
							{card.situacao && <BadgeSituacao situacao={card.situacao} />}
						</div>
					</div>
					<div className="flex items-center gap-2 flex-shrink-0">
						{card.valor !== null && (
							<span className="text-xl font-semibold text-foreground whitespace-nowrap">
								{fmtValor(card.valor)}
							</span>
						)}
						<button
							onClick={onClose}
							aria-label="Fechar"
							className="p-2 hover:bg-background rounded-lg transition-colors"
						>
							<X className="w-5 h-5 text-foreground-secondary" />
						</button>
					</div>
				</div>

				{/* Conteúdo */}
				<div className="p-4 overflow-y-auto space-y-4">
					<dl className="grid grid-cols-2 gap-x-4 gap-y-3">
						{infos.filter(i => i.valor).map(i => (
							<div key={i.rotulo}>
								<dt className="text-[11px] uppercase tracking-wide text-foreground-secondary">
									{i.rotulo}
								</dt>
								<dd className="text-sm text-foreground mt-0.5">{i.valor}</dd>
							</div>
						))}
					</dl>

					{/* Standup do vendedor */}
					{(card.andamento || card.impedimento || card.proxima_acao) && (
						<div className="space-y-2">
							<h3 className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-foreground-secondary">
								<MessageSquareQuote className="w-3.5 h-3.5" />
								Standup do vendedor
								<InfoDica>
									O que o vendedor reportou por último: andamento da conversa, bloqueio
									(se houver) e a próxima ação agendada.
								</InfoDica>
							</h3>
							{card.andamento && (
								<blockquote className="text-sm text-foreground border-l-2 border-blue-400/60 pl-3 whitespace-pre-wrap">
									{card.andamento}
								</blockquote>
							)}
							{card.impedimento && (
								<div className="flex items-start gap-1.5 bg-red-500/10 text-red-600 dark:text-red-400 rounded px-2 py-1.5 text-sm">
									<AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
									{card.impedimento}
								</div>
							)}
							{card.proxima_acao && (
								<div className="flex items-start gap-1.5 text-sm text-foreground">
									<CalendarClock className="w-4 h-4 flex-shrink-0 mt-0.5 text-foreground-secondary" />
									<span>
										{card.proxima_acao}
										{card.proxima_acao_em && (
											<span className="text-foreground-secondary"> · {fmtDataHora(card.proxima_acao_em)}</span>
										)}
									</span>
								</div>
							)}
						</div>
					)}

					{motivoDoCard(card) && (
						<div>
							<h3 className="text-[11px] uppercase tracking-wide text-foreground-secondary mb-1">
								Motivo do encerramento
							</h3>
							<p className="text-sm text-foreground whitespace-pre-wrap">{motivoDoCard(card)}</p>
						</div>
					)}

					{/* Linha do tempo */}
					<div>
						<h3 className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-foreground-secondary mb-2">
							Linha do tempo
							{fonte && (
								<>
									<span className="normal-case tracking-normal">· via {fonte}</span>
									<InfoDica>
										Qual evento do CRM gerou a última atualização deste card
										(alerta, aceite, reporte do vendedor, cobrança, venda, perda ou correção manual do gestor).
									</InfoDica>
								</>
							)}
						</h3>
						<dl className="grid grid-cols-2 gap-x-4 gap-y-3">
							{linhaDoTempo.filter(d => d.valor).map(d => (
								<div key={d.rotulo}>
									<dt className="text-[11px] uppercase tracking-wide text-foreground-secondary">
										{d.rotulo}
									</dt>
									<dd className="text-sm text-foreground mt-0.5">{d.valor}</dd>
								</div>
							))}
						</dl>
					</div>

					{/* Campos legados do v1 (se ainda presentes no JSONB) */}
					{observacoes && (
						<div>
							<h3 className="text-[11px] uppercase tracking-wide text-foreground-secondary mb-1">
								Observações do alerta
							</h3>
							<p className="text-sm text-foreground whitespace-pre-wrap">{observacoes}</p>
						</div>
					)}
					{resposta && (
						<div>
							<h3 className="text-[11px] uppercase tracking-wide text-foreground-secondary mb-1">
								Última resposta do vendedor (v1)
							</h3>
							<blockquote className="text-sm text-foreground border-l-2 border-border pl-3 whitespace-pre-wrap">
								{resposta.texto}
							</blockquote>
							{resposta.em && (
								<p className="text-[11px] text-foreground-secondary mt-1">
									{fmtDataHora(resposta.em)}
								</p>
							)}
						</div>
					)}
				</div>
			</div>
		</div>
	)
}
