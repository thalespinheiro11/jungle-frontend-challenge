import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { invalidateCartsWithNft } from '@/features/cart/api'
import { catalogKeys } from '@/features/catalog/api'
import type { Nft, NftSummary, NftUpdatedEvent, Paginated } from '@/lib/api/contracts'

import { createSocket, disposeSocket } from './socket'

/** Remembers recently seen event ids so duplicates are applied at most once. */
class SeenEvents {
  private readonly ids = new Set<string>()
  constructor(private readonly limit = 500) {}
  /** Returns true the first time an id is seen. */
  add(id: string) {
    if (this.ids.has(id)) return false
    this.ids.add(id)
    if (this.ids.size > this.limit) {
      const oldest = this.ids.values().next().value
      if (oldest) this.ids.delete(oldest)
    }
    return true
  }
}

export function applyNftUpdated(queryClient: QueryClient, event: NftUpdatedEvent) {
  const { payload } = event

  // Detail: only move forward in versions — an old or replayed event never regresses data.
  queryClient.setQueryData<Nft>(catalogKeys.detail(payload.id), (current) =>
    current && current.version < payload.version ? { ...current, ...payload } : current,
  )

  // Every cached list page containing the NFT.
  queryClient.setQueriesData<Paginated<NftSummary>>({ queryKey: catalogKeys.lists() }, (page) => {
    if (!page?.items.some((item) => item.id === payload.id)) return page
    return {
      ...page,
      items: page.items.map((item) =>
        item.id === payload.id && item.version < payload.version
          ? { ...item, price: payload.price, compareAtPrice: payload.compareAtPrice, version: payload.version }
          : item,
      ),
    }
  })
}

/**
 * Bridges Socket.IO events into the TanStack Query cache.
 * The socket lives as long as the session token: login, logout and user switch tear it
 * down (releasing listeners) and open a new one. On reconnect it refetches active catalog
 * queries, reconciling anything missed while offline.
 */
export function useRealtimeSync(token: string | null, enabled = true) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!enabled) return
    const socket = createSocket(token)
    const seen = new SeenEvents()
    let hasConnected = false

    const onNftUpdated = (event: NftUpdatedEvent) => {
      if (!seen.add(event.id)) return
      applyNftUpdated(queryClient, event)
      // Carts carry server-computed quotes: refetch instead of patching money locally.
      void invalidateCartsWithNft(queryClient, event.payload.id)
    }
    const onConnect = () => {
      if (hasConnected) {
        void queryClient.invalidateQueries({ queryKey: catalogKeys.all, refetchType: 'active' })
      }
      hasConnected = true
    }

    socket.on('connect', onConnect)
    socket.on('nft.updated', onNftUpdated)
    socket.connect()

    return () => disposeSocket(socket)
  }, [queryClient, token, enabled])
}
