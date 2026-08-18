import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const keyLength = 64
const saltLength = 16

export function hashCmsPassword(password: string) {
  const salt = randomBytes(saltLength).toString('base64url')
  const hash = scryptSync(password, salt, keyLength).toString('base64url')
  return `scrypt$${salt}$${hash}`
}

export function verifyCmsPassword(password: string, passwordHash: string) {
  const [algorithm, salt, storedHash, extra] = passwordHash.split('$')
  if (algorithm !== 'scrypt' || !salt || !storedHash || extra) return false
  const storedBuffer = Buffer.from(storedHash, 'base64url')
  const candidateBuffer = scryptSync(password, salt, keyLength)
  return storedBuffer.length === candidateBuffer.length && timingSafeEqual(storedBuffer, candidateBuffer)
}
