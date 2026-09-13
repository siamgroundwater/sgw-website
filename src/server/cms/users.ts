import 'server-only'

import { ObjectId } from 'mongodb'
import { getCmsUsersCollection } from '@/server/db'
import type { CmsDocumentStatus, CmsUserDocument, CmsUserRole } from '@/server/db'
import type { CmsSession, CmsUserRecord } from '@/types/cms'
import { hashPassword, verifyPassword } from './password'
import { isCmsSessionRevoked, validateCmsUserForm, type CmsUserErrorCode, type CmsUserField } from '@/lib/cms-access'

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
  code: CmsUserErrorCode
  field?: CmsUserField

  constructor(message: string, status = 400, code: CmsUserErrorCode = 'invalid', field?: CmsUserField) {
    super(message)
    this.name = 'CmsUserError'
    this.status = status
    this.code = code
    this.field = field
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

export async function findCmsUserSessionById(userId: string, issuedAt?: number, sessionVersion?: number) {
  if (!ObjectId.isValid(userId)) return null
  const users = await getCmsUsersCollection()
  const user = await users.findOne({
    _id: new ObjectId(userId),
    status: 'active',
    deletedAt: { $exists: false },
  })
  if (user && sessionVersion !== undefined && sessionVersion !== (user.sessionVersion || 0)) return null
  if (user && sessionVersion === undefined && issuedAt !== undefined && isCmsSessionRevoked(issuedAt, user.sessionsRevokedAt)) return null
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
  const result = await users.updateOne(
    { _id: user._id, passwordHash: user.passwordHash, status: 'active', deletedAt: { $exists: false } },
    { $set: { lastLoginAt: now, updatedAt: now } }
  )
  return result.matchedCount ? { ...toSession(user), sessionVersion: user.sessionVersion || 0 } : null
}

function validateUserInput(input: CreateCmsUserInput, passwordRequired: boolean) {
  const username = input.username.trim()
  const usernameLower = normalizeUsername(username)
  const name = input.name.trim()
  const email = input.email?.trim() || undefined

  const errors = validateCmsUserForm({ ...input, email: input.email || '' }, !passwordRequired)
  const first = Object.entries(errors)[0] as [CmsUserField, CmsUserErrorCode] | undefined
  if (first) throw new CmsUserError('Invalid user details.', 400, first[1], first[0])

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

export async function getCmsUserById(id: string) {
  if (!ObjectId.isValid(id)) return null
  const users = await getCmsUsersCollection()
  const user = await users.findOne({ _id: new ObjectId(id), deletedAt: { $exists: false } })
  return user ? serializeCmsUser(user) : null
}

export async function createCmsUser(input: CreateCmsUserInput) {
  await ensureCmsUserIndexes()
  const normalized = validateUserInput(input, true)
  const users = await getCmsUsersCollection()
  if (await users.findOne({ usernameLower: normalized.usernameLower })) {
    throw new CmsUserError('Username already exists.', 409, 'username_taken', 'username')
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
  if (!current) throw new CmsUserError('User not found.', 404, 'not_found')

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
      throw new CmsUserError('The CMS must keep at least one active administrator.', 400, 'last_admin', 'status')
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
    throw new CmsUserError('You cannot remove your own administrator access or active status.', 400, 'self_access', 'role')
  }
  if (input.id === currentUserId && input.password) throw new CmsUserError('Use My account to change your own password.', 400, 'account_password', 'password')
  await assertAdminContinuity(userId, input.role, input.status)

  const users = await getCmsUsersCollection()
  const duplicate = await users.findOne({
    _id: { $ne: userId },
    usernameLower: normalized.usernameLower,
  })
  if (duplicate) throw new CmsUserError('Username already exists.', 409, 'username_taken', 'username')

  const fields: Partial<CmsUserDocument> = {
    ...normalized,
    role: input.role,
    status: input.status,
    updatedAt: new Date(),
  }
  if (input.password) {
    fields.passwordHash = hashPassword(input.password)
    fields.sessionsRevokedAt = new Date()
  }
  if (input.status !== 'active') fields.sessionsRevokedAt = new Date()

  const result = await users.updateOne(
    { _id: userId, deletedAt: { $exists: false } },
    { $set: fields, ...(fields.sessionsRevokedAt ? { $inc: { sessionVersion: 1 } } : {}) }
  )
  if (!result.matchedCount) throw new CmsUserError('User not found.', 404, 'not_found')
  const updated = await users.findOne({ _id: userId })
  if (!updated) throw new CmsUserError('User not found.', 404, 'not_found')
  return serializeCmsUser(updated)
}

export async function deleteCmsUser(id: string, currentUserId: string) {
  await ensureCmsUserIndexes()
  if (!ObjectId.isValid(id)) throw new CmsUserError('Invalid user id.')
  if (id === currentUserId) throw new CmsUserError('You cannot remove your own account.', 400, 'self_access')

  const userId = new ObjectId(id)
  await assertAdminContinuity(userId, 'viewer', 'archived')
  const users = await getCmsUsersCollection()
  const now = new Date()
  const result = await users.updateOne(
    { _id: userId, deletedAt: { $exists: false } },
    { $set: { deletedAt: now, status: 'archived', updatedAt: now, sessionsRevokedAt: now }, $inc: { sessionVersion: 1 } }
  )
  if (!result.matchedCount) throw new CmsUserError('User not found.', 404, 'not_found')
}

export async function changeOwnCmsPassword(userId: string, currentPassword: string, newPassword: string) {
  if (!ObjectId.isValid(userId)) throw new CmsUserError('User not found.', 404, 'not_found')
  if (newPassword.length < CMS_PASSWORD_MIN_LENGTH || newPassword.length > 256) throw new CmsUserError('Invalid new password.', 400, 'password', 'password')
  const users = await getCmsUsersCollection()
  const user = await users.findOne({ _id: new ObjectId(userId), status: 'active', deletedAt: { $exists: false } })
  if (!user) throw new CmsUserError('User not found.', 404, 'not_found')
  if (!currentPassword || currentPassword.length > 256 || !verifyPassword(currentPassword, user.passwordHash)) throw new CmsUserError('Current password is incorrect.', 400, 'current_password')
  if (verifyPassword(newPassword, user.passwordHash)) throw new CmsUserError('Choose a different password.', 400, 'password_reused', 'password')
  const now = new Date()
  const changed = await users.updateOne(
    { _id: user._id, passwordHash: user.passwordHash, status: 'active', deletedAt: { $exists: false } },
    { $set: { passwordHash: hashPassword(newPassword), sessionsRevokedAt: now, updatedAt: now }, $inc: { sessionVersion: 1 } },
  )
  if (!changed.matchedCount) throw new CmsUserError('Account changed. Sign in again.', 409, 'conflict')
}
