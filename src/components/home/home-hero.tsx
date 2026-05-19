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
   * Top vehicles to rotate as background. The component cycles through them
   * automatically (9s each, fade transition). When empty, falls back to a
   * static gradient — no broken layout.
   */
  vehicles?: Vehicle[]
  /**
   * Mapa { vehicleId → publicUrl } com a versão PNG transparente (sem bg) da
   * foto principal de cada veículo. Quando presente, o hero desktop usa essa
   * versão pra simular um "carro flutuante" sobre o fundo do hero. Quando
   * ausente (cache miss), cai pro photos[0] original.
   */
  noBgPhotoMap?: Record<string, string | null>
}

const ROTATION_INTERVAL_MS = 9000

/**
 * Manifesto headline rotation — usado apenas no fallback desktop quando há
 * veículos no slider, ou no fallback mobile quando NÃO há veículos.
 */
const MANIFESTO_LINES = [
  'Seleção,\nsem igual.',
  'Critério.\nNão estoque.',
  'O lugar\ndo extraordinário.',
] as const

// Wine sóbrio — vermelho dessaturado coerente com primary Attra (#9A1C1C)
// mas com brilho suficiente pra ler em fundos claros e escuros.
const WINE = '#A8302E'

export function HomeHero({ vehicles = [], noBgPhotoMap = {} }: HomeHeroProps) {
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
      className="home-hero-canvas relative w-full overflow-hidden"
    >
      {/* ============================================================
          MOBILE LAYOUT (< lg) — híbrido estilo Avantgarde com identidade Attra:
          vertical, foto destacada centralizada, brand+modelo do veículo ativo,
          specs inline, CTA sólido wine + link secundário.
          Mantém paleta wine, Montserrat, eyebrow numérico e progress bar.
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
          DESKTOP LAYOUT (lg+) — split REAL: texto na coluna esquerda,
          foto contained na coluna direita. Ambas as colunas compartilham
          o mesmo background do `.home-hero-canvas` (light: #ecebea, dark:
          #0C0D0E), então não há "divisória" visível — a foto fica
          naturalmente integrada ao fundo, sem moldura nem fade artificial.
          Object-contain garante o veículo INTEIRO sem corte. Responsivo
          em qualquer aspect ratio (grid em %).
          ============================================================ */}
      <div className="hidden lg:grid grid-cols-[45fr_55fr] relative w-full h-[100svh] min-h-[640px] max-h-[920px] overflow-hidden">

        {/* BACKGROUND fixo do showroom — cobre o hero inteiro. Carro PNG
            transparente é renderizado por cima, alinhado à base do chão
            do showroom (ver objectPosition na coluna direita). */}
        <Image
          src="/images/hero-showroom-bg.png"
          alt=""
          fill
          priority
          sizes="100vw"
          style={{ objectFit: 'cover', objectPosition: 'center bottom' }}
          className="absolute inset-0 z-0 select-none pointer-events-none"
        />

        {/* Overlay sutil à esquerda — garante contraste do texto sobre
            qualquer reflexo/cor do showroom. Gradient horizontal forte
            à esquerda (zona do texto) e transparente à direita (zona
            do carro). Adapta light/dark via classe. */}
        <div
          aria-hidden="true"
          className="home-hero-overlay-desktop absolute inset-0 z-[1] pointer-events-none"
        />

        {/* COLUNA ESQUERDA — Editorial copy (texto + CTAs).
            pl-[14%] empurra o bloco levemente pro centro (era pl-[10%]). */}
        <div className="relative z-10 flex flex-col justify-center items-start text-left
                        pl-[14%] pr-8 pt-24 pb-32">

          {/* Eyebrow */}
          <div className="flex items-center gap-4 mb-9">
            <span
              aria-hidden
              className="block h-px w-16"
              style={{ backgroundColor: WINE }}
            />
            <span
              className="text-[11px] uppercase tracking-[0.32em] font-medium"
              style={{ color: WINE }}
            >
              {String(safeIndex + 1).padStart(2, '0')} / Coleção
            </span>
          </div>

          {/* Manifesto headline */}
          <h1
            className="text-foreground font-normal tracking-tight leading-[1.05]
                       text-[clamp(2.5rem,5.5vw,5rem)] mb-8"
            style={{ fontFamily: 'var(--font-montserrat)' }}
          >
            {manifestoLine.split('\n').map((line, i) => (
              <span key={i} className="block">
                {line}
              </span>
            ))}
          </h1>

          {/* Subhead */}
          <p className="text-foreground-secondary font-light text-[15px] tracking-wide
                        max-w-xl leading-relaxed mb-11">
            Ferrari, Porsche, Mercedes AMG, Land Rover, BMW e Audi. Selecionados em
            Uberlândia, entregues em todo o Brasil.
          </p>

          {/* CTAs */}
          <div className="flex flex-row items-center gap-7 flex-wrap">
            <Link
              href="/veiculos"
              className="hero-cta-primary group inline-flex items-center justify-center gap-3
                         text-foreground text-sm font-medium tracking-[0.22em] uppercase
                         px-10 py-4 rounded-none transition-all duration-300"
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
                         text-sm font-semibold tracking-[0.18em] uppercase transition-colors"
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

        {/* COLUNA DIREITA — Carro PNG transparente alinhado à base do
            showroom (object-position center 88%). O background do showroom
            já provê todo o cenário (parede de vidro, plantas, chão), então
            o carro só precisa ser sobreposto no "chão" da imagem.
            Quando o cache de remove-bg está em miss, cai pra foto original
            sem mask (vai aparecer com fundo próprio, look mais cru — caso
            raro depois do preprocess). */}
        <div className="relative h-full z-10">
          {slides.length > 0 ? (
            slides.map((vehicle, i) => {
              const noBgUrl = noBgPhotoMap[vehicle.id]
              const photoUrl = noBgUrl ?? vehicle.photos[0]
              return (
                <div
                  key={vehicle.id}
                  className="absolute inset-0 transition-opacity duration-[1500ms] ease-in-out"
                  style={{ opacity: i === safeIndex ? 1 : 0 }}
                  aria-hidden={i !== safeIndex}
                >
                  <Image
                    src={photoUrl}
                    alt={`${vehicle.brand} ${vehicle.model}`}
                    fill
                    priority={i === 0}
                    // object-position '50% 88%' empurra o carro pra parte
                    // inferior da coluna, alinhando a base com o chão do
                    // showroom no background. Ajustar entre 80-92% se
                    // precisar fine-tune.
                    style={{ objectFit: 'contain', objectPosition: '50% 88%' }}
                    sizes="55vw"
                  />
                </div>
              )
            })
          ) : null}
        </div>

        {/* Vehicle caption — bottom-left (sobre a coluna do texto) */}
        {activeVehicle && (
          <div className="absolute bottom-20 left-[10%] z-10 max-w-[40%]">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1
                            text-[11px] uppercase tracking-[0.22em]">
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

        {/* Slide progress bar — span full width no rodapé */}
        {slides.length > 1 && (
          <div className="absolute bottom-12 left-12 right-12 z-10">
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
    </section>
  )
}
