'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Animação de entrada ao rolar, no site inteiro (CSS em motion.css).
 *
 * Marca sozinho os blocos de cada <section> de dentro do <main> que estão
 * abaixo da primeira tela: o cabeçalho da seção, o texto e, quando o bloco é
 * uma grade ou lista de cards, cada card, com um pequeno atraso entre eles.
 * Quem já anima por conta própria marca com `data-revelar` (e as variantes,
 * como `data-revelar="cortina"`) e é respeitado; `data-sem-revelar` tira uma
 * seção do automático.
 *
 * O que está à vista quando a página abre nunca é marcado: não pode esperar o
 * JavaScript para aparecer. Com movimento reduzido, nada é escondido.
 */
const ATRASO_MS = 50
const MAX_ESCALONADOS = 5

function ehLista(el: Element): boolean {
  if (el.children.length < 3) return false
  const cs = getComputedStyle(el)
  return cs.display.includes('grid') || (cs.display.includes('flex') && cs.flexWrap === 'wrap') ||
    el.tagName === 'UL' || el.tagName === 'OL' || el.tagName === 'DL'
}

function blocosDaSecao(secao: Element): Element[] {
  // O Container (div.mx-auto) costuma ser o filho direto; os blocos são os filhos dele.
  let raiz: Element = secao
  for (let i = 0; i < 3; i++) {
    const unicos = [...raiz.children].filter((c) => !['SCRIPT', 'STYLE'].includes(c.tagName))
    if (unicos.length === 1 && unicos[0].children.length > 0 && !ehLista(unicos[0])) raiz = unicos[0]
    else break
  }
  return [...raiz.children].filter((c) => !['SCRIPT', 'STYLE'].includes(c.tagName))
}

export function RevelarAoRolar() {
  const pathname = usePathname()

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const raiz = document.documentElement
    const dobra = () => window.innerHeight * 0.92

    const revelar = (el: Element) => { (el as HTMLElement).dataset.revelado = '' }
    // Dispara um quinto de tela ANTES de o bloco aparecer: quando ele entra, a
    // animação curta já terminou ou está terminando (29/10/2026).
    const io = new IntersectionObserver((entradas) => {
      for (const e of entradas) {
        if (e.isIntersecting) {
          revelar(e.target)
          io.unobserve(e.target)
        }
      }
    }, { rootMargin: '0px 0px 20% 0px', threshold: 0 })

    const abaixoDaDobra = (el: Element) => el.getBoundingClientRect().top > dobra()

    const marcar = (el: Element, atraso = 0) => {
      const h = el as HTMLElement
      if (h.dataset.revelar !== undefined || !abaixoDaDobra(el)) return
      h.dataset.revelar = ''
      if (atraso) h.style.setProperty('--d', `${atraso}ms`)
      io.observe(el)
    }

    const varrer = () => {
      // Marcações manuais: o que já está à vista aparece direto; o resto espera a rolagem.
      document.querySelectorAll('[data-revelar]:not([data-revelado])').forEach((el) => {
        if (abaixoDaDobra(el)) io.observe(el)
        else revelar(el)
      })

      document.querySelectorAll('main section:not([data-revelar-visto])').forEach((secao) => {
        ;(secao as HTMLElement).dataset.revelarVisto = ''
        if (secao.closest('[data-sem-revelar]') || secao.querySelector('section')) return
        for (const bloco of blocosDaSecao(secao)) {
          if (bloco.querySelector('[data-revelar]')) continue
          if (ehLista(bloco)) {
            ;[...bloco.children].forEach((item, i) => marcar(item, Math.min(i, MAX_ESCALONADOS) * ATRASO_MS))
          } else {
            marcar(bloco)
          }
        }
      })
    }

    varrer()
    raiz.dataset.revelar = '1'

    // Conteúdo que chega depois (Suspense, listas que carregam aos poucos).
    let agendado: ReturnType<typeof setTimeout> | undefined
    const mo = new MutationObserver(() => {
      clearTimeout(agendado)
      agendado = setTimeout(varrer, 120)
    })
    const main = document.querySelector('main')
    if (main) mo.observe(main, { childList: true, subtree: true })

    return () => {
      clearTimeout(agendado)
      io.disconnect()
      mo.disconnect()
    }
  }, [pathname])

  return null
}
