// src/app/(site)/about/hero-slide/HeroSlide.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import './hero-slide.css'

const REAL_SLIDES = [
  {
    id: 'about-slide-1',
    src: '/images/about/slide/about-slide-1.jpg',
    width: 4608,
    height: 3456,
    alt: 'ภาพรวมการทำงานของบริษัท สยามกราวด์วอเตอร์',
  },
  {
    id: 'about-slide-2',
    src: '/images/about/slide/about-slide-2.jpg',
    width: 1299,
    height: 974,
    alt: 'ภาพทีมงานภาคสนามของบริษัท สยามกราวด์วอเตอร์',
  },
  {
    id: 'about-slide-3',
    src: '/images/about/slide/about-slide-3.jpg',
    width: 1920,
    height: 420,
    alt: 'ภาพทีมงานภาคสนามของบริษัท สยามกราวด์วอเตอร์',
  },
  {
    id: 'about-slide-4',
    src: '/images/about/slide/about-slide-4.jpg',
    width: 1280,
    height: 280,
    alt: 'ภาพทีมงานภาคสนามของบริษัท สยามกราวด์วอเตอร์',
  },
]

const AUTOPLAY_MS = 3000

function prefersReducedMotion() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  )
}

type RenderSlide = {
  key: string
  src: string
  width: number
  height: number
  alt: string
  isClone?: boolean
}

