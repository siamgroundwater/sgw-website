import type { CmsMediaAsset } from '@/types/cms-media'

export const TEAM_DEPARTMENTS = [
  'management',
  'survey',
  'drilling',
  'maintenance',
  'marketing',
] as const

export const TEAM_CONTENT_LOCALES = ['en', 'zh', 'ja'] as const

export type TeamDepartment = (typeof TEAM_DEPARTMENTS)[number]
export type TeamContentLocale = (typeof TEAM_CONTENT_LOCALES)[number]
export type TeamPublicLocale = 'th' | TeamContentLocale
export type TeamMemberRole = 'leader' | 'member'

export type CmsTeamTranslation = {
  name: string
}

export type CmsTeamTranslations = Partial<Record<TeamContentLocale, CmsTeamTranslation>>

export type CmsTeamMemberTranslation = {
  certificates: string[]
  name: string
  title: string
}

export type CmsTeamMemberTranslations = Partial<Record<TeamContentLocale, CmsTeamMemberTranslation>>

export type CmsTeamInput = {
  department: TeamDepartment
  name: string
  order: number
  translations: CmsTeamTranslations
}

export type CmsTeamMemberInput = {
  certificates: string[]
  imageSrc: string
  name: string
  order: number
  role: TeamMemberRole
  teamId: string
  title: string
  translations: CmsTeamMemberTranslations
}

export type CmsTeamRecord = CmsTeamInput & {
  createdAt: string
  id: string
  memberCount: number
  updatedAt: string
}

export type CmsTeamMemberRecord = CmsTeamMemberInput & {
  createdAt: string
  id: string
  imageAsset?: CmsMediaAsset
  updatedAt: string
}

export type PublicTeamMember = {
  certificates: string[]
  id: string
  imageSrc: string
  name: string
  role: TeamMemberRole
  title?: string
}

export type PublicPersonnelTeam = {
  id: string
  name: string
  people: PublicTeamMember[]
}

export type PublicPersonnelGroup = {
  id: TeamDepartment
  teams: PublicPersonnelTeam[]
}

export type TeamValidationField =
  | 'certificates'
  | 'department'
  | 'imageSrc'
  | 'name'
  | 'order'
  | 'role'
  | 'teamId'
  | `translations.${TeamContentLocale}.certificates`
  | `translations.${TeamContentLocale}.name`
  | `translations.${TeamContentLocale}.title`
  | 'title'

export class TeamValidationError extends Error {
  fields: Partial<Record<TeamValidationField, string>>

  constructor(message: string, fields: Partial<Record<TeamValidationField, string>>) {
    super(message)
    this.name = 'TeamValidationError'
    this.fields = fields
  }
}

function cleanText(value: unknown, maximum: number) {
  return typeof value === 'string' ? value.trim().slice(0, maximum + 1) : ''
}

function cleanOrder(value: unknown) {
  if (typeof value === 'number' && Number.isInteger(value)) return value
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) return Number(value)
  return Number.NaN
}

function cleanCertificates(value: unknown) {
  if (!Array.isArray(value)) return null
  return value.map((item) => cleanText(item, 300)).filter(Boolean)
}

function rawTranslation(value: unknown, locale: TeamContentLocale) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const translations = value as Record<string, unknown>
  const translation = translations[locale]
  return translation && typeof translation === 'object' && !Array.isArray(translation)
    ? translation as Record<string, unknown>
    : undefined
}

export function normalizeCmsTeamInput(value: unknown): CmsTeamInput {
  const raw = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
  const fields: Partial<Record<TeamValidationField, string>> = {}
  const department = TEAM_DEPARTMENTS.includes(raw.department as TeamDepartment)
    ? raw.department as TeamDepartment
    : TEAM_DEPARTMENTS[0]
  const name = cleanText(raw.name, 120)
  const order = cleanOrder(raw.order)
  if (!TEAM_DEPARTMENTS.includes(raw.department as TeamDepartment)) fields.department = 'Choose a valid department.'
  if (!name || name.length > 120) fields.name = 'Thai team name is required and must be 120 characters or fewer.'
  if (!Number.isInteger(order) || order < 0 || order > 9999) fields.order = 'Display order must be a whole number from 0 to 9999.'

  const translations: CmsTeamTranslations = {}
  for (const locale of TEAM_CONTENT_LOCALES) {
    const translation = rawTranslation(raw.translations, locale)
    const translatedName = cleanText(translation?.name, 120)
    if (translatedName.length > 120) fields[`translations.${locale}.name`] = 'Team name must be 120 characters or fewer.'
    if (translatedName) translations[locale] = { name: translatedName }
  }
  if (Object.keys(fields).length) throw new TeamValidationError('Check the highlighted team fields.', fields)
  return { department, name, order, translations }
}

