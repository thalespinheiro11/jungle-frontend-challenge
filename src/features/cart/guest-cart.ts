/**
 * Guest cart id. Visitors get a server-side cart addressed by this id (sent as X-Cart-Id),
 * so the cart survives refreshes and can be merged into the user's cart at login.
 */
const KEY = 'kurio:guest-cart-id'
let memory: string | null = null

export const guestCart = {
  get(): string | null {
    try {
      return localStorage.getItem(KEY) ?? memory
    } catch {
      return memory
    }
  },
  ensure(): string {
    const existing = guestCart.get()
    if (existing) return existing
    const id = `guest_${crypto.randomUUID()}`
    memory = id
    try {
      localStorage.setItem(KEY, id)
    } catch {
      // private mode: in-memory id for this tab
    }
    return id
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
