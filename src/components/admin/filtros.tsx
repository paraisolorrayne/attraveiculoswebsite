'use client'

/**
 * Peças de filtro das listas do admin (14/11/2026).
 *
 * Cada tela tinha (ou não tinha) a sua busca e os seus selects, cada uma de um
 * jeito. Aqui fica um conjunto só, no padrão que os sistemas grandes usam:
 * busca sempre à vista, filtros com rótulo, os filtros ligados aparecem como
 * etiquetas que dá para tirar uma a uma, "Limpar" tira todos, a contagem diz
 * quantos itens sobraram, e tudo fica na URL (recarregar ou mandar o link
 * mantém o filtro).
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { AlertTriangle, RefreshCw, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Filtros guardados na URL. `valores` traz o que está na URL (string vazia
 * quando ausente); `definir` troca um ou mais de uma vez; `limpar` tira todos.
 * Quem usa precisa estar dentro de um <Suspense> (regra do useSearchParams).
 */
export function useFiltrosUrl<C extends string>(chaves: readonly C[]) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const texto = params.toString()

  const valores = useMemo(() => {
    const p = new URLSearchParams(texto)
    return Object.fromEntries(chaves.map(c => [c, p.get(c) ?? ''])) as Record<C, string>
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto, chaves.join('|')])

  const definir = useCallback(
    (mudancas: Partial<Record<C, string>>) => {
      const p = new URLSearchParams(texto)
      for (const [c, v] of Object.entries(mudancas) as [C, string | undefined][]) {
        if (v) p.set(c, v)
        else p.delete(c)
      }
      const q = p.toString()
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false })
    },
    [router, pathname, texto],
  )

  const limpar = useCallback(() => {
    definir(Object.fromEntries(chaves.map(c => [c, ''])) as Partial<Record<C, string>>)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [definir, chaves.join('|')])

  const ativos = chaves.filter(c => valores[c] !== '').length
  return { valores, definir, limpar, ativos }
}

/** Faixa que segura busca, filtros e ações da lista. */
export function BarraDeFiltros({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('flex flex-wrap items-end gap-3', className)}>{children}</div>
}

/**
 * Busca de texto. Escreve na hora no campo e avisa quem usa depois de uma
 * pausa (`espera`, em ms), para não disparar uma consulta por tecla. Esc limpa.
 */
