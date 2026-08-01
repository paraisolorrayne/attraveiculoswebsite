'use client'

import { Phone, Car, AlertTriangle, CalendarClock, ArrowLeftRight } from 'lucide-react'
import { situacaoInfo } from './crm-constants'
import { dataReferenciaPeriodo } from '@/lib/crm-datas'

// Card do kanban do CRM — slots fixos de identificação (com "–" quando o
// dado não veio do webhook) + blocos narrativos condicionais.
// Spec: docs/superpowers/specs/2026-07-31-crm-kanban-redesign-design.md

export interface CrmCard {
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

/* ---------- formatadores compartilhados ---------- */

export const fmtValor = (v: number | null) =>
	v === null ? null : 'R$ ' + Number(v).toLocaleString('pt-BR')

/** Valor abreviado pt-BR para somas: R$ 1,2 mi · R$ 257 mil · R$ 900. */
export const fmtValorAbrev = (v: number): string => {
	if (v >= 1_000_000) return 'R$ ' + (v / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mi'
	if (v >= 1_000) return 'R$ ' + Math.round(v / 1_000).toLocaleString('pt-BR') + ' mil'
	return 'R$ ' + v.toLocaleString('pt-BR')
}

export const fmtQuando = (iso: string) => {
	const diffMs = Date.now() - new Date(iso).getTime()
	const min = Math.floor(diffMs / 60_000)
	if (min < 60) return `${min}min`
	const h = Math.floor(min / 60)
	if (h < 48) return `${h}h`
	return `${Math.floor(h / 24)}d`
}

/** Leitura defensiva do JSONB `dados` (campos legados do contrato v1). */
export const dadoStr = (dados: Record<string, unknown> | null, chave: string): string | null => {
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

export const motivoDoCard = (c: CrmCard): string | null => {
	if (c.motivo_encerramento) return c.motivo_encerramento
	const r = dadoStr(c.dados, 'resultado')
	if (!r) return null
	return RESULTADOS_LEGADO[r] ?? r.replace(/_/g, ' ')
}

/* ---------- peças visuais ---------- */

/** Slot de identificação vazio — o dado não veio do webhook. */
const Traco = () => <span className="text-foreground-secondary/60">–</span>

export function BadgeSituacao({ situacao }: { situacao: string }) {
	const s = situacaoInfo(situacao)
	return (
		<span className={`inline-flex text-[10px] border rounded-full px-2 py-0.5 whitespace-nowrap ${s.classe}`}>
			{s.label}
		</span>
	)
}

// Paleta fixa: a cor do avatar deriva do nome (estável entre renders/sessões)
const AVATAR_CORES = ['bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500']

export function AvatarVendedor({ nome }: { nome: string }) {
	const partes = nome.trim().split(/\s+/)
	const iniciais = (partes[0][0] + (partes[1]?.[0] ?? '')).toUpperCase()
	let hash = 0
	for (let i = 0; i < nome.length; i++) hash = (hash * 31 + nome.charCodeAt(i)) | 0
	const cor = AVATAR_CORES[Math.abs(hash) % AVATAR_CORES.length]
	return (
		<span
			title={nome}
			className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-semibold text-white flex-shrink-0 ${cor}`}
		>
			{iniciais}
		</span>
	)
}

/* ---------- o card ---------- */

export function CardKanban({ card: c, encerrada, agora, onSelect }: {
	card: CrmCard
	encerrada: boolean
	agora: number
	onSelect: (c: CrmCard) => void
}) {
	const proximaAtrasada = !!c.proxima_acao_em && new Date(c.proxima_acao_em).getTime() < agora
	const motivo = encerrada ? motivoDoCard(c) : null
	const primeiroNome = c.vendedor?.trim().split(/\s+/)[0] ?? null

	return (
		<div
			role="button"
			tabIndex={0}
			onClick={() => onSelect(c)}
			onKeyDown={e => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault()
					onSelect(c)
				}
			}}
			className="p-4 bg-background-card border border-border rounded-xl cursor-pointer hover:border-foreground-secondary/40 transition-colors"
		>
			{/* Nome + situação */}
			<div className="flex items-start justify-between gap-2">
				{/* min-w-0: sem isso o nome não encolhe dentro do flex e empurra o
				    badge para fora do card em vez de cortar com reticências */}
				<div className="font-medium text-foreground text-sm truncate min-w-0">
					{c.nome || <Traco />}
				</div>
				{c.situacao && <BadgeSituacao situacao={c.situacao} />}
			</div>

			{/* Valor + tempo */}
			<div className="mt-1 flex items-center justify-between gap-2">
				<span className="text-base font-semibold text-foreground whitespace-nowrap">
					{fmtValor(c.valor) ?? <Traco />}
				</span>
				<span className="text-[11px] text-foreground-secondary">{fmtQuando(dataReferenciaPeriodo(c))}</span>
			</div>

			{/* Veículo de interesse (slot fixo) + troca (condicional) */}
			<div className="mt-2 flex items-center gap-1.5 text-xs text-foreground-secondary">
				<Car className="w-3.5 h-3.5 flex-shrink-0" />
				{c.veiculo ? <span className="truncate min-w-0" title={c.veiculo}>{c.veiculo}</span> : <Traco />}
			</div>
			{c.veiculo_troca && (
				<div className="mt-1 flex items-center gap-1.5 text-xs text-foreground-secondary">
					<ArrowLeftRight className="w-3.5 h-3.5 flex-shrink-0" />
					<span className="truncate min-w-0" title={c.veiculo_troca}>Na troca: {c.veiculo_troca}</span>
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
						{c.proxima_acao_em && ` · ${new Date(c.proxima_acao_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`}
						{proximaAtrasada && ' (atrasada)'}
					</span>
				</div>
			)}

			{/* Motivo do encerramento (com fallback pro resultado legado) */}
			{motivo && (
				<div className="mt-2 text-xs text-foreground-secondary line-clamp-2" title={motivo}>
					<span className="font-medium text-foreground">Motivo:</span> {motivo}
				</div>
			)}

			{/* Rodapé: telefone · origem · vendedor (slots fixos) */}
			<div className="mt-2 pt-2 border-t border-border/60 flex items-center justify-between gap-2 text-xs">
				{c.telefone ? (
					<a
						href={`https://wa.me/55${c.telefone.replace(/\D/g, '')}`}
						target="_blank"
						rel="noopener noreferrer"
						onClick={e => e.stopPropagation()}
						className="flex items-center gap-1 text-green-600 hover:underline whitespace-nowrap flex-shrink-0"
					>
						<Phone className="w-3 h-3" />
						{c.telefone}
					</a>
				) : (
					<span className="flex items-center gap-1 text-foreground-secondary">
						<Phone className="w-3 h-3" />
						<Traco />
					</span>
				)}
				{/* A origem é a única do rodapé que pode encolher: telefone cortado
				    fica inútil e o vendedor já tem o avatar como âncora */}
				<span className="text-[10px] uppercase tracking-wide text-foreground-secondary truncate min-w-0">
					{c.origem || <Traco />}
				</span>
				<span className="flex items-center gap-1.5 min-w-0">
					{c.vendedor ? (
						<>
							<AvatarVendedor nome={c.vendedor} />
							<span className="text-[11px] text-foreground-secondary truncate">{primeiroNome}</span>
						</>
					) : (
						<Traco />
					)}
				</span>
			</div>
		</div>
	)
}
