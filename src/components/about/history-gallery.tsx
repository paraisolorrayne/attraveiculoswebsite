'use client'

import { useState, useCallback, useEffect } from 'react'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface HistorySlide {
  image: string
  year: string
  caption: string
  alt: string
}

export interface HistoryEra {
  label: string
  description: string
  slides: HistorySlide[]
}

interface HistoryGalleryProps {
  eras: HistoryEra[]
}

function flattenSlides(eras: HistoryEra[]): HistorySlide[] {
  return eras.flatMap((era) => era.slides)
}

function blockAction(e: React.MouseEvent | React.DragEvent) {
  e.preventDefault()
}

export function HistoryGallery({ eras }: HistoryGalleryProps) {
  const allSlides = flattenSlides(eras)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const openLightbox = useCallback((i: number) => setLightboxIndex(i), [])
  const closeLightbox = useCallback(() => setLightboxIndex(null), [])

  const goTo = useCallback((dir: 'prev' | 'next') => {
    setLightboxIndex((prev) => {
      if (prev === null) return null
      if (dir === 'next') return prev < allSlides.length - 1 ? prev + 1 : 0
      return prev > 0 ? prev - 1 : allSlides.length - 1
    })
  }, [allSlides.length])

  useEffect(() => {
    if (lightboxIndex === null) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox()
      if (e.key === 'ArrowRight') goTo('next')
      if (e.key === 'ArrowLeft') goTo('prev')
      if ((e.ctrlKey || e.metaKey) && e.key === 's') e.preventDefault()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handler)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handler)
    }
  }, [lightboxIndex, closeLightbox, goTo])

  // Onde cada era começa na lista única do lightbox.
  const inicioDaEra = eras.map((_, i) => eras.slice(0, i).reduce((n, era) => n + era.slides.length, 0))

  return (
    <>
      <div className="space-y-16">
        {eras.map((era, eraIndex) => {
          const eraOffset = inicioDaEra[eraIndex]

          return (
            <div key={eraIndex}>
              <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="text-[13px] font-semibold uppercase tracking-[0.16em] text-primary">
                  {era.label}
                </span>
                <div className="hidden h-px flex-1 bg-border sm:block" />
                <span className="text-sm text-foreground-secondary">
                  {era.description}
                </span>
              </div>

              {/* No celular, carrossel com rolagem para o lado (eram ~3.000 px
                  de fotos em duas colunas); a partir de 640 px, a grade. */}
              <div className={cn(
                'jornada-carrossel -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-2',
                'sm:mx-0 sm:grid sm:overflow-visible sm:px-0 sm:pb-0 lg:gap-4',
                era.slides.length <= 2
                  ? 'sm:grid-cols-2'
                  : era.slides.length <= 4
                    ? 'sm:grid-cols-2 lg:grid-cols-4'
                    : 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
              )}>
                {era.slides.map((slide, index) => {
                  const isFeature = index === 0 && era.slides.length > 2
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => openLightbox(eraOffset + index)}
                      onContextMenu={blockAction}
                      className={cn(
                        'relative w-[80%] shrink-0 snap-start rounded-2xl overflow-hidden group cursor-pointer text-left sm:w-auto',
                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                        isFeature ? 'sm:col-span-2 sm:row-span-2' : ''
                      )}
                    >
                      <div className={cn(
                        'relative bg-background-soft w-full',
                        isFeature ? 'aspect-[4/3] sm:aspect-square' : 'aspect-[4/3]'
                      )}>
                        <Image
                          src={slide.image}
                          alt={slide.alt}
                          fill
                          draggable={false}
                          className="object-cover transition-transform duration-500 group-hover:scale-105 select-none pointer-events-none"
                          sizes={isFeature
                            ? '(max-width: 640px) 80vw, 50vw'
                            : '(max-width: 640px) 80vw, (max-width: 1024px) 33vw, 25vw'
                          }
                          quality={85}
                        />
                        {/* Degradê sempre inteiro embaixo da legenda: a 60%, em foto clara
                            (a fachada de dia) o texto branco quase sumia. */}
                        <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
                        <div className="absolute top-3 right-3 p-2 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <ZoomIn className="w-4 h-4 text-white" />
                        </div>
                        <div className="absolute top-3 left-3 px-2.5 py-1 bg-primary text-white text-xs font-bold rounded-lg">
                          {slide.year}
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <p className={cn(
                            'text-white font-semibold leading-snug drop-shadow-lg',
                            isFeature ? 'text-base lg:text-lg' : 'text-xs lg:text-sm'
                          )}>
                            {slide.caption}
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {lightboxIndex !== null && allSlides[lightboxIndex] && (
        <LightboxModal
          slide={allSlides[lightboxIndex]}
          index={lightboxIndex}
          total={allSlides.length}
          onClose={closeLightbox}
          onPrev={() => goTo('prev')}
          onNext={() => goTo('next')}
        />
      )}
    </>
  )
}



/* ─── Lightbox Modal ─── */

interface LightboxModalProps {
  slide: HistorySlide
  index: number
  total: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}

function LightboxModal({ slide, index, total, onClose, onPrev, onNext }: LightboxModalProps) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
      onContextMenu={blockAction}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-[110] p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        aria-label="Fechar"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Counter */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 z-[110] text-white/70 text-sm font-medium">
        {index + 1} / {total}
      </div>

      {/* Prev */}
      <button
        onClick={(e) => { e.stopPropagation(); onPrev() }}
        className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 z-[110] p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        aria-label="Anterior"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      {/* Next */}
      <button
        onClick={(e) => { e.stopPropagation(); onNext() }}
        className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 z-[110] p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        aria-label="Próximo"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Image container */}
      <div
        className="relative w-[90vw] h-[80vh] max-w-6xl flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
        onContextMenu={blockAction}
        onDragStart={blockAction}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={slide.image}
          alt={slide.alt}
          draggable={false}
          className="max-w-full max-h-full object-contain select-none pointer-events-none rounded-lg"
          onContextMenu={blockAction}
          onDragStart={blockAction}
        />
        {/* Transparent overlay to block interaction with the image element */}
        <div className="absolute inset-0 z-10" onContextMenu={blockAction} onDragStart={blockAction} />
      </div>

      {/* Caption bar */}
      <div className="absolute bottom-0 left-0 right-0 z-[110] bg-gradient-to-t from-black/80 to-transparent px-6 py-6 text-center">
        <span className="inline-block px-3 py-1 bg-primary text-white text-xs font-bold rounded-lg mb-2">
          {slide.year}
        </span>
        <p className="text-white text-base lg:text-lg font-semibold drop-shadow-lg max-w-2xl mx-auto">
          {slide.caption}
        </p>
      </div>
    </div>
  )
}