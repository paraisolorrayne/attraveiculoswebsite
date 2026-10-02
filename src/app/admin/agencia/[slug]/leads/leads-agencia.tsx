'use client'

import { useCallback, useEffect, useState } from 'react'
import { useVisitantesApi } from '@/app/admin/visitors/visitantes-api'
import { Secao } from '@/app/admin/visitors/visitors-tabelas'
import { TabelaOrdenavel, type ColunaTabela } from '@/app/admin/visitors/visitors-tabela'
import { Badge, Erro } from '@/app/admin/visitors/visitors-ui'
import { fmtNum, fmtPct, taxa } from '@/app/admin/visitors/visitors-metrics'
import type { ContagemLeads, LeadDaAgencia, StatusLead } from '@/lib/visitors/consultas/leads-agencia'

type LinhaCampanha = ContagemLeads & { campanha: string; plataforma: string | null }

interface Dados {
	total: ContagemLeads
	porCampanha: LinhaCampanha[]
	lista: LeadDaAgencia[]
}

const ROTULO_PLATAFORMA: Record<string, string> = { google: 'Google', meta: 'Meta', webmotors: 'WebMotors' }
const STATUS: Record<StatusLead, { rotulo: string; cor: string }> = {
	com_vendedor: { rotulo: 'Com vendedor', cor: 'bg-amber-500/10 text-amber-500' },
	vendido: { rotulo: 'Vendido', cor: 'bg-emerald-500/10 text-emerald-500' },
	perdido: { rotulo: 'Perdido', cor: 'bg-foreground/10 text-foreground-secondary' },
}

const COBERTURA =
	'Contam os leads do CRM ligados a uma visita do site: pelo clique no WhatsApp no mesmo carro ou pelo telefone de quem se identificou no site. ' +
	'O lead é de vocês quando qualquer visita da pessoa nos 90 dias antes dele veio das suas campanhas. ' +
	'Ainda não entram os leads de anúncio que abre o WhatsApp direto, sem passar pelo site, nem os que não chegaram a um vendedor — passam a entrar quando o CRM enviar a campanha de cada lead.'

function dataHora(iso: string): string {
	return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
}

const colunasCampanha: ColunaTabela<LinhaCampanha>[] = [
	{ chave: 'campanha', titulo: 'Campanha', render: l => <span className="break-words">{l.campanha}</span>, valor: l => l.campanha, filtro: 'texto', prioridade: 1 },
	{ chave: 'entraram', titulo: 'Entraram', render: l => fmtNum(l.entraram), valor: l => l.entraram, alinhar: 'dir', prioridade: 1 },
	{ chave: 'com_vendedor', titulo: 'Com vendedor', render: l => fmtNum(l.com_vendedor), valor: l => l.com_vendedor, alinhar: 'dir', prioridade: 2 },
	{ chave: 'vendidos', titulo: 'Vendidos', render: l => fmtNum(l.vendidos), valor: l => l.vendidos, alinhar: 'dir', prioridade: 1 },
	{ chave: 'perdidos', titulo: 'Perdidos', render: l => fmtNum(l.perdidos), valor: l => l.perdidos, alinhar: 'dir', prioridade: 2 },
	{ chave: 'taxa', titulo: 'Lead → venda', render: l => fmtPct(taxa(l.vendidos, l.entraram)), valor: l => taxa(l.vendidos, l.entraram), alinhar: 'dir', prioridade: 3 },
	{ chave: 'plataforma', titulo: 'Plataforma', render: l => ROTULO_PLATAFORMA[l.plataforma ?? ''] ?? '—', valor: l => ROTULO_PLATAFORMA[l.plataforma ?? ''] ?? '—', filtro: 'opcoes', prioridade: 3 },
]

