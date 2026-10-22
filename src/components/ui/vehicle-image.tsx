'use client'

import Image, { type ImageProps } from 'next/image'
import { useState } from 'react'
import { PhotoSkeleton } from './skeleton'

const FALLBACK_SRC = '/placeholder.jpg'

type VehicleImageProps = Omit<ImageProps, 'src' | 'onError'> & {
  src: string | null | undefined
  fallbackSrc?: string
  /**
   * Marca Attra no lugar da foto enquanto ela carrega. Pensado para `fill`:
   * o esqueleto ocupa o mesmo pai posicionado, por baixo da imagem.
   */
  esqueleto?: boolean
}

function resolveSrc(src: string | null | undefined, fallback: string) {
  return src && src.length > 0 ? src : fallback
}

export function VehicleImage({
  src,
  fallbackSrc = FALLBACK_SRC,
  alt,
  esqueleto = false,
  onLoad,
  ...rest
}: VehicleImageProps) {
  const [currentSrc, setCurrentSrc] = useState(() => resolveSrc(src, fallbackSrc))
  const [loaded, setLoaded] = useState(false)
  const [prevSrc, setPrevSrc] = useState(src)

  // Sync state when the parent passes a new src (client-side navigation,
  // updated data). Without this, `useState` retains the mount-time value.
  if (prevSrc !== src) {
    setPrevSrc(src)
    const next = resolveSrc(src, fallbackSrc)
    if (next !== currentSrc) {
      setCurrentSrc(next)
      setLoaded(false)
    }
  }

  const image = (
    <Image
      {...rest}
      src={currentSrc}
      alt={alt}
      onLoad={(event) => {
        if (esqueleto) setLoaded(true)
        onLoad?.(event)
      }}
      onError={() => {
        if (currentSrc !== fallbackSrc) setCurrentSrc(fallbackSrc)
      }}
    />
  )

  if (!esqueleto) return image

  return (
    <>
      <PhotoSkeleton className="absolute inset-0" loaded={loaded} />
      {image}
    </>
  )
}
