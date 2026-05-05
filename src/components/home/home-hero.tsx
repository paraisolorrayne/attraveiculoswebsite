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
  'Selecionados,\nnão listados.',
  'Curadoria.\nNão estoque.',
  'O endereço\ndos raros.',
] as const

const CHAMPAGNE = '#B8A47C'

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
      className="relative w-full h-[100svh] min-h-[640px] max-h-[920px] overflow-hidden bg-[#0A0A0A]"
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
              {/* Desktop: cover preenchendo o container inteiro com object-position
                  ligeiramente à direita (60%) — mantém o carro inteiro visível
                  (frente + traseira), com a frente caindo no meio do gradient
                  diagonal pra evitar cut vertical. */}
              <Image
                src={vehicle.photos[0]}
                alt={`${vehicle.brand} ${vehicle.model}`}
                fill
                priority={i === 0}
                className="hidden lg:block"
                style={{ objectFit: 'cover', objectPosition: '60% center' }}
                sizes="100vw"
              />
            </div>
          ))
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] via-[#0f0f0f] to-[#000]" />
        )}

        {/* Mobile: vertical overlay pra texto centralizado ler sobre o carro.
            Não dá pra fazer split horizontal em mobile (não cabe). */}
        <div
          className="absolute inset-0 lg:hidden"
          style={{
            background:
              'linear-gradient(to bottom, rgba(10,10,10,0.92) 0%, rgba(10,10,10,0.55) 35%, rgba(10,10,10,0.45) 60%, rgba(10,10,10,0.85) 100%)',
          }}
        />

        {/* Desktop: gradient diagonal generoso — ângulo 125deg dá inclinação
            visível (não vertical), transição estendida 15%→75% suaviza o
            "cut" entre zona texto e foto. A frente do carro pega o
            gradiente médio (~40% escuro): ainda legível, sem corte abrupto. */}
        <div
          className="absolute inset-0 hidden lg:block pointer-events-none"
          style={{
            background:
              'linear-gradient(125deg, #0A0A0A 0%, #0A0A0A 15%, rgba(10,10,10,0.9) 28%, rgba(10,10,10,0.7) 38%, rgba(10,10,10,0.45) 48%, rgba(10,10,10,0.22) 58%, rgba(10,10,10,0.08) 68%, transparent 78%)',
          }}
        />

        {/* Slight bottom darkening — só pra reforçar a leitura da progress bar
            sem cobrir o carro. */}
        <div className="absolute inset-x-0 bottom-0 h-32
                        bg-gradient-to-t from-black/60 to-transparent" />
      </div>

      {/* Editorial copy.
          Desktop: left panel, vertically centered (Lambo Beverly Hills pattern)
          Mobile: centralizado vertical e horizontalmente sobre overlay vertical */}
      <div className="relative z-10 flex h-full flex-col
                      justify-center items-center text-center
                      lg:items-start lg:text-left
                      px-6 sm:px-10 lg:px-20 pt-24 pb-32 sm:pb-36
                      mx-auto lg:mx-0 max-w-xl lg:max-w-[42%]">

        {/* Geometric eyebrow — linha champagne fina + número/contagem (DNA Lamborghini) */}
        <div className="flex items-center gap-4 mb-7 sm:mb-9">
          <span
            aria-hidden
            className="block h-px w-12 sm:w-16"
            style={{ backgroundColor: CHAMPAGNE }}
          />
          <span
            className="text-[10px] sm:text-[11px] uppercase tracking-[0.32em] font-medium"
            style={{ color: CHAMPAGNE }}
          >
            {String(safeIndex + 1).padStart(2, '0')} / Coleção
          </span>
        </div>

        {/* Manifesto headline — serif editorial, alto contraste.
            Attra é a moldura: o headline é a posição editorial da casa,
            NÃO marca+modelo do carro (que compete com Ferrari/Lambo). */}
        <h1 className="font-editorial text-white font-light tracking-tight leading-[0.95]
                       text-[clamp(2.75rem,7.5vw,6rem)] mb-6 sm:mb-8
                       [text-shadow:_0_2px_12px_rgba(0,0,0,0.45)]">
          {manifestoLine.split('\n').map((line, i) => (
            <span key={i} className={`block ${i === 1 ? 'italic font-light' : ''}`}>
              {line}
            </span>
          ))}
        </h1>

        {/* Subhead — sans, neutro, lista das marcas + procedência.
            Sem hífens nem em-dash no corpo do texto. "Mercedes AMG" sem hifen
            (a marca oficial usa hifen, mas a regra editorial Attra é remover
            hifens de textos do site). */}
        <p className="text-white/85 font-light text-sm sm:text-[15px] tracking-wide
                      max-w-xl leading-relaxed mb-9 sm:mb-11
                      [text-shadow:_0_1px_6px_rgba(0,0,0,0.5)]">
          Ferrari, Porsche, Mercedes AMG, Land Rover, BMW e Audi. Selecionados em
          Uberlândia, entregues em todo o Brasil.
        </p>

        {/* CTAs — primário ghost outline + secundário link */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-7">
          <Link
            href="/veiculos"
            className="group inline-flex items-center justify-center gap-3
                       border border-white/60 hover:border-white text-white
                       text-xs sm:text-sm font-medium tracking-[0.22em] uppercase
                       px-9 sm:px-12 py-4 rounded-none
                       hover:bg-white hover:text-black
                       transition-all duration-300"
          >
            Explorar Estoque
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <a
            href={getWhatsAppUrl(consultantWhatsAppMessage)}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center text-white/80 hover:text-white
                       text-xs sm:text-sm font-light tracking-[0.18em] uppercase
                       transition-colors"
          >
            <span className="border-b border-white/30 group-hover:border-white pb-1 transition-colors">
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
        <div className="absolute bottom-28 sm:bottom-32 right-8 sm:right-12 lg:right-16 z-10 text-right
                        [text-shadow:_0_2px_10px_rgba(0,0,0,0.85)]">
          <div className="flex items-center justify-end gap-3 mb-2">
            <span className="text-white text-[10px] uppercase tracking-[0.3em] font-semibold">
              Em destaque
            </span>
            <span
              aria-hidden
              className="block h-px w-10"
              style={{ backgroundColor: CHAMPAGNE }}
            />
          </div>
          <p className="text-white text-base sm:text-lg font-light tracking-wide">
            {activeVehicle.brand} {activeVehicle.model}
          </p>
          <p className="text-white/85 text-xs font-light tracking-[0.15em] uppercase mt-1">
            {activeVehicle.year_model}
          </p>
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
                  className="block h-px transition-all duration-500"
                  style={{
                    backgroundColor: i === safeIndex ? CHAMPAGNE : 'rgba(255,255,255,0.18)',
                  }}
                />
              </button>
            ))}
            <span
              className="text-[10px] tracking-[0.25em] font-light ml-3"
              style={{ color: CHAMPAGNE }}
            >
              {String(safeIndex + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
            </span>
          </div>
        </div>
      )}
    </section>
  )
}
