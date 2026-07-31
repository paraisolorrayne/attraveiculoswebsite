// Vocabulário do contrato v2 do CRM + estilos e textos dos tooltips (i).
export const ETAPAS_KANBAN = [
	{
		id: 'novo', label: 'Novo', dot: 'bg-amber-500',
		badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
		descricao: 'Lead chegou e ainda não foi assumido por um vendedor. Meta: primeiro contato o quanto antes.',
	},
	{
		id: 'em_atendimento', label: 'Em atendimento', dot: 'bg-blue-500',
		badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
		descricao: 'Um vendedor assumiu e está conversando com o cliente. Ainda não há proposta na mesa.',
	},
	{
		id: 'em_negociacao', label: 'Em negociação', dot: 'bg-purple-500',
		badge: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
		descricao: 'Proposta, valores ou troca em discussão. É o lead mais quente do funil.',
	},
	{
		id: 'encerrado_ganho', label: 'Encerrado — Ganho', dot: 'bg-green-500',
		badge: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30',
		descricao: 'Venda concluída.',
	},
	{
		id: 'encerrado_perdido', label: 'Encerrado — Perdido', dot: 'bg-red-500',
		badge: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30',
		descricao: 'Encerrado sem venda. O motivo aparece no card.',
	},
] as const

export const ETAPA_DESCONHECIDA = {
	dot: 'bg-zinc-400',
	badge: 'bg-background text-foreground-secondary border-border',
	descricao: 'Etapa fora do contrato v2 — verificar o emissor.',
}

export const SITUACOES: Record<string, { label: string; classe: string }> = {
	sem_contato:        { label: 'Sem contato',        classe: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/30' },
	em_conversa:        { label: 'Em conversa',        classe: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30' },
	aguardando_cliente: { label: 'Aguardando cliente', classe: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' },
	proposta_enviada:   { label: 'Proposta enviada',   classe: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30' },
	negociando:         { label: 'Negociando',         classe: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30' },
	avaliando_troca:    { label: 'Avaliando troca',    classe: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30' },
	sem_estoque:        { label: 'Sem estoque',        classe: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30' },
	sem_perfil:         { label: 'Sem perfil',         classe: 'bg-stone-500/10 text-stone-600 dark:text-stone-400 border-stone-500/30' },
	comprou_outro:      { label: 'Comprou outro',      classe: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30' },
	nao_responde:       { label: 'Não responde',       classe: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30' },
	desistiu:           { label: 'Desistiu',           classe: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30' },
	sem_atualizacao:    { label: 'Sem atualização',    classe: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30' },
	// O emissor passará a enviar situacao=perdido no evento de perda
	// (fix/crm-webhook-campos-v2 do time do webhook, 2026-07-31)
	perdido:            { label: 'Perdido',            classe: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30' },
}

export function situacaoInfo(s: string): { label: string; classe: string } {
	return SITUACOES[s] ?? {
		label: s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
		classe: 'bg-background text-foreground-secondary border-border',
	}
}

export const FONTES_EVENTO: Record<string, string> = {
	alerta: 'Alerta automático',
	aceite: 'Aceite do vendedor',
	reporte: 'Reporte do vendedor',
	cobranca: 'Cobrança automática',
	venda: 'Venda registrada',
	perda: 'Perda registrada',
	correcao_manual: 'Correção manual (gestor)',
}

// Filtros de período: base = movimentação (atualizado_em)
export const PERIODOS = [
	{ dias: 1,  label: 'Hoje' },
	{ dias: 7,  label: 'Semana (7d)' },
	{ dias: 15, label: 'Quinzena (15d)' },
	{ dias: 30, label: 'Mês (30d)' },
	{ dias: 0,  label: 'Tudo' },
] as const