const colunasLista: ColunaTabela<LeadDaAgencia>[] = [
	{ chave: 'entrada', titulo: 'Entrada', render: l => <span className="tabular-nums">{dataHora(l.entrada)}</span>, valor: l => l.entrada, prioridade: 1 },
	{ chave: 'campanha', titulo: 'Campanha', render: l => <span className="break-words">{l.campanha}</span>, valor: l => l.campanha, filtro: 'texto', prioridade: 1 },
	{ chave: 'status', titulo: 'Status', render: l => <Badge cor={STATUS[l.status].cor}>{STATUS[l.status].rotulo}</Badge>, valor: l => STATUS[l.status].rotulo, filtro: 'opcoes', prioridade: 1 },
	{ chave: 'veiculo', titulo: 'Veículo', render: l => <span className="break-words">{l.veiculo}</span>, valor: l => l.veiculo, filtro: 'texto', prioridade: 2 },
	{ chave: 'tipo', titulo: 'Tipo', render: l => (l.tipo === 'comprar' ? 'Comprar' : 'Vender/trocar'), valor: l => l.tipo, prioridade: 3 },
	{ chave: 'plataforma', titulo: 'Plataforma', render: l => ROTULO_PLATAFORMA[l.plataforma ?? ''] ?? '—', valor: l => ROTULO_PLATAFORMA[l.plataforma ?? ''] ?? '—', filtro: 'opcoes', prioridade: 3 },
	{
		chave: 'ligacao',
		titulo: 'Como foi ligado',
		render: l => (l.ligacao === 'clique' ? 'Na visita da campanha' : 'Em visita anterior'),
		valor: l => l.ligacao,
		prioridade: 3,
	},
]

/**
 * Leads da agência: quantos entraram no CRM vindos das campanhas dela, quantos
 * estão com vendedor, vendidos e perdidos — no total, por campanha e um a um.
 * Sem nome, telefone, vendedor ou valor (a consulta nem devolve isso).
 */
export function LeadsAgencia() {
	const { api, periodo } = useVisitantesApi()
	const dias = periodo?.dias ?? 30
	const [dados, setDados] = useState<Dados | null>(null)
	const [erro, setErro] = useState<string | null>(null)

	const carregar = useCallback(async () => {
		setErro(null)
		try {
			const r = await fetch(api('leads', { dias }))
			if (!r.ok) throw new Error(`HTTP ${r.status}`)
			setDados(await r.json())
		} catch (e) {
			console.error('[Leads agência] falha ao carregar:', e)
			setErro('Não foi possível carregar os leads.')
		}
	}, [api, dias])

	useEffect(() => {
		carregar()
	}, [carregar])

	if (erro) return <Erro>{erro}</Erro>
	if (!dados) return <p className="py-10 text-center text-sm text-foreground-secondary">Carregando…</p>

	return (
		<div className="space-y-6">
			<NumerosLeads total={dados.total} />
			<p className="text-xs leading-relaxed text-foreground-secondary">{COBERTURA}</p>

			<Secao titulo="Leads por campanha" dica="Cada lead conta na campanha da visita de vocês mais próxima dele.">
				<TabelaOrdenavel colunas={colunasCampanha} linhas={dados.porCampanha} chaveLinha={l => l.campanha} vazio="Nenhum lead das suas campanhas no período." />
			</Secao>

			<Secao titulo={`Leads do período — ${fmtNum(dados.total.entraram)}`} dica="Os mais recentes primeiro. O veículo aparece como o CRM registrou, sem preço nem anotações.">
				<TabelaOrdenavel colunas={colunasLista} linhas={dados.lista} chaveLinha={l => `${l.entrada}-${l.campanha}-${l.veiculo}`} vazio="Nenhum lead das suas campanhas no período." />
			</Secao>
		</div>
	)
}

/** Os quatro números de leads; também usado no Resumo. */
export function NumerosLeads({ total }: { total: ContagemLeads }) {
	return (
		<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
			<Numero rotulo="Leads que entraram" valor={fmtNum(total.entraram)} />
			<Numero rotulo="Com vendedor" valor={fmtNum(total.com_vendedor)} />
			<Numero rotulo="Vendidos" valor={fmtNum(total.vendidos)} nota={total.entraram > 0 ? `${fmtPct(taxa(total.vendidos, total.entraram))} dos leads` : undefined} destaque />
			<Numero rotulo="Perdidos" valor={fmtNum(total.perdidos)} />
		</div>
	)
}

function Numero({ rotulo, valor, nota, destaque }: { rotulo: string; valor: string; nota?: string; destaque?: boolean }) {
	return (
		<div className={`min-w-0 rounded-xl border bg-background-card px-4 py-3 ${destaque ? 'border-emerald-500/40' : 'border-border'}`}>
			<div className="text-[11px] uppercase tracking-wide text-foreground-secondary">{rotulo}</div>
			<div className={`mt-1 text-xl font-semibold tabular-nums ${destaque ? 'text-emerald-500' : 'text-foreground'}`}>{valor}</div>
			{nota && <div className="mt-0.5 text-xs text-foreground-secondary">{nota}</div>}
		</div>
	)
}
