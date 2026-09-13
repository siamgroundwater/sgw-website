import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const read = file => readFileSync(path.resolve(file), 'utf8')

test('the old footer scroll button and its scroll listener are removed', () => {
  const component = read('src/components/Footer/Footer.tsx')
  const css = read('src/components/Footer/Footer.css')
  assert.doesNotMatch(component + css, /footer-back-to-top|handleBackToTop|showBackToTop/)
  assert.doesNotMatch(component, /addEventListener\('scroll'/)
  assert.match(css, /padding-bottom:\s*calc\(72px \+ env\(safe-area-inset-bottom/)
})

test('one floating contact control is mounted in each public layout, never in CMS', () => {
  for (const file of ['src/app/(site)/layout.tsx', 'src/app/[locale]/layout.tsx']) {
    const source = read(file)
    assert.equal([...source.matchAll(/<ContactFab\s/g)].length, 1)
  }
  assert.doesNotMatch(read('src/app/cms/layout.tsx'), /ContactFab/)
  assert.doesNotMatch(read('src/components/Footer/Footer.tsx'), /ContactFab/)
})

test('the contact disclosure uses shared details, localization and safe keyboard behavior', () => {
  const source = read('src/components/ContactFab/ContactFab.tsx')
  const css = read('src/components/ContactFab/ContactFab.module.css')
  assert.match(source, /companyContact/)
  for (const key of ['office', 'wasin', 'toeng', 'email', 'social']) assert.ok(source.includes(`companyContact.${key}`))
  for (const locale of ['th', 'en', 'zh', 'ja']) assert.match(source, new RegExp(`\\b${locale}:`))
  assert.match(source, /localePath\('\/contact', locale\)/)
  assert.doesNotMatch(source, /social\.slice|Facebook|TikTok/)
  assert.match(source, /action\.paddedIcon \? ` \$\{styles\.iconPadded\}`/)
  assert.equal([...source.matchAll(/paddedIcon: true/g)].length, 2)
  assert.equal([...source.matchAll(/compactLabel: true/g)].length, 1)
  assert.doesNotMatch(source, /<strong>|<small>|hideLabel|directContactCopy/)
  for (const label of ['LINE', 'สำนักงาน', 'คุณวศิน', 'คุณเติ้ง', 'อีเมล', 'ตำแหน่งที่ตั้ง']) assert.ok(source.includes(label))
  assert.match(css, /white-space:\s*nowrap/)
  assert.match(css, /\.emailLabel\s*\{[^}]*font-size:\s*0\.8125rem/s)
  assert.match(css, /\.iconPadded\s*\{\s*padding:\s*4px/)
  assert.match(css, /\.icon\s*\{[^}]*width:\s*56px;[^}]*height:\s*56px;/s)
  assert.match(source, /aria-expanded=\{open\}/)
  assert.match(source, /aria-controls=\{panelId\}/)
  assert.match(source, /hidden=\{!open\}/)
  assert.match(source, /inert=\{!open\}/)
  assert.match(source, /event\.key === 'Escape'/)
  assert.match(source, /addEventListener\('pointerdown'/)
  assert.match(source, /removeEventListener\('pointerdown'/)
  assert.match(source, /key=\{pathname\}/)
  assert.match(source, /rel="noopener noreferrer"/)
  assert.match(css, /position:\s*fixed/)
  assert.match(css, /\.panel\[hidden\]\s*\{\s*display:\s*none/)
  assert.match(css, /safe-area-inset-bottom/)
  assert.match(css, /\.icon img\s*\{[^}]*width:\s*100%;[^}]*height:\s*100%;[^}]*object-fit:\s*cover;/s)
  assert.match(css, /prefers-reduced-motion:\s*reduce/)
  assert.doesNotMatch(source, /<header|<h2|data-contact-fab-close/)
  assert.match(source, /<nav/)
  assert.match(source, /\/icons\/Call-start\.png/)
  assert.match(source, /\/icons\/Call-end\.png/)
})
