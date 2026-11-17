import { setupWorker } from 'msw/browser'

import type { Nft } from '@/lib/api/contracts'

import { mockConfig, SCENARIOS, isScenario, type ScenarioName } from './config'
import { db } from './db'
import { handlers } from './handlers'
import { realtimeStats } from './handlers/realtime'
import { resetNetworkState } from './http-utils'
import { replayOrderEvent, settleDueOrders, settlementControl, startSettlementLoop } from './orders'

export const worker = setupWorker(...handlers)

/**
 * Control surface for demos and Playwright. It changes the *mock server* state;
 * the app only ever observes the effects through REST responses and Socket.IO events.
 */
const controls = {
  scenarios: SCENARIOS,
  get scenario() {
    return mockConfig.scenario
  },
  setScenario(name: ScenarioName) {
    if (!isScenario(name)) throw new Error(`Unknown scenario: ${name}`)
    mockConfig.setScenario(name)
    resetNetworkState()
  },
  reset() {
    db.reset()
    settlementControl.resume()
    mockConfig.setScenario('default')
    resetNetworkState()
  },
  /** Expires every active session now (next authenticated call gets SESSION_EXPIRED). */
  expireSessions() {
    db.sessions.expireAll()
  },
  /** Live Socket.IO connections (tests wait for > 0 before emitting events). */
  realtimeConnections() {
    return realtimeStats.connections
  },
  /** Live sockets authenticated as some user (private events need one). */
  authenticatedRealtimeConnections() {
    return realtimeStats.authenticated
  },
  /** Drops every socket; clients reconnect on their own (network interruption). */
  disconnectRealtime() {
    realtimeStats.disconnectAll()
  },
  /** Freezes / resumes the simulated chain, to keep orders pending deterministically. */
  pauseSettlement() {
    settlementControl.pause()
  },
  resumeSettlement() {
    settlementControl.resume()
    settleDueOrders()
  },
  /** Re-emits the last order.updated (duplicate), or a copy with an older version (stale). */
  replayOrderEvent(orderId: string, version?: number) {
    return replayOrderEvent(orderId, version)
  },
  /** All order ids (tests assert no duplicate purchase was created). */
  orderIds() {
    return db.orders.all().map((r) => r.order.id)
  },
  getOrder(id: string) {
    return db.orders.find(id)?.order
  },
  getNft(id: string) {
    return db.nfts.find(id)
  },
  updateNft(id: string, patch: Partial<Pick<Nft, 'compareAtPrice' | 'editions'>>) {
    return db.nfts.update(id, patch)
  },
}

declare global {
  interface Window {
    __mocks?: typeof controls
  }
}

export async function startMocking() {
  window.__mocks = controls
  startSettlementLoop()
  await worker.start({
    serviceWorker: { url: '/mockServiceWorker.js' },
    // Assets and other HTTP pass through silently; an unmatched WebSocket means the
    // realtime mock isn't wired, so it is surfaced as a warning.
    onUnhandledRequest: (request, print) => {
      if (request.url.startsWith('ws')) print.warning()
    },
    quiet: import.meta.env.PROD,
  })
}
