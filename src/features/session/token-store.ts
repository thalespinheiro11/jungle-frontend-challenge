/**
 * Access token persistence. Only the opaque token is stored (never credentials); the user
 * profile is always re-read from GET /session, so a refresh recovers the session from the
 * API instead of trusting local data.
 */
const KEY = 'kurio:access-token'

let memory: string | null = null

export const tokenStore = {
  get(): string | null {
    try {
      return localStorage.getItem(KEY)
    } catch {
      return memory
    }
  },
  set(token: string) {
    memory = token
    try {
      localStorage.setItem(KEY, token)
    } catch {
      // private mode: keep it in memory for this tab
    }
  },
  clear() {
    memory = null
    try {
      localStorage.removeItem(KEY)
    } catch {
      // ignore
    }
  },
}
