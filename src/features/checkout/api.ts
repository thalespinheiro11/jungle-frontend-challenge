import { useIsMutating, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'

import { useSession } from '@/features/session/use-session'
import type {
  CheckoutQuote,
  CreateOrderRequest,
  Order,
  StaleQuoteErrorBody,
  WalletConnection,
  WalletConnectionRequest,
} from '@/lib/api/contracts'
import { api, ApiError } from '@/lib/api/http'

import { orderKeys } from '@/features/orders/api'

import { attemptStore, draftStore } from './attempt-store'

const placeOrderKey = ['orders', 'place'] as const

/** True while an order is being sent (the checkout must stay on screen meanwhile). */
export const usePlacingOrder = () => useIsMutating({ mutationKey: placeOrderKey }) > 0

export const checkoutApi = {
  connect: (body: WalletConnectionRequest) => api.post<WalletConnection>('/wallet-connections', body),
  disconnect: (id: string) => api.delete<void>(`/wallet-connections/${id}`),
  quote: () => api.post<CheckoutQuote>('/checkout/quote'),
  createOrder: (body: CreateOrderRequest, idempotencyKey: string) =>
    api.post<Order>('/orders', body, { headers: { 'Idempotency-Key': idempotencyKey } }),
}

export const useConnectWallet = () => useMutation({ mutationFn: checkoutApi.connect })
export const useCreateQuote = () => useMutation({ mutationFn: checkoutApi.quote })

/** The fresh quote attached to a 409 "values changed" answer, if any. */
export function staleQuoteOf(error: unknown): CheckoutQuote | null {
  if (!(error instanceof ApiError) || error.status !== 409) return null
  return (error.details as Partial<StaleQuoteErrorBody> | undefined)?.quote ?? null
}

/** Timeouts and connection drops are ambiguous: the server may have created the order. */
const isAmbiguous = (error: unknown) =>
  error instanceof ApiError && (error.code === 'TIMEOUT' || error.code === 'NETWORK_ERROR' || error.status >= 500)

/**
 * Places the order idempotently.
 * - One Idempotency-Key per (user, payload). The same payload reuses the key — double clicks,
 *   resends and retries after a refresh can only return the same order.
 * - On an ambiguous failure (timeout/network/5xx) it re-sends once with the same key, which
 *   recovers the order the server may already have created.
 * - A different payload (e.g. a new quote) gets a new key.
 */
export function usePlaceOrder() {
  const { user } = useSession()
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationKey: placeOrderKey,
    mutationFn: async (body: CreateOrderRequest) => {
      if (!user) throw new ApiError({ status: 401, code: 'UNAUTHENTICATED', message: 'Faça login para continuar.' })
      const fingerprint = JSON.stringify(body)
      let attempt = attemptStore.get(user.id)
      if (!attempt || attempt.fingerprint !== fingerprint) {
        attempt = { key: crypto.randomUUID(), fingerprint }
        attemptStore.set(user.id, attempt)
      }
      let order: Order
      try {
        order = await checkoutApi.createOrder(body, attempt.key)
      } catch (error) {
        if (!isAmbiguous(error)) throw error
        order = await checkoutApi.createOrder(body, attempt.key)
      }
      attemptStore.set(user.id, { ...attempt, orderId: order.id })
      return order
    },
    // Hook-level callbacks run even if the checkout unmounted meanwhile (e.g. the order got
    // confirmed and emptied the cart before a slow response arrived).
    onSuccess: (order) => {
      if (!user) return
      queryClient.setQueryData(orderKeys.detail(user.id, order.id), order)
      draftStore.clear(user.id)
      void router.navigate({ to: '/orders/$orderId', params: { orderId: order.id } })
    },
    onError: (error) => {
      // Reused key with another payload: start a fresh attempt next time.
      if (user && error instanceof ApiError && error.code === 'IDEMPOTENCY_CONFLICT') attemptStore.clear(user.id)
    },
  })
}
