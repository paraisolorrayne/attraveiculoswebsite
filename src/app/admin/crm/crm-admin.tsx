'use client'

import { useState, useEffect, useCallback } from 'react'
import {
	Loader2, RefreshCw, X,
	AlertTriangle, CalendarClock, MessageSquareQuote,
} from 'lucide-react'
import { COLUNAS_KANBAN, colunaDoCard, cardSemInformacao, FONTES_EVENTO, PERIODOS } from './crm-constants'
import { InfoDica } from './info-dica'
import { dataEncerramento, dataReferenciaPeriodo } from '@/lib/crm-datas'
import {
	type CrmCard, CardKanban, BadgeSituacao,
	fmtValor, fmtValorAbrev, dadoStr, motivoDoCard,
} from './crm-card'

const colunaInfo = (c: { etapa: string; fonte_evento: string | null }) =>
	COLUNAS_KANBAN.find(col => col.id === colunaDoCard(c)) ?? COLUNAS_KANBAN[0]

const ENCERRADAS = ['encerrado_ganho', 'encerrado_perdido']

const fmtDataHora = (iso: string) => {
	const d = new Date(iso)
	if (isNaN(d.getTime())) return iso
	return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
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

// Fixtures do modo demo (?demo=1): valida o redesign sem banco/webhook.
// Cobrem as 4 colunas da visão do gestor: movimentando (reporte completo),
// assumido mínimo (slots com "–"), perdido com motivo legado e assumido
// via cobrança com impedimento + próxima ação atrasada.
const DEMO_CARDS: CrmCard[] = [
	{
		id: 'demo-1', etapa: 'em_negociacao', nome: 'Ricardo Almeida', telefone: '34999887766',
		email: 'ricardo@example.com', veiculo: 'Porsche 911 Carrera GTS 2024', valor: 1250000,
		origem: 'patrocinado', vendedor: 'Ana Souza', fonte_evento: 'reporte', situacao: 'negociando',
		andamento: 'Cliente pediu simulação com 50% de entrada, aguardando retorno do banco.',
		impedimento: null, proxima_acao: 'Enviar simulação', proxima_acao_em: new Date(Date.now() + 86_400_000).toISOString(),
		motivo_encerramento: null, veiculo_troca: 'BMW X5 2021', atribuido_em: null,
		primeiro_contato_em: null, encerrado_em: null, criado_em: null,
		atualizado_em: new Date(Date.now() - 3_600_000).toISOString(), dados: null,
	},
	{
		// Card quase vazio: só telefone. Continua VISÍVEL (um sinal basta) e
		// demonstra os slots fixos exibindo "–".
		id: 'demo-2', etapa: 'em_atendimento', nome: null, telefone: '34988776655', email: null, veiculo: null,
		valor: null, origem: null, vendedor: null, fonte_evento: 'aceite', situacao: null,
		andamento: null, impedimento: null, proxima_acao: null, proxima_acao_em: null,
		motivo_encerramento: null, veiculo_troca: null, atribuido_em: null,
		primeiro_contato_em: null, encerrado_em: null, criado_em: null,
		atualizado_em: new Date(Date.now() - 600_000).toISOString(), dados: null,
	},
	{
		id: 'demo-3', etapa: 'encerrado_perdido', nome: 'Marcelo P.', telefone: '11988776655',
		email: null, veiculo: 'Mercedes-Benz GLE63s Coupé', valor: 849000, origem: 'site',
		vendedor: 'Carlos Lima', fonte_evento: 'perda', situacao: 'comprou_outro',
		andamento: null, impedimento: null, proxima_acao: null, proxima_acao_em: null,
		motivo_encerramento: null, veiculo_troca: null, atribuido_em: null,
		primeiro_contato_em: null, encerrado_em: new Date(Date.now() - 86_400_000).toISOString(),
		criado_em: null, atualizado_em: new Date(Date.now() - 86_400_000).toISOString(),
		dados: { resultado: 'encerrado_por_inatividade' },
	},
	{
		// Card em branco vindo de cobrança automática: deve ser OCULTADO do
		// quadro e contado no aviso do rodapé.
		id: 'demo-5', etapa: 'em_atendimento', nome: null, telefone: null, email: null,
		veiculo: null, valor: null, origem: null, vendedor: null, fonte_evento: 'cobranca_semanal',
		situacao: 'sem_atualizacao', andamento: null, impedimento: null, proxima_acao: null,
		proxima_acao_em: null, motivo_encerramento: null, veiculo_troca: null, atribuido_em: null,
		primeiro_contato_em: null, encerrado_em: null, criado_em: null,
		atualizado_em: new Date(Date.now() - 1_800_000).toISOString(), dados: null,
	},
	{
		id: 'demo-4', etapa: 'em_atendimento', nome: 'Fernanda Torres', telefone: '31977665544',
		email: null, veiculo: 'Range Rover Sport 2023', valor: null, origem: 'organico',
		vendedor: 'Ana Souza', fonte_evento: 'cobranca', situacao: 'aguardando_cliente',
		andamento: null, impedimento: 'Cliente viaja até dia 10 — sem contato.',
		proxima_acao: 'Retomar contato', proxima_acao_em: new Date(Date.now() - 172_800_000).toISOString(),
		motivo_encerramento: null, veiculo_troca: null, atribuido_em: null,
		primeiro_contato_em: null, encerrado_em: null, criado_em: null,
		atualizado_em: new Date(Date.now() - 7_200_000).toISOString(), dados: null,
	},
]

export function CrmAdmin() {
	const [cards, setCards] = useState<CrmCard[]>([])
	const [loading, setLoading] = useState(true)
	const [erro, setErro] = useState<string | null>(null)
	const [selecionado, setSelecionado] = useState<CrmCard | null>(null)
	const [filtroVendedor, setFiltroVendedor] = useState<string>('') // '' = todos
	const [filtroDias, setFiltroDias] = useState<number>(0) // 0 = tudo

	const load = useCallback(async () => {
		// Modo demo (?demo=1): fixtures locais, sem tocar na API — validação
		// visual do redesign em ambientes sem banco.
		if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('demo') === '1') {
			setCards(DEMO_CARDS)
			setLoading(false)
			return
		}
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

	// Visão do gestor: leads ainda não assumidos (etapa `novo`) ficam fora
	// do painel — a história começa no aceite do vendedor.
	const cardsAssumidos = cards.filter(c => c.etapa !== 'novo')

	// Cards em branco (só etapa, situação e data) saem do quadro: não dá para
	// agir sobre eles e ainda inflavam a contagem das colunas. O total some é
	// informado abaixo do quadro, para o número não desaparecer calado.
	const cardsBase = cardsAssumidos.filter(c => !cardSemInformacao(c))
	const ocultosSemInfo = cardsAssumidos.length - cardsBase.length

	// Vendedores únicos (pro filtro). Alguns nomes não são vendedores — ocultos.
	const VENDEDORES_OCULTOS = ['guilherme']
	const vendedorOculto = (v: string) => VENDEDORES_OCULTOS.some(o => v.toLowerCase().includes(o))
	const vendedores = [...new Set(cardsBase.map(c => c.vendedor).filter((v): v is string => !!v))]
		.filter(v => !vendedorOculto(v))
		.sort()

	const agora = Date.now()
	const cardsFiltrados = cardsBase.filter(c => {
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

	// KPIs sobre o conjunto filtrado (visão do gestor)
	const kpiTotal = cardsFiltrados.length
	const kpiAssumidos = cardsFiltrados.filter(c => colunaDoCard(c) === 'assumido').length
	const kpiMovimentando = cardsFiltrados.filter(c => colunaDoCard(c) === 'movimentando').length
	const ganhosFiltrados = cardsFiltrados.filter(c => colunaDoCard(c) === 'ganho')
	const kpiGanhos = ganhosFiltrados.length
	const somaGanhos = ganhosFiltrados.reduce((s, c) => s + (c.valor !== null ? Number(c.valor) : 0), 0)
	const kpiPerdidos = cardsFiltrados.filter(c => colunaDoCard(c) === 'perdido').length
	const kpiValorAberto = cardsFiltrados
		.filter(c => !ENCERRADAS.includes(c.etapa) && c.valor !== null)
		.reduce((s, c) => s + Number(c.valor), 0)

	const kpis: { rotulo: string; valor: string; dica: string }[] = [
		{ rotulo: 'Leads', valor: String(kpiTotal), dica: 'Total de leads assumidos por vendedor que se movimentaram no período selecionado, já com o filtro de vendedor aplicado. Leads ainda sem vendedor não entram no painel.' },
		{ rotulo: 'Assumidos', valor: String(kpiAssumidos), dica: 'O vendedor aceitou o lead e confirmou o contato, mas ainda não reportou movimentação nas cobranças.' },
		{ rotulo: 'Movimentando', valor: String(kpiMovimentando), dica: 'Leads cujo último evento é um reporte do vendedor — a conversa está andando de fato.' },
		{ rotulo: 'Ganhos', valor: somaGanhos > 0 ? `${kpiGanhos} · ${fmtValorAbrev(somaGanhos)}` : String(kpiGanhos), dica: 'Vendas concluídas no período: quantidade e soma dos valores.' },
		{ rotulo: 'Perdidos', valor: String(kpiPerdidos), dica: 'Leads encerrados sem venda no período. O motivo aparece em cada card.' },
		{ rotulo: 'R$ em aberto', valor: kpiValorAberto > 0 ? 'R$ ' + kpiValorAberto.toLocaleString('pt-BR') : '—', dica: 'Soma dos valores dos leads ainda ativos (Assumidos + Movimentando). É o potencial de venda na mesa.' },
	]

	return (
		<div className="max-w-full px-4 sm:px-6 py-8">
			<div className="flex items-center justify-between mb-4 max-w-[1600px] mx-auto flex-wrap gap-3">
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
				<div className="max-w-[1600px] mx-auto mb-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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
				<div className="max-w-[1600px] mx-auto mb-4 px-4 py-3 rounded-lg text-sm bg-red-500/10 text-red-500 border border-red-500/30">
					Não foi possível carregar os leads agora. Tente atualizar em instantes.
				</div>
			)}

			{loading && cards.length === 0 ? (
				<div className="p-12 text-center text-foreground-secondary">
					<Loader2 className="w-6 h-6 animate-spin mx-auto" />
				</div>
			) : cards.length === 0 && !erro ? (
				<div className="max-w-[1600px] mx-auto p-12 text-center bg-background-card border border-border rounded-xl">
					<p className="text-foreground font-medium">Nenhum lead ainda</p>
					<p className="text-sm text-foreground-secondary mt-2">
						Este painel é alimentado automaticamente. Assim que o primeiro
						lead for enviado, ele aparece aqui.
					</p>
				</div>
			) : cardsFiltrados.length === 0 ? (
				<div className="max-w-[1600px] mx-auto p-12 text-center bg-background-card border border-border rounded-xl">
					<p className="text-foreground font-medium">Nenhum lead para os filtros selecionados</p>
					<p className="text-sm text-foreground-secondary mt-2">Ajuste o período ou o vendedor no topo.</p>
				</div>
			) : (
				<div className="flex gap-4 overflow-x-auto pb-4 max-w-[1600px] mx-auto">
					{COLUNAS_KANBAN.map(col => {
						const daColuna = cardsFiltrados.filter(c => colunaDoCard(c) === col.id)
						const somaColuna = daColuna.reduce((s, c) => s + (c.valor !== null ? Number(c.valor) : 0), 0)
						return (
							// As colunas dividem a largura disponível em vez de terem 320px
							// fixos: com 4 colunas fixas a soma estourava o container e a
							// última ficava cortada mesmo em tela larga. O min-width mantém
							// o scroll horizontal em telas estreitas.
							<div key={col.id} className="flex-1 min-w-[19rem] max-w-[26rem]">
								{/* Faixa tingida na cor da coluna: label + contagem + soma dos valores */}
								<div className={`flex items-center justify-between gap-2 border rounded-lg px-3 py-2 mb-3 ${col.badge}`}>
									<h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide min-w-0">
										<span className={`w-2 h-2 rounded-full flex-shrink-0 ${col.dot}`} />
										<span className="truncate">{col.label}</span>
										<InfoDica>{col.descricao}</InfoDica>
									</h2>
									<span className="text-xs whitespace-nowrap">
										{daColuna.length}
										<span className="opacity-70"> · {somaColuna > 0 ? fmtValorAbrev(somaColuna) : '–'}</span>
									</span>
								</div>
								<div className="space-y-3">
									{daColuna.map(c => (
										<CardKanban
											key={c.id}
											card={c}
											encerrada={col.encerrada}
											agora={agora}
											onSelect={setSelecionado}
										/>
									))}
								</div>
							</div>
						)
					})}
				</div>
			)}

			{selecionado && (
				<DetalhesModal card={selecionado} onClose={() => setSelecionado(null)} />
			)}

			<p className="max-w-[1600px] mx-auto mt-6 text-xs text-foreground-secondary">
				{ocultosSemInfo > 0 && (
					<>
						{ocultosSemInfo === 1
							? '1 lead sem nenhuma informação foi ocultado'
							: `${ocultosSemInfo} leads sem nenhuma informação foram ocultados`}
						<InfoDica>
							Chegaram do CRM só com etapa e data, sem nome, telefone, veículo,
							valor ou relato do vendedor — não há o que ler nem o que fazer com
							eles. Continuam no CRM; some apenas do quadro.
						</InfoDica>
						{' · '}
					</>
				)}
				Atualização automática a cada 60s
			</p>
		</div>
	)
}

// Modal de detalhes — 100% somente leitura (nenhuma ação/edição)
function DetalhesModal({ card, onClose }: { card: CrmCard; onClose: () => void }) {
	const estilo = colunaInfo(card)
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
								{estilo.label}
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
