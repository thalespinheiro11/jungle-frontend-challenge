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
  | 'COUPON_INVALID'
  | 'COUPON_EXPIRED'
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
  /** Most recent reviews (the full count is `reviewsCount`). */
  reviews: NftReview[]
  editions: NftEdition[]
  gallery: string[]
  /** Shortened contract address shown in the details tab, e.g. "0x7A42...19E8". */
  contractAddress: string
}

export interface NftReview {
  id: string
  author: string
  rating: number
  comment: string
  createdAt: IsoDate
}

// ---------- Favorites ----------

/** GET /me/favorites — the signed-in user's favorites, most recent first. */
export interface FavoriteList {
  items: NftSummary[]
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

// ---------- Cart & quote ----------

/**
 * The cart lives server-side for everyone: authenticated users own one cart; visitors use a
 * guest cart identified by the `X-Cart-Id` header, merged into the user's cart at login.
 * Every cart response carries a fresh quote (current prices, availability, coupon, fees),
 * so the UI never computes money on its own.
 */
export interface CartLine {
  id: string
  nftId: string
  editionId: EditionId
  editionLabel: string
  name: string
  tokenId: string
  image: string
  imageAlt: string
  /** Current unit price for the edition. */
  unitPrice: EthAmount
  quantity: number
  /** Units still purchasable (edition availability capped by the per-order limit). */
  maxQuantity: number
  lineTotal: EthAmount
  /** Set when the price changed since the user added / last acknowledged it. */
  priceChange: { from: EthAmount; to: EthAmount } | null
  /** Availability problem that blocks checkout until the user adjusts the line. */
  issue: 'sold_out' | 'insufficient' | null
}

export interface CartCoupon {
  code: string
  label: string
}

export interface CartSummary {
  itemCount: number
  subtotal: EthAmount
  discount: EthAmount
  networkFee: EthAmount
  total: EthAmount
}

export interface Cart {
  id: string
  /** Increments on every change; lets the client ignore out-of-order responses. */
  version: number
  lines: CartLine[]
  coupon: CartCoupon | null
  summary: CartSummary
  /** True when some line has a price change or availability issue to resolve. */
  needsReview: boolean
  updatedAt: IsoDate
}

export interface AddCartItemRequest {
  nftId: string
  editionId: EditionId
  quantity: number
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
