'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, MessageCircle } from 'lucide-react'
import { Vehicle } from '@/types'
import { getWhatsAppUrl } from '@/lib/constants'

interface HomeHeroProps {
  /**
   * Top vehicles to rotate as background. The component cycles through them
   * automatically (8s each, fade transition). When empty, falls back to a
   * static gradient background — no broken layout.
   */
  vehicles?: Vehicle[]
}

const whatsappMessage =
  'Olá, Attra. Gostaria de conversar com um especialista sobre um veículo premium.'

const ROTATION_INTERVAL_MS = 8000

export function HomeHero({ vehicles = [] }: HomeHeroProps) {
  const slides = vehicles.filter(v => v.photos?.[0]).slice(0, 3)
  const [activeIndex, setActiveIndex] = useState(0)
  // Bumped on manual indicator click so the rotation effect restarts the
  // interval from zero — avoids the jarring "auto-advance fires right after
  // a user click" behaviour.
  const [restartTick, setRestartTick] = useState(0)

  // Note on stale activeIndex: if `vehicles` shrinks at runtime, the modulo
  // clamp on `safeIndex` below keeps render correct without needing a reset
  // effect. The next auto-tick or manual click realigns the state itself.

  // Auto-rotate the background image. Respects prefers-reduced-motion live —
  // if the user toggles the OS preference at runtime, the interval stops/resumes
  // accordingly (mq.addEventListener('change')).
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
    const onChange = () => {
      stop()
      start()
    }

    start()
    mq.addEventListener('change', onChange)
    return () => {
      stop()
      mq.removeEventListener('change', onChange)
    }
  }, [slides.length, restartTick])

  // Clamp index for render — defensive in case a fast prop change leaves the
  // state stale before the effect above runs.
  const safeIndex = slides.length > 0 ? activeIndex % slides.length : 0
  const activeVehicle = slides[safeIndex] ?? null

  const handleSelectSlide = (i: number) => {
    setActiveIndex(i)
    setRestartTick(t => t + 1)
  }

  return (
    <section
      aria-label="Apresentação Attra Veículos"
      className="relative w-full h-[100svh] min-h-[600px] max-h-[900px] overflow-hidden bg-black"
    >
      {/* Background slides — fade between top vehicles */}
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
          // Fallback: gradient when no vehicles in stock
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460]" />
        )}

        {/* Cinematic gradients — bottom for legibility, vignette for focus */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/40" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.5)_100%)]" />
      </div>

      {/* Top-right: brand mark of the active vehicle (subtle, luxury cue) */}
      {activeVehicle && (
        <div className="absolute top-24 right-6 sm:top-28 sm:right-10 z-10 text-right">
          <p className="text-white/40 text-[10px] uppercase tracking-[0.3em] font-medium mb-1">
            Em destaque
          </p>
          <p className="text-white/85 text-sm sm:text-base font-medium tracking-wide">
            {activeVehicle.brand} {activeVehicle.model}
          </p>
        </div>
      )}

      {/* Bottom-left: copy + CTAs */}
      <div className="absolute inset-x-0 bottom-0 z-10 px-6 sm:px-10 lg:px-16 pb-10 sm:pb-14 lg:pb-20">
        <div className="max-w-2xl">
          <p className="text-white/60 text-[10px] sm:text-xs uppercase tracking-[0.28em] font-medium mb-4 sm:mb-6">
            Attra · Curadoria nacional desde 2009
          </p>

          <h1 className="text-white font-light tracking-tight leading-[1.05] mb-7 sm:mb-9
                         text-[clamp(2rem,6vw,4.5rem)]">
            Um atendimento à altura
            <span className="block font-normal">
              do carro que você vai comprar.
            </span>
          </h1>

          {/* CTAs — primary solid + secondary ghost. Stacked on mobile,
              inline on sm+. Anchored bottom-left for cinematic feel. */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 max-w-xs sm:max-w-none">
            <a
              href={getWhatsAppUrl(whatsappMessage)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-white text-black hover:bg-white/90
                         font-medium text-sm sm:text-base px-7 py-4 rounded-md
                         transition-colors shadow-xl"
            >
              <MessageCircle className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
              Falar com especialista
            </a>
            <Link
              href="/veiculos"
              className="inline-flex items-center justify-center gap-2 border border-white/40 hover:border-white
                         bg-transparent text-white font-medium text-sm sm:text-base px-7 py-4 rounded-md
                         transition-colors backdrop-blur-sm"
            >
              Ver estoque
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Slide indicators — bottom-right, only when multi-slide */}
      {slides.length > 1 && (
        <div className="absolute bottom-6 right-6 sm:bottom-8 sm:right-10 z-10 flex items-center gap-2">
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
                    ? 'w-10 bg-white'
                    : 'w-6 bg-white/40 group-hover:bg-white/70'
                }`}
              />
            </button>
          ))}
        </div>
      )}

      {/* Click-through layer — clicking the background goes to the active vehicle.
          tabIndex={-1} so keyboard navigation focuses the visible CTAs (which
          cover the same destinations) instead of an invisible full-section link. */}
      {activeVehicle && (
        <Link
          href={`/veiculo/${activeVehicle.slug}`}
          aria-label={`Conhecer ${activeVehicle.brand} ${activeVehicle.model}`}
          tabIndex={-1}
          className="absolute inset-0 z-[1]"
        />
      )}
    </section>
  )
}