export default function HeroSlide() {
  const n = REAL_SLIDES.length

  // render: [lastClone] + real + [firstClone]
  const renderSlides: RenderSlide[] = [
    {
      key: `clone-start-${REAL_SLIDES[n - 1].id}`,
      src: REAL_SLIDES[n - 1].src,
      width: REAL_SLIDES[n - 1].width,
      height: REAL_SLIDES[n - 1].height,
      alt: REAL_SLIDES[n - 1].alt,
      isClone: true,
    },
    ...REAL_SLIDES.map((s) => ({
      key: s.id,
      src: s.src,
      width: s.width,
      height: s.height,
      alt: s.alt,
    })),
    {
      key: `clone-end-${REAL_SLIDES[0].id}`,
      src: REAL_SLIDES[0].src,
      width: REAL_SLIDES[0].width,
      height: REAL_SLIDES[0].height,
      alt: REAL_SLIDES[0].alt,
      isClone: true,
    },
  ]

  // activeIndex = real index (0..n-1)
  const [activeIndex, setActiveIndex] = useState(0)

  const sliderRef = useRef<HTMLDivElement | null>(null)

  // posRef = position index in renderSlides (0..n+1), where real slides are 1..n
  const posRef = useRef(1)
  const activeRef = useRef(0)

  const pausedRef = useRef(false)
  const reduceMotionRef = useRef(false)

  const intervalRef = useRef<number | null>(null)
  const resumeTimerRef = useRef<number | null>(null)
  const scrollEndTimerRef = useRef<number | null>(null)

  const stepRef = useRef<number>(0)

  useEffect(() => {
    activeRef.current = activeIndex
  }, [activeIndex])

  const updateStep = () => {
    const el = sliderRef.current
    if (!el) return
    const styles = getComputedStyle(el)
    const gapStr = styles.columnGap || styles.gap || '0px'
    const gap = Number.parseFloat(gapStr) || 0
    stepRef.current = el.clientWidth + gap
  }

  const scrollToPos = (pos: number, behavior: ScrollBehavior) => {
    const el = sliderRef.current
    if (!el) return
    const step = stepRef.current || el.clientWidth
    el.scrollTo({ left: pos * step, behavior })
  }

  const pauseAutoplay = () => {
    pausedRef.current = true
    if (resumeTimerRef.current) {
      window.clearTimeout(resumeTimerRef.current)
      resumeTimerRef.current = null
    }
  }

  const pauseThenResume = (ms = 3000) => {
    pauseAutoplay()
    resumeTimerRef.current = window.setTimeout(() => {
      pausedRef.current = false
    }, ms)
  }

  const getRealIndexFromPos = (pos: number) => {
    // pos: 0 (start clone) -> real last
    // pos: n+1 (end clone) -> real first
    // pos: 1..n -> pos-1
    if (pos === 0) return n - 1
    if (pos === n + 1) return 0
    return Math.max(0, Math.min(n - 1, pos - 1))
  }

  const fixLoopIfNeeded = () => {
    const el = sliderRef.current
    if (!el) return

    const step = stepRef.current || el.clientWidth
    const pos = Math.round(el.scrollLeft / step)

    if (pos === 0) {
      // at start clone -> jump to last real (pos = n) instantly
      posRef.current = n
      scrollToPos(n, 'auto')
      setActiveIndex(n - 1)
      activeRef.current = n - 1
      return
    }

    if (pos === n + 1) {
      // at end clone -> jump to first real (pos = 1) instantly
      posRef.current = 1
      scrollToPos(1, 'auto')
      setActiveIndex(0)
      activeRef.current = 0
    }
  }

  const handleScroll = () => {
    const el = sliderRef.current
    if (!el) return

    pauseThenResume(3000)

    const step = stepRef.current || el.clientWidth
    const pos = Math.round(el.scrollLeft / step)

    if (pos !== posRef.current) {
      posRef.current = pos
      const real = getRealIndexFromPos(pos)
      if (real !== activeRef.current) {
        activeRef.current = real
        setActiveIndex(real)
      }
    }

    // debounce to detect "scroll end" then fix clone jump invisibly
    if (scrollEndTimerRef.current)
      window.clearTimeout(scrollEndTimerRef.current)
    scrollEndTimerRef.current = window.setTimeout(() => {
      fixLoopIfNeeded()
    }, 120)
  }

  const handleDotClick = (realIndex: number) => {
    const targetPos = realIndex + 1 // real slides are 1..n
    activeRef.current = realIndex
    setActiveIndex(realIndex)
    posRef.current = targetPos

    pauseThenResume(3000)
    scrollToPos(targetPos, reduceMotionRef.current ? 'auto' : 'smooth')
  }

  // init position + reduced motion listener
  useEffect(() => {
    reduceMotionRef.current = prefersReducedMotion()

    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!mq) return

    const onChange = () => {
      reduceMotionRef.current = mq.matches
    }

    if (mq.addEventListener) mq.addEventListener('change', onChange)
    else mq.addListener(onChange)

    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange)
      else mq.removeListener(onChange)
    }
  }, [])

  // after mount: compute step and jump to first real slide (pos=1)
  useEffect(() => {
    const el = sliderRef.current
    if (!el) return

    const init = () => {
      updateStep()
      posRef.current = 1
      scrollToPos(1, 'auto')
    }

    // run after layout
    requestAnimationFrame(init)
  }, [])

  // resize: keep aligned
  useEffect(() => {
    const onResize = () => {
      updateStep()
      scrollToPos(posRef.current, 'auto')
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // autoplay
  useEffect(() => {
    if (reduceMotionRef.current) return

    intervalRef.current = window.setInterval(() => {
      if (pausedRef.current) return

      const nextPos = posRef.current + 1 // can reach n+1 (end clone)
      posRef.current = nextPos

      const nextReal = getRealIndexFromPos(nextPos)
      activeRef.current = nextReal
      setActiveIndex(nextReal)

      scrollToPos(nextPos, 'smooth')
      // fixLoopIfNeeded will run via handleScroll debounce after scrolling settles
    }, AUTOPLAY_MS)

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="about-hero-slider">
      <div
        ref={sliderRef}
        className="about-hero-slider-track"
        onScroll={handleScroll}
        onPointerEnter={(event) => { if (event.pointerType === 'mouse') pauseAutoplay() }}
        onPointerLeave={(event) => { if (event.pointerType === 'mouse') pausedRef.current = false }}
        onFocusCapture={pauseAutoplay}
        onBlurCapture={() => (pausedRef.current = false)}
        onTouchStart={pauseAutoplay}
        onTouchEnd={() => pauseThenResume(3000)}
      >
        {renderSlides.map((slide) => (
          <div
            key={slide.key}
            className="about-hero-slide"
            aria-hidden={slide.isClone}
          >
            <Image
              src={slide.src}
              alt={slide.alt}
              width={slide.width}
              height={slide.height}
              className="about-hero-slide-image"
              sizes="(width <= 1080px) 100vw, 1080px"
              priority={slide.key === REAL_SLIDES[0].id}
            />
          </div>
        ))}
      </div>

      <div className="about-hero-slider-dots">
        {REAL_SLIDES.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            onClick={() => handleDotClick(index)}
            className={
              'about-hero-slider-dot' + (index === activeIndex ? ' active' : '')
            }
            aria-label={`ไปยังสไลด์ที่ ${index + 1}`}
          />
        ))}
      </div>
    </section>
  )
}
