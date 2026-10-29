'use client'

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Check, ChevronDown } from 'lucide-react'
import { avisarNavegacao } from '@/lib/navegacao'
import { cn } from '@/lib/utils'

// "Ano mais novo" no lugar de "Mais recentes": ordena pelo ano do modelo, e
// "mais recentes" se lia como os que chegaram por último ao estoque.
const OPCOES = [
  { valor: 'preco-desc', rotulo: 'Maior preço' },
  { valor: 'preco-asc', rotulo: 'Menor preço' },
  { valor: 'ano-desc', rotulo: 'Ano mais novo' },
  { valor: 'km-asc', rotulo: 'Menor km' },
]

interface SortDropdownProps {
  currentSort?: string
}

/**
 * "Ordenar por" de /veiculos (27/10/2026), adaptado do estoque da Avantgarde:
 * rótulo pequeno em cima (o mesmo de "Filtros"), a escolha sobre um fio
 * vermelho em vez da caixa do <select> do sistema e as opções num painel com a
 * atual marcada (em vermelho no tema claro; no escuro o vermelho da marca não
 * tem contraste para texto, fica o check). É uma lista própria (listbox) porque o painel do <select>
 * nativo não aceita estilo; o teclado segue o padrão do select (setas, Home,
 * End, Enter, Esc).
 */
export function SortDropdown({ currentSort }: SortDropdownProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const id = useId()
  const raiz = useRef<HTMLDivElement>(null)
  const botao = useRef<HTMLButtonElement>(null)
  const lista = useRef<HTMLUListElement>(null)
  const [aberto, setAberto] = useState(false)
  const [foco, setFoco] = useState(0)

  const atual = Math.max(0, OPCOES.findIndex((o) => o.valor === (currentSort || 'preco-desc')))

  const abrir = () => {
    setFoco(atual)
    setAberto(true)
  }

  const fechar = (devolverFoco = true) => {
    setAberto(false)
    if (devolverFoco) botao.current?.focus()
  }

  const escolher = (valor: string) => {
    fechar()
    if (valor === OPCOES[atual].valor) return
    const params = new URLSearchParams(searchParams.toString())
    if (valor !== 'preco-desc') {
      params.set('ordenar', valor)
    } else {
      params.delete('ordenar')
    }
    avisarNavegacao(`${pathname}?${params.toString()}`)
    router.push(`${pathname}?${params.toString()}`)
  }

  // Aberto, o foco vai para a lista; clique fora fecha.
  useEffect(() => {
    if (!aberto) return
    lista.current?.focus()
    const fora = (e: PointerEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener('pointerdown', fora)
    return () => document.removeEventListener('pointerdown', fora)
  }, [aberto])

  const teclaNoBotao = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      abrir()
    }
  }

  const teclaNaLista = (e: KeyboardEvent) => {
    const ultimo = OPCOES.length - 1
    const mover: Record<string, () => number> = {
      ArrowDown: () => Math.min(foco + 1, ultimo),
      ArrowUp: () => Math.max(foco - 1, 0),
      Home: () => 0,
      End: () => ultimo,
    }
    if (mover[e.key]) {
      e.preventDefault()
      setFoco(mover[e.key]())
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      escolher(OPCOES[foco].valor)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      fechar()
    } else if (e.key === 'Tab') {
      fechar(false)
    }
  }

  return (
    <div ref={raiz} className="relative shrink-0">
      <span id={`${id}-rotulo`} className="block text-[11px] font-medium uppercase tracking-[0.22em] text-foreground-secondary">
        Ordenar por
      </span>
      <button
        ref={botao}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-controls={aberto ? `${id}-lista` : undefined}
        aria-labelledby={`${id}-rotulo ${id}-valor`}
        onClick={() => (aberto ? fechar() : abrir())}
        onKeyDown={teclaNoBotao}
        className="group mt-1.5 flex min-w-[9.5rem] items-center justify-between gap-4 border-b border-primary pb-1.5 text-left text-[15px] font-semibold text-foreground"
      >
        <span id={`${id}-valor`}>{OPCOES[atual].rotulo}</span>
        <ChevronDown
          aria-hidden="true"
          className={cn('h-4 w-4 text-foreground-secondary transition-[transform,color] duration-300 group-hover:text-primary', aberto && 'rotate-180 text-primary')}
        />
      </button>

      {aberto && (
        <ul
          ref={lista}
          id={`${id}-lista`}
          role="listbox"
          tabIndex={-1}
          aria-labelledby={`${id}-rotulo`}
          aria-activedescendant={`${id}-${foco}`}
          onKeyDown={teclaNaLista}
          className="absolute right-0 top-full z-30 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-background-card py-1.5 shadow-[0_8px_40px_rgba(0,0,0,0.12)] focus:outline-none"
        >
          {OPCOES.map((o, i) => (
            <li
              key={o.valor}
              id={`${id}-${i}`}
              role="option"
              aria-selected={i === atual}
              onClick={() => escolher(o.valor)}
              onPointerEnter={() => setFoco(i)}
              className={cn(
                'flex cursor-pointer items-center justify-between gap-6 px-4 py-2.5 text-[14px] transition-colors',
                i === foco && 'bg-foreground/[0.05]',
                i === atual ? 'font-semibold text-primary dark:text-foreground' : 'text-foreground'
              )}
            >
              {o.rotulo}
              {i === atual && <Check className="h-4 w-4 text-primary" aria-hidden="true" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
