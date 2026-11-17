import { z } from 'zod'

import { NETWORKS, NFT_CATEGORIES, NFT_SORTS, NFT_TABS, type NftListParams } from '@/lib/api/contracts'

const decimal = z.string().regex(/^\d+(\.\d+)?$/)

/** Accepts a single value or a list from the URL and drops unknown entries instead of failing. */
const listOf = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .union([z.enum(values), z.array(z.string())])
    .transform((v) => (Array.isArray(v) ? v : [v]).filter((x): x is T[number] => values.includes(x)))
    .optional()
    .catch(undefined)

/**
 * Catalog search state lives in the URL: it survives refresh, is shareable and is restored
 * by browser history. Invalid params fall back to defaults instead of breaking the page.
 */
export const catalogSearchSchema = z.object({
  q: z.string().trim().max(80).optional().catch(undefined),
  category: listOf(NFT_CATEGORIES),
  network: listOf(NETWORKS),
  minPrice: decimal.optional().catch(undefined),
  maxPrice: decimal.optional().catch(undefined),
  sort: z.enum(NFT_SORTS).optional().catch(undefined),
  tab: z.enum(NFT_TABS).optional().catch(undefined),
  page: z.coerce.number().int().min(1).optional().catch(undefined),
})

export type CatalogSearch = z.infer<typeof catalogSearchSchema>

export function toListParams(search: CatalogSearch): NftListParams {
  return {
    q: search.q || undefined,
    category: search.category?.length ? search.category : undefined,
    network: search.network?.length ? search.network : undefined,
    minPrice: search.minPrice,
    maxPrice: search.maxPrice,
    sort: search.sort ?? 'recent',
    tab: search.tab ?? 'all',
    page: search.page ?? 1,
    pageSize: 9,
  }
}
