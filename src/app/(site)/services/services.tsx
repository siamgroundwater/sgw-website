import Image from 'next/image'
import Link from 'next/link'
import { localePath, type LocalizedLocale } from '@/i18n/config'
import {
  localizedContent,
  SERVICE_KEYS,
  type LocalizedContent,
} from '@/i18n/localized-content'
import './services.css'

const SERVICE_META = {
  survey: {
    href: '/services/survey',
    image: '/images/logo/services/survey.png',
  },
  drilling: {
    href: '/services/drilling',
    image: '/images/logo/services/well-drilling.png',
  },
  maintenance: {
    href: '/services/maintenance',
    image: '/images/logo/services/maintenance.png',
  },
  consult: {
    href: '/services/consult',
    image: '/images/logo/services/consult.png',
  },
} as const

export default function Services({
  locale,
  copy,
  headingLevel = 'h2',
}: {
  locale?: LocalizedLocale
  copy?: LocalizedContent
  headingLevel?: 'h1' | 'h2'
} = {}) {
  const activeLocale = locale ?? 'th'
  const activeCopy = copy ?? localizedContent[activeLocale]
  const serviceHref = (href: string) =>
    locale ? localePath(href, activeLocale) : href
  const Heading = headingLevel

  return (
    <section className="home-services" aria-labelledby="home-services-title">
      <div className="home-services-illustration-wrap">
        <Image
          src="/services/services-BG.png"
          alt={activeCopy.services.title}
          width={1200}
          height={900}
          className="home-services-illustration"
          sizes="(width <= 900px) 100vw, 44vw"
          priority={headingLevel === 'h1'}
        />
      </div>

      <div className="home-services-content">
        <Heading id="home-services-title">{activeCopy.services.title}</Heading>

        <div className="home-services-grid">
          {SERVICE_KEYS.map((serviceKey) => {
            const service = activeCopy.services.items[serviceKey]
            const meta = SERVICE_META[serviceKey]

            return (
              <Link
                key={serviceKey}
                href={serviceHref(meta.href)}
                className="home-service-card"
              >
                <span className="home-service-icon" aria-hidden="true">
                  <Image
                    src={meta.image}
                    alt=""
                    width={120}
                    height={120}
                    loading="lazy"
                  />
                </span>
                <span className="home-service-text">{service.title}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
