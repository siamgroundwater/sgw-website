'use client'

import FallbackImage from '@/components/media/FallbackImage'
import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'

type ServiceGalleryProps = {
  fallbackImages?: readonly string[]
  images: readonly string[]
  label: string
  serviceTitle: string
}

export default function ServiceGallery({
  fallbackImages = [],
  images,
  label,
  serviceTitle,
}: ServiceGalleryProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const dragStartRef = useRef({ x: 0, scrollLeft: 0 })
  const [isDragging, setIsDragging] = useState(false)

  const stopDragging = () => setIsDragging(false)

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) {
      return
    }

    const track = trackRef.current
    if (!track) return

    dragStartRef.current = {
      x: event.clientX,
      scrollLeft: track.scrollLeft,
    }
    track.setPointerCapture(event.pointerId)
    setIsDragging(true)
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const track = trackRef.current
    if (!isDragging || !track || !track.hasPointerCapture(event.pointerId)) {
      return
    }

    const distance = event.clientX - dragStartRef.current.x
    if (Math.abs(distance) > 2) event.preventDefault()
    track.scrollLeft = dragStartRef.current.scrollLeft - distance
  }

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    const track = trackRef.current
    if (track?.hasPointerCapture(event.pointerId)) {
      track.releasePointerCapture(event.pointerId)
    }
    stopDragging()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return

    event.preventDefault()
    const track = trackRef.current
    track?.scrollBy({
      left: (event.key === 'ArrowRight' ? 1 : -1) * track.clientWidth * 0.8,
      behavior: 'smooth',
    })
  }

  return (
    <div
      ref={trackRef}
      className={`service-detail-gallery-grid${isDragging ? ' is-dragging' : ''}`}
      role="region"
      aria-label={`${label}: ${serviceTitle}`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={stopDragging}
      onLostPointerCapture={stopDragging}
    >
      {images.map((image, index) => {
        const fallbackSrc = fallbackImages[index] || fallbackImages[0] || image
        return (
          <figure key={`${image}-${index}`}>
            <FallbackImage
              src={image}
              fallbackSrc={fallbackSrc}
              alt={`${label}: ${serviceTitle} ${index + 1}`}
              fill
              quality={90}
              sizes="(width <= 700px) 78vw, (width <= 900px) 48vw, 36vw"
              draggable={false}
            />
          </figure>
        )
      })}
    </div>
  )
}
