import {
  queryOptions,
  useIsMutating,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from '@tanstack/react-query'
import type { AxiosRequestConfig } from 'axios'

import { privateKeys } from '@/features/session/api'
import { useSession } from '@/features/session/use-session'
import { tokenStore } from '@/features/session/token-store'
import type { AddCartItemRequest, Cart } from '@/lib/api/contracts'
import { api } from '@/lib/api/http'

import { guestCart } from './guest-cart'

/**
 * Cart cache keys: the user's cart is private (['me', userId, 'cart'], dropped on logout);
 * a visitor's cart is keyed by its guest id.
 */
export const cartKeys = {
  user: (userId: string) => [...privateKeys.user(userId), 'cart'] as const,
  guest: (guestId: string) => ['cart', 'guest', guestId] as const,
}
const cartMutationKey = ['cart', 'mutation'] as const

/** Guest requests identify the cart by header; authenticated ones by the bearer token. */
function cartConfig(config: AxiosRequestConfig = {}): AxiosRequestConfig {
  if (tokenStore.get()) return config
  return { ...config, headers: { ...config.headers, 'X-Cart-Id': guestCart.ensure() } }
}

export const cartApi = {
  get: (signal?: AbortSignal) => api.get<Cart>('/cart', cartConfig({ signal })),
  add: (body: AddCartItemRequest) => api.post<Cart>('/cart/items', body, cartConfig()),
  update: (lineId: string, quantity: number) =>
    api.patch<Cart>(`/cart/items/${lineId}`, { quantity }, cartConfig()),
  remove: (lineId: string) => api.delete<Cart>(`/cart/items/${lineId}`, cartConfig()),
  acknowledge: () => api.post<Cart>('/cart/acknowledge', undefined, cartConfig()),
  applyCoupon: (code: string) => api.put<Cart>('/cart/coupon', { code }, cartConfig()),
  removeCoupon: () => api.delete<Cart>('/cart/coupon', cartConfig()),
  merge: (guestCartId: string) => api.post<Cart>('/cart/merge', { guestCartId }),
}

export const cartQuery = (key: QueryKey) =>
  queryOptions({
    queryKey: key,
    queryFn: ({ signal }) => cartApi.get(signal),
    staleTime: 15_000,
    // Out-of-order guard for fetches too: a response older than the cached cart (e.g. a GET
    // that started before a mutation) never replaces newer data.
    structuralSharing: (previous, next) =>
      isCart(previous) && isCart(next) && previous.version > next.version ? previous : next,
  })

function isCart(value: unknown): value is Cart {
  return typeof value === 'object' && value !== null && 'version' in value
}

/** Stores a cart response unless a newer version is already cached (out-of-order guard). */
function setCart(queryClient: QueryClient, key: QueryKey, cart: Cart) {
  queryClient.setQueryData<Cart>(key, (current) =>
    !current || cart.version >= current.version ? cart : current,
  )
}

/** Current cart key: waits for the session so a signed-in user never fetches a guest cart. */
export function useCartKey(): QueryKey | null {
  const { user, isPending } = useSession()
  if (isPending) return null
  return user ? cartKeys.user(user.id) : cartKeys.guest(guestCart.ensure())
}

export function useCart() {
  const key = useCartKey()
  return useQuery({ ...cartQuery(key ?? ['cart', 'pending']), enabled: key !== null })
}

export function useCartBusy() {
  return useIsMutating({ mutationKey: cartMutationKey }) > 0
}

function useCartMutation<TVars>(mutationFn: (vars: TVars) => Promise<Cart>) {
  const queryClient = useQueryClient()
  const key = useCartKey()
  return useMutation({
    mutationKey: cartMutationKey,
    mutationFn,
    onSuccess: (cart) => {
      if (key) setCart(queryClient, key, cart)
    },
    onError: () => {
      // The server may have changed underneath (stock, prices): resync.
      if (key) void queryClient.invalidateQueries({ queryKey: key })
    },
  })
}

export const useAddToCart = () => useCartMutation((body: AddCartItemRequest) => cartApi.add(body))
export const useUpdateCartLine = () =>
  useCartMutation(({ lineId, quantity }: { lineId: string; quantity: number }) =>
    cartApi.update(lineId, quantity),
  )
export const useRemoveCartLine = () => useCartMutation((lineId: string) => cartApi.remove(lineId))
export const useAcknowledgeCart = () => useCartMutation(() => cartApi.acknowledge())
export const useApplyCoupon = () => useCartMutation((code: string) => cartApi.applyCoupon(code))
export const useRemoveCoupon = () => useCartMutation(() => cartApi.removeCoupon())

/**
 * Called right after login/signup: moves the visitor's cart into the user's cart.
 * On failure the guest id is kept, so the items are not lost and merge is retried later.
 */
export async function mergeGuestCart(queryClient: QueryClient, userId: string) {
  const guestId = guestCart.get()
  if (!guestId) return
  const cart = await cartApi.merge(guestId)
  setCart(queryClient, cartKeys.user(userId), cart)
  guestCart.clear()
  queryClient.removeQueries({ queryKey: cartKeys.guest(guestId) })
}

/** Realtime: refetch any cached cart that contains the updated NFT (prices/availability). */
export function invalidateCartsWithNft(queryClient: QueryClient, nftId: string) {
  return queryClient.invalidateQueries({
    predicate: (query) => {
      const data = query.state.data as Cart | undefined
      return Boolean(
        query.queryKey.includes('cart') && data?.lines?.some((line) => line.nftId === nftId),
      )
    },
  })
}
