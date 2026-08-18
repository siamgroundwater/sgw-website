import 'server-only'

import { MongoClient, type Collection, type Db, type Document } from 'mongodb'

const defaultDbName = 'siamgroundwater'

type MongoGlobal = typeof globalThis & {
  _sgwMongoClientPromise?: Promise<MongoClient>
}

function getMongoUri() {
  const uri = process.env.MONGODB_URI?.trim()

  if (!uri) {
    throw new Error('Missing MONGODB_URI environment variable.')
  }

  return uri
}

export function getMongoDbName() {
  return process.env.MONGODB_DB?.trim() || defaultDbName
}

export function getMongoClient() {
  const globalForMongo = globalThis as MongoGlobal

  if (!globalForMongo._sgwMongoClientPromise) {
    const client = new MongoClient(getMongoUri(), {
      appName: 'siamgroundwater-cms',
      connectTimeoutMS: 8000,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 10000,
    })

    globalForMongo._sgwMongoClientPromise = client.connect().catch((error) => {
      delete globalForMongo._sgwMongoClientPromise
      throw error
    })
  }

  return globalForMongo._sgwMongoClientPromise
}

export async function getMongoDb(dbName = getMongoDbName()): Promise<Db> {
  const client = await getMongoClient()
  return client.db(dbName)
}

export async function getMongoCollection<TSchema extends Document = Document>(
  collectionName: string
): Promise<Collection<TSchema>> {
  const db = await getMongoDb()
  return db.collection<TSchema>(collectionName)
}

export async function pingMongo() {
  const db = await getMongoDb()
  await db.command({ ping: 1 }, { timeoutMS: 5000 })
  return { dbName: db.databaseName, ok: true as const }
}
