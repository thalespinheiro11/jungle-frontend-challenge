import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { cartKeys, invalidateCartsWithNft } from '@/features/cart/api'
import { catalogKeys } from '@/features/catalog/api'
import { applyOrderUpdated, orderKeys } from '@/features/orders/api'
import type { Nft, NftSummary, NftUpdatedEvent, OrderUpdatedEvent, Paginated } from '@/lib/api/contracts'

import type { Socket } from 'socket.io-client'

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
 * down (releasing listeners) and open a new one, so events of a previous session can never
 * touch the next user's cache. On reconnect it refetches active catalog, cart and order
 * queries, reconciling anything missed while offline.
 */
export function useRealtimeSync(token: string | null, userId: string | null, enabled = true) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!enabled) return
    // Creation is async (network gate + lazy client); a cleanup that runs first cancels it.
    let disposed = false
    let socket: Socket | null = null
    const seen = new SeenEvents()
    let hasConnected = false

    const onNftUpdated = (event: NftUpdatedEvent) => {
      if (!seen.add(event.id)) return
      applyNftUpdated(queryClient, event)
      // Carts carry server-computed quotes: refetch instead of patching money locally.
      void invalidateCartsWithNft(queryClient, event.payload.id)
    }
    const onOrderUpdated = (event: OrderUpdatedEvent) => {
      if (!userId || !seen.add(event.id)) return
      const changed = applyOrderUpdated(queryClient, userId, event)
      // A confirmed order removed the purchased items from the cart server-side.
      if (changed && event.payload.status === 'confirmed') {
        void queryClient.invalidateQueries({ queryKey: cartKeys.user(userId) })
      }
    }
    const onConnect = () => {
      if (hasConnected) {
        void queryClient.invalidateQueries({ queryKey: catalogKeys.all, refetchType: 'active' })
        if (userId) {
          void queryClient.invalidateQueries({ queryKey: orderKeys.all(userId), refetchType: 'active' })
          void queryClient.invalidateQueries({ queryKey: cartKeys.user(userId), refetchType: 'active' })
        }
      }
      hasConnected = true
    }

    void createSocket(token).then((created) => {
      if (disposed) return disposeSocket(created)
      socket = created
      socket.on('connect', onConnect)
      socket.on('nft.updated', onNftUpdated)
      socket.on('order.updated', onOrderUpdated)
      socket.connect()
    })

    return () => {
      disposed = true
      if (socket) disposeSocket(socket)
    }
  }, [queryClient, token, userId, enabled])
}
