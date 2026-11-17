import Decimal from 'decimal.js'

import type { CheckoutQuote, Order, OrderLine, OrderUpdatedEvent } from '@/lib/api/contracts'

import { checkCoupon, editionOf, toCart, userCartId } from './cart'
import { db, publish, type MockOrder } from './db'

export const QUOTE_TTL_MS = 2 * 60_000
export const SETTLE_DELAY_MS = 2_500

/** Builds a quote from the user's current cart, or explains why it can't be bought now. */
export function buildQuote(
  userId: string,
): { ok: true; quote: CheckoutQuote } | { ok: false; status: number; code: 'VALIDATION_ERROR' | 'OUT_OF_STOCK'; message: string } {
  const mockCart = db.carts.ensure(userCartId(userId), userId)
  const cart = toCart(mockCart)
  if (cart.lines.length === 0) {
    return { ok: false, status: 422, code: 'VALIDATION_ERROR', message: 'Seu carrinho está vazio.' }
  }
  if (cart.lines.some((l) => l.issue)) {
    return {
      ok: false,
      status: 409,
      code: 'OUT_OF_STOCK',
      message: 'Alguns itens do carrinho ficaram indisponíveis. Revise o carrinho.',
    }
  }
  const lines: OrderLine[] = cart.lines.map((l) => ({
    nftId: l.nftId,
    editionId: l.editionId,
    editionLabel: l.editionLabel,
    name: l.name,
    tokenId: l.tokenId,
    image: l.image,
    quantity: l.quantity,
    unitPrice: l.unitPrice,
    lineTotal: l.lineTotal,
  }))
  const quote: CheckoutQuote = {
    id: `qt_${crypto.randomUUID().slice(0, 12)}`,
    lines,
    coupon: cart.coupon,
    summary: cart.summary,
    cartVersion: mockCart.version,
    expiresAt: new Date(Date.now() + QUOTE_TTL_MS).toISOString(),
  }
  db.quotes.save(userId, quote)
  return { ok: true, quote }
}

/** Why a quote can no longer be honoured (null = still valid). */
export function quoteProblem(userId: string, quote: CheckoutQuote): 'expired' | 'price' | 'stock' | null {
  if (Date.parse(quote.expiresAt) <= Date.now()) return 'expired'
  for (const line of quote.lines) {
    const found = editionOf(line.nftId, line.editionId)
    if (!found || found.edition.available < line.quantity) return 'stock'
    if (!new Decimal(found.edition.price).eq(line.unitPrice)) return 'price'
  }
  if (quote.coupon && !checkCoupon(quote.coupon.code).ok) return 'price'
  const cart = db.carts.ensure(userCartId(userId), userId)
  if (cart.version !== quote.cartVersion) return 'price'
  return null
}

function adjustStock(order: Order, direction: -1 | 1) {
  for (const line of order.lines) {
    const nft = db.nfts.find(line.nftId)
    if (!nft) continue
    db.nfts.update(nft.id, {
      editions: nft.editions.map((e) =>
        e.id === line.editionId ? { ...e, available: Math.max(0, e.available + direction * line.quantity) } : e,
      ),
    })
  }
}

/** Reserves stock for a new pending order (emits nft.updated for each affected NFT). */
export const reserveStock = (order: Order) => adjustStock(order, -1)

export function orderEvent(order: Order): OrderUpdatedEvent {
  return {
    id: crypto.randomUUID(),
    type: 'order.updated',
    resource: { kind: 'order', id: order.id },
    version: order.version,
    occurredAt: new Date().toISOString(),
    payload: {
      id: order.id,
      status: order.status,
      version: order.version,
      txHash: order.txHash,
      failureReason: order.failureReason,
    },
  }
}

/** Last event emitted per order — lets tests replay duplicates / stale versions. */
export const lastOrderEvents = new Map<string, { event: OrderUpdatedEvent; userId: string }>()

function emit(record: MockOrder) {
  const event = orderEvent(record.order)
  lastOrderEvents.set(record.order.id, { event, userId: record.userId })
  publish(event, { userId: record.userId })
}

function fakeTxHash() {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return `0x${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`
}

/** Removes exactly the purchased quantities from the buyer's cart. */
function removePurchasedFromCart(record: MockOrder) {
  const cart = db.carts.ensure(userCartId(record.userId), record.userId)
  db.carts.update(cart, (c) => {
    for (const bought of record.order.lines) {
      const line = c.lines.find((l) => l.nftId === bought.nftId && l.editionId === bought.editionId)
      if (line) line.quantity -= bought.quantity
    }
    c.lines = c.lines.filter((l) => l.quantity > 0)
    if (c.lines.length === 0) c.couponCode = null
  })
}

// Persisted like the scenario, so a page reload keeps a paused chain paused (deterministic tests).
const PAUSE_KEY = 'kurio:mocks:settlement-paused'
function isPaused() {
  try {
    return localStorage.getItem(PAUSE_KEY) === '1'
  } catch {
    return false
  }
}
function setPaused(value: boolean) {
  try {
    if (value) localStorage.setItem(PAUSE_KEY, '1')
    else localStorage.removeItem(PAUSE_KEY)
  } catch {
    // ignore
  }
}
export const settlementControl = {
  pause: () => setPaused(true),
  resume: () => setPaused(false),
}

/** Settles every pending order whose time has come. Safe to call repeatedly (terminal states). */
export function settleDueOrders(now = Date.now()) {
  if (isPaused()) return
  for (const record of db.orders.all()) {
    const { order } = record
    if (order.status !== 'pending' || Date.parse(record.settleAt) > now) continue
    order.status = record.outcome
    order.version += 1
    order.settledAt = new Date(now).toISOString()
    if (record.outcome === 'confirmed') {
      order.txHash = fakeTxHash()
      removePurchasedFromCart(record)
    } else {
      order.failureReason = 'Pagamento recusado pela carteira. Nenhum valor foi cobrado.'
      adjustStock(order, 1)
    }
    db.commit()
    emit(record)
  }
}

let loop: ReturnType<typeof setInterval> | null = null
/** The "chain": a ticker that settles due orders. Deadlines are persisted, so a reload resumes. */
export function startSettlementLoop() {
  loop ??= setInterval(() => settleDueOrders(), 400)
}

export function replayOrderEvent(orderId: string, overrideVersion?: number) {
  const last = lastOrderEvents.get(orderId)
  if (!last) return false
  const event =
    overrideVersion === undefined
      ? last.event // exact duplicate (same id)
      : { ...last.event, id: crypto.randomUUID(), version: overrideVersion, payload: { ...last.event.payload, version: overrideVersion, status: 'pending' as const } }
  publish(event, { userId: last.userId })
  return true
}
