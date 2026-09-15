import 'server-only'

import { createHash } from 'node:crypto'
import { BSON, ObjectId, type ClientSession } from 'mongodb'
import teamGroupsJson from '@/app/(site)/about/teams/teams.json'
import {
  TEAM_DEPARTMENTS,
  TEAM_CONTENT_LOCALES,
  localizedTeamMember,
  localizedTeamName,
  normalizeCmsTeamInput,
  normalizeCmsTeamMemberInput,
  type CmsTeamMemberRecord,
  type CmsTeamRecord,
  type PublicPersonnelGroup,
  type TeamDepartment,
  type TeamPublicLocale,
} from '@/lib/team-directory'
import {
  getCmsTeamDirectoryCollection,
  getCmsTeamOperationsCollection,
  getMongoClient,
  type CmsSiteMediaItem,
  type CmsTeamDirectoryDocument,
  type CmsTeamDocument,
  type CmsTeamMemberDocument,
  type CmsTeamOperationResult,
} from '@/server/db'

const directoryId = 'about-teams' as const
const defaultPortrait = '/images/personnel/user.png'
const maximumDirectoryBytes = 12 * 1024 * 1024
const transactionOptions = {
  maxCommitTimeMS: 10000,
  readConcern: { level: 'snapshot' as const },
  writeConcern: { w: 'majority' as const },
}

type FallbackPerson = {
  certificates?: unknown
  imageSrc?: unknown
  name?: unknown
  role?: unknown
  title?: unknown
}

type FallbackTeam = {
  name?: unknown
  people?: unknown
}

type FallbackGroup = {
  id?: unknown
  teams?: unknown
}

export type CmsTeamDirectorySnapshot = {
  members: CmsTeamMemberRecord[]
  revision: number
  teams: CmsTeamRecord[]
}

export class CmsTeamError extends Error {
  fields?: Record<string, string>
  status: number

  constructor(message: string, status = 400, fields?: Record<string, string>) {
    super(message)
    this.name = 'CmsTeamError'
    this.fields = fields
    this.status = status
  }
}

let indexesPromise: Promise<void> | null = null

async function ensureCmsTeamIndexes() {
  if (!indexesPromise) {
    indexesPromise = (async () => {
      const [directory, operations] = await Promise.all([
        getCmsTeamDirectoryCollection(),
        getCmsTeamOperationsCollection(),
      ])
      await Promise.all([
        directory.createIndex({ updatedAt: -1 }),
        operations.createIndex({ userId: 1, operationId: 1 }, { unique: true }),
        operations.createIndex({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 }),
      ])
    })().catch((error) => {
      indexesPromise = null
      throw error
    })
  }
  await indexesPromise
}

function text(value: unknown, maximum: number) {
  return typeof value === 'string' ? value.trim().slice(0, maximum) : ''
}

function fallbackDirectory(now = new Date(0)): CmsTeamDirectoryDocument {
  const groups = Array.isArray(teamGroupsJson) ? teamGroupsJson as FallbackGroup[] : []
  const teams: CmsTeamDocument[] = []
  for (const group of groups) {
    if (!TEAM_DEPARTMENTS.includes(group.id as TeamDepartment) || !Array.isArray(group.teams)) continue
    const department = group.id as TeamDepartment
    for (const [teamIndex, rawTeam] of (group.teams as FallbackTeam[]).entries()) {
      const teamName = text(rawTeam.name, 120)
      if (!teamName || !Array.isArray(rawTeam.people)) continue
      const teamId = `fallback-${department}-${teamIndex + 1}`
      const members: CmsTeamMemberDocument[] = []
      for (const [memberIndex, rawPerson] of (rawTeam.people as FallbackPerson[]).entries()) {
        const name = text(rawPerson.name, 160)
        const role = rawPerson.role === 'leader' || rawPerson.role === 'member' ? rawPerson.role : null
        if (!name || !role) continue
        const certificates = Array.isArray(rawPerson.certificates)
          ? rawPerson.certificates.map((item) => text(item, 300)).filter(Boolean).slice(0, 12)
          : []
        members.push({
          certificates,
          createdAt: now,
          id: `${teamId}-member-${memberIndex + 1}`,
          image: { src: text(rawPerson.imageSrc, 1200) || defaultPortrait },
          name,
          order: memberIndex,
          role,
          title: text(rawPerson.title, 240),
          translations: {},
          updatedAt: now,
        })
      }
      teams.push({
        createdAt: now,
        department,
        id: teamId,
        members,
        name: teamName,
        order: teamIndex,
        translations: {},
        updatedAt: now,
      })
    }
  }
  return {
    _id: directoryId,
    createdAt: now,
    revision: 0,
    schemaVersion: 1,
    teams,
    updatedAt: now,
    updatedBy: 'public-fallback',
  }
}

