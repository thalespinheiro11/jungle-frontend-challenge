import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { privateKeys } from '@/features/session/api'
import { useSession } from '@/features/session/hooks'
import type { FavoriteList, NftSummary } from '@/lib/api/contracts'
import { api, ApiError } from '@/lib/api/http'

export const favoritesKeys = {
  list: (userId: string) => [...privateKeys.user(userId), 'favorites'] as const,
}
const toggleMutationKey = ['favorites', 'toggle'] as const

export const favoritesQuery = (userId: string) =>
  queryOptions({
    queryKey: favoritesKeys.list(userId),
    queryFn: ({ signal }) => api.get<FavoriteList>('/me/favorites', { signal }),
  })

/** Favorites of the signed-in user; anonymous visitors simply have none. */
export function useFavorites() {
  const { user } = useSession()
  const query = useQuery({ ...favoritesQuery(user?.id ?? 'anonymous'), enabled: Boolean(user) })
  const ids = new Set(query.data?.items.map((item) => item.id))
  return { query, isFavorite: (nftId: string) => ids.has(nftId) }
}

interface ToggleVars {
  nft: NftSummary
  favorite: boolean
}

/**
 * Optimistic toggle: the heart flips immediately; on failure the previous list is restored
 * and the user is told why. The list is re-synced with the API once the last pending toggle
 * settles (not after each one, so rapid clicks don't flicker).
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient()
  const { user } = useSession()

  return useMutation({
    mutationKey: toggleMutationKey,
    mutationFn: ({ nft, favorite }: ToggleVars) => {
      const url = `/me/favorites/${encodeURIComponent(nft.id)}`
      return favorite ? api.put<void>(url) : api.delete<void>(url)
    },
    onMutate: async ({ nft, favorite }) => {
      if (!user) return undefined
      const key = favoritesKeys.list(user.id)
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<FavoriteList>(key)
      queryClient.setQueryData<FavoriteList>(key, (old) => {
        const items = (old?.items ?? []).filter((item) => item.id !== nft.id)
        return { items: favorite ? [nft, ...items] : items }
      })
      return { key, previous }
    },
    onError: (error, { favorite }, context) => {
      if (context) queryClient.setQueryData(context.key, context.previous)
      // Auth failures are handled globally (toast + redirect); don't double-notify.
      if (error instanceof ApiError && error.isAuthError) return
      toast.error(
        favorite
          ? 'Não foi possível favoritar agora. Tente novamente.'
          : 'Não foi possível remover dos favoritos agora. Tente novamente.',
      )
    },
    onSuccess: (_data, { nft, favorite }) => {
      toast.success(
        favorite ? `${nft.name} adicionado aos favoritos.` : `${nft.name} removido dos favoritos.`,
      )
    },
    onSettled: (_data, _error, _vars, context) => {
      if (context && queryClient.isMutating({ mutationKey: toggleMutationKey }) === 1) {
        void queryClient.invalidateQueries({ queryKey: context.key })
      }
    },
  })
}
