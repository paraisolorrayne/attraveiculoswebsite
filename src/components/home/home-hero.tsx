'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Vehicle } from '@/types'
import { getWhatsAppUrl } from '@/lib/constants'
import { formatPrice, formatMileage } from '@/lib/utils'

const consultantWhatsAppMessage =
  'Olá, Attra. Gostaria de falar com um consultor sobre os veículos do acervo.'

interface HomeHeroProps {
  /**
   * Top veículos pro card MOBILE (rotaciona 9s, fade). Usa a foto original
   * (photos[0]) — sem remove-bg, sem composite IA. Mobile sempre foi assim
   * e o cliente aprovou; não mexer.
   */
  vehicles?: Vehicle[]
  /**
   * ID do vídeo mais recente do canal da Attra (via youtube-feed RSS).
   * Usado APENAS no DESKTOP, em autoplay mudo/loop na coluna direita.
   * Quando ausente (feed indisponível), o texto ocupa o hero — sem layout
   * quebrado.
   */
  videoId?: string | null
}

const ROTATION_INTERVAL_MS = 9000

/**
 * Manifesto headline rotation — Attra é a MOLDURA, não o quadro.
 * Usado no texto do DESKTOP e no fallback mobile (sem veículos).
 */
const MANIFESTO_LINES = [
  'Seleção,\nsem igual.',
  'Critério.\nNão estoque.',
  'O lugar\ndo extraordinário.',
] as const

// Wine sóbrio — vermelho dessaturado coerente com primary Attra (#9A1C1C).
const WINE = '#A8302E'

