import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { siteMediaFallbacks } from '../src/lib/site-media.ts'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function source(relativePath) {
  return readFileSync(path.join(root, relativePath), 'utf8')
}

test('About hero resolves CMS images with one local fallback per original slide', () => {
  const fallbacks = siteMediaFallbacks['about-hero']
  assert.deepEqual(fallbacks, [
    '/images/about/slide/about-slide-1.jpg',
    '/images/about/slide/about-slide-2.jpg',
    '/images/about/slide/about-slide-3.jpg',
    '/images/about/slide/about-slide-4.jpg',
  ])
  for (const fallback of fallbacks) {
    assert.ok(existsSync(path.join(root, 'public', fallback.slice(1))), fallback)
  }

  const hero = source('src/app/(site)/about/hero-slide/HeroSlide.tsx')
  const fallbackImage = source('src/components/media/FallbackImage.tsx')
  assert.match(hero, /siteMediaFallbacks\['about-hero'\]/)
  assert.match(hero, /<FallbackImage[\s\S]*?src=\{slide\.src\}[\s\S]*?fallbackSrc=\{slide\.fallbackSrc\}/)
  assert.match(fallbackImage, /onError=\{\(\) => \{[\s\S]*?setFailedSrc\(requestedSrc\)/)
  assert.match(hero, /Record<SiteLocale/)
  for (const locale of ['th', 'en', 'zh', 'ja']) {
    assert.match(hero, new RegExp(`\\b${locale}: \\(position\\)`))
  }
})

test('About routes load managed images server-side and retain requested crops', () => {
  const thaiPage = source('src/app/(site)/about/page.tsx')
  const localizedPage = source('src/app/[locale]/[[...slug]]/page.tsx')
  const heroStyles = source('src/app/(site)/about/hero-slide/hero-slide.css')
  const hero = source('src/app/(site)/about/hero-slide/HeroSlide.tsx')

  assert.match(thaiPage, /await getPublicSiteMediaImages\('about-hero'\)/)
  assert.match(thaiPage, /<HeroSlide images=\{heroImages\} locale="th"/)
  assert.match(localizedPage, /await getPublicSiteMediaImages\('about-hero'\)/)
  assert.match(localizedPage, /<HeroSlide images=\{heroImages\} locale=\{locale\}/)
  assert.match(heroStyles, /\.about-hero-slide\s*\{[\s\S]*?aspect-ratio:\s*3 \/ 1;/)
  assert.match(heroStyles, /@media \(width <= 768px\)[\s\S]*?\.about-hero-slide\s*\{[\s\S]*?aspect-ratio:\s*16 \/ 9;/)
  assert.match(heroStyles, /object-fit:\s*cover;/)
  assert.match(heroStyles, /object-position:\s*center;/)
  assert.match(hero, /sizes="\(width <= 768px\) calc\(100vw - 2\.5rem\), calc\(100vw - 3rem\)"/)
})

test('About hero supports captured pointer dragging without breaking native vertical touch movement', () => {
  const hero = source('src/app/(site)/about/hero-slide/HeroSlide.tsx')
  const heroStyles = source('src/app/(site)/about/hero-slide/hero-slide.css')

  assert.match(hero, /track\.setPointerCapture\(event\.pointerId\)/)
  assert.match(hero, /track\.scrollLeft = drag\.startScrollLeft - distance/)
  assert.match(hero, /onPointerDown=\{handlePointerDown\}/)
  assert.match(hero, /onPointerMove=\{handlePointerMove\}/)
  assert.match(hero, /onPointerUp=\{finishDragging\}/)
  assert.match(hero, /onPointerCancel=\{finishDragging\}/)
  assert.match(hero, /draggable=\{false\}/)
  assert.match(heroStyles, /touch-action:\s*pan-y;/)
  assert.match(heroStyles, /\.about-hero-slider-track\.is-dragging\s*\{[\s\S]*?scroll-snap-type:\s*none;/)
  assert.match(heroStyles, /@media \(hover: hover\) and \(pointer: fine\)[\s\S]*?cursor:\s*grab;/)
})
