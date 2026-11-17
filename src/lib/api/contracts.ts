/**
 * REST + realtime contracts shared by the app (transport → state → UI) and the MSW mocks.
 * Mocks import these types too, so a contract change breaks both sides at compile time.
 */

/** ETH amounts travel as decimal strings ("1.19") and are only computed with decimal.js. */
export type EthAmount = string
/** ISO-8601 timestamp. */
export type IsoDate = string

// ---------- Errors ----------

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'SESSION_EXPIRED'
  | 'INVALID_CREDENTIALS'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'OUT_OF_STOCK'
  | 'PRICE_CHANGED'
  | 'IDEMPOTENCY_CONFLICT'
  | 'TRANSIENT'

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode
    message: string
    /** Field-level messages for form validation errors, keyed by field name. */
    fieldErrors?: Record<string, string>
  }
}

// ---------- Catalog ----------

export const NFT_CATEGORIES = [
  'digital-art',
  'photography',
  'music',
  '3d-art',
  'collectibles',
  'generative',
  'games',
  'subscriptions',
  'utility',
] as const
export type NftCategory = (typeof NFT_CATEGORIES)[number]

export const NETWORKS = ['ethereum', 'polygon', 'solana'] as const
export type Network = (typeof NETWORKS)[number]

export type EditionId = '1-1' | '1-10' | '1-50' | 'open'

export interface NftEdition {
  id: EditionId
  /** Display label, e.g. "1/50" or "ABERTA". */
  label: string
  price: EthAmount
  /** Units still purchasable for this edition; 0 means sold out. */
  available: number
}

export interface NftSummary {
  id: string
  name: string
  image: string
  imageAlt: string
  category: NftCategory
  network: Network
  /** Lowest current price across available editions. */
  price: EthAmount
  /** Previous price when the NFT is discounted (rendered struck-through). */
  compareAtPrice: EthAmount | null
  tags: Array<'new' | 'trending' | 'featured'>
  listedAt: IsoDate
  /** Monotonic version; realtime events carry it so stale updates can be dropped. */
  version: number
}

export interface Nft extends NftSummary {
  tokenId: string
  collection: string
  creator: string
  description: string
  details: string
  attributes: string[]
  rating: number
  reviewsCount: number
  editions: NftEdition[]
  gallery: string[]
}

export const NFT_SORTS = ['recent', 'price-asc', 'price-desc', 'name'] as const
export type NftSort = (typeof NFT_SORTS)[number]

export const NFT_TABS = ['all', 'new', 'trending'] as const
export type NftTab = (typeof NFT_TABS)[number]

export interface NftListParams {
  q?: string
  category?: NftCategory[]
  network?: Network[]
  minPrice?: EthAmount
  maxPrice?: EthAmount
  sort?: NftSort
  tab?: NftTab
  page?: number
  pageSize?: number
}

export interface Paginated<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface FacetCount<T extends string> {
  value: T
  count: number
}

export interface CatalogFacets {
  categories: FacetCount<NftCategory>[]
  networks: FacetCount<Network>[]
  priceRange: { min: EthAmount; max: EthAmount }
}

// ---------- Session ----------

export interface SessionUser {
  id: string
  name: string
  username: string
  email: string
  avatarUrl: string | null
}

export interface Session {
  user: SessionUser
  accessToken: string
  expiresAt: IsoDate
}

/** POST /auth/login */
export interface LoginRequest {
  email: string
  password: string
}

/** POST /auth/signup */
export interface SignupRequest {
  username: string
  email: string
  password: string
}

// ---------- Realtime ----------

export interface RealtimeEnvelope<TType extends string, TPayload> {
  /** Stable event id — duplicates with the same id must be ignored. */
  id: string
  type: TType
  /** Affected resource. */
  resource: { kind: 'nft' | 'order'; id: string }
  /** Resource version after this change; older-or-equal versions must not be applied. */
  version: number
  occurredAt: IsoDate
  payload: TPayload
}

export type NftUpdatedEvent = RealtimeEnvelope<
  'nft.updated',
  Pick<Nft, 'id' | 'price' | 'compareAtPrice' | 'editions' | 'version'>
>
