'use client'

import Image, { type ImageProps } from 'next/image'
import { useRef, useState } from 'react'

const FALLBACK_SRC = '/placeholder.jpg'

type VehicleImageProps = Omit<ImageProps, 'src' | 'onError'> & {
  src: string | null | undefined
  fallbackSrc?: string
}

function resolveSrc(src: string | null | undefined, fallback: string) {
  return src && src.length > 0 ? src : fallback
}

export function VehicleImage({
  src,
  fallbackSrc = FALLBACK_SRC,
  alt,
  ...rest
}: VehicleImageProps) {
  const [currentSrc, setCurrentSrc] = useState(() => resolveSrc(src, fallbackSrc))
  const prevSrcRef = useRef(src)

  // Sync state when the parent passes a new src (client-side navigation,
  // updated data). Without this, `useState` retains the mount-time value.
  if (prevSrcRef.current !== src) {
    prevSrcRef.current = src
    const next = resolveSrc(src, fallbackSrc)
    if (next !== currentSrc) setCurrentSrc(next)
  }

  return (
    <Image
      {...rest}
      src={currentSrc}
      alt={alt}
      onError={() => {
        if (currentSrc !== fallbackSrc) setCurrentSrc(fallbackSrc)
      }}
    />
  )
}
