import { http, HttpResponse } from 'msw'

import type { LoginRequest, Session, SignupRequest } from '@/lib/api/contracts'
import { loginSchema, signupRequestSchema, toFieldErrors } from '@/features/session/schemas'

import { authenticate, hashPassword, readBearer, toSession } from '../auth'
import { db } from '../db'
import { apiError, applyNetwork } from '../http-utils'

const API = '*/api'

export const sessionHandlers = [
  http.post<never, SignupRequest>(`${API}/auth/signup`, async ({ request }) => {
    const failure = await applyNetwork(request, 'auth')
    if (failure) return failure

    const parsed = signupRequestSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return apiError(422, 'VALIDATION_ERROR', 'Revise os campos destacados.', toFieldErrors(parsed.error))
    }
    const { username, email, password } = parsed.data

    const conflicts: Record<string, string> = {}
    if (db.users.findByEmail(email)) conflicts.email = 'Este e-mail já está cadastrado.'
    if (db.users.findByUsername(username)) conflicts.username = 'Este nome de usuário já está em uso.'
    if (Object.keys(conflicts).length) {
      return apiError(409, 'CONFLICT', 'Já existe uma conta com estes dados.', conflicts)
    }

    const salt = crypto.randomUUID()
    const user = db.users.insert({
      id: `usr_${crypto.randomUUID().slice(0, 8)}`,
      name: username,
      username,
      email: email.toLowerCase(),
      avatarUrl: null,
      ensName: username.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 32).padEnd(3, '0'),
      walletNickname: 'Principal',
      updatedAt: new Date().toISOString(),
      salt,
      passwordHash: await hashPassword(salt, password),
      createdAt: new Date().toISOString(),
    })
    const session = db.sessions.create(user.id)
    return HttpResponse.json<Session>(toSession(session, user), { status: 201 })
  }),

  http.post<never, LoginRequest>(`${API}/auth/login`, async ({ request }) => {
    const failure = await applyNetwork(request, 'auth')
    if (failure) return failure

    const parsed = loginSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return apiError(422, 'VALIDATION_ERROR', 'Revise os campos destacados.', toFieldErrors(parsed.error))
    }
    const user = db.users.findByEmail(parsed.data.email)
    const valid = user && (await hashPassword(user.salt, parsed.data.password)) === user.passwordHash
    if (!user || !valid) {
      // Same message for unknown e-mail and wrong password: no account enumeration.
      return apiError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha incorretos.')
    }
    const session = db.sessions.create(user.id)
    return HttpResponse.json<Session>(toSession(session, user))
  }),

  http.get(`${API}/session`, async ({ request }) => {
    const failure = await applyNetwork(request, 'session')
    if (failure) return failure

    const auth = authenticate(request)
    if (!auth.ok) return auth.response
    return HttpResponse.json<Session>(toSession(auth.session, auth.user))
  }),

  http.post(`${API}/auth/logout`, async ({ request }) => {
    const failure = await applyNetwork(request, 'auth')
    if (failure) return failure

    // Idempotent: logging out an unknown or expired session still succeeds.
    const token = readBearer(request)
    if (token) db.sessions.revoke(token)
    return new HttpResponse(null, { status: 204 })
  }),
]
