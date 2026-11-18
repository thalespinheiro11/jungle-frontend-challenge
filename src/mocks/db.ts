import type {
  CheckoutQuote,
  EditionId,
  Nft,
  NftUpdatedEvent,
  Order,
  OrderUpdatedEvent,
  Wallet,
  WalletConnection,
  WalletList,
} from '@/lib/api/contracts'

import { buildNftFixtures, minAvailablePrice } from './fixtures/nfts'
import { buildUserFixtures, buildWalletFixtures, type MockUser } from './fixtures/users'

/**
 * In-memory mock database, persisted to localStorage so refreshes keep state.
 * `reset()` restores the seeded fixtures exactly. Mutations publish realtime events,
 * which the Socket.IO handler forwards to connected clients — REST and events stay in sync.
 */

const STORAGE_KEY = 'kurio:mocks:db'
const SCHEMA_VERSION = 8

export const SESSION_TTL_MS = 30 * 60_000

export interface MockSession {
  token: string
  userId: string
  createdAt: string
  expiresAt: string
}

interface DbState {
  schema: number
  nfts: Record<string, Nft>
  users: Record<string, MockUser>
  sessions: Record<string, MockSession>
  /** userId → NFT ids, most recent first. */
  favorites: Record<string, string[]>
  carts: Record<string, MockCart>
  wallets: Record<string, WalletList>
  connections: Record<string, WalletConnection & { userId: string }>
  quotes: Record<string, { quote: CheckoutQuote; userId: string }>
  orders: Record<string, MockOrder>
  /** `${userId}:${idempotencyKey}` → order id + request fingerprint. */
  idempotency: Record<string, { orderId: string; fingerprint: string }>
  newsletter: string[]
}

export interface MockOrder {
  order: Order
  userId: string
  /** When the simulated chain settles the order, and with which outcome. */
  settleAt: string
  outcome: 'confirmed' | 'declined'
}

export interface MockCartLine {
  id: string
  nftId: string
  editionId: EditionId
  quantity: number
  /** Unit price the user last saw (at add time or last acknowledgement). */
  seenUnitPrice: string
}

export interface MockCart {
  id: string
  /** null for guest carts. */
  ownerId: string | null
  version: number
  lines: MockCartLine[]
  couponCode: string | null
  updatedAt: string
}

export type DbEvent = NftUpdatedEvent | OrderUpdatedEvent
/** `userId` set → private event, delivered only to that user's sockets. */
export interface EventAudience {
  userId?: string
}
type Listener = (event: DbEvent, audience: EventAudience) => void

function seed(): DbState {
  return {
    schema: SCHEMA_VERSION,
    nfts: Object.fromEntries(buildNftFixtures().map((nft) => [nft.id, nft])),
    users: Object.fromEntries(buildUserFixtures().map((user) => [user.id, user])),
    sessions: {},
    favorites: {},
    carts: {},
    wallets: buildWalletFixtures(),
    connections: {},
    quotes: {},
    orders: {},
    idempotency: {},
    newsletter: [],
  }
}

function load(): DbState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as DbState
      if (parsed.schema === SCHEMA_VERSION) return parsed
    }
  } catch {
    // corrupted or unavailable storage — reseed
  }
  return seed()
}

let state = load()
const listeners = new Set<Listener>()

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // quota / private mode: state stays in memory for this tab
  }
}

export function publish(event: DbEvent, audience: EventAudience = {}) {
  listeners.forEach((listener) => listener(event, audience))
}

