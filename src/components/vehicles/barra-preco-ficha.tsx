'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { MessageCircle } from 'lucide-react'

const semInscricao = () => () => {}

interface BarraPrecoFichaProps {
  titulo: string
  preco: string
  whatsappUrl: string
}

/**
 * Barra fixa do celular na ficha: preço + WhatsApp sempre à mão enquanto a
 * pessoa vê as fotos e a ficha técnica. No computador a coluna lateral já
 * acompanha a rolagem com o preço e o botão, então a barra não existe lá.
 *
 * Aparece só depois que o preço do título sai da tela (para não mostrar o
 * preço duas vezes) e some quando a caixa "Interessado?" ou o rodapé entram
 * (para não cobrir os botões dela nem o fim da página). Enquanto está visível,
 * o círculo verde global do WhatsApp se esconde (`data-barra-ficha` no <html>,
 * regra em motion.css): dois botões flutuantes disputando o polegar é pior
 * que um.
 *
 * O link é um <a> comum para wa.me: o rastreio global de cliques
 * (visitor-tracking-provider) registra o clique como qualquer outro botão.
 *
 * Vai por portal para o <body>: até 30/10/2026 o <main> do layout tinha a
 * animação `page-enter`, que deixava um transform aplicado, e com ele
 * `position: fixed` valia para o <main> e não para a tela (a barra ficava no
 * fim da página em vez de embaixo da tela). O portal continua protegendo
 * contra qualquer transform num ancestral.
 */
export function BarraPrecoFicha({ titulo, preco, whatsappUrl }: BarraPrecoFichaProps) {
  const [visivel, setVisivel] = useState(false)
  // false no servidor e na hidratação, true depois: o portal precisa do document.
  const montado = useSyncExternalStore(semInscricao, () => true, () => false)

  useEffect(() => {
    const precoEl = document.getElementById('preco-ficha')
    const contatoEl = document.getElementById('contato-ficha')
    const rodapeEl = document.querySelector('footer')
    if (!precoEl) return

    let precoPassou = false
    let fimNaTela = false
    const atualizar = () => setVisivel(precoPassou && !fimNaTela)

    const observaPreco = new IntersectionObserver(([entrada]) => {
      // Só conta como "passou" quando saiu por cima; antes de chegar nele
      // (página carregada no meio, por exemplo) a barra não aparece.
      precoPassou = !entrada.isIntersecting && entrada.boundingClientRect.top < 0
      atualizar()
    })
    observaPreco.observe(precoEl)

    const naTela = new Set<Element>()
    const observaFim = new IntersectionObserver((entradas) => {
      for (const e of entradas) {
        if (e.isIntersecting) naTela.add(e.target)
        else naTela.delete(e.target)
      }
      fimNaTela = naTela.size > 0
      atualizar()
    })
    if (contatoEl) observaFim.observe(contatoEl)
    if (rodapeEl) observaFim.observe(rodapeEl)

    return () => {
      observaPreco.disconnect()
      observaFim.disconnect()
    }
  }, [])

  useEffect(() => {
    const raiz = document.documentElement
    if (visivel) raiz.dataset.barraFicha = '1'
    else delete raiz.dataset.barraFicha
    return () => { delete raiz.dataset.barraFicha }
  }, [visivel])

  if (!montado) return null

  return createPortal(
    <div
      className={`lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-md
                  transition-transform duration-300 ease-out ${visivel ? 'translate-y-0' : 'translate-y-full'}`}
      style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
      aria-hidden={!visivel}
      inert={!visivel}
    >
      <div className="flex items-center gap-4 px-4 pt-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-foreground-secondary truncate">{titulo}</p>
          <p className="text-lg font-semibold text-foreground leading-tight">{preco}</p>
        </div>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-12 items-center gap-2 rounded-lg bg-green-500 px-5 font-medium text-white hover:bg-green-600 transition-colors"
        >
          <MessageCircle className="w-5 h-5" aria-hidden="true" />
          WhatsApp
        </a>
      </div>
    </div>,
    document.body,
  )
}
