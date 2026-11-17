import Decimal from 'decimal.js'

import type { Cart, CartLine } from '@/lib/api/contracts'

import { authenticate } from './auth'
import { db, type MockCart } from './db'
import { apiError } from './http-utils'

/** Per-order cap per line, on top of edition availability. Mirrors the detail page. */
export const MAX_PER_LINE = 10
export const NETWORK_FEE = '0.016'
export const GUEST_CART_HEADER = 'X-Cart-Id'

interface CouponRule {
  label: string
  kind: 'percent' | 'fixed'
  value: string
  expiresAt?: string
}

/** Demo coupons (listed in the README). */
export const COUPONS: Record<string, CouponRule> = {
  KURIO10: { label: 'KURIO10 · 10% de desconto', kind: 'percent', value: '0.10' },
  LANCAMENTO: { label: 'LANCAMENTO · 0.05 ETH de desconto', kind: 'fixed', value: '0.05' },
  GENESIS2025: {
    label: 'GENESIS2025',
    kind: 'percent',
    value: '0.20',
    expiresAt: '2026-01-31T23:59:59.000Z',
  },
}

export const userCartId = (userId: string) => `cart_${userId}`
const GUEST_ID = /^guest_[a-zA-Z0-9-]{8,64}$/

/**
 * Resolves the caller's cart: the user's cart with a valid session, otherwise the guest cart
 * named by the X-Cart-Id header. Guest ids can never address a user's cart.
 */
export function resolveCart(request: Request): { ok: true; cart: MockCart } | { ok: false; response: Response } {
  if (request.headers.get('Authorization')) {
    const auth = authenticate(request)
    if (!auth.ok) return auth
    return { ok: true, cart: db.carts.ensure(userCartId(auth.user.id), auth.user.id) }
  }
  const guestId = request.headers.get(GUEST_CART_HEADER)
  if (!guestId || !GUEST_ID.test(guestId)) {
    return {
      ok: false,
      response: apiError(400, 'VALIDATION_ERROR', 'Carrinho de visitante não informado.'),
    }
  }
  return { ok: true, cart: db.carts.ensure(guestId, null) }
}

export function editionOf(nftId: string, editionId: string) {
  const nft = db.nfts.find(nftId)
  const edition = nft?.editions.find((e) => e.id === editionId)
  return nft && edition ? { nft, edition } : null
}

export function maxForEdition(available: number) {
  return Math.max(0, Math.min(available, MAX_PER_LINE))
}

/** Builds the API representation: current prices, availability issues and the quote. */
export function toCart(cart: MockCart): Cart {
  const lines: CartLine[] = []
  for (const line of cart.lines) {
    const found = editionOf(line.nftId, line.editionId)
    if (!found) continue
    const { nft, edition } = found
    const maxQuantity = maxForEdition(edition.available)
    const unitPrice = edition.price
    lines.push({
      id: line.id,
      nftId: nft.id,
      editionId: edition.id,
      editionLabel: edition.label,
      name: nft.name,
      tokenId: nft.tokenId,
      image: nft.image,
      imageAlt: nft.imageAlt,
      unitPrice,
      quantity: line.quantity,
      maxQuantity,
      lineTotal: new Decimal(unitPrice).times(line.quantity).toString(),
      priceChange: new Decimal(line.seenUnitPrice).eq(unitPrice)
        ? null
        : { from: line.seenUnitPrice, to: unitPrice },
      issue: maxQuantity === 0 ? 'sold_out' : line.quantity > maxQuantity ? 'insufficient' : null,
    })
  }

  // Sold-out lines can't be bought, so they don't count towards the quote.
  const subtotal = lines
    .filter((l) => l.issue !== 'sold_out')
    .reduce((sum, l) => sum.plus(l.lineTotal), new Decimal(0))

  const rule = cart.couponCode ? COUPONS[cart.couponCode] : undefined
  let discount = new Decimal(0)
  if (rule && subtotal.gt(0)) {
    discount =
      rule.kind === 'percent'
        ? subtotal.times(rule.value).toDecimalPlaces(6, Decimal.ROUND_DOWN)
        : Decimal.min(rule.value, subtotal)
  }
  const networkFee = subtotal.gt(0) ? new Decimal(NETWORK_FEE) : new Decimal(0)

  return {
    id: cart.id,
    version: cart.version,
    lines,
    coupon: rule && cart.couponCode ? { code: cart.couponCode, label: rule.label } : null,
    summary: {
      itemCount: lines.reduce((n, l) => n + l.quantity, 0),
      subtotal: subtotal.toString(),
      discount: discount.toString(),
      networkFee: networkFee.toString(),
      total: subtotal.minus(discount).plus(networkFee).toString(),
    },
    needsReview: lines.some((l) => l.priceChange || l.issue),
    updatedAt: cart.updatedAt,
  }
}

/** Validates a coupon code, returning the normalized code or an error response. */
export function checkCoupon(raw: string): { ok: true; code: string } | { ok: false; response: Response } {
  const code = raw.trim().toUpperCase()
  const rule = COUPONS[code]
  if (!rule) {
    return { ok: false, response: apiError(422, 'COUPON_INVALID', 'Cupom inválido.', { code: 'Cupom inválido.' }) }
  }
  if (rule.expiresAt && Date.parse(rule.expiresAt) < Date.now()) {
    const date = new Date(rule.expiresAt).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
    const message = `Este cupom expirou em ${date}.`
    return { ok: false, response: apiError(422, 'COUPON_EXPIRED', message, { code: message }) }
  }
  return { ok: true, code }
}
