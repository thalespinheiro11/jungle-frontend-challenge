import { http, HttpResponse } from 'msw'

import { toFieldErrors } from '@/features/session/schemas'
import { walletInputSchema } from '@/features/wallets/schemas'
import type { Wallet, WalletList, WalletSlot } from '@/lib/api/contracts'

import { authenticate } from '../auth'
import { db } from '../db'
import { apiError, applyNetwork } from '../http-utils'

const API = '*/api'
const SLOTS: WalletSlot[] = ['primary', 'secondary']

export const walletHandlers = [
  http.get(`${API}/me/wallets`, async ({ request }) => {
    const failure = await applyNetwork(request, 'wallets')
    if (failure) return failure
    const auth = authenticate(request)
    if (!auth.ok) return auth.response
    return HttpResponse.json<WalletList>(db.wallets.list(auth.user.id))
  }),

  /** Creates or replaces the wallet in a slot (idempotent PUT). */
  http.put<{ slot: string }>(`${API}/me/wallets/:slot`, async ({ request, params }) => {
    const failure = await applyNetwork(request, 'wallets')
    if (failure) return failure
    const auth = authenticate(request)
    if (!auth.ok) return auth.response

    const slot = params.slot as WalletSlot
    if (!SLOTS.includes(slot)) return apiError(404, 'NOT_FOUND', 'Carteira não encontrada.')

    const parsed = walletInputSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return apiError(422, 'VALIDATION_ERROR', 'Revise os campos destacados.', toFieldErrors(parsed.error))
    }

    const other = db.wallets.list(auth.user.id)[slot === 'primary' ? 'secondary' : 'primary']
    if (other && other.address.toLowerCase() === parsed.data.address.toLowerCase()) {
      return apiError(409, 'CONFLICT', 'Este endereço já está cadastrado na outra carteira.', {
        address: 'Este endereço já está cadastrado na outra carteira.',
      })
    }

    const wallet: Wallet = { ...parsed.data, slot, updatedAt: new Date().toISOString() }
    return HttpResponse.json<Wallet>(db.wallets.save(auth.user.id, wallet))
  }),
]