export function normalizeCmsTeamMemberInput(value: unknown): CmsTeamMemberInput {
  const raw = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
  const fields: Partial<Record<TeamValidationField, string>> = {}
  const name = cleanText(raw.name, 160)
  const title = cleanText(raw.title, 240)
  const certificates = raw.certificates === undefined ? [] : cleanCertificates(raw.certificates)
  const imageSrc = cleanText(raw.imageSrc, 1200)
  const teamId = cleanText(raw.teamId, 100)
  const order = cleanOrder(raw.order)
  const role = raw.role === 'leader' || raw.role === 'member' ? raw.role : 'member'

  if (!name || name.length > 160) fields.name = 'Thai member name is required and must be 160 characters or fewer.'
  if (title.length > 240) fields.title = 'Title must be 240 characters or fewer.'
  if (!certificates || certificates.length > 12 || certificates.some((item) => item.length > 300)) fields.certificates = 'Add no more than 12 credentials, with 300 characters or fewer each.'
  if (!teamId || teamId.length > 100) fields.teamId = 'Choose a valid team.'
  if (raw.role !== 'leader' && raw.role !== 'member') fields.role = 'Choose a valid role.'
  if (!Number.isInteger(order) || order < 0 || order > 9999) fields.order = 'Display order must be a whole number from 0 to 9999.'
  if (!imageSrc || imageSrc.length > 1200) fields.imageSrc = 'A valid member portrait or the default portrait is required.'

  const translations: CmsTeamMemberTranslations = {}
  for (const locale of TEAM_CONTENT_LOCALES) {
    const translation = rawTranslation(raw.translations, locale)
    if (!translation) continue
    const translatedName = cleanText(translation.name, 160)
    const translatedTitle = cleanText(translation.title, 240)
    const translatedCertificates = translation.certificates === undefined ? [] : cleanCertificates(translation.certificates)
    if (translatedName.length > 160) fields[`translations.${locale}.name`] = 'Member name must be 160 characters or fewer.'
    if (translatedTitle.length > 240) fields[`translations.${locale}.title`] = 'Title must be 240 characters or fewer.'
    if (translatedCertificates === null || translatedCertificates.length > 12 || translatedCertificates.some((item) => item.length > 300)) {
      fields[`translations.${locale}.certificates`] = 'Add no more than 12 credentials, with 300 characters or fewer each.'
    }
    if (translatedName || translatedTitle || translatedCertificates?.length) {
      translations[locale] = {
        certificates: translatedCertificates || [],
        name: translatedName,
        title: translatedTitle,
      }
    }
  }
  if (Object.keys(fields).length) throw new TeamValidationError('Check the highlighted team-member fields.', fields)
  return {
    certificates: certificates || [],
    imageSrc,
    name,
    order,
    role,
    teamId,
    title,
    translations,
  }
}

export function localizedTeamName(team: Pick<CmsTeamInput, 'name' | 'translations'>, locale: TeamPublicLocale) {
  if (locale === 'th') return team.name
  return team.translations[locale]?.name?.trim() || team.translations.en?.name?.trim() || team.name
}

export function localizedTeamMember(
  member: Pick<CmsTeamMemberInput, 'certificates' | 'name' | 'title' | 'translations'>,
  locale: TeamPublicLocale
) {
  if (locale === 'th') {
    return { certificates: member.certificates, name: member.name, title: member.title }
  }
  const selected = member.translations[locale]
  const english = member.translations.en
  return {
    certificates: selected?.certificates?.length
      ? selected.certificates
      : english?.certificates?.length ? english.certificates : member.certificates,
    name: selected?.name?.trim() || english?.name?.trim() || member.name,
    title: selected?.title?.trim() || english?.title?.trim() || member.title,
  }
}