function validDate(value: unknown): value is Date {
  return value instanceof Date && Number.isFinite(value.getTime())
}

function validObject(value: unknown) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function validTranslations(value: unknown, member = false) {
  if (!validObject(value)) return false
  const translations = value as Record<string, unknown>
  for (const locale of TEAM_CONTENT_LOCALES) {
    const translation = translations[locale]
    if (translation === undefined) continue
    if (!validObject(translation)) return false
    const item = translation as Record<string, unknown>
    if (typeof item.name !== 'string' || item.name.length > (member ? 160 : 120)) return false
    if (member && (
      typeof item.title !== 'string' || item.title.length > 240 ||
      !Array.isArray(item.certificates) || item.certificates.length > 12 ||
      item.certificates.some((certificate) => typeof certificate !== 'string' || certificate.length > 300)
    )) return false
  }
  return true
}

function validTeamImageSource(value: unknown) {
  if (typeof value !== 'string' || !value || value.length > 1200) return false
  if (/^\/images\/personnel\/[A-Za-z0-9._-]+$/.test(value)) return true
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname === 'res.cloudinary.com'
  } catch {
    return false
  }
}

function validDirectory(document: CmsTeamDirectoryDocument) {
  if (
    document._id !== directoryId ||
    document.schemaVersion !== 1 ||
    !Number.isInteger(document.revision) ||
    document.revision < 1 ||
    !validDate(document.createdAt) ||
    !validDate(document.updatedAt) ||
    !Array.isArray(document.teams) ||
    document.teams.length > 100
  ) return false
  const teamIds = new Set<string>()
  const memberIds = new Set<string>()
  for (const team of document.teams) {
    if (
      !team ||
      typeof team.id !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(team.id) ||
      teamIds.has(team.id) ||
      !TEAM_DEPARTMENTS.includes(team.department) ||
      typeof team.name !== 'string' || !team.name.trim() || team.name.length > 120 ||
      !validTranslations(team.translations) ||
      !Number.isInteger(team.order) || team.order < 0 || team.order > 9999 ||
      !Array.isArray(team.members) ||
      team.members.length > 100 ||
      !validDate(team.createdAt) ||
      !validDate(team.updatedAt)
    ) return false
    teamIds.add(team.id)
    let leaderCount = 0
    for (const member of team.members) {
      if (
        !member ||
        typeof member.id !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(member.id) ||
        memberIds.has(member.id) ||
        typeof member.name !== 'string' || !member.name.trim() || member.name.length > 160 ||
        typeof member.title !== 'string' || member.title.length > 240 ||
        !validTranslations(member.translations, true) ||
        (member.role !== 'leader' && member.role !== 'member') ||
        !Number.isInteger(member.order) || member.order < 0 || member.order > 9999 ||
        !Array.isArray(member.certificates) || member.certificates.length > 12 ||
        member.certificates.some((certificate) => typeof certificate !== 'string' || certificate.length > 300) ||
        !validObject(member.image) || !validTeamImageSource(member.image.src) ||
        (member.image.asset !== undefined && (!validObject(member.image.asset) || member.image.asset.src !== member.image.src)) ||
        !validDate(member.createdAt) ||
        !validDate(member.updatedAt)
      ) return false
      memberIds.add(member.id)
      if (member.role === 'leader') leaderCount += 1
    }
    if (team.members.length && leaderCount !== 1) return false
  }
  return true
}