function buildEmbedUrl(videoId: string): string {
  // Autoplay mudo + loop (loop exige playlist=mesmaId). controls=0 e
  // modestbranding pra look de banner. youtube-nocookie é privacy-friendly
  // e já está liberado no CSP do site.
  const params = new URLSearchParams({
    autoplay: '1',
    mute: '1',
    loop: '1',
    playlist: videoId,
    controls: '0',
    modestbranding: '1',
    playsinline: '1',
    rel: '0',
    disablekb: '1',
  })
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`
}

export function HomeHero({ vehicles = [], videoId }: HomeHeroProps) {
  const slides = vehicles.filter(v => v.photos?.[0]).slice(0, 3)
  const [activeIndex, setActiveIndex] = useState(0)
  const [restartTick, setRestartTick] = useState(0)

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

  const safeIndex = slides.length > 0 ? activeIndex % slides.length : 0
  const activeVehicle = slides[safeIndex] ?? null
  const manifestoLine = MANIFESTO_LINES[safeIndex % MANIFESTO_LINES.length]
  const embedUrl = videoId ? buildEmbedUrl(videoId) : null

  const handleSelectSlide = (i: number) => {
    setActiveIndex(i)
    setRestartTick(t => t + 1)
  }

  // Bloco de texto editorial — DESKTOP (esquerda do split).
  const editorialCopy = (
    <>
      {/* Eyebrow */}
      <div className="flex items-center gap-4 mb-7 sm:mb-9">
        <span aria-hidden className="block h-px w-12 sm:w-16" style={{ backgroundColor: WINE }} />
        <span
          className="text-[10px] sm:text-[11px] uppercase tracking-[0.32em] font-medium"
          style={{ color: WINE }}
        >
          Attra · Coleção
        </span>
      </div>

      {/* Manifesto headline */}
      <h1
        className="text-foreground font-normal tracking-tight leading-[1.05]
                   text-[clamp(2.5rem,5.5vw,5rem)] mb-6 sm:mb-8"
        style={{ fontFamily: 'var(--font-montserrat)' }}
      >
        {manifestoLine.split('\n').map((line, i) => (
          <span key={i} className="block">
            {line}
          </span>
        ))}
      </h1>

      {/* Subhead */}
      <p className="text-foreground-secondary font-light text-sm sm:text-[15px] tracking-wide
                    max-w-xl leading-relaxed mb-8 sm:mb-11">
        Ferrari, Porsche, Mercedes AMG, Land Rover, BMW e Audi. Selecionados em
        Uberlândia, entregues em todo o Brasil.
      </p>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-7">
        <Link
          href="/veiculos"
          className="hero-cta-primary group inline-flex items-center justify-center gap-3
                     text-white sm:text-foreground
                     text-xs sm:text-sm font-medium tracking-[0.22em] uppercase
                     px-9 sm:px-10 py-4 rounded-none transition-all duration-300
                     bg-[#A8302E] sm:bg-[rgba(168,48,46,0.08)]
                     border border-[#A8302E]"
        >
          Explorar Estoque
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
        <a
          href={getWhatsAppUrl(consultantWhatsAppMessage)}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center
                     text-xs sm:text-sm font-semibold tracking-[0.18em] uppercase transition-colors"
          style={{ color: WINE }}
        >
          <span className="border-b pb-1 transition-colors" style={{ borderColor: WINE }}>
            Falar com consultor
          </span>
        </a>
      </div>
    </>
  )

  // Player do vídeo — DESKTOP, autoplay mudo loop, sem controles (banner).
  const videoPlayer = embedUrl ? (
    <div className="relative w-full aspect-video overflow-hidden rounded-2xl shadow-2xl shadow-black/30 border border-border/40 bg-black">
      <iframe
        src={embedUrl}
        title="Attra Veículos — último vídeo"
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        loading="lazy"
        className="absolute inset-0 w-full h-full"
      />
    </div>
  ) : null

  return (
    <section
      aria-label="Apresentação Attra Veículos"
      className="home-hero-canvas relative w-full overflow-hidden"
    >
      {/* ============================================================
          MOBILE LAYOUT (< lg) — INTACTO (aprovado pelo cliente): card
          vertical, foto original do veículo ativo, brand+modelo, specs
          inline, CTA wine + progress bar. NÃO usa vídeo nem composite IA.
          ============================================================ */}
      <div className="lg:hidden relative w-full bg-background pt-24 pb-12 px-6">
        {activeVehicle ? (
          <div className="flex flex-col items-center text-center max-w-md mx-auto">
            {/* Eyebrow — linha wine + ATTRA · NN */}
            <div className="flex items-center gap-3 mb-5">
              <span
                aria-hidden
                className="block h-px w-10"
                style={{ backgroundColor: WINE }}
              />
              <span
                className="text-[10px] uppercase tracking-[0.32em] font-medium"
                style={{ color: WINE }}
              >
                Attra · {String(safeIndex + 1).padStart(2, '0')}
              </span>
            </div>

            {/* Brand — pequeno, watermark visual */}
            <p
              className="text-[11px] font-bold uppercase tracking-[0.3em] mb-2"
              style={{ color: WINE }}
            >
              {activeVehicle.brand}
            </p>

            {/* Model — display Montserrat */}
            <h1
              className="text-foreground font-bold tracking-tight leading-[0.95]
                         text-4xl sm:text-5xl mb-6"
              style={{ fontFamily: 'var(--font-montserrat)' }}
            >
              {activeVehicle.model}
            </h1>

            {/* Photo destacada — aspect ratio fixo, com fade entre slides */}
            <div className="relative w-full aspect-[16/10] rounded-2xl overflow-hidden mb-6 shadow-xl shadow-black/30 border border-border/40">
              {slides.map((vehicle, i) => (
                <Image
                  key={vehicle.id}
                  src={vehicle.photos[0]}
                  alt={`${vehicle.brand} ${vehicle.model}`}
                  fill
                  priority={i === 0}
                  className="object-cover transition-opacity duration-[1500ms] ease-in-out"
                  style={{ opacity: i === safeIndex ? 1 : 0 }}
                  sizes="100vw"
                  aria-hidden={i !== safeIndex}
                />
              ))}
            </div>

            {/* Specs inline — Ano · Km · Valor */}
            <p className="text-foreground-secondary text-[11px] uppercase tracking-[0.2em] mb-6 flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
              <span>{activeVehicle.year_model}</span>
              <span className="text-foreground/30" aria-hidden>·</span>
              <span>{activeVehicle.mileage === 0 ? '0 km' : formatMileage(activeVehicle.mileage)}</span>
              <span className="text-foreground/30" aria-hidden>·</span>
              <span className="text-foreground font-semibold">{formatPrice(activeVehicle.price)}</span>
            </p>

            {/* CTA primário — conhecer o veículo ativo (sólido wine) */}
            <Link
              href={`/veiculo/${activeVehicle.slug}`}
              className="w-full inline-flex items-center justify-center gap-3
                         text-white text-xs font-medium tracking-[0.22em] uppercase
                         px-8 py-4 mb-3
                         transition-all duration-300
                         bg-[#A8302E] hover:bg-[#8A2422]
                         border border-[#A8302E]"
            >
              Conheça
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            {/* CTA secundário — ver todo o acervo (link sublinhado) */}
            <Link
              href="/veiculos"
              className="text-xs font-semibold tracking-[0.18em] uppercase pb-1 border-b mb-7"
              style={{ color: WINE, borderColor: WINE }}
            >
              Ver todo o acervo
            </Link>

            {/* Progress bar — mesma linguagem do desktop */}
            {slides.length > 1 && (
              <div className="w-full">
                <div className="flex items-center gap-3">
                  {slides.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelectSlide(i)}
                      aria-label={`Ver veículo ${i + 1} de ${slides.length}`}
                      aria-current={i === safeIndex}
                      className="group flex-1 py-3 -my-3"
                    >
                      <span
                        className={`block h-px transition-all duration-500 ${i !== safeIndex ? 'bg-foreground/20' : ''}`}
                        style={{
                          backgroundColor: i === safeIndex ? WINE : undefined,
                        }}
                      />
                    </button>
                  ))}
                  <span
                    className="text-[10px] tracking-[0.25em] font-bold ml-3"
                    style={{ color: WINE }}
                  >
                    {String(safeIndex + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Fallback mobile — sem veículos no slider: manifesto + CTA único */
          <div className="flex flex-col items-center text-center max-w-md mx-auto min-h-[60vh] justify-center">
            <div className="flex items-center gap-3 mb-6">
              <span
                aria-hidden
                className="block h-px w-10"
                style={{ backgroundColor: WINE }}
              />
              <span
                className="text-[10px] uppercase tracking-[0.32em] font-medium"
                style={{ color: WINE }}
              >
                Attra Veículos
              </span>
            </div>
            <h1
              className="text-foreground font-bold tracking-tight leading-[1.05] text-3xl mb-6"
              style={{ fontFamily: 'var(--font-montserrat)' }}
            >
              {manifestoLine.split('\n').map((line, i) => (
                <span key={i} className="block">{line}</span>
              ))}
            </h1>
            <p className="text-foreground-secondary text-sm leading-relaxed mb-8">
              Ferrari, Porsche, Mercedes AMG, Land Rover, BMW e Audi. Selecionados em
              Uberlândia, entregues em todo o Brasil.
            </p>
            <Link
              href="/veiculos"
              className="w-full inline-flex items-center justify-center gap-3
                         text-white text-xs font-medium tracking-[0.22em] uppercase
                         px-8 py-4
                         bg-[#A8302E] hover:bg-[#8A2422]
                         border border-[#A8302E]"
            >
              Explorar estoque
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>

      {/* ============================================================
          DESKTOP LAYOUT (lg+) — split: texto editorial à esquerda,
          último vídeo do canal @attraveiculos à direita (autoplay mudo).
          Substitui o composite IA (removido — alucinava texto/distorcia).
          ============================================================ */}
      <div className="hidden lg:grid grid-cols-[45fr_55fr] items-center gap-12 relative w-full
                      h-[100svh] min-h-[640px] max-h-[920px] overflow-hidden px-[10%]">
        {/* Coluna esquerda — texto */}
        <div className="relative z-10 flex flex-col justify-center items-start text-left">
          {editorialCopy}
        </div>

        {/* Coluna direita — vídeo (centralizado verticalmente) */}
        <div className="relative z-10 flex items-center justify-center">
          {videoPlayer}
        </div>
      </div>
    </section>
  )
}
