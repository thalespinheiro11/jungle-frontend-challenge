/**
 * Shape of `window.__mocks` (src/mocks/browser.ts) as seen from Playwright `page.evaluate`.
 * Kept minimal and structural so the e2e project doesn't compile the app sources.
 */
interface MockEdition {
  id: string
  label: string
  price: string
  available: number
}

interface MockNft {
  id: string
  price: string
  editions: MockEdition[]
  version: number
}

interface Window {
  __mocks?: {
    scenario: string
    setScenario(name: string): void
    reset(): void
    expireSessions(): void
    getNft(id: string): MockNft | undefined
    updateNft(id: string, patch: { editions?: MockEdition[]; compareAtPrice?: string | null }): MockNft | undefined
  }
}
