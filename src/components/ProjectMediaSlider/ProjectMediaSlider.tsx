'use client'

import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRef, useState, type KeyboardEvent, type TouchEvent } from 'react'
import type { LocalizedLocale } from '@/i18n/config'
import './ProjectMediaSlider.css'

type ProjectMediaSliderProps = {
  images: string[]
  locale: LocalizedLocale
  projectNumber: number | string
  title: string
}

const sliderCopy: Record<
  LocalizedLocale,
  { gallery: string; image: string; next: string; previous: string; project: string }
> = {
  th: {
    gallery: 'ภาพโครงการ',
    image: 'ภาพที่',
    next: 'ภาพถัดไป',
    previous: 'ภาพก่อนหน้า',
    project: 'โครงการ',
  },
  en: {
    gallery: 'Project gallery',
    image: 'Image',
    next: 'Next image',
    previous: 'Previous image',
    project: 'Project',
  },
  zh: {
    gallery: '项目图片',
    image: '图片',
    next: '下一张图片',
    previous: '上一张图片',
    project: '项目',
  },
  ja: {
    gallery: 'プロジェクト画像',
    image: '画像',
    next: '次の画像',
    previous: '前の画像',
    project: 'プロジェクト',
  },
}

export default function ProjectMediaSlider({
  images,
  locale,
  projectNumber,
  title,
}: ProjectMediaSliderProps) {
  const uniqueImages = [...new Set(images)]
  const [activeIndex, setActiveIndex] = useState(0)
  const touchStartX = useRef<number | null>(null)
  const copy = sliderCopy[locale]
  const hasMultipleImages = uniqueImages.length > 1
  const showDots = hasMultipleImages && uniqueImages.length <= 10
  const activeImage = uniqueImages[activeIndex] ?? uniqueImages[0]

  const showImage = (index: number) => {
    const nextIndex =
      (index + uniqueImages.length) % Math.max(uniqueImages.length, 1)
    setActiveIndex(nextIndex)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!hasMultipleImages) return
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      showImage(activeIndex - 1)
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      showImage(activeIndex + 1)
    }
  }

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.touches[0]?.clientX ?? null
  }

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (!hasMultipleImages || touchStartX.current === null) return
    const endX = event.changedTouches[0]?.clientX ?? touchStartX.current
    const distance = endX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(distance) < 45) return
    showImage(distance > 0 ? activeIndex - 1 : activeIndex + 1)
  }

  return (
    <section
      className="project-detail-media"
      aria-label={`${copy.gallery}: ${title}`}
      onKeyDown={handleKeyDown}
      tabIndex={hasMultipleImages ? 0 : undefined}
    >
      <div
        className="project-detail-media-viewport"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {activeImage && (
          <figure className="project-detail-media-slide is-active" key={activeImage}>
            <Image
              src={activeImage}
              alt={`${title} — ${copy.image} ${activeIndex + 1}`}
              width={1600}
              height={1200}
              sizes="calc(100vw - 2rem)"
              loading="lazy"
            />
          </figure>
        )}

        {hasMultipleImages && (
          <>
            <button
              type="button"
              className="project-detail-media-arrow is-previous"
              aria-label={copy.previous}
              onClick={() => showImage(activeIndex - 1)}
            >
              <ChevronLeft aria-hidden="true" />
            </button>
            <button
              type="button"
              className="project-detail-media-arrow is-next"
              aria-label={copy.next}
              onClick={() => showImage(activeIndex + 1)}
            >
              <ChevronRight aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      <div className="project-detail-media-controls">
        <span className="project-detail-media-project">
          {copy.project} #{String(projectNumber).padStart(3, '0')}
        </span>

        {showDots && (
          <div className="project-detail-media-dots" aria-label={copy.gallery}>
            {uniqueImages.map((imageSource, index) => (
              <button
                type="button"
                className={index === activeIndex ? 'is-active' : ''}
                aria-label={`${copy.image} ${index + 1}`}
                aria-current={index === activeIndex ? 'true' : undefined}
                onClick={() => showImage(index)}
                key={imageSource}
              />
            ))}
          </div>
        )}

        <span className="project-detail-media-count" aria-live="polite">
          {activeIndex + 1} / {uniqueImages.length}
        </span>
      </div>
    </section>
  )
}
