import type { Session, SessionUser } from '@/lib/api/contracts'

import { db, type MockSession } from './db'
import type { MockUser } from './fixtures/users'
import { apiError } from './http-utils'

export async function hashPassword(salt: string, password: string) {
  const bytes = new TextEncoder().encode(`${salt}:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

export function publicUser(user: MockUser): SessionUser {
  const { id, name, username, email, avatarUrl } = user
  return { id, name, username, email, avatarUrl }
}

export function toSession(session: MockSession, user: MockUser): Session {
  return { user: publicUser(user), accessToken: session.token, expiresAt: session.expiresAt }
}

export function readBearer(request: Request) {
  const header = request.headers.get('Authorization') ?? ''
  return header.startsWith('Bearer ') ? header.slice(7) : null
}

/** Resolves the caller's session or the 401 response to return instead. */
export function authenticate(
  request: Request,
): { ok: true; user: MockUser; session: MockSession } | { ok: false; response: Response } {
  const token = readBearer(request)
  const session = token ? db.sessions.find(token) : undefined
  const user = session ? db.users.find(session.userId) : undefined
  if (!session || !user) {
    return { ok: false, response: apiError(401, 'UNAUTHENTICATED', 'Faça login para continuar.') }
  }
  if (Date.parse(session.expiresAt) <= Date.now()) {
    return {
      ok: false,
      response: apiError(401, 'SESSION_EXPIRED', 'Sua sessão expirou. Entre novamente.'),
    }
  }
  return { ok: true, user, session }
}
