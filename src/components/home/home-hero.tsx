'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, MessageCircle } from 'lucide-react'
import { Vehicle } from '@/types'
import { getWhatsAppUrl } from '@/lib/constants'
import { formatPrice, formatMileage } from '@/lib/utils'

interface HomeHeroProps {
  /**
   * Top vehicles to rotate as background. The component cycles through them
   * automatically (8s each, fade transition). When empty, falls back to a
   * static gradient — no broken layout.
   */
  vehicles?: Vehicle[]
}

const whatsappMessage =
  'Olá, Attra. Gostaria de conversar com um especialista sobre um veículo premium.'

const ROTATION_INTERVAL_MS = 8000

/**
 * Optional poetic tagline shown under the model — gives the meta line room
 * to breathe and avoids the "classified ad" feeling. Hand-picked per brand.
 * Falls back to a generic line if brand isn't mapped.
 */
const TAGLINES_BY_BRAND: Record<string, string> = {
  ferrari: 'A engenharia italiana em estado bruto.',
  lamborghini: 'Sem desculpas. Sem comparações.',
  porsche: 'A precisão alemã em forma de esporte.',
  mclaren: 'Fórmula 1 nas ruas.',
  'aston martin': 'O silêncio antes da emoção.',
  bentley: 'Luxo construído para durar gerações.',
  'rolls-royce': 'Mais que um carro — uma declaração.',
  'mercedes-benz': 'O melhor ou nada.',
  mercedes: 'O melhor ou nada.',
  bmw: 'Performance que conversa com o piloto.',
  audi: 'Tecnologia que define o passo.',
  'land rover': 'Onde o asfalto termina.',
  maserati: 'Caráter italiano em cada detalhe.',
  maybach: 'O extraordinário ao alcance.',
  chevrolet: 'Performance americana indomável.',
  dodge: 'Potência sem máscara.',
  ford: 'Tradição e potência.',
}

function taglineFor(brand: string): string {
  // AutoConf returns brand in many shapes — "Mercedes", "Mercedes-Benz",
  // "MERCEDES-AMG", "Land Rover", etc. We do exact-match first, then fall
  // back to startsWith so "Mercedes-AMG GT" still gets the Mercedes tagline.
  const key = brand.toLowerCase().trim()
  if (TAGLINES_BY_BRAND[key]) return TAGLINES_BY_BRAND[key]

  for (const mappedKey of Object.keys(TAGLINES_BY_BRAND)) {
    if (key.startsWith(mappedKey)) return TAGLINES_BY_BRAND[mappedKey]
  }
  return 'Curadoria nacional desde 2009.'
}

