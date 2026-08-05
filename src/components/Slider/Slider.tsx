'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import './Slider.css'

export type Slide = {
  src: string
  alt: string
  caption: string
  priority?: boolean
}

type SliderProps = {
  slides: Slide[]
  ariaLabel?: string
  intervalMs?: number
}

export default function Slider({
  slides,
  ariaLabel = 'Image carousel',
  intervalMs = 3000,
}: SliderProps) {
  const total = slides.length
  const isLoop = total > 1

  const loopSlides = useMemo(() => {
    if (!isLoop) return slides
    return [slides[total - 1], ...slides, slides[0]]
  }, [slides, total, isLoop])

  const [index, setIndex] = useState(isLoop ? 1 : 0)
  const [isHovering, setIsHovering] = useState(false)
  const [enableTransition, setEnableTransition] = useState(true)

  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    flushSync(() => {
      setEnableTransition(false)
      setIndex(isLoop ? 1 : 0)
    })
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setEnableTransition(true))
    })
  }, [isLoop, total])

  const next = () => {
    if (total <= 1) return
    setIndex((v) => v + 1)
  }

  const prev = () => {
    if (total <= 1) return
    setIndex((v) => v - 1)
  }

  useEffect(() => {
    const el = rootRef.current
    if (!el) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        prev()
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        next()
      }
    }

    el.addEventListener('keydown', onKeyDown)
    return () => el.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total])

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches

    if (reduce) return
    if (total <= 1) return
    if (isHovering) return

    const id = window.setInterval(() => next(), intervalMs)
    return () => window.clearInterval(id)
  }, [isHovering, intervalMs, total]) // eslint-disable-line react-hooks/exhaustive-deps

  const onTransitionEnd = () => {
    if (!isLoop) return

    if (index === 0) {
      flushSync(() => {
        setEnableTransition(false)
        setIndex(total)
      })
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setEnableTransition(true))
      })
    }

    if (index === total + 1) {
      flushSync(() => {
        setEnableTransition(false)
        setIndex(1)
      })
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setEnableTransition(true))
      })
    }
  }

  if (total === 0) return null

  const realIndex = isLoop ? (index - 1 + total) % total : index

  return (
    <div
      ref={rootRef}
      className="slider"
      tabIndex={0}
      role="region"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="slider__viewport">
        <div
          className={`slider__track ${
            enableTransition ? '' : 'slider__track--no-anim'
          }`}
          style={{ transform: `translate3d(${-index * 100}%, 0, 0)` }}
          onTransitionEnd={onTransitionEnd}
        >
          {loopSlides.map((s, i) => (
            <div className="slider__slide" key={`${s.src}-${i}`}>
              <figure className="slider__figure">
                <div className="slider__media">
                  <Image
                    className="slider__img"
                    src={s.src}
                    alt={s.alt}
                    fill
                    sizes="(width <= 768px) 92vw, 720px"
                    priority={Boolean(s.priority)}
                  />
                </div>

                <figcaption className="slider__caption">
                  <span>{s.caption}</span>
                </figcaption>
              </figure>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="slider__btn slider__btn--left"
          onClick={prev}
          aria-label="Previous slide"
        >
          <ChevronLeft aria-hidden="true" size={44} strokeWidth={2.4} />
        </button>

        <button
          type="button"
          className="slider__btn slider__btn--right"
          onClick={next}
          aria-label="Next slide"
        >
          <ChevronRight aria-hidden="true" size={44} strokeWidth={2.4} />
        </button>
      </div>

      <div
        className="slider__dots"
        role="tablist"
        aria-label="Slide navigation"
      >
        {slides.map((s, i) => {
          const active = i === realIndex
          return (
            <button
              key={`dot-${i}`}
              type="button"
              className={`slider__dot ${active ? 'is-active' : ''}`}
              onClick={() => setIndex(isLoop ? i + 1 : i)}
              aria-label={`Go to slide ${i + 1}: ${s.caption}`}
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              role="tab"
            />
          )
        })}
      </div>

      <p className="slider__sr" aria-live="polite">
        Showing slide {realIndex + 1} of {total}
      </p>
    </div>
  )
}
