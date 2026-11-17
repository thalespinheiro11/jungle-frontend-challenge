import { keepPreviousData, queryOptions } from '@tanstack/react-query'

import type {
  CatalogFacets,
  Nft,
  NftListParams,
  NftSummary,
  Paginated,
} from '@/lib/api/contracts'
import { api } from '@/lib/api/http'

/**
 * Query keys include every request parameter, so each filter combination has its own cache
 * entry. TanStack Query passes an AbortSignal to the queryFn; Axios cancels superseded
 * requests with it, and a late response can only ever land in its own key — never in the
 * one currently on screen. That is how out-of-order responses are neutralised.
 */
export const catalogKeys = {
  all: ['nfts'] as const,
  lists: () => [...catalogKeys.all, 'list'] as const,
  list: (params: NftListParams) => [...catalogKeys.lists(), params] as const,
  facets: () => [...catalogKeys.all, 'facets'] as const,
  details: () => [...catalogKeys.all, 'detail'] as const,
  detail: (id: string) => [...catalogKeys.details(), id] as const,
}

export const nftListQuery = (params: NftListParams) =>
  queryOptions({
    queryKey: catalogKeys.list(params),
    queryFn: ({ signal }) => api.get<Paginated<NftSummary>>('/nfts', { params, signal }),
    // Keep the previous page on screen while the next one loads (background update state).
    placeholderData: keepPreviousData,
  })

export const facetsQuery = () =>
  queryOptions({
    queryKey: catalogKeys.facets(),
    queryFn: ({ signal }) => api.get<CatalogFacets>('/nfts/facets', { signal }),
    staleTime: 5 * 60_000,
  })

export const nftDetailQuery = (id: string) =>
  queryOptions({
    queryKey: catalogKeys.detail(id),
    queryFn: ({ signal }) => api.get<Nft>(`/nfts/${encodeURIComponent(id)}`, { signal }),
  })
