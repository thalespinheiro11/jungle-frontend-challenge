/**
 * Mock scenario configuration. Selected by `?scenario=<name>` (persisted) or via
 * `window.__mocks.setScenario(name)`. Every scenario is deterministic: latency is derived
 * from the request, never from Math.random, so runs are reproducible.
 */

export const SCENARIOS = {
  default: 'Respostas rápidas e bem-sucedidas.',
  'empty-catalog': 'Catálogo sem resultados.',
  'slow-network': 'Latência alta e variável (respostas podem chegar fora de ordem).',
  'server-error': 'Catálogo responde 500 nas primeiras 2 tentativas e depois se recupera.',
  offline: 'Todas as chamadas REST falham como erro de rede.',
  'favorites-error': 'Favoritar/desfavoritar responde 503 (teste de rollback otimista).',
  'wallet-rejected': 'A carteira recusa a conexão no pagamento.',
  'payment-declined': 'Pedidos são criados, mas o pagamento é recusado na liquidação.',
  'order-timeout':
    'A criação do pedido responde só depois do timeout do cliente (o pedido existe; o reenvio recupera o mesmo).',
} as const

export type ScenarioName = keyof typeof SCENARIOS

const STORAGE_KEY = 'kurio:mocks:scenario'

export function isScenario(value: unknown): value is ScenarioName {
  return typeof value === 'string' && value in SCENARIOS
}

function read(): ScenarioName {
  try {
    const fromUrl = new URL(window.location.href).searchParams.get('scenario')
    if (isScenario(fromUrl)) {
      localStorage.setItem(STORAGE_KEY, fromUrl)
      return fromUrl
    }
    const stored = localStorage.getItem(STORAGE_KEY)
    if (isScenario(stored)) return stored
  } catch {
    // storage unavailable — fall through to default
  }
  return 'default'
}

let current: ScenarioName = read()

export const mockConfig = {
  get scenario() {
    return current
  },
  setScenario(name: ScenarioName) {
    current = name
    try {
      localStorage.setItem(STORAGE_KEY, name)
    } catch {
      // ignore
    }
  },
}
