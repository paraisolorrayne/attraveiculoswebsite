// Vocabulário do contrato v2 do CRM + estilos e textos dos tooltips (i).
//
// Colunas na VISÃO DO GESTOR (spec 2026-07-31-crm-colunas-visao-gestor):
// a etapa do CRM (em_atendimento/em_negociacao) é vocabulário de vendedor e
// vira dado interno; a coluna é derivada do último evento (fonte_evento).
//
// 10/08: a etapa `novo` VOLTOU ao quadro como primeira coluna. Ela era
// escondida por decisão de desenho ("a história começa no aceite"), e o custo
// apareceu num dia comum: dos 13 alertas enviados naquela manhã, 7 estavam em
// `novo` e portanto invisíveis — inclusive uma proposta de R$ 1,25 mi à vista
// e outra de R$ 900 mil. O gestor não tinha como saber que existiam.
export const COLUNAS_KANBAN = [
	{
		id: 'aguardando', label: 'Aguardando aceite', encerrada: false, dot: 'bg-amber-500',
		badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
		descricao: 'O lead já foi designado a um vendedor e o alerta foi enviado, mas ninguém aceitou ainda. É a fila que o gestor precisa esvaziar — o relógio conta só em horário comercial (09:00–21:00, sábado até 13:00).',
	},
	{
		id: 'assumido', label: 'Assumido pelo vendedor', encerrada: false, dot: 'bg-blue-500',
		badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
		descricao: 'O vendedor aceitou o lead e confirmou que chamou o cliente, mas ainda não reportou movimentação nas cobranças diária/semanal/mensal.',
	},
	{
		id: 'movimentando', label: 'Movimentando', encerrada: false, dot: 'bg-purple-500',
		badge: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
		descricao: 'O último evento é um reporte do vendedor: a conversa está andando de fato — andamento, impedimento e próxima ação aparecem no card.',
	},
	{
		id: 'ganho', label: 'Encerrado — Ganho', encerrada: true, dot: 'bg-green-500',
		badge: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30',
		descricao: 'Venda concluída.',
	},
	{
		id: 'perdido', label: 'Encerrado — Perdido', encerrada: true, dot: 'bg-red-500',
		badge: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30',
		descricao: 'Encerrado sem venda. O motivo aparece no card.',
	},
] as const

export type ColunaKanban = (typeof COLUNAS_KANBAN)[number]

export { ETAPA_AGUARDANDO } from '@/lib/crm-datas'
import { ETAPA_AGUARDANDO } from '@/lib/crm-datas'

const preenchido = (v: string | null | undefined) => !!v && v.trim() !== ''

/**
 * Card sem nada que sustente uma leitura: nem identificação do cliente, nem
 * negócio, nem relato do vendedor — só etapa, situação e data.
 *
 * Não é hipótese: dos 325 cards recebidos até 01/08, 16 chegaram assim, todos
 * de eventos automáticos de cobrança (`cobranca_semanal` ou sem fonte), e
 * nenhum deles tinha veículo, valor ou vendedor. No quadro viravam cartões em
 * branco que só ocupam espaço e sujam a contagem das colunas.
 *
 * O critério é deliberadamente conservador: basta UM sinal — telefone, e-mail,
 * veículo, valor, vendedor ou qualquer relato — para o card continuar visível.
 * Some só o que não tem nada.
 */
export function cardSemInformacao(c: {
	nome: string | null
	telefone: string | null
	email: string | null
	veiculo: string | null
	valor: number | null
	vendedor: string | null
	andamento: string | null
	impedimento: string | null
	proxima_acao: string | null
	motivo_encerramento: string | null
}): boolean {
	if (preenchido(c.nome) || preenchido(c.telefone) || preenchido(c.email)) return false
	if (preenchido(c.veiculo) || c.valor !== null || preenchido(c.vendedor)) return false
	if (preenchido(c.andamento) || preenchido(c.impedimento)) return false
	if (preenchido(c.proxima_acao) || preenchido(c.motivo_encerramento)) return false
	return true
}

/** Coluna do card na visão do gestor — derivada do último evento, não da etapa. */
export function colunaDoCard(c: { etapa: string; fonte_evento: string | null }): ColunaKanban['id'] {
	if (c.etapa === 'encerrado_ganho') return 'ganho'
	if (c.etapa === 'encerrado_perdido') return 'perdido'
	// `novo` = designado, alerta enviado, aceite pendente. Precede o teste de
	// fonte_evento: um card em `novo` chega com fonte `alerta` e cairia em
	// "Assumido pelo vendedor", afirmando um aceite que não aconteceu.
	if (c.etapa === ETAPA_AGUARDANDO) return 'aguardando'
	return c.fonte_evento === 'reporte' ? 'movimentando' : 'assumido'
}

export const SITUACOES: Record<string, { label: string; classe: string }> = {
	// Situação com que TODO card de alerta nasce (o emissor manda
	// situacao='aguardando_contato' junto com etapa='aguardando_vendedor').
	// Faltava aqui e caía no fallback humanizado, sem cor.
	aguardando_contato: { label: 'Aguardando contato', classe: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' },
	assumido:           { label: 'Assumido',           classe: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30' },
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

// Conferido contra o que o emissor realmente manda (produção, 10/08): havia
// três valores em uso que caíam aqui como texto cru — `cobranca_semanal`,
// `inatividade` e `sistema`. `alerta_manual` deveria ser reescrito para
// `alerta` pelo emissor e mesmo assim há 1 card com ele no banco.
export const FONTES_EVENTO: Record<string, string> = {
	alerta: 'Alerta automático',
	alerta_manual: 'Alerta automático',
	aceite: 'Aceite do vendedor',
	reporte: 'Reporte do vendedor',
	cobranca: 'Cobrança automática',
	cobranca_semanal: 'Cobrança semanal',
	// 12/08: o emissor passa a transbordar o lead para outro vendedor, o que
	// devolve o card para a fila de aceite (etapa volta a `novo`).
	transbordo: 'Transbordo para outro vendedor',
	inatividade: 'Encerrado por inatividade',
	venda: 'Venda registrada',
	perda: 'Perda registrada',
	sistema: 'Ajuste do sistema',
	correcao_manual: 'Correção manual (gestor)',
	backfill_lead_novo: 'Importação inicial',
}

// Filtros de período: dias-calendário em America/Sao_Paulo, com HOJE contando
// como o primeiro dia (ver src/lib/crm-periodo.ts). Base de comparação por
// card: dataReferenciaPeriodo (alerta / movimentação / encerramento).
export const PERIODOS = [
	{ dias: 1,  label: 'Hoje' },
	{ dias: 7,  label: 'Semana (7d)' },
	{ dias: 15, label: 'Quinzena (15d)' },
	{ dias: 30, label: 'Mês (30d)' },
	{ dias: 0,  label: 'Tudo' },
] as const
