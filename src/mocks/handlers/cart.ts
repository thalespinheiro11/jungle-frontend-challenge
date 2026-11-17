import { http, HttpResponse } from 'msw'

import type { AddCartItemRequest, Cart } from '@/lib/api/contracts'

import { authenticate } from '../auth'
import { checkCoupon, editionOf, maxForEdition, resolveCart, toCart, userCartId } from '../cart'
import { db } from '../db'
import { apiError, applyNetwork } from '../http-utils'

const API = '*/api'

const ok = (cart: Parameters<typeof toCart>[0]) => HttpResponse.json<Cart>(toCart(cart))

function stockError(max: number) {
  return max === 0
    ? apiError(409, 'OUT_OF_STOCK', 'Esta edição está esgotada.')
    : apiError(
        409,
        'OUT_OF_STOCK',
        max === 1
          ? 'Só resta 1 unidade disponível desta edição.'
          : `Só restam ${max} unidades disponíveis desta edição.`,
      )
}

const isQuantity = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 1

export const cartHandlers = [
  http.get(`${API}/cart`, async ({ request }) => {
    const failure = await applyNetwork(request, 'cart')
    if (failure) return failure
    const resolved = resolveCart(request)
    if (!resolved.ok) return resolved.response
    return ok(resolved.cart)
  }),

  http.post<never, AddCartItemRequest>(`${API}/cart/items`, async ({ request }) => {
    const failure = await applyNetwork(request, 'cart')
    if (failure) return failure
    const resolved = resolveCart(request)
    if (!resolved.ok) return resolved.response

    const body = (await request.json().catch(() => null)) as AddCartItemRequest | null
    if (!body || !isQuantity(body.quantity)) {
      return apiError(422, 'VALIDATION_ERROR', 'Quantidade inválida.')
    }
    const found = editionOf(body.nftId, body.editionId)
    if (!found) return apiError(404, 'NOT_FOUND', 'NFT ou edição não encontrada.')

    const max = maxForEdition(found.edition.available)
    const cart = resolved.cart
    const existing = cart.lines.find((l) => l.nftId === body.nftId && l.editionId === body.editionId)
    const quantity = (existing?.quantity ?? 0) + body.quantity
    if (quantity > max) return stockError(max)

    db.carts.update(cart, (c) => {
      if (existing) {
        existing.quantity = quantity
        existing.seenUnitPrice = found.edition.price // re-adding acknowledges the price
      } else {
        c.lines.push({
          id: `line_${crypto.randomUUID().slice(0, 8)}`,
          nftId: body.nftId,
          editionId: body.editionId,
          quantity,
          seenUnitPrice: found.edition.price,
        })
      }
    })
    return ok(cart)
  }),

  http.patch<{ lineId: string }, { quantity: number }>(
    `${API}/cart/items/:lineId`,
    async ({ request, params }) => {
      const failure = await applyNetwork(request, 'cart')
      if (failure) return failure
      const resolved = resolveCart(request)
      if (!resolved.ok) return resolved.response

      const cart = resolved.cart
      const line = cart.lines.find((l) => l.id === params.lineId)
      if (!line) return apiError(404, 'NOT_FOUND', 'Item não está mais no carrinho.')
      const body = (await request.json().catch(() => null)) as { quantity?: unknown } | null
      if (!body || !isQuantity(body.quantity)) {
        return apiError(422, 'VALIDATION_ERROR', 'Quantidade inválida.')
      }
      const found = editionOf(line.nftId, line.editionId)
      const max = maxForEdition(found?.edition.available ?? 0)
      // Lowering the quantity is always allowed (it is how users resolve "insufficient").
      if (body.quantity > line.quantity && body.quantity > max) return stockError(max)

      const quantity = body.quantity
      db.carts.update(cart, () => {
        line.quantity = quantity
      })
      return ok(cart)
    },
  ),

  // Idempotent: removing a line that is already gone returns the current cart.
  http.delete<{ lineId: string }>(`${API}/cart/items/:lineId`, async ({ request, params }) => {
    const failure = await applyNetwork(request, 'cart')
    if (failure) return failure
    const resolved = resolveCart(request)
    if (!resolved.ok) return resolved.response

    const cart = resolved.cart
    if (cart.lines.some((l) => l.id === params.lineId)) {
      db.carts.update(cart, (c) => {
        c.lines = c.lines.filter((l) => l.id !== params.lineId)
      })
    }
    return ok(cart)
  }),

  /** Marks current prices as seen (the user reviewed the price changes). */
  http.post(`${API}/cart/acknowledge`, async ({ request }) => {
    const failure = await applyNetwork(request, 'cart')
    if (failure) return failure
    const resolved = resolveCart(request)
    if (!resolved.ok) return resolved.response

    db.carts.update(resolved.cart, (c) => {
      for (const line of c.lines) {
        const found = editionOf(line.nftId, line.editionId)
        if (found) line.seenUnitPrice = found.edition.price
      }
    })
    return ok(resolved.cart)
  }),

  http.put<never, { code?: string }>(`${API}/cart/coupon`, async ({ request }) => {
    const failure = await applyNetwork(request, 'cart')
    if (failure) return failure
    const resolved = resolveCart(request)
    if (!resolved.ok) return resolved.response

    const body = (await request.json().catch(() => null)) as { code?: string } | null
    if (!body?.code?.trim()) {
      return apiError(422, 'VALIDATION_ERROR', 'Informe um cupom.', { code: 'Informe um cupom.' })
    }
    const coupon = checkCoupon(body.code)
    if (!coupon.ok) return coupon.response
    db.carts.update(resolved.cart, (c) => {
      c.couponCode = coupon.code
    })
    return ok(resolved.cart)
  }),

  http.delete(`${API}/cart/coupon`, async ({ request }) => {
    const failure = await applyNetwork(request, 'cart')
    if (failure) return failure
    const resolved = resolveCart(request)
    if (!resolved.ok) return resolved.response
    db.carts.update(resolved.cart, (c) => {
      c.couponCode = null
    })
    return ok(resolved.cart)
  }),

  /**
   * Moves a guest cart into the signed-in user's cart (called right after login/signup).
   * Quantities are summed and capped by availability; the guest cart is deleted.
   * Idempotent: merging an already-merged (missing) guest cart is a no-op.
   */
  http.post<never, { guestCartId?: string }>(`${API}/cart/merge`, async ({ request }) => {
    const failure = await applyNetwork(request, 'cart')
    if (failure) return failure
    const auth = authenticate(request)
    if (!auth.ok) return auth.response

    const body = (await request.json().catch(() => null)) as { guestCartId?: string } | null
    const userCart = db.carts.ensure(userCartId(auth.user.id), auth.user.id)
    const guest = body?.guestCartId ? db.carts.find(body.guestCartId) : undefined
    if (!guest || guest.ownerId !== null) return ok(userCart)

    db.carts.update(userCart, (c) => {
      for (const gl of guest.lines) {
        const max = maxForEdition(editionOf(gl.nftId, gl.editionId)?.edition.available ?? 0)
        const existing = c.lines.find((l) => l.nftId === gl.nftId && l.editionId === gl.editionId)
        if (existing) {
          existing.quantity = Math.max(1, Math.min(existing.quantity + gl.quantity, Math.max(max, existing.quantity)))
        } else {
          c.lines.push({ ...gl })
        }
      }
      c.couponCode ??= guest.couponCode
    })
    db.carts.remove(guest.id)
    return ok(userCart)
  }),
]
