import { setupWorker } from 'msw/browser'

import type { Nft } from '@/lib/api/contracts'

import { mockConfig, SCENARIOS, isScenario, type ScenarioName } from './config'
import { db } from './db'
import { handlers } from './handlers'
import { resetNetworkState } from './http-utils'

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
    mockConfig.setScenario('default')
    resetNetworkState()
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
