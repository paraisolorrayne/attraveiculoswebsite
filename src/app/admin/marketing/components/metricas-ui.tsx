/**
 * Peças das telas de métricas da Meta (página do anúncio e aba Resultados):
 * os formatos de número, o cartão de medida e o gráfico por dia.
 */
import { cn } from '@/lib/utils'
import type { Metricas, PeriodoDaMeta } from '@/lib/meta-ads'

export const PERIODOS: { id: PeriodoDaMeta; rotulo: string }[] = [
  { id: '7d', rotulo: '7 dias' },
  { id: '30d', rotulo: '30 dias' },
  { id: 'total', rotulo: 'Desde o início' },
]

export const inteiro = (n: number) => Math.round(n).toLocaleString('pt-BR')
export const real = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
export const pct = (parte: number, todo: number) =>
  todo > 0 ? `${((parte / todo) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%` : 'sem dado'
export const custo = (gasto: number, n: number) => (n > 0 ? real(gasto / n) : 'sem dado')
export const diaCurto = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
export const horaDe = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

export function SeletorDePeriodo({ periodo, aoMudar }: { periodo: PeriodoDaMeta; aoMudar: (p: PeriodoDaMeta) => void }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-lg border border-border bg-background-card p-1" role="group" aria-label="Período">
      {PERIODOS.map(p => (
        <button
          key={p.id}
          type="button"
          aria-pressed={periodo === p.id}
          onClick={() => aoMudar(p.id)}
          className={cn(
            'min-h-10 rounded-md px-4 text-sm font-medium transition-colors',
            periodo === p.id ? 'bg-primary text-white' : 'text-foreground-secondary hover:text-foreground',
          )}
        >
          {p.rotulo}
        </button>
      ))}
    </div>
  )
}

export function Numero({ valor, rotulo, nota }: { valor: string; rotulo: string; nota?: string }) {
  return (
    <div className="rounded-xl border border-border bg-background-card p-4">
      <div className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">{valor}</div>
      <div className="mt-1 text-sm text-foreground-secondary">{rotulo}</div>
      {nota && <div className="mt-0.5 text-xs text-foreground-secondary">{nota}</div>}
    </div>
  )
}

/** Os números principais de um conjunto de anúncios. `alcance` só quando é um anúncio só. */
export function GradeDeNumeros({ m, alcance }: { m: Metricas; alcance?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <Numero valor={real(m.gasto)} rotulo="Gasto" />
      <Numero valor={inteiro(m.conversas)} rotulo="Conversas iniciadas" nota={`${custo(m.gasto, m.conversas)} por conversa`} />
      <Numero valor={inteiro(m.cliquesNoLink)} rotulo="Cliques no link" nota={`${custo(m.gasto, m.cliquesNoLink)} por clique`} />
      <Numero valor={pct(m.cliquesNoLink, m.impressoes)} rotulo="Taxa de clique (CTR)" />
      <Numero valor={inteiro(m.impressoes)} rotulo="Impressões" nota={m.impressoes > 0 ? `${real((m.gasto / m.impressoes) * 1000)} por mil` : undefined} />
      {alcance !== undefined ? (
        <Numero valor={inteiro(alcance)} rotulo="Pessoas alcançadas" nota={alcance > 0 ? `${(m.impressoes / alcance).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} vezes por pessoa` : undefined} />
      ) : (
        <Numero valor={inteiro(m.leads + m.visitasNaPagina)} rotulo="Leads e visitas à página" nota={`${inteiro(m.leads)} leads, ${inteiro(m.visitasNaPagina)} visitas`} />
      )}
    </div>
  )
}

export function Painel({ titulo, nota, children, className }: { titulo: string; nota?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-xl border border-border bg-background-card p-5', className)}>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-base font-semibold text-foreground">{titulo}</h2>
        {nota && <span className="text-sm text-foreground-secondary">{nota}</span>}
      </div>
      {children}
    </section>
  )
}

type Dia = { dia: string; gasto: number; conversas: number; cliquesNoLink: number }

function Faixa({ dias, valor, rotulo, formato, cor, altura }: { dias: Dia[]; valor: (d: Dia) => number; rotulo: string; formato: (n: number) => string; cor: string; altura: string }) {
  const maior = Math.max(...dias.map(valor), 0)
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-foreground-secondary">
        <span>{rotulo}</span>
        <span>maior dia: {formato(maior)}</span>
      </div>
      <div className={cn('flex items-end gap-px border-b border-border', altura)} role="img" aria-label={`${rotulo} por dia`}>
        {dias.map(d => (
          <div
            key={d.dia}
            title={`${diaCurto(d.dia)}: ${real(d.gasto)}, ${inteiro(d.conversas)} conversas, ${inteiro(d.cliquesNoLink)} cliques`}
            className={cn('min-w-0 flex-1 rounded-t-sm', cor)}
            style={{ height: maior > 0 && valor(d) > 0 ? `${Math.max(3, (valor(d) / maior) * 100)}%` : '0%' }}
          />
        ))}
      </div>
    </div>
  )
}

/** Gasto e conversas por dia, um sobre o outro, no mesmo eixo de dias. */
export function GraficoPorDia({ dias }: { dias: Dia[] }) {
  if (dias.length === 0 || dias.every(d => d.gasto === 0)) {
    return <p className="text-sm text-foreground-secondary">Sem gasto no período.</p>
  }
  // No "desde o início" podem ser muitos dias: mostra os 90 mais recentes.
  const visiveis = dias.slice(-90)
  return (
    <div className="space-y-4">
      <Faixa dias={visiveis} valor={d => d.gasto} rotulo="Gasto" formato={real} cor="bg-primary/70 hover:bg-primary" altura="h-40" />
      <Faixa dias={visiveis} valor={d => d.conversas} rotulo="Conversas iniciadas" formato={inteiro} cor="bg-green-500/70 hover:bg-green-500" altura="h-24" />
      <div className="flex justify-between text-xs text-foreground-secondary">
        <span>{diaCurto(visiveis[0].dia)}</span>
        {dias.length > visiveis.length && <span>mostrando os últimos 90 dias</span>}
        <span>{diaCurto(visiveis[visiveis.length - 1].dia)}</span>
      </div>
    </div>
  )
}