export function CampoBusca({
  valor,
  aoMudar,
  placeholder = 'Buscar',
  espera = 250,
  className,
}: {
  valor: string
  aoMudar: (v: string) => void
  placeholder?: string
  espera?: number
  className?: string
}) {
  const [texto, setTexto] = useState(valor)
  /** O último valor que este campo mandou para fora. */
  const [enviado, setEnviado] = useState(valor)
  const [anterior, setAnterior] = useState(valor)

  // Mudança de fora (Limpar, voltar do navegador) entra no campo. A que é só
  // o eco do que o próprio campo mandou não mexe no que a pessoa já digitou
  // depois. Ajuste durante a renderização, sem efeito.
  if (valor !== anterior) {
    setAnterior(valor)
    if (valor !== enviado) {
      setTexto(valor)
      setEnviado(valor)
    }
  }

  useEffect(() => {
    if (texto === enviado) return
    const t = setTimeout(() => {
      setEnviado(texto)
      aoMudar(texto)
    }, espera)
    return () => clearTimeout(t)
  }, [texto, enviado, espera, aoMudar])

  return (
    <div className={cn('relative min-w-56 flex-1 sm:max-w-md', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-secondary" />
      <input
        type="search"
        value={texto}
        onChange={e => setTexto(e.target.value)}
        onKeyDown={e => e.key === 'Escape' && setTexto('')}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-11 w-full rounded-lg border border-border bg-background-card pl-10 pr-10 text-sm text-foreground placeholder:text-foreground-secondary focus:border-primary focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {texto && (
        <button
          type="button"
          onClick={() => setTexto('')}
          aria-label="Limpar a busca"
          className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-foreground-secondary hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

/** Select com rótulo em cima. A primeira opção (valor vazio) é "todos". */
export function SeletorFiltro({
  rotulo,
  valor,
  aoMudar,
  opcoes,
  todos = 'Todos',
  className,
}: {
  rotulo: string
  valor: string
  aoMudar: (v: string) => void
  opcoes: readonly { valor: string; rotulo: string }[]
  todos?: string
  className?: string
}) {
  return (
    <label className={cn('flex flex-col gap-1', className)}>
      <span className="text-xs font-medium text-foreground-secondary">{rotulo}</span>
      <select
        value={valor}
        onChange={e => aoMudar(e.target.value)}
        className={cn(
          'h-11 max-w-56 rounded-lg border bg-background-card px-3 text-sm text-foreground focus:border-primary focus:outline-none',
          valor ? 'border-primary/60' : 'border-border',
        )}
      >
        <option value="">{todos}</option>
        {opcoes.map(o => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
    </label>
  )
}

export interface FiltroLigado {
  /** Texto da etiqueta, já legível: "Status: Rascunho". */
  rotulo: string
  aoRemover: () => void
}

/** Contagem + etiquetas dos filtros ligados + "Limpar". */
export function ResumoDosFiltros({
  total,
  mostrando,
  nome,
  filtros,
  aoLimpar,
  className,
}: {
  /** Quantos itens existem sem filtro. */
  total: number
  /** Quantos passaram pelos filtros. */
  mostrando: number
  /** [singular, plural]: ['post', 'posts']. */
  nome: [string, string]
  filtros: FiltroLigado[]
  aoLimpar: () => void
  className?: string
}) {
  const plural = (n: number) => `${n.toLocaleString('pt-BR')} ${n === 1 ? nome[0] : nome[1]}`
  return (
    <div className={cn('flex flex-wrap items-center gap-2 text-sm text-foreground-secondary', className)}>
      <span className="tabular-nums">
        {filtros.length > 0 && mostrando !== total ? `${mostrando.toLocaleString('pt-BR')} de ${plural(total)}` : plural(mostrando)}
      </span>
      {filtros.map(f => (
        <button
          key={f.rotulo}
          type="button"
          onClick={f.aoRemover}
          title="Tirar este filtro"
          className="flex min-h-8 items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 text-xs font-medium text-foreground hover:border-primary"
        >
          {f.rotulo}
          <X className="h-3.5 w-3.5" />
        </button>
      ))}
      {filtros.length > 0 && (
        <button type="button" onClick={aoLimpar} className="min-h-8 px-2 text-xs font-medium text-foreground underline underline-offset-2 hover:text-primary">
          Limpar filtros
        </button>
      )}
    </div>
  )
}

/** Lista vazia: diz por quê e oferece a saída. */
export function EstadoVazio({
  titulo,
  texto,
  acao,
  Icon,
}: {
  titulo: string
  texto?: string
  /** Botão ou link: "Limpar filtros", "Criar o primeiro". */
  acao?: React.ReactNode
  Icon?: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-border px-6 py-12 text-center">
      {Icon && <Icon className="mb-3 h-8 w-8 text-foreground-secondary" />}
      <p className="font-semibold text-foreground">{titulo}</p>
      {texto && <p className="mt-1 max-w-md text-sm text-foreground-secondary">{texto}</p>}
      {acao && <div className="mt-4">{acao}</div>}
    </div>
  )
}

/** Falha ao carregar: aparece na tela, com "Tentar de novo". */
export function EstadoErro({ texto, aoTentar }: { texto: string; aoTentar?: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-foreground">
      <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
      <span className="flex-1">{texto}</span>
      {aoTentar && (
        <button type="button" onClick={aoTentar} className="flex min-h-9 items-center gap-2 rounded-lg border border-border bg-background-card px-3 font-medium hover:border-foreground-secondary">
          <RefreshCw className="h-4 w-4" />
          Tentar de novo
        </button>
      )}
    </div>
  )
}

/** Botão padrão para "Limpar filtros" dentro de um estado vazio. */
export function BotaoSecundario({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={cn('flex min-h-10 items-center gap-2 rounded-lg border border-border bg-background-card px-4 text-sm font-medium text-foreground hover:border-foreground-secondary', props.className)}
    >
      {children}
    </button>
  )
}
