// src/app/(site)/page.tsx

import HomePage from './home/page'

export const revalidate = 60

export default function SiteRootPage() {
  return <HomePage />
}
