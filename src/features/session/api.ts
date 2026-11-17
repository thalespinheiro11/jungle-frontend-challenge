import { queryOptions } from '@tanstack/react-query'

import type { Session } from '@/lib/api/contracts'
import { ApiError, api } from '@/lib/api/http'

export const sessionKeys = {
  current: ['session'] as const,
}

/** Resolves to `null` for anonymous visitors instead of erroring, so guards can branch on it. */
export const sessionQuery = () =>
  queryOptions({
    queryKey: sessionKeys.current,
    queryFn: async ({ signal }) => {
      try {
        return await api.get<Session>('/session', { signal })
      } catch (error) {
        if (error instanceof ApiError && error.isAuthError) return null
        throw error
      }
    },
    staleTime: 60_000,
  })
