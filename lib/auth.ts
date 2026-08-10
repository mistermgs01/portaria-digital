import 'server-only'
import { cookies } from 'next/headers'
import { db } from '@/db'
import { sessions, users } from '@/db/schemas/users'
import { eq, gt } from 'drizzle-orm'

const SESSION_COOKIE = 'portaria_session'
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000 // 12 hours

// --- Password hashing via Web Crypto (PBKDF2) ---
async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder()
  const saltBytes = crypto.getRandomValues(new Uint8Array(16))
  const saltHex = Array.from(saltBytes).map(b => b.toString(16).padStart(2, '0')).join('')
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const hashBuf = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBytes, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    256,
  )
  const hashHex = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('')
  return `pbkdf2:${saltHex}:${hashHex}`
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [, saltHex, expectedHex] = stored.split(':')
    const enc = new TextEncoder()
    const saltBytes = new Uint8Array(saltHex.match(/.{2}/g)!.map(h => parseInt(h, 16)))
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
    const hashBuf = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: saltBytes, iterations: 100_000, hash: 'SHA-256' },
      keyMaterial,
      256,
    )
    const hashHex = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('')
    // constant-time compare
    if (hashHex.length !== expectedHex.length) return false
    let diff = 0
    for (let i = 0; i < hashHex.length; i++) diff |= hashHex.charCodeAt(i) ^ expectedHex.charCodeAt(i)
    return diff === 0
  } catch {
    return false
  }
}

function generateId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

// --- Public API ---

export async function loginWithPassword(username: string, password: string) {
  const normalized = username.trim().toLowerCase()
  const [user] = await db.select().from(users).where(eq(users.username, normalized)).limit(1)

  // constant-time: always run verifyPassword even if user not found
  const dummyHash = 'pbkdf2:0000000000000000:0000000000000000000000000000000000000000000000000000000000000000'
  const valid = await verifyPassword(password, user?.passwordHash ?? dummyHash)

  if (!user || !valid) {
    return { success: false, error: 'INVALID_CREDENTIALS' } as const
  }

  // Create session
  const sessionId = generateId()
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS)
  await db.insert(sessions).values({ id: sessionId, userId: user.id, expiresAt })

  // Set HttpOnly cookie
  const jar = await cookies()
  jar.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  })

  return {
    success: true,
    user: { id: user.id, username: user.username, displayName: user.displayName, role: user.role },
  } as const
}

export async function getCurrentUser() {
  const jar = await cookies()
  const sessionId = jar.get(SESSION_COOKIE)?.value
  if (!sessionId) return null

  const [row] = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, sessionId))
    .limit(1)

  if (!row || row.session.expiresAt < new Date()) {
    if (row) await db.delete(sessions).where(eq(sessions.id, sessionId))
    return null
  }

  return { id: row.user.id, username: row.user.username, displayName: row.user.displayName, role: row.user.role }
}

export async function logout() {
  const jar = await cookies()
  const sessionId = jar.get(SESSION_COOKIE)?.value
  if (sessionId) {
    await db.delete(sessions).where(eq(sessions.id, sessionId)).catch(() => {})
  }
  jar.set(SESSION_COOKIE, '', { httpOnly: true, secure: true, sameSite: 'lax', expires: new Date(0), path: '/' })
}

export { hashPassword }
