/**
 * Per-user checkout persistence in sessionStorage (tab-scoped, cleared with the tab):
 * - attempt: the Idempotency-Key of the current purchase attempt, the payload fingerprint it
 *   was used with, and the order id once known. Reusing it after a timeout, a double click or
 *   a refresh can only ever return the same order.
 * - draft: form values, so an expired session during checkout resumes with the data filled.
 */
export interface CheckoutAttempt {
  key: string
  fingerprint: string
  orderId?: string
}

const attemptKey = (userId: string) => `kurio:checkout-attempt:${userId}`
const draftKey = (userId: string) => `kurio:checkout-draft:${userId}`

function read<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null) sessionStorage.removeItem(key)
    else sessionStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage unavailable: idempotency still holds within this page via memory
  }
}

export const attemptStore = {
  get: (userId: string) => read<CheckoutAttempt>(attemptKey(userId)),
  set: (userId: string, attempt: CheckoutAttempt) => write(attemptKey(userId), attempt),
  clear: (userId: string) => write(attemptKey(userId), null),
}

export const draftStore = {
  get: <T>(userId: string) => read<T>(draftKey(userId)),
  set: (userId: string, draft: unknown) => write(draftKey(userId), draft),
  clear: (userId: string) => write(draftKey(userId), null),
}
