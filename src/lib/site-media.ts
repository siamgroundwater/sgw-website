import siteMediaManifest from '../data/site-media-manifest.json' with { type: 'json' }

export const siteMediaSectionKeys = [
  'service-survey',
  'service-drilling',
  'service-maintenance',
  'service-consult',
  'project-map',
  'governance',
  'about-hero',
] as const

export type SiteMediaSectionKey = (typeof siteMediaSectionKeys)[number]
export type SiteMediaServiceKey = 'survey' | 'drilling' | 'maintenance' | 'consult'

type SiteMediaManifestEntry = {
  fallbacks: string[]
  maximum: number
  minimum: number
}

const manifest = siteMediaManifest as unknown as Record<SiteMediaSectionKey, SiteMediaManifestEntry>

export const siteMediaFallbacks = Object.fromEntries(
  siteMediaSectionKeys.map((section) => [section, manifest[section].fallbacks])
) as unknown as Record<SiteMediaSectionKey, readonly string[]>

export const siteMediaLimits = Object.fromEntries(
  siteMediaSectionKeys.map((section) => [section, {
    maximum: manifest[section].maximum,
    minimum: manifest[section].minimum,
  }])
) as unknown as Record<SiteMediaSectionKey, { maximum: number; minimum: number }>

export function isSiteMediaSectionKey(value: unknown): value is SiteMediaSectionKey {
  return typeof value === 'string' && siteMediaSectionKeys.includes(value as SiteMediaSectionKey)
}

export function serviceMediaSectionKey(serviceKey: SiteMediaServiceKey) {
  return `service-${serviceKey}` as const
}

export function siteMediaUploadTarget(section: SiteMediaSectionKey) {
  return `site-${section}`
}
