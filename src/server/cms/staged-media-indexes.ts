import type { Collection } from 'mongodb'
import type { CmsStagedProjectMediaDocument } from '../db/types'
import { ensureCmsIndexes } from '../db/cms-indexes.ts'

export async function ensureCmsStagedMediaIndexes(collection: Collection<CmsStagedProjectMediaDocument>) {
  // Establish current uniqueness before retiring the index for the old shape.
  await ensureCmsIndexes(collection, 'stagedProjectMedia')

  const indexes = await collection.listIndexes().toArray()
  const obsolete = indexes.find((index) =>
    index.name === 'publicId_1' && index.unique === true &&
    Object.keys(index.key).length === 1 && index.key.publicId === 1
  )
  if (!obsolete) return

  // Current records have no top-level publicId. A unique index on that missing
  // field admits just one record, so the second image in a save fails E11000.
  // Removing this index does not remove documents or Cloudinary images.
  try {
    await collection.dropIndex('publicId_1')
  } catch (error) {
    // Another serverless instance may have completed the same repair.
    if (!error || typeof error !== 'object' || !('code' in error) || error.code !== 27) throw error
  }
}
