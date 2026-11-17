import { delay, HttpResponse } from 'msw'

import type { ApiErrorBody, ApiErrorCode } from '@/lib/api/contracts'

import { mockConfig } from './config'

export function apiError(
  status: number,
  code: ApiErrorCode,
  message: string,
  fieldErrors?: Record<string, string>,
) {
  return HttpResponse.json<ApiErrorBody>({ error: { code, message, fieldErrors } }, { status })
}

/** Stable 32-bit hash of a string (FNV-1a) used to derive deterministic latency. */
function hash(input: string) {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

const attempts = new Map<string, number>()

/**
 * Applies the active scenario's network conditions to a request.
 * Returns a Response to short-circuit the handler (failure), or undefined to continue.
 */
export async function applyNetwork(request: Request, endpoint: string): Promise<Response | undefined> {
  const scenario = mockConfig.scenario

  if (scenario === 'offline') return HttpResponse.error()

  if (scenario === 'slow-network') {
    // 400–2000ms, derived from the URL: different filters resolve at different times,
    // which reproduces out-of-order responses deterministically.
    await delay(400 + (hash(request.url) % 1600))
  } else {
    await delay(import.meta.env.MODE === 'test' ? 0 : 120)
  }

  if (scenario === 'server-error' && endpoint === 'catalog') {
    const count = (attempts.get(endpoint) ?? 0) + 1
    attempts.set(endpoint, count)
    if (count <= 2) return apiError(503, 'TRANSIENT', 'Serviço temporariamente indisponível.')
  }

  return undefined
}

export function resetNetworkState() {
  attempts.clear()
}
