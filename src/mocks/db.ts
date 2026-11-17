import type { Nft, NftUpdatedEvent } from '@/lib/api/contracts'

import { buildNftFixtures, minAvailablePrice } from './fixtures/nfts'

/**
 * In-memory mock database, persisted to localStorage so refreshes keep state.
 * `reset()` restores the seeded fixtures exactly. Mutations publish realtime events,
 * which the Socket.IO handler forwards to connected clients — REST and events stay in sync.
 */

const STORAGE_KEY = 'kurio:mocks:db'
const SCHEMA_VERSION = 1

interface DbState {
  schema: number
  nfts: Record<string, Nft>
}

type DbEvent = NftUpdatedEvent
type Listener = (event: DbEvent) => void

function seed(): DbState {
  return {
    schema: SCHEMA_VERSION,
    nfts: Object.fromEntries(buildNftFixtures().map((nft) => [nft.id, nft])),
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

  subscribe(listener: Listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },

  reset() {
    state = seed()
    persist()
  },
}
