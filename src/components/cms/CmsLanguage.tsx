'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Languages } from 'lucide-react'
import { CMS_LOCALE_COOKIE, type CmsLocale } from '@/lib/cms-locale'

type CmsLanguageContextValue = {
  locale: CmsLocale
  setLocale: (locale: CmsLocale) => void
}

const CmsLanguageContext = createContext<CmsLanguageContextValue | null>(null)

export function CmsLanguageProvider({ children, initialLocale }: { children: ReactNode; initialLocale: CmsLocale }) {
  const router = useRouter()
  const [locale, setLocaleState] = useState(initialLocale)

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const value = useMemo<CmsLanguageContextValue>(() => ({
    locale,
    setLocale(nextLocale) {
      if (nextLocale === locale) return
      setLocaleState(nextLocale)
      document.documentElement.lang = nextLocale
      document.cookie = `${CMS_LOCALE_COOKIE}=${nextLocale}; Path=/cms; Max-Age=31536000; SameSite=Lax`
      router.refresh()
    },
  }), [locale, router])

  return <CmsLanguageContext.Provider value={value}>{children}</CmsLanguageContext.Provider>
}

export function useCmsLanguage() {
  const value = useContext(CmsLanguageContext)
  if (!value) throw new Error('useCmsLanguage must be used within CmsLanguageProvider.')
  return value
}

export function CmsLanguageSwitcher() {
  const { locale, setLocale } = useCmsLanguage()
  const label = locale === 'th' ? 'เลือกภาษา' : 'Choose language'

  return (
    <div className="cms-language-switcher" role="group" aria-label={label}>
      <Languages aria-hidden="true" />
      <button type="button" aria-pressed={locale === 'th'} onClick={() => setLocale('th')}>TH</button>
      <button type="button" aria-pressed={locale === 'en'} onClick={() => setLocale('en')}>EN</button>
    </div>
  )
}
