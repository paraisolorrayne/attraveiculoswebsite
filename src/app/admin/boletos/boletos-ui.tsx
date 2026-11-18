/**
 * Peças comuns das telas de boletos: a etiqueta da situação, os formatos de
 * dinheiro e de data e os rótulos do histórico.
 */
import { cn } from '@/lib/utils'
import { ROTULO_DA_SITUACAO, type SituacaoBoleto } from '@/lib/boletos'

export const dinheiro = (n: number): string => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const dataHora = (iso: string): string =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })

/** "há 3 dias", "hoje", "ontem": há quanto tempo o lembrete foi aberto. */
export function haQuanto(iso: string, agora: number = Date.now()): string {
  const dias = Math.floor((agora - Date.parse(iso)) / (24 * 60 * 60 * 1000))
  if (dias <= 0) return 'hoje'
  if (dias === 1) return 'ontem'
  return `há ${dias} dias`
}

const COR: Record<SituacaoBoleto, string> = {
  comprovante: 'bg-green-500/15 text-green-700 dark:text-green-400 ring-1 ring-green-500/40',
  promessa: 'bg-purple-500/15 text-purple-700 dark:text-purple-400',
  atraso: 'bg-red-500/15 text-red-700 dark:text-red-400',
  hoje: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  'a-vencer': 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  em_negociacao: 'bg-foreground-secondary/15 text-foreground',
  pago: 'bg-green-500/15 text-green-700 dark:text-green-400',
  cancelado: 'bg-foreground-secondary/15 text-foreground-secondary',
}

export function EtiquetaDaSituacao({ situacao, className }: { situacao: SituacaoBoleto; className?: string }) {
  return (
    <span className={cn('inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium', COR[situacao], className)}>
      {ROTULO_DA_SITUACAO[situacao]}
    </span>
  )
}

export const ROTULO_DO_EVENTO: Record<string, string> = {
  criado: 'Cadastrado',
  lembrete: 'Lembrete',
  contato: 'Contato',
  pago: 'Pago',
  reaberto: 'Reaberto',
  cancelado: 'Cancelado',
  em_negociacao: 'Em negociação',
  editado: 'Alterado',
  promessa: 'Promessa de pagamento',
  comprovante: 'Comprovante',
  resposta: 'Resposta do cliente',
  falha_envio: 'Lembrete não entregue',
}

export const CAMPO =
  'min-h-11 w-full rounded-lg border border-border bg-background px-3 text-foreground placeholder:text-foreground-secondary focus:border-primary focus:outline-none'
export const BOTAO_PRIMARIO =
  'flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-60'
export const BOTAO_NEUTRO =
  'flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-background-card px-4 font-medium text-foreground transition-colors hover:border-foreground-secondary disabled:opacity-60'
