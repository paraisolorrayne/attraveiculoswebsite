'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Vehicle } from '@/types'
import { getWhatsAppUrl } from '@/lib/constants'

const consultantWhatsAppMessage =
  'Olá, Attra. Gostaria de falar com um consultor sobre os veículos do acervo.'

interface HomeHeroProps {
  /**
   * Top vehicles to rotate as background. The component cycles through them
   * automatically (8s each, fade transition). When empty, falls back to a
   * static gradient — no broken layout.
   */
  vehicles?: Vehicle[]
}

const ROTATION_INTERVAL_MS = 9000

/**
 * Manifesto headline rotation — Attra é a MOLDURA, não o quadro.
 * Em vez de mostrar marca+modelo grande (que compete com a marca do carro
 * vendido), o headline é a posição editorial da Attra. As frases curam.
 * Pode ser trocado/expandido depois.
 */
const MANIFESTO_LINES = [
  'Seleção,\nsem igual.',
  'Critério.\nNão estoque.',
  'O lugar\ndo extraordinário.',
] as const

// Wine sóbrio — vermelho dessaturado coerente com primary Attra (#9A1C1C)
// mas com brilho suficiente pra ler em fundos claros e escuros.
const WINE = '#A8302E'

export function HomeHero({ vehicles = [] }: HomeHeroProps) {
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

  const handleSelectSlide = (i: number) => {
    setActiveIndex(i)
    setRestartTick(t => t + 1)
  }

  return (
    <section
      aria-label="Apresentação Attra Veículos"
      className="home-hero-canvas relative w-full h-[100svh] min-h-[640px] max-h-[920px] overflow-hidden"
    >
      {/* Background — carro empurrado pra direita (object-position: right) com
          gradient horizontal forte à esquerda criando zona escura pra texto.
          Lamborghini Beverly Hills pattern: carro à direita ocupando ~60% do
          frame visualmente, texto à esquerda em zona preta sólida — sem
          texto sobre o carro. */}
      <div className="absolute inset-0">
        {slides.length > 0 ? (
          slides.map((vehicle, i) => (
            <div
              key={vehicle.id}
              className="absolute inset-0 transition-opacity duration-[1500ms] ease-in-out"
              style={{ opacity: i === safeIndex ? 1 : 0 }}
              aria-hidden={i !== safeIndex}
            >
              {/* Mobile: cover preenche o viewport inteiro — sem letterbox.
                  Texto centralizado lê sobre overlay vertical forte. Contain
                  causava quebra de layout (faixas pretas top/bottom + texto
                  fragmentado). */}
              <Image
                src={vehicle.photos[0]}
                alt={`${vehicle.brand} ${vehicle.model}`}
                fill
                priority={i === 0}
                className="lg:hidden"
                style={{ objectFit: 'cover', objectPosition: 'center' }}
                sizes="100vw"
              />
              {/* Desktop: foto contida em uma "janela" de 45% da largura,
                  alinhada à direita do viewport. Mask em RADIAL-gradient
                  com ellipse vertical alongada gera uma borda oval/curva
                  na lateral esquerda da foto — em vez da linha vertical
                  reta, a transição faz um arco entrando suavemente no
                  preto. */}
              <div
                className="hidden lg:block absolute inset-y-0 right-0 w-[45%]"
                style={{
                  WebkitMaskImage:
                    'radial-gradient(ellipse 130% 150% at 130% 50%, black 60%, rgba(0,0,0,0.75) 80%, transparent 100%)',
                  maskImage:
                    'radial-gradient(ellipse 130% 150% at 130% 50%, black 60%, rgba(0,0,0,0.75) 80%, transparent 100%)',
                }}
              >
                <Image
                  src={vehicle.photos[0]}
                  alt={`${vehicle.brand} ${vehicle.model}`}
                  fill
                  priority={i === 0}
                  style={{ objectFit: 'cover', objectPosition: '100% center' }}
                  sizes="60vw"
                />
              </div>
            </div>
          ))
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] via-[#0f0f0f] to-[#000]" />
        )}

        {/* Mobile: vertical overlay pra texto centralizado ler sobre o carro.
            Adaptativo light/dark via classe (regras em hero.css). */}
        <div className="home-hero-overlay-mobile absolute inset-0 lg:hidden" />

        {/* Desktop: gradient diagonal generoso — ângulo 125deg cria a "zona
            do headline" à esquerda. Cor segue o tema (branco em light,
            preto em dark) via classe adaptativa. */}
        <div className="home-hero-overlay-desktop absolute inset-0 hidden lg:block pointer-events-none" />

        {/* Texture layer — radial gradients sutis quebram a chapação
            da zona do headline em desktop. */}
        <div className="home-hero-texture absolute inset-0 hidden lg:block pointer-events-none" />

        {/* Slight bottom darkening — adaptativo light/dark. */}
        <div className="home-hero-bottom-fade absolute inset-x-0 bottom-0 h-32" />
      </div>

      {/* Editorial copy.
          Desktop: bloco deslocado da borda esquerda (~10% da viewport) para
          aproximar do centro visual sem sobrepor o carro — mantém o pattern
          split Lambo Beverly Hills mas com mais respiro à esquerda.
          Mobile: centralizado vertical e horizontalmente sobre overlay vertical */}
      <div className="relative z-10 flex h-full flex-col
                      justify-center items-center text-center
                      lg:items-start lg:text-left
                      px-6 sm:px-10 lg:pl-[18%] lg:pr-12 pt-24 pb-32 sm:pb-36
                      mx-auto lg:mx-0 max-w-xl lg:max-w-[46%]">

        {/* Geometric eyebrow — linha champagne fina + número/contagem (DNA Lamborghini) */}
        <div className="flex items-center gap-4 mb-7 sm:mb-9">
          <span
            aria-hidden
            className="block h-px w-12 sm:w-16"
            style={{ backgroundColor: WINE }}
          />
          <span
            className="text-[10px] sm:text-[11px] uppercase tracking-[0.32em] font-medium"
            style={{ color: WINE }}
          >
            {String(safeIndex + 1).padStart(2, '0')} / Coleção
          </span>
        </div>

        {/* Manifesto headline — Montserrat Regular, alto contraste, tracking
            largo (Lamborghini Beverly Hills pattern). Attra é a moldura: o
            headline é a posição editorial da casa, NÃO marca+modelo do carro
            (que compete com Ferrari/Lambo). */}
        <h1
          className="text-foreground font-normal tracking-tight leading-[1.05]
                     text-[clamp(2.75rem,7.5vw,6rem)] mb-6 sm:mb-8"
          style={{ fontFamily: 'var(--font-montserrat)' }}
        >
          {manifestoLine.split('\n').map((line, i) => (
            <span key={i} className="block">
              {line}
            </span>
          ))}
        </h1>

        {/* Subhead — sans, neutro, lista das marcas + procedência.
            Sem hífens nem em-dash no corpo do texto. "Mercedes AMG" sem hifen
            (a marca oficial usa hifen, mas a regra editorial Attra é remover
            hifens de textos do site). */}
        <p className="text-foreground-secondary font-light text-sm sm:text-[15px] tracking-wide
                      max-w-xl leading-relaxed mb-9 sm:mb-11">
          Ferrari, Porsche, Mercedes AMG, Land Rover, BMW e Audi. Selecionados em
          Uberlândia, entregues em todo o Brasil.
        </p>

        {/* CTAs — primário com toque champagne + secundário link champagne.
            Champagne (#B8A47C) é a cor de acento já usada no eyebrow e na
            progress bar do hero, então o uso aqui mantém coesão visual sem
            roubar protagonismo do carro. */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-7">
          <Link
            href="/veiculos"
            className="hero-cta-primary group inline-flex items-center justify-center gap-3
                       text-foreground
                       text-xs sm:text-sm font-medium tracking-[0.22em] uppercase
                       px-9 sm:px-12 py-4 rounded-none
                       transition-all duration-300"
            style={{
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: WINE,
              backgroundColor: 'rgba(168, 48, 46, 0.08)',
            }}
          >
            Explorar Estoque
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <a
            href={getWhatsAppUrl(consultantWhatsAppMessage)}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center
                       text-xs sm:text-sm font-semibold tracking-[0.18em] uppercase
                       transition-colors"
            style={{ color: WINE }}
          >
            <span
              className="border-b pb-1 transition-colors"
              style={{ borderColor: WINE }}
            >
              Falar com consultor
            </span>
          </a>
        </div>
      </div>

      {/* Vehicle caption — bottom-right, sobre a zona escurecida pelo gradient
          inferior. "Etiqueta da obra" estilo galeria de arte. Posicionada do
          lado do carro, não do texto.
          O eyebrow "EM DESTAQUE" usa branco com text-shadow forte (não champagne)
          pra garantir contraste em fundos claros — chão de cimento do showroom
          ou paredes claras. Champagne só fica na linha decorativa. */}
      {activeVehicle && (
        <div className="absolute bottom-16 sm:bottom-20 left-8 sm:left-12 lg:left-[18%] right-8 sm:right-12 z-10">
          {/* Caption editorial inline — formato disclaimer, uma linha só,
              logo acima da progress bar. Filete wine ancora à esquerda;
              separadores neutros (·) entre os blocos de informação. */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1
                          text-[10px] sm:text-[11px] uppercase tracking-[0.22em]">
            <span
              aria-hidden
              className="block h-px w-8"
              style={{ backgroundColor: WINE }}
            />
            <span className="font-semibold text-foreground">Em destaque</span>
            <span className="text-foreground/30" aria-hidden>·</span>
            <span className="font-light text-foreground-secondary tracking-[0.18em]">
              {activeVehicle.brand} {activeVehicle.model}
            </span>
            <span className="text-foreground/30" aria-hidden>·</span>
            <span className="font-light text-foreground-secondary">
              {activeVehicle.year_model}
            </span>
          </div>
        </div>
      )}

      {/* Slide progress bar — Lamborghini Beverly Hills pattern.
          Linha base + segmento ativo champagne avançando. Mais elegante
          que dots; comunica progresso de forma cinematográfica. */}
      {slides.length > 1 && (
        <div className="absolute bottom-10 sm:bottom-12 left-8 sm:left-12 right-8 sm:right-12 z-10">
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
    </section>
  )
}
