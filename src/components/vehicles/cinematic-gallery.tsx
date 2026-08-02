'use client'

import { useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, Expand, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CinematicGalleryProps {
  photos: string[]
  /** Marca + modelo já concatenados pela ficha (ex.: "Chevrolet Corvette Z06"). */
  vehicleName: string
  /**
   * Ano do modelo. Opcional porque só a ficha tem esse dado: quando vem
   * preenchido o `alt` deixa de ser genérico e passa a identificar a unidade
   * exata (marca + modelo + ano), que é o que um buscador ou um LLM consegue citar.
   */
  vehicleYear?: string | number
}

/**
 * Rótulo usado em todos os `alt` da galeria. Só entra no texto o que veio do
 * estoque — nada é inventado quando o ano não é informado.
 */
function buildVehicleLabel(vehicleName: string, vehicleYear?: string | number): string {
  const year = vehicleYear != null ? String(vehicleYear).trim() : ''
  return year ? `${vehicleName} ${year}` : vehicleName
}

// Skeleton loading component
function ImageSkeleton() {
  return (
    <div className="absolute inset-0 bg-background-soft animate-pulse flex items-center justify-center">
      <Loader2 className="w-12 h-12 text-primary/50 animate-spin" />
    </div>
  )
}

export function CinematicGallery({ photos, vehicleName, vehicleYear }: CinematicGalleryProps) {
  const vehicleLabel = buildVehicleLabel(vehicleName, vehicleYear)
  const totalPhotos = photos.length
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set())
  const [errorImages, setErrorImages] = useState<Set<number>>(new Set())
  const [fullscreenLoaded, setFullscreenLoaded] = useState<Set<number>>(new Set())

  // Mark image as loaded
  const handleImageLoad = useCallback((index: number) => {
    setLoadedImages(prev => new Set(prev).add(index))
  }, [])

  // Handle image error
  const handleImageError = useCallback((index: number) => {
    setErrorImages(prev => new Set(prev).add(index))
    setLoadedImages(prev => new Set(prev).add(index)) // Hide skeleton
  }, [])

  // Preload adjacent images
  useEffect(() => {
    const preloadIndexes = [
      currentIndex,
      (currentIndex + 1) % photos.length,
      (currentIndex - 1 + photos.length) % photos.length,
    ]

    preloadIndexes.forEach(index => {
      if (!loadedImages.has(index) && photos[index]) {
        const img = new window.Image()
        img.src = photos[index]
      }
    })
  }, [currentIndex, photos, loadedImages])

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1))
  }, [photos.length])

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1))
  }, [photos.length])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrevious()
      if (e.key === 'ArrowRight') goToNext()
      if (e.key === 'Escape' && isFullscreen) setIsFullscreen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goToPrevious, goToNext, isFullscreen])

  const isCurrentLoaded = loadedImages.has(currentIndex)
  const hasCurrentError = errorImages.has(currentIndex)

  return (
    <>
      {/* Main Hero Gallery - 60-70% viewport */}
      <div className="relative h-[60vh] lg:h-[70vh] w-full bg-background-soft overflow-hidden">
        {/* Main Image - Clickable area to open fullscreen */}
        <div
          className="relative h-full w-full cursor-pointer group"
          onClick={() => setIsFullscreen(true)}
          role="button"
          tabIndex={0}
          aria-label="Clique para ver em tela cheia"
          onKeyDown={(e) => e.key === 'Enter' && setIsFullscreen(true)}
        >
          {/* Loading skeleton for current image */}
          {!isCurrentLoaded && <ImageSkeleton />}

          {photos.map((photo, index) => {
            // Only render current, previous, and next images for performance
            const shouldRender =
              index === currentIndex ||
              index === (currentIndex + 1) % photos.length ||
              index === (currentIndex - 1 + photos.length) % photos.length

            if (!shouldRender) return null

            return (
              <div
                key={photo}
                className={cn(
                  'absolute inset-0 transition-opacity duration-500',
                  index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
                )}
              >
                {hasCurrentError && index === currentIndex ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-background-soft">
                    <p className="text-foreground-secondary">Erro ao carregar imagem</p>
                  </div>
                ) : (
                  <Image
                    src={photo}
                    alt={`${vehicleLabel} — foto ${index + 1} de ${totalPhotos} do veículo em estoque na Attra Veículos`}
                    // width/height declarados no lugar de `fill` só para que os
                    // atributos existam no HTML bruto (era o que faltava para o CLS
                    // no mobile). O tamanho real continua vindo do CSS
                    // `.hero-vehicle-image`, que força width/height 100% com
                    // object-fit contain — o resultado visual é o mesmo do `fill`.
                    width={1920}
                    height={1080}
                    className={cn(
                      // `block` porque sem `fill` a imagem volta a ser inline e
                      // ganharia o vão de baseline embaixo.
                      "block hero-vehicle-image transition-opacity duration-300",
                      loadedImages.has(index) ? "opacity-100" : "opacity-0"
                    )}
                    priority={index === 0 || index === currentIndex}
                    quality={90}
                    sizes="100vw"
                    onLoad={() => handleImageLoad(index)}
                    onError={() => handleImageError(index)}
                  />
                )}
              </div>
            )
          })}

          {/* Hover overlay hint */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 pointer-events-none z-15" />
        </div>

        {/* Subtle gradient overlays - reduced for better image visibility */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background/80 to-transparent pointer-events-none z-20" />

        {/* Navigation arrows - stopPropagation to prevent opening fullscreen when clicking arrows */}
        <button
          onClick={(e) => { e.stopPropagation(); goToPrevious() }}
          className="absolute left-4 lg:left-8 top-1/2 -translate-y-1/2 p-3 bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-full text-white transition-all z-40"
          aria-label="Imagem anterior"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); goToNext() }}
          className="absolute right-4 lg:right-8 top-1/2 -translate-y-1/2 p-3 bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-full text-white transition-all z-40"
          aria-label="Próxima imagem"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Fullscreen button - positioned below header (top-24 = 96px to clear 80px header) */}
        <button
          onClick={(e) => { e.stopPropagation(); setIsFullscreen(true) }}
          className="absolute top-24 right-4 p-3 bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-full text-white transition-all z-40"
          aria-label="Tela cheia"
        >
          <Expand className="w-5 h-5" />
        </button>

        {/* Image counter */}
        <div className="absolute bottom-4 left-4 px-4 py-2 bg-black/40 backdrop-blur-sm rounded-full text-white text-sm z-40 pointer-events-none">
          {currentIndex + 1} / {photos.length}
        </div>

        {/* Thumbnail strip */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 max-w-[80%] overflow-x-auto py-2 px-4 z-40">
          {photos.map((photo, index) => (
            <button
              key={index}
              onClick={(e) => { e.stopPropagation(); setCurrentIndex(index) }}
              className={cn(
                'relative w-16 h-12 lg:w-20 lg:h-14 rounded-lg overflow-hidden shrink-0 border-2 transition-all bg-background-soft',
                index === currentIndex ? 'border-primary' : 'border-transparent opacity-60 hover:opacity-100'
              )}
            >
              {/* O botão não tem texto: o `alt` da miniatura é o nome acessível
                  dele, por isso descreve a ação e o veículo, e não fica vazio. */}
              <Image
                src={photo}
                alt={`Ver foto ${index + 1} de ${totalPhotos} do ${vehicleLabel}`}
                width={80}
                height={56}
                className="block h-full w-full object-cover"
                sizes="80px"
                quality={60}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Fullscreen Modal - rendered via Portal to ensure it's above everything including header.
          Não precisa de guarda de "mounted": `isFullscreen` só vira true a partir de um
          handler de clique/teclado, que nunca roda no servidor — logo, aqui `document` existe. */}
      {isFullscreen && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black overflow-hidden"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            overflow: 'hidden'
          }}
        >
          {/* Close button - top right */}
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 z-50 p-3 bg-white/20 hover:bg-white/40 rounded-full text-white transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Previous button - left center */}
          <button
            onClick={goToPrevious}
            className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-50 p-2 md:p-3 bg-white/20 hover:bg-white/40 rounded-full text-white transition-colors"
            aria-label="Imagem anterior"
          >
            <ChevronLeft className="w-6 h-6 md:w-8 md:h-8" />
          </button>

          {/* Next button - right center */}
          <button
            onClick={goToNext}
            className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-50 p-2 md:p-3 bg-white/20 hover:bg-white/40 rounded-full text-white transition-colors"
            aria-label="Próxima imagem"
          >
            <ChevronRight className="w-6 h-6 md:w-8 md:h-8" />
          </button>

          {/* Main image container - área principal */}
          <div
            className="w-full flex items-center justify-center px-12 md:px-16 relative"
            style={{
              height: 'calc(100vh - 100px)',
              paddingTop: '16px'
            }}
          >
            {/* Loading spinner for fullscreen image */}
            {!fullscreenLoaded.has(currentIndex) && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-white/60 animate-spin" />
              </div>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element -- o lightbox existe
                justamente para mostrar a foto em resolução original; passar pelo
                otimizador do next/image limitaria a largura aos deviceSizes. */}
            <img
              key={currentIndex}
              src={photos[currentIndex]}
              alt={`${vehicleLabel} — foto ${currentIndex + 1} de ${totalPhotos} em tela cheia`}
              className={cn(
                "max-w-full max-h-full object-contain transition-opacity duration-300",
                fullscreenLoaded.has(currentIndex) ? "opacity-100" : "opacity-0"
              )}
              onLoad={() => setFullscreenLoaded(prev => new Set(prev).add(currentIndex))}
            />
          </div>

          {/* Thumbnails + Counter - fixed at bottom */}
          <div
            className="absolute bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black via-black/80 to-transparent"
            style={{ height: '100px', paddingTop: '20px' }}
          >
            {/* Thumbnails */}
            <div className="flex justify-center gap-1.5 md:gap-2 px-4 overflow-x-auto">
              {photos.map((photo, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={cn(
                    'flex-shrink-0 w-12 h-9 md:w-16 md:h-12 rounded overflow-hidden border-2 transition-all',
                    index === currentIndex
                      ? 'border-primary opacity-100 scale-105'
                      : 'border-white/20 opacity-40 hover:opacity-80'
                  )}
                >
                  {/* Mesmo caso da tira de miniaturas: o `alt` é o nome acessível do botão.
                      A miniatura vive numa caixa fixa, então vai pelo next/image — antes
                      cada uma baixava a foto em resolução original. */}
                  <Image
                    src={photo}
                    alt={`Ver foto ${index + 1} de ${totalPhotos} do ${vehicleLabel}`}
                    width={64}
                    height={48}
                    className="block w-full h-full object-cover"
                    sizes="64px"
                    quality={60}
                  />
                </button>
              ))}
            </div>

            {/* Counter */}
            <div className="text-center mt-2 text-white/70 text-xs">
              {currentIndex + 1} / {photos.length}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

