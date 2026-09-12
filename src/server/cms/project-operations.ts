import 'server-only'

import { createHash } from 'node:crypto'
import type { ClientSession } from 'mongodb'
import { getMongoClient } from '@/server/db'
import { getCmsProjectOperationsCollection } from '@/server/db/collections'
import type { CmsProjectRecord } from '@/types/cms'
import { CmsContentError, ensureCmsContentIndexes } from './content'

let indexes: Promise<unknown> | undefined

export function validateProjectOperationId(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(value)) {
    throw new CmsContentError('A valid save operation id is required. Reload the editor.', 400)
  }
  return value.toLowerCase()
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)]))
  }
  return value
}

export function projectOperationFingerprint(method: string, body: Record<string, unknown>) {
  return createHash('sha256').update(JSON.stringify(canonical({ method, body }))).digest('hex')
}

async function collectionWithIndexes() {
  const collection = await getCmsProjectOperationsCollection()
  indexes ||= collection.createIndex({ userId: 1, operationId: 1 }, { unique: true }).catch((error) => {
    indexes = undefined
    throw error
  })
  await indexes
  return collection
}

export async function getSavedProjectOperation(userId: string, operationId: string, fingerprint?: string) {
  const collection = await collectionWithIndexes()
  const row = await collection.findOne({ userId, operationId: validateProjectOperationId(operationId) })
  if (row && fingerprint && row.fingerprint !== fingerprint) {
    throw new CmsContentError('This operation id belongs to a different change. Start a new save for your edited content.', 409)
  }
  return row?.item || null
}

/** Project state and its receipt commit together, so a lost response can be recovered safely. */
export async function runProjectOperation(
  userId: string,
  operationId: string,
  fingerprint: string,
  write: (session: ClientSession) => Promise<CmsProjectRecord>
) {
  const collection = await collectionWithIndexes()
  await ensureCmsContentIndexes()
  const saved = await getSavedProjectOperation(userId, operationId, fingerprint)
  if (saved) return { item: saved, replayed: true }
  const session = (await getMongoClient()).startSession()
  try {
    const result = await session.withTransaction(async () => {
      const prior = await collection.findOne({ userId, operationId }, { session })
      if (prior) {
        if (prior.fingerprint !== fingerprint) throw new CmsContentError('This operation id belongs to a different change.', 409)
        return { item: prior.item, replayed: true }
      }
      const item = await write(session)
      await collection.insertOne({ operationId, userId, fingerprint, item, createdAt: new Date() }, { session })
      return { item, replayed: false }
    }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' }, maxCommitTimeMS: 10000 })
    if (!result) throw new Error('Project operation did not return a saved result.')
    return result
  } catch (error) {
    // A concurrent identical request or an uncertain commit can already have a durable receipt.
    const recovered = await getSavedProjectOperation(userId, operationId, fingerprint)
    if (recovered) return { item: recovered, replayed: true }
    throw error
  } finally {
    await session.endSession()
  }
}