function sortTeams(teams: CmsTeamDocument[]) {
  return [...teams].sort((left, right) =>
    TEAM_DEPARTMENTS.indexOf(left.department) - TEAM_DEPARTMENTS.indexOf(right.department) ||
    left.order - right.order ||
    left.id.localeCompare(right.id)
  )
}

function sortMembers(members: CmsTeamMemberDocument[]) {
  return [...members].sort((left, right) =>
    (left.role === 'leader' ? -1 : 0) - (right.role === 'leader' ? -1 : 0) ||
    left.order - right.order ||
    left.id.localeCompare(right.id)
  )
}

function teamRecord(team: CmsTeamDocument): CmsTeamRecord {
  return {
    createdAt: team.createdAt.toISOString(),
    department: team.department,
    id: team.id,
    memberCount: team.members.length,
    name: team.name,
    order: team.order,
    translations: team.translations || {},
    updatedAt: team.updatedAt.toISOString(),
  }
}

function memberRecord(team: CmsTeamDocument, member: CmsTeamMemberDocument): CmsTeamMemberRecord {
  return {
    certificates: member.certificates,
    createdAt: member.createdAt.toISOString(),
    id: member.id,
    imageAsset: member.image.asset,
    imageSrc: member.image.src,
    name: member.name,
    order: member.order,
    role: member.role,
    teamId: team.id,
    title: member.title,
    translations: member.translations || {},
    updatedAt: member.updatedAt.toISOString(),
  }
}

function snapshot(document: CmsTeamDirectoryDocument): CmsTeamDirectorySnapshot {
  const teams = sortTeams(document.teams)
  return {
    members: teams.flatMap((team) => sortMembers(team.members).map((member) => memberRecord(team, member))),
    revision: document.revision,
    teams: teams.map(teamRecord),
  }
}

function publicDirectory(document: CmsTeamDirectoryDocument, locale: TeamPublicLocale): PublicPersonnelGroup[] {
  const groups = new Map<TeamDepartment, PublicPersonnelGroup>(
    TEAM_DEPARTMENTS.map((id) => [id, { id, teams: [] }])
  )
  for (const team of sortTeams(document.teams)) {
    const group = groups.get(team.department)
    if (!group) continue
    group.teams.push({
      id: team.id,
      name: localizedTeamName(team, locale),
      people: sortMembers(team.members).map((member) => {
        const localized = localizedTeamMember(member, locale)
        return {
          certificates: localized.certificates,
          id: member.id,
          imageSrc: member.image.src || defaultPortrait,
          name: localized.name,
          role: member.role,
          title: localized.title || undefined,
        }
      }),
    })
  }
  return TEAM_DEPARTMENTS.map((id) => groups.get(id) as PublicPersonnelGroup)
}

async function storedDirectory(session?: ClientSession) {
  return (await getCmsTeamDirectoryCollection()).findOne({ _id: directoryId }, { session })
}

export async function getCmsTeamDirectorySnapshot() {
  const document = await storedDirectory()
  if (document && !validDirectory(document)) {
    throw new CmsTeamError('The saved team directory is invalid. Restore a verified backup before editing.', 500)
  }
  return snapshot(document || fallbackDirectory())
}

export async function getCmsTeamById(id: string) {
  const data = await getCmsTeamDirectorySnapshot()
  return { item: data.teams.find((team) => team.id === id) || null, members: data.members.filter((member) => member.teamId === id), revision: data.revision }
}

export async function getCmsTeamMemberById(teamId: string, memberId: string) {
  const data = await getCmsTeamDirectorySnapshot()
  return { item: data.members.find((member) => member.teamId === teamId && member.id === memberId) || null, revision: data.revision, teams: data.teams }
}

export async function getCmsTeamMemberByIdAny(memberId: string) {
  const data = await getCmsTeamDirectorySnapshot()
  return { item: data.members.find((member) => member.id === memberId) || null, revision: data.revision, teams: data.teams }
}

export async function getPublicTeamDirectory(locale: TeamPublicLocale): Promise<PublicPersonnelGroup[]> {
  try {
    const document = await storedDirectory()
    return publicDirectory(document && validDirectory(document) ? document : fallbackDirectory(), locale)
  } catch (error) {
    console.error('Could not load the team directory; using the public fallback.', error)
    return publicDirectory(fallbackDirectory(), locale)
  }
}

