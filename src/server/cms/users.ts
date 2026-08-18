import 'server-only'

import { ObjectId } from 'mongodb'
import { getCmsUsersCollection } from '@/server/db'
import type { CmsDocumentStatus, CmsUserDocument, CmsUserRole } from '@/server/db'
import type { CmsSession, CmsUserRecord } from '@/types/cms'
import { hashPassword, verifyPassword } from './password'

export const CMS_PASSWORD_MIN_LENGTH = 12

export type CreateCmsUserInput = {
  email?: string
  name: string
  password: string
  role: CmsUserRole
  status: CmsDocumentStatus
  username: string
}

export type UpdateCmsUserInput = Omit<CreateCmsUserInput, 'password'> & {
  id: string
  password?: string
}

export class CmsUserError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = 'CmsUserError'
    this.status = status
  }
}

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase()
}

export async function ensureCmsUserIndexes() {
  const users = await getCmsUsersCollection()
  await Promise.all([
    users.createIndex({ usernameLower: 1 }, { unique: true }),
    users.createIndex({ status: 1, role: 1 }),
  ])
}

function toSession(user: CmsUserDocument): CmsSession {
  if (!user._id) throw new Error('CMS user is missing _id.')
  return {
    displayName: user.name,
    role: user.role,
    userId: user._id.toString(),
    username: user.username,
  }
}

export function serializeCmsUser(user: CmsUserDocument): CmsUserRecord {
  if (!user._id) throw new Error('CMS user is missing _id.')
  return {
    createdAt: user.createdAt.toISOString(),
    email: user.email || '',
    id: user._id.toString(),
    lastLoginAt: user.lastLoginAt?.toISOString() || null,
    name: user.name,
    role: user.role,
    status: user.status,
    username: user.username,
  }
}

export async function findCmsUserSessionById(userId: string) {
  if (!ObjectId.isValid(userId)) return null
  const users = await getCmsUsersCollection()
  const user = await users.findOne({
    _id: new ObjectId(userId),
    status: 'active',
    deletedAt: { $exists: false },
  })
  return user ? toSession(user) : null
}

export async function authenticateCmsUser(username: string, password: string) {
  await ensureCmsUserIndexes()
  const users = await getCmsUsersCollection()
  const user = await users.findOne({
    usernameLower: normalizeUsername(username),
    status: 'active',
    deletedAt: { $exists: false },
  })

  if (!user?.passwordHash || !verifyPassword(password, user.passwordHash)) return null

  const now = new Date()
  await users.updateOne(
    { _id: user._id },
    { $set: { lastLoginAt: now, updatedAt: now } }
  )
  return toSession(user)
}

function validateUserInput(input: CreateCmsUserInput, passwordRequired: boolean) {
  const username = input.username.trim()
  const usernameLower = normalizeUsername(username)
  const name = input.name.trim()
  const email = input.email?.trim() || undefined

  if (usernameLower.length < 3 || usernameLower.length > 80) {
    throw new CmsUserError('Username must contain 3 to 80 characters.')
  }
  if (!/^[a-z0-9._-]+$/.test(usernameLower)) {
    throw new CmsUserError('Username may contain letters, numbers, dots, underscores, and hyphens.')
  }
  if (!name || name.length > 120) throw new CmsUserError('Display name is required.')
  if (email && (!email.includes('@') || email.length > 254)) {
    throw new CmsUserError('Enter a valid email address.')
  }
  if (passwordRequired && input.password.length < CMS_PASSWORD_MIN_LENGTH) {
    throw new CmsUserError(`Password must contain at least ${CMS_PASSWORD_MIN_LENGTH} characters.`)
  }
  if (input.password.length > 256) {
    throw new CmsUserError('Password must not exceed 256 characters.')
  }

  return { email, name, username, usernameLower }
}

export async function listCmsUsers() {
  await ensureCmsUserIndexes()
  const users = await getCmsUsersCollection()
  const rows = await users
    .find({ deletedAt: { $exists: false } })
    .sort({ status: 1, name: 1 })
    .toArray()
  return rows.map(serializeCmsUser)
}

export async function createCmsUser(input: CreateCmsUserInput) {
  await ensureCmsUserIndexes()
  const normalized = validateUserInput(input, true)
  const users = await getCmsUsersCollection()
  if (await users.findOne({ usernameLower: normalized.usernameLower })) {
    throw new CmsUserError('Username already exists.', 409)
  }

  const now = new Date()
  const document: CmsUserDocument = {
    ...normalized,
    createdAt: now,
    passwordHash: hashPassword(input.password),
    role: input.role,
    status: input.status,
    updatedAt: now,
  }
  const result = await users.insertOne(document)
  return serializeCmsUser({ ...document, _id: result.insertedId })
}

async function assertAdminContinuity(
  userId: ObjectId,
  nextRole: CmsUserRole,
  nextStatus: CmsDocumentStatus
) {
  const users = await getCmsUsersCollection()
  const current = await users.findOne({ _id: userId })
  if (!current) throw new CmsUserError('User not found.', 404)

  if (
    current.role === 'admin' &&
    current.status === 'active' &&
    (nextRole !== 'admin' || nextStatus !== 'active')
  ) {
    const activeAdmins = await users.countDocuments({
      role: 'admin',
      status: 'active',
      deletedAt: { $exists: false },
    })
    if (activeAdmins <= 1) {
      throw new CmsUserError('The CMS must keep at least one active administrator.')
    }
  }
}

export async function updateCmsUser(input: UpdateCmsUserInput, currentUserId: string) {
  await ensureCmsUserIndexes()
  if (!ObjectId.isValid(input.id)) throw new CmsUserError('Invalid user id.')
  const userId = new ObjectId(input.id)
  const normalized = validateUserInput(
    { ...input, password: input.password || '' },
    Boolean(input.password)
  )

  if (input.id === currentUserId && (input.role !== 'admin' || input.status !== 'active')) {
    throw new CmsUserError('You cannot remove your own administrator access or active status.')
  }
  await assertAdminContinuity(userId, input.role, input.status)

  const users = await getCmsUsersCollection()
  const duplicate = await users.findOne({
    _id: { $ne: userId },
    usernameLower: normalized.usernameLower,
  })
  if (duplicate) throw new CmsUserError('Username already exists.', 409)

  const fields: Partial<CmsUserDocument> = {
    ...normalized,
    role: input.role,
    status: input.status,
    updatedAt: new Date(),
  }
  if (input.password) fields.passwordHash = hashPassword(input.password)

  const result = await users.updateOne(
    { _id: userId, deletedAt: { $exists: false } },
    { $set: fields }
  )
  if (!result.matchedCount) throw new CmsUserError('User not found.', 404)
  const updated = await users.findOne({ _id: userId })
  if (!updated) throw new CmsUserError('User not found.', 404)
  return serializeCmsUser(updated)
}

export async function deleteCmsUser(id: string, currentUserId: string) {
  await ensureCmsUserIndexes()
  if (!ObjectId.isValid(id)) throw new CmsUserError('Invalid user id.')
  if (id === currentUserId) throw new CmsUserError('You cannot remove your own account.')

  const userId = new ObjectId(id)
  await assertAdminContinuity(userId, 'viewer', 'archived')
  const users = await getCmsUsersCollection()
  const now = new Date()
  const result = await users.updateOne(
    { _id: userId, deletedAt: { $exists: false } },
    { $set: { deletedAt: now, status: 'archived', updatedAt: now } }
  )
  if (!result.matchedCount) throw new CmsUserError('User not found.', 404)
}
