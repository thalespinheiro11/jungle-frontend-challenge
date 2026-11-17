import { queryOptions, useQuery, type QueryClient } from '@tanstack/react-query'

import { privateKeys } from '@/features/session/api'
import { useSession } from '@/features/session/use-session'
import type { Order, OrderUpdatedEvent } from '@/lib/api/contracts'
import { api } from '@/lib/api/http'

export const orderKeys = {
  all: (userId: string) => [...privateKeys.user(userId), 'orders'] as const,
  detail: (userId: string, orderId: string) => [...orderKeys.all(userId), orderId] as const,
}

/** Polling is only a safety net while pending; Socket.IO `order.updated` is the primary path. */
const PENDING_FALLBACK_POLL_MS = 10_000

export const orderQuery = (userId: string, orderId: string) =>
  queryOptions({
    queryKey: orderKeys.detail(userId, orderId),
    queryFn: ({ signal }) => api.get<Order>(`/me/orders/${encodeURIComponent(orderId)}`, { signal }),
    refetchInterval: (query) => (query.state.data?.status === 'pending' ? PENDING_FALLBACK_POLL_MS : false),
  })

export function useOrder(orderId: string) {
  const { user } = useSession()
  return useQuery({ ...orderQuery(user?.id ?? 'anonymous', orderId), enabled: Boolean(user) })
}

/**
 * Applies an order.updated event to the cached order of its owner. Versions only move
 * forward: duplicates and older events never regress a terminal state.
 * Returns true when the event changed something.
 */
export function applyOrderUpdated(queryClient: QueryClient, userId: string, event: OrderUpdatedEvent) {
  const key = orderKeys.detail(userId, event.payload.id)
  const current = queryClient.getQueryData<Order>(key)
  if (current && current.version >= event.version) return false
  if (!current) {
    void queryClient.invalidateQueries({ queryKey: key })
    return true
  }
  queryClient.setQueryData<Order>(key, {
    ...current,
    status: event.payload.status,
    version: event.payload.version,
    txHash: event.payload.txHash,
    failureReason: event.payload.failureReason,
  })
  return true
}