function validateOperationId(value: unknown) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{8,100}$/.test(value)) {
    throw new CmsTeamError('A valid save operation id is required. Reload the editor.', 400)
  }
  return value
}

function validateRevision(value: unknown) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new CmsTeamError('Reload the latest team directory before saving.', 428)
  }
  return value
}

export function teamOperationFingerprint(action: string, body: unknown) {
  return createHash('sha256').update(JSON.stringify({ action, body })).digest('hex')
}

export async function getSavedTeamOperation(userId: string, operationId: unknown, fingerprint?: string) {
  await ensureCmsTeamIndexes()
  const id = validateOperationId(operationId)
  const row = await (await getCmsTeamOperationsCollection()).findOne({ userId, operationId: id })
  if (row && fingerprint && row.fingerprint !== fingerprint) {
    throw new CmsTeamError('This operation id belongs to a different team change. Start a new save.', 409)
  }
  return row?.result || null
}

type MutationContext = {
  expectedRevision: unknown
  fingerprint: string
  operationId: unknown
  userId: string
}

async function runMutation(
  context: MutationContext,
  mutate: (document: CmsTeamDirectoryDocument, now: Date) => CmsTeamOperationResult,
  beforeCommit?: (session: ClientSession) => Promise<void>
) {
  await ensureCmsTeamIndexes()
  const operationId = validateOperationId(context.operationId)
  const expectedRevision = validateRevision(context.expectedRevision)
  const prior = await getSavedTeamOperation(context.userId, operationId, context.fingerprint)
  if (prior) return { result: prior, recovered: true }

  const session = (await getMongoClient()).startSession()
  let result: CmsTeamOperationResult | undefined
  let replayedInTransaction = false
  try {
    result = await session.withTransaction(async () => {
      const receipts = await getCmsTeamOperationsCollection()
      const replay = await receipts.findOne({ userId: context.userId, operationId }, { session })
      if (replay) {
        if (replay.fingerprint !== context.fingerprint) throw new CmsTeamError('This operation id belongs to a different team change.', 409)
        replayedInTransaction = true
        return replay.result
      }
      const collection = await getCmsTeamDirectoryCollection()
      const stored = await collection.findOne({ _id: directoryId }, { session })
      if (stored && !validDirectory(stored)) throw new CmsTeamError('The saved team directory is invalid. Restore a verified backup before editing.', 500)
      const document = stored || fallbackDirectory(new Date())
      if (document.revision !== expectedRevision) throw new CmsTeamError('The team directory changed in another tab. Reload before saving.', 409)
      const now = new Date()
      const mutationResult = mutate(document, now)
      document.revision += 1
      document.updatedAt = now
      document.updatedBy = context.userId
      mutationResult.revision = document.revision
      if (!validDirectory(document)) throw new CmsTeamError('This change would make the team directory invalid.', 400)
      if (BSON.calculateObjectSize(document) > maximumDirectoryBytes) {
        throw new CmsTeamError('The team directory is too large for another save. Reduce long credentials or remove unused records.', 413)
      }
      await beforeCommit?.(session)
      if (stored) {
        const updated = await collection.replaceOne({ _id: directoryId, revision: expectedRevision }, document, { session })
        if (updated.modifiedCount !== 1) throw new CmsTeamError('The team directory changed in another tab. Reload before saving.', 409)
      } else {
        await collection.insertOne(document, { session })
      }
      await receipts.insertOne({
        createdAt: now,
        fingerprint: context.fingerprint,
        operationId,
        result: mutationResult,
        userId: context.userId,
      }, { session })
      return mutationResult
    }, transactionOptions)
  } catch (error) {
    const recovered = await getSavedTeamOperation(context.userId, operationId, context.fingerprint).catch(() => null)
    if (recovered) return { result: recovered, recovered: true }
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      throw new CmsTeamError('The team directory changed in another tab. Reload before saving.', 409)
    }
    throw error
  } finally {
    await session.endSession()
  }
  if (!result) throw new Error('Team mutation did not return a result.')
  return { result, recovered: replayedInTransaction }
}

