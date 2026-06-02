'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getWhatsAppUrl } from '@/lib/constants'

const consultantWhatsAppMessage =
  'Olá, Attra. Gostaria de falar com um consultor sobre os veículos do acervo.'

interface HomeHeroProps {
  /**
   * ID do vídeo mais recente do canal da Attra (via youtube-feed RSS).
   * Quando presente, exibido em autoplay mudo/loop na coluna direita.
   * Quando ausente (feed indisponível), a coluna de vídeo é omitida e o
   * texto ocupa o hero inteiro — sem layout quebrado.
   */
  videoId?: string | null
}

const MANIFESTO_ROTATION_MS = 7000

/**
 * Manifesto headline rotation — Attra é a MOLDURA, não o quadro.
 * Frases editoriais que curam, em vez de marca+modelo (que competiria
 * com Ferrari/Lambo).
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

export function HomeHero({ videoId }: HomeHeroProps) {
  const [lineIndex, setLineIndex] = useState(0)

  // Rotaciona o manifesto (respeitando prefers-reduced-motion).
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) return
    const interval = setInterval(() => {
      setLineIndex((prev) => (prev + 1) % MANIFESTO_LINES.length)
    }, MANIFESTO_ROTATION_MS)
    return () => clearInterval(interval)
  }, [])

  const manifestoLine = MANIFESTO_LINES[lineIndex]
  const embedUrl = videoId ? buildEmbedUrl(videoId) : null

  // Bloco de texto editorial — reusado em mobile e desktop.
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

  // Player do vídeo — autoplay mudo loop, sem controles (look de banner).
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
          MOBILE LAYOUT (< lg) — texto em cima, vídeo embaixo.
          ============================================================ */}
      <div className="lg:hidden relative w-full bg-background pt-24 pb-12 px-6">
        <div className="flex flex-col items-start text-left max-w-md mx-auto">
          {editorialCopy}
          {videoPlayer && <div className="w-full mt-10">{videoPlayer}</div>}
        </div>
      </div>

      {/* ============================================================
          DESKTOP LAYOUT (lg+) — split: texto à esquerda, vídeo à direita.
          ============================================================ */}
      <div className="hidden lg:grid grid-cols-[45fr_55fr] items-center gap-12 relative w-full
                      min-h-[560px] py-16 xl:py-20 overflow-hidden px-[10%]">
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
