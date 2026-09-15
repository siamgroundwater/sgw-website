'use client'

import Image, { type ImageProps } from 'next/image'
import { useState } from 'react'

type FallbackImageProps = Omit<ImageProps, 'onError' | 'src'> & {
  fallbackSrc: string
  onFallback?: () => void
  src: string
}

export default function FallbackImage({
  fallbackSrc,
  onFallback,
  src,
  ...props
}: FallbackImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const requestedSrc = src || fallbackSrc
  const activeSrc = failedSrc === requestedSrc ? fallbackSrc : requestedSrc

  return (
    <Image
      {...props}
      src={activeSrc}
      onError={() => {
        if (activeSrc !== fallbackSrc) {
          setFailedSrc(requestedSrc)
          onFallback?.()
        }
      }}
    />
  )
}
