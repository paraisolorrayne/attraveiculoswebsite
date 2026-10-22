'use client'

import { Suspense, useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { EVENTO_NAVEGANDO } from '@/lib/navegacao'

interface RacingProgressProps {
  className?: string
}

/**
 * Linha fina no topo enquanto a próxima página não chega.
 *
 * Começa no clique num link interno ou no aviso dos filtros (EVENTO_NAVEGANDO)
 * e termina quando o endereço muda de verdade — antes era um cronômetro de 3 s
 * que acabava com a página carregada ou não, com bolinha e bandeirada.
 * Enquanto anda, marca `data-navegando` no <html>: a listagem usa isso para
 * esmaecer enquanto o resultado do filtro carrega (motion.css).
 */
function Barra({ className }: RacingProgressProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const rota = `${pathname}?${searchParams.toString()}`

  // Rota de onde a navegação partiu. A fase sai da comparação com a rota
  // atual, sem estado extra: mudou o endereço, a barra fecha.
  const [partida, setPartida] = useState<string | null>(null)
  const fase = partida === null ? 'parada' : partida === rota ? 'andando' : 'chegando'

  useEffect(() => {
    const rotaAtual = () => `${window.location.pathname}?${new URLSearchParams(window.location.search).toString()}`
    let desiste: ReturnType<typeof setTimeout> | undefined

    const comecar = (destino: URL) => {
      const atual = rotaAtual()
      const alvo = `${destino.pathname}?${destino.searchParams.toString()}`
      if (alvo === atual) return
      setPartida(atual)
      clearTimeout(desiste)
      // Se a navegação não acontecer (erro, clique cancelado), a barra não fica presa.
      desiste = setTimeout(() => setPartida(null), 12000)
    }

    const aoClicar = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const link = (e.target as HTMLElement | null)?.closest('a')
      if (!link || !link.href || link.target === '_blank' || link.hasAttribute('download')) return
      const destino = new URL(link.href, window.location.href)
      if (destino.origin !== window.location.origin) return
      comecar(destino)
    }

    const aoAvisar = (e: Event) => {
      const destino = (e as CustomEvent<{ destino: string }>).detail?.destino
      if (destino) comecar(new URL(destino, window.location.href))
    }

    document.addEventListener('click', aoClicar)
    window.addEventListener(EVENTO_NAVEGANDO, aoAvisar)
    return () => {
      document.removeEventListener('click', aoClicar)
      window.removeEventListener(EVENTO_NAVEGANDO, aoAvisar)
      clearTimeout(desiste)
    }
  }, [])

  useEffect(() => {
    const raiz = document.documentElement
    if (fase === 'andando') raiz.dataset.navegando = '1'
    else delete raiz.dataset.navegando
  }, [fase])

  if (fase === 'parada') return null

  return (
    <div className={cn('pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5', className)} aria-hidden="true">
      <div
        data-fase={fase}
        // Na cor do texto, não no vermelho: o cabeçalho já tem uma linha
        // vermelha no topo e a barra sumia em cima dela.
        className="progresso-navegacao h-full bg-foreground"
        onTransitionEnd={(e) => {
          if (fase === 'chegando' && e.propertyName === 'opacity') setPartida(null)
        }}
      />
    </div>
  )
}

export function RacingProgress({ className }: RacingProgressProps) {
  // useSearchParams pede Suspense; sem ele, as páginas estáticas não montam.
  return (
    <Suspense fallback={null}>
      <Barra className={className} />
    </Suspense>
  )
}
