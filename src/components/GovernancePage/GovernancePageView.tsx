'use client'

import { Download } from 'lucide-react'
import { useState } from 'react'
import FallbackImage from '@/components/media/FallbackImage'
import { siteMediaFallbacks } from '@/lib/site-media'

const fallbackPoster = siteMediaFallbacks.governance[0]
const downloadFilename = 'siam-groundwater-governance-poster.png'

export function governancePosterDownloadUrl(source: string) {
  try {
    const url = new URL(source)
    const uploadSegment = '/image/upload/'
    if (
      url.protocol !== 'https:' ||
      url.hostname !== 'res.cloudinary.com' ||
      !url.pathname.includes(uploadSegment)
    ) {
      return source
    }

    url.pathname = url.pathname.replace(
      uploadSegment,
      `${uploadSegment}fl_attachment:siam-groundwater-governance-poster/`
    )
    return url.toString()
  } catch {
    return source
  }
}

export default function GovernancePageView({
  description,
  downloadLabel,
  eyebrow,
  imageAlt,
  imageSrc,
  title,
}: {
  description: string
  downloadLabel: string
  eyebrow: string
  imageAlt: string
  imageSrc: string
  title: string
}) {
  const requestedSrc = imageSrc || fallbackPoster
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const posterSrc = failedSrc === requestedSrc ? fallbackPoster : requestedSrc
  const localDownload = posterSrc.startsWith('/')
  const downloadUrl = localDownload
    ? posterSrc
    : governancePosterDownloadUrl(posterSrc)

  return (
    <main className="governance-page">
      <section className="governance-header">
        <p className="governance-eyebrow">{eyebrow}</p>
        <h1 className="governance-title-th">{title}</h1>
        <p className="governance-description">{description}</p>
      </section>

      <section className="governance-poster-section">
        <div className="governance-poster-frame">
          <div className="governance-poster-inner">
            <FallbackImage
              src={posterSrc}
              fallbackSrc={fallbackPoster}
              onFallback={() => setFailedSrc(requestedSrc)}
              alt={imageAlt}
              width={1200}
              height={1700}
              className="governance-poster-image"
              priority
            />
          </div>
        </div>
        <a
          className="governance-download-button"
          href={downloadUrl}
          download={localDownload ? downloadFilename : undefined}
        >
          <Download aria-hidden="true" />
          {downloadLabel}
        </a>
      </section>
    </main>
  )
}
