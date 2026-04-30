'use client'

import Image, { type ImageProps } from 'next/image'
import { useState } from 'react'

const FALLBACK_SRC = '/placeholder.jpg'

type VehicleImageProps = Omit<ImageProps, 'src' | 'onError'> & {
  src: string | null | undefined
  fallbackSrc?: string
}

export function VehicleImage({
  src,
  fallbackSrc = FALLBACK_SRC,
  alt,
  ...rest
}: VehicleImageProps) {
  const initial = src && src.length > 0 ? src : fallbackSrc
  const [currentSrc, setCurrentSrc] = useState(initial)

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
