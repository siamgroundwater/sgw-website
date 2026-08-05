// src/app/(site)/page.tsx

import type { Metadata } from 'next'
import HomePage from './home/page'

export const metadata: Metadata = {
  alternates: { canonical: '/' },
}

export default function SiteRootPage() {
  return <HomePage />
}
