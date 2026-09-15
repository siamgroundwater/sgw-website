// src/app/(site)/about/hero-slide/HeroSlide.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import FallbackImage from '@/components/media/FallbackImage'
import type { SiteLocale } from '@/i18n/config'
import { siteMediaFallbacks } from '@/lib/site-media'
import './hero-slide.css'

const ABOUT_HERO_FALLBACKS = siteMediaFallbacks['about-hero']

const SLIDE_ALT: Record<SiteLocale, readonly string[]> = {
  th: [
    'ภาพรวมการทำงานของบริษัท สยามกราวด์วอเตอร์',
    'ภาพทีมงานภาคสนามของบริษัท สยามกราวด์วอเตอร์',
    'ภาพทีมงานภาคสนามของบริษัท สยามกราวด์วอเตอร์',
    'ภาพทีมงานภาคสนามของบริษัท สยามกราวด์วอเตอร์',
  ],
  en: [
    'Siam Groundwater field team and drilling vehicles',
    'Siam Groundwater field team carrying out drilling work',
    'Siam Groundwater field operations',
    'Siam Groundwater field operations',
  ],
  zh: [
    '暹罗地下水公司的现场团队和钻井车辆',
    '暹罗地下水公司的现场钻井团队',
    '暹罗地下水公司的现场作业',
    '暹罗地下水公司的现场作业',
  ],
  ja: [
    'サイアム・グラウンドウォーターの現場チームと掘削車両',
    '掘削作業を行うサイアム・グラウンドウォーターの現場チーム',
    'サイアム・グラウンドウォーターの現場作業',
    'サイアム・グラウンドウォーターの現場作業',
  ],
}

const DOT_LABEL: Record<SiteLocale, (position: number) => string> = {
  th: (position) => `ไปยังสไลด์ที่ ${position}`,
  en: (position) => `Go to slide ${position}`,
  zh: (position) => `前往第 ${position} 张幻灯片`,
  ja: (position) => `スライド${position}へ移動`,
}

const FALLBACK_SLIDES = [
  {
    id: 'about-slide-1',
    fallbackSrc: ABOUT_HERO_FALLBACKS[0],
  },
  {
    id: 'about-slide-2',
    fallbackSrc: ABOUT_HERO_FALLBACKS[1],
  },
  {
    id: 'about-slide-3',
    fallbackSrc: ABOUT_HERO_FALLBACKS[2],
  },
  {
    id: 'about-slide-4',
    fallbackSrc: ABOUT_HERO_FALLBACKS[3],
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
  fallbackSrc: string
  alt: string
  isClone?: boolean
}

type HeroSlideProps = {
  images: readonly string[]
  locale?: SiteLocale
}

export default function HeroSlide({ images, locale = 'th' }: HeroSlideProps) {
  const sources = images.length ? images : ABOUT_HERO_FALLBACKS
  const realSlides = sources.map((src, index) => {
    const fallback = FALLBACK_SLIDES[index]
    const fallbackIndex = index % FALLBACK_SLIDES.length
    return {
      id: fallback?.id || `about-slide-${index + 1}`,
      src,
      fallbackSrc: fallback?.fallbackSrc || FALLBACK_SLIDES[fallbackIndex].fallbackSrc,
      alt: SLIDE_ALT[locale][index] || `${SLIDE_ALT[locale][0]} ${index + 1}`,
    }
  })
  const n = realSlides.length

  // render: [lastClone] + real + [firstClone]
  const renderSlides: RenderSlide[] = [
    {
      key: `clone-start-${realSlides[n - 1].id}`,
      src: realSlides[n - 1].src,
      fallbackSrc: realSlides[n - 1].fallbackSrc,
      alt: realSlides[n - 1].alt,
      isClone: true,
    },
    ...realSlides.map((s) => ({
      key: s.id,
      src: s.src,
      fallbackSrc: s.fallbackSrc,
      alt: s.alt,
    })),
    {
      key: `clone-end-${realSlides[0].id}`,
      src: realSlides[0].src,
      fallbackSrc: realSlides[0].fallbackSrc,
      alt: realSlides[0].alt,
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
            <FallbackImage
              src={slide.src}
              fallbackSrc={slide.fallbackSrc}
              alt={slide.alt}
              fill
              className="about-hero-slide-image"
              sizes="(width <= 768px) calc(100vw - 2.5rem), calc(100vw - 3rem)"
              priority={slide.key === realSlides[0].id}
            />
          </div>
        ))}
      </div>

      <div className="about-hero-slider-dots">
        {realSlides.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            onClick={() => handleDotClick(index)}
            className={
              'about-hero-slider-dot' + (index === activeIndex ? ' active' : '')
            }
            aria-label={DOT_LABEL[locale](index + 1)}
          />
        ))}
      </div>
    </section>
  )
}
