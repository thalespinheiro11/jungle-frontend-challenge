import { QueryClient } from '@tanstack/react-query'

import { ApiError } from '@/lib/api/http'

/**
 * Cache policy (to be documented in ARCHITECTURE.md):
 * - Catalog data is fresh for 30s; realtime events patch it in between.
 * - Only transient failures (network, timeout, 5xx) are retried, at most twice, with backoff.
 * - Mutations are never retried automatically: orders rely on idempotency keys instead.
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: true,
        retry: (failureCount, error) =>
          error instanceof ApiError && error.isTransient && failureCount < 2,
        retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 4_000),
      },
      mutations: { retry: false },
    },
  })
}
