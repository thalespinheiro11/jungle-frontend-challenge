import { http, HttpResponse } from 'msw'

import type { FavoriteList } from '@/lib/api/contracts'

import { authenticate } from '../auth'
import { mockConfig } from '../config'
import { db } from '../db'
import { apiError, applyNetwork } from '../http-utils'
import { toSummary } from './catalog'

const API = '*/api'

/** Favorites are private: every route requires a valid session and is scoped to its user. */
export const favoritesHandlers = [
  http.get(`${API}/me/favorites`, async ({ request }) => {
    const failure = await applyNetwork(request, 'favorites')
    if (failure) return failure
    const auth = authenticate(request)
    if (!auth.ok) return auth.response

    const items = db.favorites
      .list(auth.user.id)
      .map((id) => db.nfts.find(id))
      .filter((nft) => nft !== undefined)
      .map(toSummary)
    return HttpResponse.json<FavoriteList>({ items })
  }),

  // PUT/DELETE are idempotent: repeating them leaves the same final state.
  http.put(`${API}/me/favorites/:nftId`, async ({ request, params }) => {
    const failure = await applyNetwork(request, 'favorites')
    if (failure) return failure
    const auth = authenticate(request)
    if (!auth.ok) return auth.response
    if (mockConfig.scenario === 'favorites-error') {
      return apiError(503, 'TRANSIENT', 'Não foi possível salvar o favorito agora.')
    }

    const nftId = String(params.nftId)
    if (!db.nfts.find(nftId)) return apiError(404, 'NOT_FOUND', 'NFT não encontrado.')
    db.favorites.add(auth.user.id, nftId)
    return new HttpResponse(null, { status: 204 })
  }),

  http.delete(`${API}/me/favorites/:nftId`, async ({ request, params }) => {
    const failure = await applyNetwork(request, 'favorites')
    if (failure) return failure
    const auth = authenticate(request)
    if (!auth.ok) return auth.response
    if (mockConfig.scenario === 'favorites-error') {
      return apiError(503, 'TRANSIENT', 'Não foi possível remover o favorito agora.')
    }

    db.favorites.remove(auth.user.id, String(params.nftId))
    return new HttpResponse(null, { status: 204 })
  }),
]
