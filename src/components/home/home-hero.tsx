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

  // Modulo clamp keeps render correct if slides shrink at runtime; the next
  // tick or manual click realigns state itself.
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

        {/* Cinematic gradient — subtle vignette for centered text legibility */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.45)_0%,rgba(0,0,0,0.7)_100%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40" />
      </div>

      {/* Centered editorial copy — focuses on the vehicle (Avantgarde/Païto pattern) */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
        {activeVehicle ? (
          <>
            <p className="text-white/55 text-[10px] sm:text-xs uppercase tracking-[0.32em] font-medium mb-4 sm:mb-6">
              Acervo Attra · Em destaque
            </p>

            <h1 className="text-white font-light tracking-tight leading-[1.05] mb-3 sm:mb-4
                           text-[clamp(2.25rem,7vw,5.5rem)]">
              <span className="block">{activeVehicle.brand}</span>
              <span className="block font-normal">{activeVehicle.model}</span>
            </h1>

            {/* Vehicle meta — ano · km · preço (concorrentes seguem esse padrão) */}
            <p className="text-white/85 text-sm sm:text-base font-light tracking-wide mb-8 sm:mb-10
                          flex flex-wrap justify-center items-center gap-x-3 gap-y-1">
              <span>{activeVehicle.year_model}</span>
              <span aria-hidden className="text-white/30">·</span>
              <span>
                {activeVehicle.mileage === 0 ? '0 km' : formatMileage(activeVehicle.mileage)}
              </span>
              {activeVehicle.price > 0 && (
                <>
                  <span aria-hidden className="text-white/30">·</span>
                  <span className="font-medium">{formatPrice(activeVehicle.price)}</span>
                </>
              )}
            </p>

            <Link
              href={`/veiculo/${activeVehicle.slug}`}
              className="inline-flex items-center gap-2 border border-white/40 hover:border-white
                         text-white text-sm sm:text-base font-medium px-7 sm:px-10 py-3.5 sm:py-4
                         rounded-sm transition-colors backdrop-blur-sm
                         hover:bg-white/5"
            >
              Conheça este veículo
              <ArrowRight className="w-4 h-4" />
            </Link>
          </>
        ) : (
          // Fallback when stock is empty — institutional fallback
          <>
            <p className="text-white/55 text-[10px] sm:text-xs uppercase tracking-[0.32em] font-medium mb-4 sm:mb-6">
              Attra Veículos · Desde 2009
            </p>
            <h1 className="text-white font-light tracking-tight leading-[1.05] mb-8
                           text-[clamp(2rem,5vw,4rem)]">
              <span className="block">Curadoria nacional em</span>
              <span className="block font-normal">supercarros e premium</span>
            </h1>
            <Link
              href="/veiculos"
              className="inline-flex items-center gap-2 border border-white/40 hover:border-white
                         text-white text-sm sm:text-base font-medium px-7 py-3.5 rounded-sm transition-colors"
            >
              Ver acervo completo
              <ArrowRight className="w-4 h-4" />
            </Link>
          </>
        )}
      </div>

      {/* Slide indicators — bottom-center, discreet */}
      {slides.length > 1 && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-24 sm:bottom-28 z-10 flex items-center gap-2.5">
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

      {/* Persistent action bar — bottom of the hero, sempre visível.
          Atende ao pedido do dono (WhatsApp + estoque "logo de cara") sem
          competir com o protagonismo do carro no centro. */}
      <div className="absolute inset-x-0 bottom-0 z-10
                      bg-gradient-to-t from-black/70 to-transparent
                      px-6 sm:px-10 py-4 sm:py-5">
        <div className="mx-auto max-w-3xl flex flex-col sm:flex-row items-stretch sm:items-center
                        justify-center gap-2.5 sm:gap-3">
          <a
            href={getWhatsAppUrl(whatsappMessage)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-white text-black hover:bg-white/90
                       font-medium text-sm px-6 py-3 rounded-sm transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            Falar com especialista
          </a>
          <Link
            href="/veiculos"
            className="inline-flex items-center justify-center gap-2
                       border border-white/40 hover:border-white text-white
                       font-medium text-sm px-6 py-3 rounded-sm transition-colors"
          >
            Ver estoque
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