function nextTeamId() {
  return new ObjectId().toHexString()
}

function requireTeam(document: CmsTeamDirectoryDocument, teamId: string) {
  const team = document.teams.find((candidate) => candidate.id === teamId)
  if (!team) throw new CmsTeamError('Team not found.', 404)
  return team
}

function requireMember(team: CmsTeamDocument, memberId: string) {
  const member = team.members.find((candidate) => candidate.id === memberId)
  if (!member) throw new CmsTeamError('Team member not found.', 404)
  return member
}

export function createCmsTeam(input: unknown, context: MutationContext) {
  const clean = normalizeCmsTeamInput(input)
  return runMutation(context, (document, now) => {
    const id = nextTeamId()
    document.teams.push({ ...clean, createdAt: now, id, members: [], updatedAt: now })
    return { revision: 0, teamId: id }
  })
}

export function updateCmsTeam(teamId: string, input: unknown, context: MutationContext) {
  const clean = normalizeCmsTeamInput(input)
  return runMutation(context, (document, now) => {
    const team = requireTeam(document, teamId)
    Object.assign(team, clean, { updatedAt: now })
    return { revision: 0, teamId }
  })
}

export function deleteCmsTeam(teamId: string, confirmation: unknown, context: MutationContext) {
  return runMutation(context, (document) => {
    const team = requireTeam(document, teamId)
    if (team.members.length) throw new CmsTeamError('Remove or move every team member before deleting this team.', 409)
    if (confirmation !== team.name) throw new CmsTeamError('Type the exact Thai team name to confirm deletion.', 400)
    document.teams = document.teams.filter((candidate) => candidate.id !== teamId)
    return { revision: 0, teamId }
  })
}

export function createCmsTeamMember(
  input: unknown,
  image: CmsSiteMediaItem,
  context: MutationContext,
  beforeCommit?: (session: ClientSession) => Promise<void>
) {
  const clean = normalizeCmsTeamMemberInput(input)
  return runMutation(context, (document, now) => {
    const team = requireTeam(document, clean.teamId)
    if (clean.role !== 'leader' && team.members.length === 0) {
      throw new CmsTeamError('The first person in a team must be its leader.', 400, { role: 'Choose Team leader for the first person.' })
    }
    if (clean.role === 'leader') {
      for (const member of team.members) {
        if (member.role === 'leader') {
          member.role = 'member'
          member.updatedAt = now
        }
      }
    }
    const id = nextTeamId()
    const { imageSrc: _imageSrc, teamId: _teamId, ...member } = clean
    void _imageSrc
    void _teamId
    team.members.push({ ...member, createdAt: now, id, image, updatedAt: now })
    team.updatedAt = now
    return { memberId: id, revision: 0, teamId: team.id }
  }, beforeCommit)
}

export function updateCmsTeamMember(
  memberId: string,
  input: unknown,
  image: CmsSiteMediaItem,
  context: MutationContext,
  beforeCommit?: (session: ClientSession) => Promise<void>
) {
  const clean = normalizeCmsTeamMemberInput(input)
  return runMutation(context, (document, now) => {
    const destination = requireTeam(document, clean.teamId)
    let source: CmsTeamDocument | undefined
    let member: CmsTeamMemberDocument | undefined
    for (const team of document.teams) {
      const candidate = team.members.find((item) => item.id === memberId)
      if (candidate) { source = team; member = candidate; break }
    }
    if (!source || !member) throw new CmsTeamError('Team member not found.', 404)
    if (source.id !== destination.id && member.role === 'leader' && source.members.length > 1) {
      throw new CmsTeamError('Choose another leader for the current team before moving this leader.', 409)
    }
    const destinationOthers = destination.members.filter((candidate) => candidate.id !== memberId)
    if (clean.role !== 'leader' && !destinationOthers.some((candidate) => candidate.role === 'leader')) {
      throw new CmsTeamError('A team with members must have one leader.', 400, { role: 'Assign another leader before changing this role.' })
    }
    if (clean.role === 'leader') {
      for (const candidate of destinationOthers) {
        if (candidate.role === 'leader') {
          candidate.role = 'member'
          candidate.updatedAt = now
        }
      }
    }
    const { imageSrc: _imageSrc, teamId: _teamId, ...memberInput } = clean
    void _imageSrc
    void _teamId
    const updated: CmsTeamMemberDocument = {
      ...member,
      ...memberInput,
      image,
      updatedAt: now,
    }
    source.members = source.members.filter((candidate) => candidate.id !== memberId)
    destination.members.push(updated)
    source.updatedAt = now
    destination.updatedAt = now
    return { memberId, revision: 0, teamId: destination.id }
  }, beforeCommit)
}