export const db = {
  nfts: {
    all: (): Nft[] => Object.values(state.nfts),
    find: (id: string): Nft | undefined => state.nfts[id],
    /** Applies a price/availability change, bumps the version and emits `nft.updated`. */
    update(id: string, patch: Partial<Pick<Nft, 'compareAtPrice' | 'editions'>>): Nft | undefined {
      const current = state.nfts[id]
      if (!current) return undefined
      const editions = patch.editions ?? current.editions
      const next: Nft = {
        ...current,
        ...patch,
        editions,
        price: minAvailablePrice(editions),
        version: current.version + 1,
      }
      state.nfts[id] = next
      persist()
      publish({
        id: crypto.randomUUID(),
        type: 'nft.updated',
        resource: { kind: 'nft', id },
        version: next.version,
        occurredAt: new Date().toISOString(),
        payload: {
          id,
          price: next.price,
          compareAtPrice: next.compareAtPrice,
          editions: next.editions,
          version: next.version,
        },
      })
      return next
    },
  },

  users: {
    find: (id: string): MockUser | undefined => state.users[id],
    findByEmail: (email: string) =>
      Object.values(state.users).find((u) => u.email.toLowerCase() === email.toLowerCase()),
    findByUsername: (username: string) =>
      Object.values(state.users).find((u) => u.username.toLowerCase() === username.toLowerCase()),
    /** Applies changes to a user (persisted). */
    update(id: string, change: (user: MockUser) => void): MockUser | undefined {
      const user = state.users[id]
      if (!user) return undefined
      change(user)
      user.updatedAt = new Date().toISOString()
      persist()
      return user
    },
    insert(user: MockUser) {
      state.users[user.id] = user
      persist()
      return user
    },
  },

  sessions: {
    find: (token: string): MockSession | undefined => state.sessions[token],
    create(userId: string): MockSession {
      const now = Date.now()
      const session: MockSession = {
        token: `tok_${crypto.randomUUID()}`,
        userId,
        createdAt: new Date(now).toISOString(),
        expiresAt: new Date(now + SESSION_TTL_MS).toISOString(),
      }
      state.sessions[session.token] = session
      persist()
      return session
    },
    revoke(token: string) {
      delete state.sessions[token]
      persist()
    },
    /** Test/demo control: makes every active session expire now. */
    expireAll() {
      const past = new Date(Date.now() - 1_000).toISOString()
      for (const session of Object.values(state.sessions)) session.expiresAt = past
      persist()
    },
  },

  favorites: {
    list: (userId: string): string[] => state.favorites[userId] ?? [],
    add(userId: string, nftId: string) {
      const current = state.favorites[userId] ?? []
      state.favorites[userId] = [nftId, ...current.filter((id) => id !== nftId)]
      persist()
    },
    remove(userId: string, nftId: string) {
      state.favorites[userId] = (state.favorites[userId] ?? []).filter((id) => id !== nftId)
      persist()
    },
  },

  carts: {
    find: (id: string): MockCart | undefined => state.carts[id],
    /** Returns the cart, creating an empty one on first use. */
    ensure(id: string, ownerId: string | null): MockCart {
      state.carts[id] ??= {
        id,
        ownerId,
        version: 0,
        lines: [],
        couponCode: null,
        updatedAt: new Date().toISOString(),
      }
      return state.carts[id]
    },
    /** Applies a change and bumps the version (persisted). */
    update(cart: MockCart, change: (cart: MockCart) => void): MockCart {
      change(cart)
      cart.version += 1
      cart.updatedAt = new Date().toISOString()
      state.carts[cart.id] = cart
      persist()
      return cart
    },
    remove(id: string) {
      delete state.carts[id]
      persist()
    },
  },

  wallets: {
    list: (userId: string): WalletList => state.wallets[userId] ?? { primary: null, secondary: null },
    save(userId: string, wallet: Wallet) {
      const current = state.wallets[userId] ?? { primary: null, secondary: null }
      state.wallets[userId] = { ...current, [wallet.slot]: wallet }
      persist()
      return wallet
    },
  },

  connections: {
    find: (id: string) => state.connections[id],
    create(userId: string, connection: WalletConnection) {
      state.connections[connection.id] = { ...connection, userId }
      persist()
      return connection
    },
    remove(id: string) {
      delete state.connections[id]
      persist()
    },
  },

  quotes: {
    find: (id: string) => state.quotes[id],
    save(userId: string, quote: CheckoutQuote) {
      state.quotes[quote.id] = { quote, userId }
      persist()
      return quote
    },
  },

  orders: {
    find: (id: string): MockOrder | undefined => state.orders[id],
    all: (): MockOrder[] => Object.values(state.orders),
    save(record: MockOrder) {
      state.orders[record.order.id] = record
      persist()
      return record
    },
    idempotency: {
      find: (userId: string, key: string) => state.idempotency[`${userId}:${key}`],
      save(userId: string, key: string, value: { orderId: string; fingerprint: string }) {
        state.idempotency[`${userId}:${key}`] = value
        persist()
      },
    },
  },

  newsletter: {
    has: (email: string) => state.newsletter.includes(email.toLowerCase()),
    add(email: string) {
      state.newsletter.push(email.toLowerCase())
      persist()
    },
  },

  /** Persists in-place changes made to records returned by the accessors. */
  commit() {
    persist()
  },

  subscribe(listener: Listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },

  reset() {
    state = seed()
    persist()
  },
}
