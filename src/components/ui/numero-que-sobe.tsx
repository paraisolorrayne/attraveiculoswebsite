'use client'

import { useEffect, useRef, useState } from 'react'

interface NumeroQueSobeProps {
  valor: number
  /** Texto colado depois do número, como o "+" de "500+". */
  sufixo?: string
  /** Duração da subida, em ms. */
  duracao?: number
  className?: string
}

const formatar = (n: number) => n.toLocaleString('pt-BR')

/**
 * Número que sobe de 0 até o valor quando entra na tela (os números do topo de
 * /servicos). O HTML já sai com o valor final: sem JavaScript, ou com movimento
 * reduzido, o número aparece pronto. `tabular-nums` deixa os dígitos com a
 * mesma largura, para o texto não tremer enquanto conta.
 *
 * Com a abertura da marca na tela (abertura-attra.tsx), espera ela subir: o
 * número já está "à vista" por baixo dela e terminaria de contar escondido.
 */
const FIM_DA_ABERTURA_MS = 1900

export function NumeroQueSobe({ valor, sufixo = '', duracao = 1600, className }: NumeroQueSobeProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const [atual, setAtual] = useState(valor)

  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let quadro = 0
    let espera: ReturnType<typeof setTimeout> | undefined
    const contar = () => {
      const inicio = performance.now()
      const passo = (agora: number) => {
        const t = Math.min(1, (agora - inicio) / duracao)
        // Rápido no começo, assentando no valor (ease-out cúbico).
        setAtual(Math.round(valor * (1 - (1 - t) ** 3)))
        if (t < 1) quadro = requestAnimationFrame(passo)
      }
      quadro = requestAnimationFrame(passo)
    }
    // O primeiro quadro da contagem já zera o número.
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      if (document.documentElement.dataset.aberturaAgora) {
        // Zera ainda escondido: a tela sobe de baixo para cima e mostraria o
        // valor final por um instante antes de a contagem começar.
        setAtual(0)
        espera = setTimeout(contar, FIM_DA_ABERTURA_MS)
      } else contar()
    }, { threshold: 0.6 })
    io.observe(el)
    return () => { io.disconnect(); cancelAnimationFrame(quadro); clearTimeout(espera) }
  }, [valor, duracao])

  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {/* Leitor de tela lê o valor final, não a contagem. */}
      <span aria-hidden="true">{formatar(atual)}{sufixo}</span>
      <span className="sr-only">{formatar(valor)}{sufixo}</span>
    </span>
  )
}