export function deleteCmsTeamMember(
  teamId: string,
  memberId: string,
  confirmation: unknown,
  context: MutationContext
) {
  return runMutation(context, (document, now) => {
    const team = requireTeam(document, teamId)
    const member = requireMember(team, memberId)
    if (confirmation !== member.name) throw new CmsTeamError('Type the exact Thai member name to confirm deletion.', 400)
    if (member.role === 'leader' && team.members.length > 1) {
      throw new CmsTeamError('Choose another team leader before deleting the current leader.', 409)
    }
    team.members = team.members.filter((candidate) => candidate.id !== memberId)
    team.updatedAt = now
    return { memberId, revision: 0, teamId }
  })
}

export function reorderCmsTeams(
  orders: unknown,
  context: MutationContext
) {
  return runMutation(context, (document, now) => {
    if (!orders || typeof orders !== 'object' || Array.isArray(orders)) {
      throw new CmsTeamError('Invalid team order.', 400)
    }

    const entries = Object.entries(orders as Record<string, unknown>)
    if (!entries.length || entries.some(([department]) => !TEAM_DEPARTMENTS.includes(department as TeamDepartment))) {
      throw new CmsTeamError('Invalid team order.', 400)
    }

    for (const [departmentValue, ids] of entries) {
      const department = departmentValue as TeamDepartment
      if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string')) {
        throw new CmsTeamError('Invalid team order.', 400)
      }
      const current = sortTeams(document.teams.filter((team) => team.department === department)).map((team) => team.id)
      if (ids.length !== current.length || new Set(ids).size !== ids.length || ids.some((id) => !current.includes(id))) {
        throw new CmsTeamError('Reload the complete team list before changing its order.', 409)
      }
      const order = new Map((ids as string[]).map((id, index) => [id, index]))
      for (const team of document.teams) {
        if (team.department === department) {
          team.order = order.get(team.id) as number
          team.updatedAt = now
        }
      }
    }
    return { revision: 0 }
  })
}

export function reorderCmsTeamMembers(teamId: string, ids: unknown, context: MutationContext) {
  return runMutation(context, (document, now) => {
    const team = requireTeam(document, teamId)
    if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string')) throw new CmsTeamError('Invalid member order.', 400)
    const current = sortMembers(team.members).map((member) => member.id)
    if (ids.length !== current.length || new Set(ids).size !== ids.length || ids.some((id) => !current.includes(id))) {
      throw new CmsTeamError('Reload the complete member list before changing its order.', 409)
    }
    const order = new Map((ids as string[]).map((id, index) => [id, index]))
    for (const member of team.members) {
      const position = order.get(member.id) as number
      const role = position === 0 ? 'leader' : 'member'
      if (member.order !== position || member.role !== role) member.updatedAt = now
      member.order = position
      member.role = role
    }
    team.updatedAt = now
    return { revision: 0, teamId }
  })
}

export async function getCmsTeamMediaUrlsInUse(urls: string[]) {
  const unique = Array.from(new Set(urls.map((value) => value.trim()).filter(Boolean)))
  if (!unique.length) return new Set<string>()
  const document = await storedDirectory()
  const inUse = new Set<string>()
  for (const team of document?.teams || []) {
    for (const member of team.members) {
      if (unique.includes(member.image.src)) inUse.add(member.image.src)
    }
  }
  return inUse
}

export const cmsTeamDefaultPortrait = defaultPortrait
