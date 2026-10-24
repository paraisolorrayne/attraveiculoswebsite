'use client'

import { useState, useCallback, useEffect, useRef, type CSSProperties, type TouchEvent } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, Expand, X } from 'lucide-react'
import { PhotoSkeleton } from '@/components/ui/skeleton'
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

  // Original das vizinhas, para a tela cheia (que mostra a foto crua do
  // AutoConf) trocar de foto sem espera. Só com ela aberta: a galeria já
  // renderiza a atual e as duas vizinhas pelo next/image, e baixar o original
  // de cada uma somava ~1,7 MB de JPEG a toda ficha aberta, disputando banda
  // com a primeira foto.
  useEffect(() => {
    if (!isFullscreen) return
    const preloadIndexes = [
      (currentIndex + 1) % photos.length,
      (currentIndex - 1 + photos.length) % photos.length,
    ]

    preloadIndexes.forEach(index => {
      if (!fullscreenLoaded.has(index) && photos[index]) {
        const img = new window.Image()
        img.src = photos[index]
      }
    })
  }, [isFullscreen, currentIndex, photos, fullscreenLoaded])

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1))
  }, [photos.length])

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1))
  }, [photos.length])

  // Arrastar com o dedo. O carrossel acompanha o dedo (--arrasto no palco,
  // sem re-render) e, ao soltar, troca de foto se o gesto passou de 60 px ou
  // de 15% da largura. Só o gesto horizontal conta: o vertical continua sendo
  // a rolagem da página (touch-action: pan-y no palco).
  const palcoRef = useRef<HTMLDivElement>(null)
  const toqueRef = useRef<{ x: number; y: number; horizontal: boolean | null } | null>(null)
  // Um arrasto não pode terminar abrindo a tela cheia, que é o clique do palco.
  const arrastouRef = useRef(false)

  const aoTocar = useCallback((e: TouchEvent) => {
    const toque = e.touches[0]
    toqueRef.current = { x: toque.clientX, y: toque.clientY, horizontal: null }
    arrastouRef.current = false
  }, [])

  const aoArrastar = useCallback((e: TouchEvent) => {
    const inicio = toqueRef.current
    const palco = palcoRef.current
    if (!inicio || !palco) return
    const dx = e.touches[0].clientX - inicio.x
    const dy = e.touches[0].clientY - inicio.y
    if (inicio.horizontal === null && Math.hypot(dx, dy) > 8) inicio.horizontal = Math.abs(dx) > Math.abs(dy)
    if (!inicio.horizontal) return
    palco.dataset.arrastando = ''
    palco.style.setProperty('--arrasto', `${dx}px`)
  }, [])

  const aoSoltar = useCallback((e: TouchEvent) => {
    const inicio = toqueRef.current
    const palco = palcoRef.current
    toqueRef.current = null
    if (!palco) return
    delete palco.dataset.arrastando
    palco.style.removeProperty('--arrasto')
    if (!inicio?.horizontal) return
    arrastouRef.current = true
    const dx = (e.changedTouches[0]?.clientX ?? inicio.x) - inicio.x
    if (Math.abs(dx) < Math.min(60, palco.clientWidth * 0.15)) return
    if (dx < 0) goToNext()
    else goToPrevious()
  }, [goToNext, goToPrevious])

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
      {/* Main Hero Gallery. 80% da tela no computador (era 70%): a foto agora
          fica só entre o cabeçalho e as miniaturas e precisava da altura de
          volta. No celular, nunca menos de 26rem, senão a foto encolhia demais
          em telas baixas. */}
      <div className="relative h-[60vh] min-h-[26rem] lg:h-[80vh] w-full bg-background-soft overflow-hidden">
        {/* Main Image - Clickable area to open fullscreen */}
        <div
          ref={palcoRef}
          className="relative h-full w-full cursor-pointer group touch-pan-y"
          onClick={() => {
            if (arrastouRef.current) {
              arrastouRef.current = false
              return
            }
            setIsFullscreen(true)
          }}
          onTouchStart={aoTocar}
          onTouchMove={aoArrastar}
          onTouchEnd={aoSoltar}
          onTouchCancel={aoSoltar}
          role="button"
          tabIndex={0}
          aria-label="Clique para ver em tela cheia"
          onKeyDown={(e) => e.key === 'Enter' && setIsFullscreen(true)}
        >
          {/* Esqueleto da marca até a foto atual chegar */}
          <PhotoSkeleton className="absolute inset-0" loaded={isCurrentLoaded} />

          {photos.map((photo, index) => {
            // Só a atual e as duas vizinhas existem no DOM. As vizinhas aparecem
            // nas laterais, apagadas, e a troca desliza (`.galeria-vitrine-foto`
            // em media.css): no celular, como uma faixa nas bordas; a partir de
            // 1280 px, menores e mais à mostra. Com duas fotos, a outra é a
            // "próxima".
            const posicao =
              index === currentIndex ? 0
                : index === (currentIndex + 1) % photos.length ? 1
                  : index === (currentIndex - 1 + photos.length) % photos.length ? -1
                    : null

            if (posicao === null) return null

            return (
              <div
                key={photo}
                // Vizinha é atalho de toque e de mouse para a seta do mesmo lado;
                // teclado e leitor de tela já têm as setas e as miniaturas.
                aria-hidden={posicao !== 0 || undefined}
                onClick={posicao === 0 ? undefined : (e) => {
                  e.stopPropagation()
                  if (posicao === 1) goToNext()
                  else goToPrevious()
                }}
                style={{ '--pos': posicao, '--lateral': posicao === 0 ? 0 : 1 } as CSSProperties}
                className={cn(
                  'galeria-vitrine-foto absolute inset-0 transition-opacity duration-500',
                  posicao === 0
                    ? 'opacity-100 z-10'
                    : 'opacity-50 z-0 xl:opacity-40 hover:opacity-70'
                )}
              >
                {hasCurrentError && index === currentIndex ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-background-soft">
                    <p className="text-foreground-secondary">Erro ao carregar imagem</p>
                  </div>
                ) : (
                  <Image
                    src={photo}
                    alt={`${vehicleLabel}, foto ${index + 1} de ${totalPhotos} do veículo em estoque na Attra Veículos`}
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
                      // A primeira foto não espera o onLoad: com opacity-0 no
                      // HTML, ela só aparecia depois de o React hidratar, e o LCP
                      // da ficha ficava preso ao JS. O skeleton segue por baixo
                      // até ela pintar.
                      index === 0 || loadedImages.has(index) ? "opacity-100" : "opacity-0"
                    )}
                    priority={index === 0 || index === currentIndex}
                    fetchPriority={index === 0 ? 'high' : undefined}
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

        {/* Navigation arrows - stopPropagation to prevent opening fullscreen when clicking arrows.
            Só a partir de 768 px: no celular elas cobriam a faixa das fotos
            vizinhas, e lá a troca é por arrasto, pela faixa ou pelas miniaturas. */}
        <button
          onClick={(e) => { e.stopPropagation(); goToPrevious() }}
          className="hidden md:block absolute left-4 lg:left-8 top-1/2 -translate-y-1/2 p-3 bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-full text-white transition-all z-40"
          aria-label="Imagem anterior"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); goToNext() }}
          className="hidden md:block absolute right-4 lg:right-8 top-1/2 -translate-y-1/2 p-3 bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-full text-white transition-all z-40"
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

        {/* Image counter. No celular fica no alto, na linha do botão de tela
            cheia: embaixo, a fileira de miniaturas passava por cima dele e o
            "1 / 20" aparecia cortado. */}
        <div className="absolute top-24 left-4 lg:top-auto lg:bottom-4 px-4 py-2 bg-black/40 backdrop-blur-sm rounded-full text-white text-sm z-40 pointer-events-none">
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
            {/* Esqueleto da marca enquanto a foto original (a mais pesada) carrega */}
            <PhotoSkeleton dark className="absolute inset-0" loaded={fullscreenLoaded.has(currentIndex)} />
            {/* eslint-disable-next-line @next/next/no-img-element -- o lightbox existe
                justamente para mostrar a foto em resolução original; passar pelo
                otimizador do next/image limitaria a largura aos deviceSizes. */}
            <img
              key={currentIndex}
              src={photos[currentIndex]}
              alt={`${vehicleLabel}, foto ${currentIndex + 1} de ${totalPhotos} em tela cheia`}
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