export function HomeHero({ vehicles = [] }: HomeHeroProps) {
  const slides = vehicles.filter(v => v.photos?.[0]).slice(0, 3)
  const [activeIndex, setActiveIndex] = useState(0)
  const [restartTick, setRestartTick] = useState(0)

  // Auto-rotate. Respects prefers-reduced-motion live (mq listener).
  useEffect(() => {
    if (slides.length <= 1) return
    if (typeof window === 'undefined') return

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    let intervalId: ReturnType<typeof setInterval> | undefined

    const start = () => {
      if (mq.matches) return
      intervalId = setInterval(() => {
        setActiveIndex(prev => (prev + 1) % slides.length)
      }, ROTATION_INTERVAL_MS)
    }
    const stop = () => {
      if (intervalId) clearInterval(intervalId)
      intervalId = undefined
    }
    const onChange = () => { stop(); start() }

    start()
    mq.addEventListener('change', onChange)
    return () => {
      stop()
      mq.removeEventListener('change', onChange)
    }
  }, [slides.length, restartTick])

  // Modulo clamp keeps render correct if slides shrink at runtime.
  const safeIndex = slides.length > 0 ? activeIndex % slides.length : 0
  const activeVehicle = slides[safeIndex] ?? null

  const handleSelectSlide = (i: number) => {
    setActiveIndex(i)
    setRestartTick(t => t + 1)
  }

  return (
    <section
      aria-label="Apresentação Attra Veículos"
      className="relative w-full h-[100svh] min-h-[640px] max-h-[920px] overflow-hidden bg-black"
    >
      {/* Background slides */}
      <div className="absolute inset-0">
        {slides.length > 0 ? (
          slides.map((vehicle, i) => (
            <div
              key={vehicle.id}
              className="absolute inset-0 transition-opacity duration-[1500ms] ease-in-out"
              style={{ opacity: i === safeIndex ? 1 : 0 }}
              aria-hidden={i !== safeIndex}
            >
              <Image
                src={vehicle.photos[0]}
                alt={`${vehicle.brand} ${vehicle.model}`}
                fill
                priority={i === 0}
                className="object-cover"
                sizes="100vw"
              />
            </div>
          ))
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460]" />
        )}

        {/* Single gradient — let the photo breathe (Avantgarde pattern). */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-black/30" />

        {/* Soft spotlight behind the centered text — mais escuro no centro
            pra texto ler em qualquer foto (badges PPF brancos, céu claro, etc). */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(0,0,0,0.4)_0%,transparent_70%)]" />
      </div>

      {/* Centered editorial copy — the only element competing for attention.
          No bottom action bar (PM decision: action bar destroys luxury).
          The global WhatsAppButton (layout.tsx) handles persistent CTA via FAB.
          text-shadow garante legibilidade quando a foto tem áreas claras
          (badges PPF brancos, céu, paint de cor clara). */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center
                      [text-shadow:_0_2px_8px_rgba(0,0,0,0.55)]">
        {activeVehicle ? (
          <>
            <p className="text-white/65 text-[10px] sm:text-xs uppercase tracking-[0.32em] font-medium mb-5 sm:mb-7">
              Acervo Attra
            </p>

            <h1 className="text-white tracking-tight leading-[0.98] mb-4 sm:mb-5
                           text-[clamp(2.5rem,7.5vw,6rem)]">
              <span className="block font-light">{activeVehicle.brand}</span>
              <span className="block font-light italic">{activeVehicle.model}</span>
            </h1>

            {/* Poetic tagline — gives meta line room to breathe (Avantgarde pattern). */}
            <p className="text-white/85 italic font-light text-base sm:text-lg
                          tracking-wide max-w-md mb-7 sm:mb-9">
              {taglineFor(activeVehicle.brand)}
            </p>

            {/* Meta line — ano · km · preço */}
            <p className="text-white/95 text-sm sm:text-base font-light tracking-[0.05em] mb-10 sm:mb-12
                          flex flex-wrap justify-center items-center gap-x-3 gap-y-1">
              <span>{activeVehicle.year_model}</span>
              <span aria-hidden className="text-white/40">|</span>
              <span>
                {activeVehicle.mileage === 0 ? '0 km' : formatMileage(activeVehicle.mileage)}
              </span>
              {activeVehicle.price > 0 && (
                <>
                  <span aria-hidden className="text-white/40">|</span>
                  <span className="font-medium">{formatPrice(activeVehicle.price)}</span>
                </>
              )}
            </p>

            {/* Single primary CTA — ghost outline, premium-confident.
                "Falar com especialista" responde ao requisito do dono
                (CTA convidativo, palavra-chave que eleva, não diminui). */}
            <a
              href={getWhatsAppUrl(whatsappMessage)}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center justify-center gap-2.5
                         border border-white/50 hover:border-white text-white
                         text-sm sm:text-base font-light tracking-[0.18em] uppercase
                         px-10 sm:px-14 py-4 sm:py-[18px] rounded-sm
                         backdrop-blur-sm hover:bg-white/[0.06]
                         transition-all duration-300"
            >
              <MessageCircle className="w-4 h-4 sm:w-[18px] sm:h-[18px] opacity-80
                                       group-hover:opacity-100 transition-opacity" />
              Falar com especialista
            </a>

            {/* Contextual link to vehicle detail — discreet, doesn't compete. */}
            <Link
              href={`/veiculo/${activeVehicle.slug}`}
              className="mt-6 inline-flex items-center gap-1.5 text-white/60 hover:text-white/95
                         text-xs sm:text-sm font-light transition-colors"
            >
              Conheça este {activeVehicle.brand} {activeVehicle.model}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </>
        ) : (
          // Fallback when stock is empty
          <>
            <p className="text-white/55 text-[10px] sm:text-xs uppercase tracking-[0.32em] font-medium mb-5">
              Attra Veículos · Desde 2009
            </p>
            <h1 className="text-white font-light tracking-tight leading-[1.05] mb-9
                           text-[clamp(2rem,5vw,4rem)]">
              <span className="block">Curadoria nacional em</span>
              <span className="block italic">supercarros e premium</span>
            </h1>
            <Link
              href="/veiculos"
              className="inline-flex items-center gap-2.5 border border-white/50 hover:border-white
                         text-white text-sm font-light tracking-[0.18em] uppercase px-12 py-4
                         rounded-sm transition-colors"
            >
              Ver acervo
              <ArrowRight className="w-4 h-4" />
            </Link>
          </>
        )}
      </div>

      {/* Slide indicators — bottom-center, subtle. Now that there's no action
          bar competing, they have visual autonomy. */}
      {slides.length > 1 && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-12 sm:bottom-14 z-10
                        flex items-center gap-2.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => handleSelectSlide(i)}
              aria-label={`Ver veículo ${i + 1} de ${slides.length}`}
              aria-current={i === safeIndex}
              className="group p-2 -m-2"
            >
              <span
                className={`block h-[2px] transition-all duration-500 ${
                  i === safeIndex
                    ? 'w-12 bg-white'
                    : 'w-6 bg-white/40 group-hover:bg-white/70'
                }`}
              />
            </button>
          ))}
        </div>
      )}

      {/* Slide counter — minimal, Ferrari.com pattern. Only when multi-slide. */}
      {slides.length > 1 && (
        <div className="absolute bottom-12 sm:bottom-14 right-8 sm:right-12 z-10
                        text-white/55 text-[11px] tracking-[0.2em] font-light">
          {String(safeIndex + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
        </div>
      )}
    </section>
  )
}
