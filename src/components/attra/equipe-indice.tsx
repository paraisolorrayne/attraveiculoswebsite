'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { MONTSERRAT } from '@/components/ui/cabecalho-secao'
import { EQUIPE_ATTRA } from '@/lib/equipe-attra'
import { getWhatsAppUrl } from '@/lib/constants'
import { cn } from '@/lib/utils'

/**
 * A equipe no /sobre, escolhida em 24/10/2026 entre três direções do design
 * ("Índice"; as outras eram Cinema e Preto e branco). Seção escura nos dois
 * temas: os três nomes empilhados à esquerda, em corpo grande, e um palco
 * fixo à direita com um retrato por vez. O nome no meio da tela é o ativo e
 * a foto dele abre em cortina por cima da anterior; voltando, ela desce e a
 * anterior reaparece. No celular, sem palco: foto e nome de cada um.
 *
 * Substituiu a "página de revista" e, antes dela, a versão literal com faixa
 * de pista: a dona achou as duas sem cara de marca premium.
 */
export function EquipeIndice() {
  const [ativo, setAtivo] = useState(0)
  const itens = useRef<(HTMLLIElement | null)[]>([])

  useEffect(() => {
    const io = new IntersectionObserver((entradas) => {
      for (const e of entradas) if (e.isIntersecting) setAtivo(Number((e.target as HTMLElement).dataset.i))
    }, { rootMargin: '-45% 0px -45% 0px' })
    itens.current.forEach((el) => el && io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <section className="dark bg-[#050505] py-20 text-white lg:py-28">
      {/* Na largura da ficha (80% da tela, nunca menos que 1280 px): presa em
          1280 px, em 1920 o palco ficava pequeno no meio da tela. */}
      <Container className="max-w-[max(80%,1280px)]">
        <div className="lg:grid lg:grid-cols-12 lg:gap-6">
          <div className="lg:col-span-6">
            <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[#e04848]">Equipe</p>
            <h2 className="mt-4 text-[40px] font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-[64px]" style={MONTSERRAT}>
              Quem faz <span className="text-white/45">a Attra</span>
            </h2>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-white/70">
              Thiago, Cris e Gabriel: as pessoas que você encontra na Attra, em Uberlândia.
            </p>
            <Link
              href={getWhatsAppUrl('Olá! Gostaria de falar com a equipe da Attra.')}
              target="_blank"
              className="mt-6 inline-flex items-center gap-2 text-[15px] font-medium text-white hover:text-white/70"
            >
              Falar com a equipe no WhatsApp <ArrowRight className="h-4 w-4" />
            </Link>

            <ol className="mt-12 space-y-12 lg:mt-0 lg:space-y-0">
              {EQUIPE_ATTRA.map((p, i) => (
                <li
                  key={p.nome}
                  ref={(el) => { itens.current[i] = el }}
                  data-i={i}
                  className="lg:flex lg:min-h-[70vh] lg:flex-col lg:justify-center"
                >
                  <div className="relative mb-5 aspect-[4/5] overflow-hidden rounded-2xl lg:hidden">
                    <Image
                      src={p.noCarro.src}
                      alt={`${p.nome}${p.cargo ? `, ${p.cargo}` : ''} da Attra Veículos, dirigindo`}
                      fill
                      sizes="100vw"
                      className="object-cover"
                      style={{ objectPosition: p.noCarro.enquadramento }}
                    />
                  </div>
                  <p
                    className={cn(
                      'text-[48px] font-semibold leading-[0.95] tracking-[-0.02em] transition-colors duration-[400ms] lg:text-[clamp(56px,7vw,112px)]',
                      ativo === i ? 'text-white' : 'lg:text-white/20',
                    )}
                    style={MONTSERRAT}
                  >
                    {p.nome}
                  </p>
                  {p.cargo && (
                    <p className={cn('mt-3 text-[13px] uppercase tracking-[0.2em] transition-colors duration-[400ms]', ativo === i ? 'text-white/60' : 'lg:text-white/15')}>
                      {p.cargo}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </div>

          {/* Palco fixo: as três fotos sobrepostas; até a ativa ficam abertas
              (as seguintes, recolhidas para baixo), então descer abre a próxima
              por cima e subir a recolhe. */}
          <div className="hidden lg:col-span-6 lg:block">
            {/* Centrado na altura da janela abaixo do cabeçalho; a foto cresce
                com a tela até 720 px de largura sem passar da altura visível. */}
            <div className="sticky top-20 flex h-[calc(100svh-5rem)] items-center">
              <div className="relative ml-auto aspect-[4/5] w-full max-w-[min(720px,calc((100svh-9rem)*0.8))] overflow-hidden rounded-2xl bg-white/5">
                {EQUIPE_ATTRA.map((p, i) => (
                  <Image
                    key={p.nome}
                    src={p.noCarro.src}
                    alt={i === ativo ? `${p.nome}${p.cargo ? `, ${p.cargo}` : ''} da Attra Veículos, dirigindo` : ''}
                    fill
                    sizes="(min-width: 1800px) 720px, 45vw"
                    className="object-cover transition-[clip-path] duration-[900ms] ease-[cubic-bezier(0.65,0,0.35,1)] motion-reduce:transition-none"
                    style={{ objectPosition: p.noCarro.enquadramento, zIndex: i, clipPath: i <= ativo ? 'inset(0 0 0 0)' : 'inset(100% 0 0 0)' }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
