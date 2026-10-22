'use client'

import { useEffect, useRef, type CSSProperties } from 'react'
import { Container } from '@/components/ui/container'
import { anosDeMercado } from '@/lib/constants'

/**
 * Faixa de números da home. Substitui a TrustStrip (6 ícones) e os 4 cards de
 * números do Posicionamento, que repetiam "18 anos" e "27 estados".
 *
 * O contador é só visual (ver `.contador` em motion.css): o HTML já sai com o
 * número final. Na referência que inspirou a faixa, o HTML saía com "0 anos de
 * mercado" e era isso que Google e assistentes liam.
 */
const NUMEROS = [
  { valor: anosDeMercado(), sufixo: '', rotulo: 'anos de mercado' },
  { valor: 500, sufixo: '+', rotulo: 'veículos por ano' },
  { valor: 27, sufixo: '', rotulo: 'estados atendidos' },
  { valor: 5, sufixo: ',0', rotulo: 'avaliação no Google' },
]

export function NumerosAttra() {
  const ref = useRef<HTMLElement>(null)

  // O CSS já conta ao carregar. Aqui só se segura quem estava fora da tela na
  // hora da hidratação, para contar quando a pessoa chegar nele.
  useEffect(() => {
    const contadores = ref.current?.querySelectorAll<HTMLElement>('.contador')
    if (!contadores?.length) return
    const vistos = new WeakSet<Element>()
    const observer = new IntersectionObserver((entradas) => {
      for (const e of entradas) {
        const el = e.target as HTMLElement
        if (!vistos.has(el)) {
          vistos.add(el)
          if (!e.isIntersecting) {
            el.dataset.esperando = ''
            continue
          }
        }
        if (e.isIntersecting) {
          delete el.dataset.esperando
          observer.unobserve(el)
        }
      }
    }, { threshold: 0.6 })
    contadores.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={ref} aria-label="A Attra em números" className="border-b border-border/60 py-14 md:py-20">
      <Container size="2xl">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-12 lg:grid-cols-4">
          {NUMEROS.map(({ valor, sufixo, rotulo }) => (
            <div key={rotulo} className="flex flex-col-reverse gap-3 border-t border-border/60 pt-6">
              <dt className="text-[11px] uppercase tracking-[0.28em] text-foreground-secondary">{rotulo}</dt>
              <dd
                className="text-foreground font-light leading-none tracking-tight text-[clamp(3rem,6vw,5.5rem)]"
                style={{ fontFamily: 'var(--font-montserrat)' }}
              >
                <span className="contador" style={{ '--contador-alvo': valor } as CSSProperties}>
                  <span className="contador__valor">{valor}</span>
                  <span className="contador__desenho" aria-hidden="true" />
                </span>
                {sufixo}
              </dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  )
}
