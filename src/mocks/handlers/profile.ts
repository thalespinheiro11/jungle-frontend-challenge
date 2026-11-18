import { http, HttpResponse } from 'msw'

import { AVATAR_MAX_BYTES, AVATAR_TYPES, changePasswordSchema, profileSchema } from '@/features/profile/schemas'
import { toFieldErrors } from '@/features/session/schemas'
import type { Profile, UpdateAvatarRequest } from '@/lib/api/contracts'

import { authenticate, hashPassword } from '../auth'
import { db } from '../db'
import type { MockUser } from '../fixtures/users'
import { apiError, applyNetwork } from '../http-utils'

const API = '*/api'

function toProfile(user: MockUser): Profile {
  return {
    id: user.id,
    displayName: user.name,
    username: user.username,
    email: user.email,
    ensName: user.ensName,
    walletNickname: user.walletNickname,
    avatarUrl: user.avatarUrl,
    updatedAt: user.updatedAt,
  }
}

/** data:image/<png|jpeg|webp>;base64,<payload> within the size limit. */
function checkAvatar(dataUrl: unknown): string | null {
  if (typeof dataUrl !== 'string') return 'Envie uma imagem.'
  const match = /^data:(image\/[a-z]+);base64,[A-Za-z0-9+/=]+$/.exec(dataUrl)
  if (!match || !(AVATAR_TYPES as readonly string[]).includes(match[1]!)) {
    return 'Use uma imagem PNG, JPG ou WEBP.'
  }
  if (dataUrl.length > AVATAR_MAX_BYTES * 1.37) return 'A imagem deve ter no máximo 1 MB.'
  return null
}

export const profileHandlers = [
  http.get(`${API}/me/profile`, async ({ request }) => {
    const failure = await applyNetwork(request, 'profile')
    if (failure) return failure
    const auth = authenticate(request)
    if (!auth.ok) return auth.response
    return HttpResponse.json<Profile>(toProfile(auth.user))
  }),

  http.patch(`${API}/me/profile`, async ({ request }) => {
    const failure = await applyNetwork(request, 'profile')
    if (failure) return failure
    const auth = authenticate(request)
    if (!auth.ok) return auth.response

    const parsed = profileSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return apiError(422, 'VALIDATION_ERROR', 'Revise os campos destacados.', toFieldErrors(parsed.error))
    }
    const data = parsed.data
    const conflicts: Record<string, string> = {}
    const byEmail = db.users.findByEmail(data.email)
    if (byEmail && byEmail.id !== auth.user.id) conflicts.email = 'Este e-mail já está em uso por outra conta.'
    const byUsername = db.users.findByUsername(data.username)
    if (byUsername && byUsername.id !== auth.user.id) conflicts.username = 'Este nome de usuário já está em uso.'
    if (Object.keys(conflicts).length) {
      return apiError(409, 'CONFLICT', 'Já existe uma conta com estes dados.', conflicts)
    }

    const user = db.users.update(auth.user.id, (u) => {
      u.name = data.displayName
      u.username = data.username
      u.email = data.email.toLowerCase()
      u.ensName = data.ensName
      u.walletNickname = data.walletNickname
    })!
    return HttpResponse.json<Profile>(toProfile(user))
  }),

  http.put<never, UpdateAvatarRequest>(`${API}/me/avatar`, async ({ request }) => {
    const failure = await applyNetwork(request, 'profile')
    if (failure) return failure
    const auth = authenticate(request)
    if (!auth.ok) return auth.response

    const body = (await request.json().catch(() => null)) as UpdateAvatarRequest | null
    const problem = checkAvatar(body?.dataUrl)
    if (problem) return apiError(422, 'VALIDATION_ERROR', problem, { avatar: problem })
    const user = db.users.update(auth.user.id, (u) => {
      u.avatarUrl = body!.dataUrl
    })!
    return HttpResponse.json<Profile>(toProfile(user))
  }),

  http.delete(`${API}/me/avatar`, async ({ request }) => {
    const failure = await applyNetwork(request, 'profile')
    if (failure) return failure
    const auth = authenticate(request)
    if (!auth.ok) return auth.response
    const user = db.users.update(auth.user.id, (u) => {
      u.avatarUrl = null
    })!
    return HttpResponse.json<Profile>(toProfile(user))
  }),

  http.post(`${API}/me/password`, async ({ request }) => {
    const failure = await applyNetwork(request, 'profile')
    if (failure) return failure
    const auth = authenticate(request)
    if (!auth.ok) return auth.response

    const parsed = changePasswordSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return apiError(422, 'VALIDATION_ERROR', 'Revise os campos destacados.', toFieldErrors(parsed.error))
    }
    const { currentPassword, newPassword } = parsed.data
    if ((await hashPassword(auth.user.salt, currentPassword)) !== auth.user.passwordHash) {
      return apiError(422, 'VALIDATION_ERROR', 'Senha atual incorreta.', { currentPassword: 'Senha atual incorreta.' })
    }
    if (currentPassword === newPassword) {
      const message = 'A nova senha deve ser diferente da atual.'
      return apiError(422, 'VALIDATION_ERROR', message, { newPassword: message })
    }
    // New salt + hash; the plain password is never stored.
    const salt = crypto.randomUUID()
    const passwordHash = await hashPassword(salt, newPassword)
    db.users.update(auth.user.id, (u) => {
      u.salt = salt
      u.passwordHash = passwordHash
    })
    return new HttpResponse(null, { status: 204 })
  }),
]
