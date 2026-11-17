import type { Nft, NftUpdatedEvent } from '@/lib/api/contracts'

import { buildNftFixtures, minAvailablePrice } from './fixtures/nfts'
import { buildUserFixtures, type MockUser } from './fixtures/users'

/**
 * In-memory mock database, persisted to localStorage so refreshes keep state.
 * `reset()` restores the seeded fixtures exactly. Mutations publish realtime events,
 * which the Socket.IO handler forwards to connected clients — REST and events stay in sync.
 */

const STORAGE_KEY = 'kurio:mocks:db'
const SCHEMA_VERSION = 3

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
}

type DbEvent = NftUpdatedEvent
type Listener = (event: DbEvent) => void

function seed(): DbState {
  return {
    schema: SCHEMA_VERSION,
    nfts: Object.fromEntries(buildNftFixtures().map((nft) => [nft.id, nft])),
    users: Object.fromEntries(buildUserFixtures().map((user) => [user.id, user])),
    sessions: {},
    favorites: {},
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

function publish(event: DbEvent) {
  listeners.forEach((listener) => listener(event))
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

  subscribe(listener: Listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },

  reset() {
    state = seed()
    persist()
  },
}
