'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  Construction,
  Layers3,
  ScanSearch,
  Stethoscope,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import type { ServiceKey } from '@/i18n/localized-content'

type ServiceTab = {
  key: ServiceKey
  href: string
  title: string
}

const icons: Record<ServiceKey, LucideIcon> = {
  survey: ScanSearch,
  drilling: Construction,
  maintenance: Wrench,
  consult: Stethoscope,
}

export default function ServiceTabs({
  activeKey,
  label,
  tabs,
}: {
  activeKey: ServiceKey
  label: string
  tabs: ServiceTab[]
}) {
  const activeRef = useRef<HTMLAnchorElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const list = listRef.current
    const active = activeRef.current
    if (!list || !active || list.scrollWidth <= list.clientWidth) return

    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth'

    list.scrollTo({
      behavior,
      left: active.offsetLeft - (list.clientWidth - active.offsetWidth) / 2,
    })
  }, [activeKey])

  return (
    <nav className="service-detail-tabs" aria-label={label}>
      <span className="service-detail-tabs-label">
        <Layers3 aria-hidden="true" />
        {label}
      </span>
      <div ref={listRef} className="service-detail-tabs-list">
        {tabs.map((tab) => {
          const Icon = icons[tab.key]
          const isActive = tab.key === activeKey

          return (
            <Link
              key={tab.key}
              ref={isActive ? activeRef : undefined}
              href={tab.href}
              className={isActive ? 'is-active' : undefined}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon aria-hidden="true" />
              {tab.title}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
