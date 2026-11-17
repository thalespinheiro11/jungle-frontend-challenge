import { delay, http, HttpResponse } from 'msw'

import { buyerSchema } from '@/features/checkout/schemas'
import { toFieldErrors } from '@/features/session/schemas'
import { walletAddressSchema } from '@/features/wallets/schemas'
import {
  NETWORKS,
  WALLET_PROVIDERS,
  type CheckoutQuote,
  type CreateOrderRequest,
  type Order,
  type StaleQuoteErrorBody,
  type WalletConnection,
  type WalletConnectionRequest,
} from '@/lib/api/contracts'

import { authenticate } from '../auth'
import { mockConfig } from '../config'
import { db } from '../db'
import { apiError, applyNetwork } from '../http-utils'
import { buildQuote, quoteProblem, reserveStock, SETTLE_DELAY_MS, settleDueOrders } from '../orders'

const API = '*/api'
/** Longer than the client's 10s Axios timeout. */
const TIMEOUT_SCENARIO_DELAY_MS = 12_000

export const checkoutHandlers = [
  /** Simulated wallet handshake: approved, or rejected in the `wallet-rejected` scenario. */
  http.post<never, WalletConnectionRequest>(`${API}/wallet-connections`, async ({ request }) => {
    const failure = await applyNetwork(request, 'wallet')
    if (failure) return failure
    const auth = authenticate(request)
    if (!auth.ok) return auth.response

    const body = (await request.json().catch(() => null)) as WalletConnectionRequest | null
    if (
      !body ||
      !walletAddressSchema.safeParse(body.address).success ||
      !(WALLET_PROVIDERS as readonly string[]).includes(body.provider) ||
      !(NETWORKS as readonly string[]).includes(body.network)
    ) {
      return apiError(422, 'VALIDATION_ERROR', 'Dados da carteira inválidos.')
    }
    await delay(600) // the "wallet popup"
    if (mockConfig.scenario === 'wallet-rejected') {
      return apiError(403, 'WALLET_REJECTED', 'A conexão foi recusada na carteira.')
    }
    const connection: WalletConnection = {
      id: `conn_${crypto.randomUUID().slice(0, 10)}`,
      address: body.address,
      provider: body.provider,
      network: body.network,
      connectedAt: new Date().toISOString(),
    }
    return HttpResponse.json(db.connections.create(auth.user.id, connection), { status: 201 })
  }),

  http.delete<{ id: string }>(`${API}/wallet-connections/:id`, async ({ request, params }) => {
    const failure = await applyNetwork(request, 'wallet')
    if (failure) return failure
    const auth = authenticate(request)
    if (!auth.ok) return auth.response
    const connection = db.connections.find(params.id)
    if (connection?.userId === auth.user.id) db.connections.remove(params.id)
    return new HttpResponse(null, { status: 204 })
  }),

  /** Revalidates the user's cart and freezes it into a short-lived quote. */
  http.post(`${API}/checkout/quote`, async ({ request }) => {
    const failure = await applyNetwork(request, 'checkout')
    if (failure) return failure
    const auth = authenticate(request)
    if (!auth.ok) return auth.response

    const result = buildQuote(auth.user.id)
    if (!result.ok) return apiError(result.status, result.code, result.message)
    return HttpResponse.json<CheckoutQuote>(result.quote, { status: 201 })
  }),

  /**
   * Idempotent order creation. Same Idempotency-Key + same payload → the same order (200);
   * same key with a different payload → 409 IDEMPOTENCY_CONFLICT. A stale quote → 409 with
   * the fresh quote, so the user confirms the new values.
   */
  http.post<never, CreateOrderRequest>(`${API}/orders`, async ({ request }) => {
    const failure = await applyNetwork(request, 'orders')
    if (failure) return failure
    const auth = authenticate(request)
    if (!auth.ok) return auth.response
    const userId = auth.user.id

    const key = request.headers.get('Idempotency-Key')
    if (!key || key.length < 8) {
      return apiError(400, 'VALIDATION_ERROR', 'Cabeçalho Idempotency-Key obrigatório.')
    }
    const body = (await request.json().catch(() => null)) as CreateOrderRequest | null
    const buyer = buyerSchema.safeParse(body?.buyer)
    if (!body || !buyer.success) {
      return apiError(
        422,
        'VALIDATION_ERROR',
        'Revise os dados do colecionador.',
        buyer.success ? undefined : toFieldErrors(buyer.error),
      )
    }
    const fingerprint = JSON.stringify({ q: body.quoteId, c: body.connectionId, b: buyer.data })

    const previous = db.orders.idempotency.find(userId, key)
    if (previous) {
      if (previous.fingerprint !== fingerprint) {
        return apiError(409, 'IDEMPOTENCY_CONFLICT', 'Esta tentativa de compra já foi usada com outros dados.')
      }
      const existing = db.orders.find(previous.orderId)
      if (existing) return HttpResponse.json<Order>(existing.order, { status: 200 })
    }

    const stored = db.quotes.find(body.quoteId)
    if (!stored || stored.userId !== userId) return apiError(404, 'NOT_FOUND', 'Cotação não encontrada.')
    const connection = db.connections.find(body.connectionId)
    if (!connection || connection.userId !== userId) {
      return apiError(409, 'CONFLICT', 'Sua carteira foi desconectada. Conecte-a novamente.')
    }

    const problem = quoteProblem(userId, stored.quote)
    if (problem) {
      const fresh = buildQuote(userId)
      if (!fresh.ok) return apiError(fresh.status, fresh.code, fresh.message)
      const code = problem === 'stock' ? 'OUT_OF_STOCK' : problem === 'expired' ? 'QUOTE_EXPIRED' : 'PRICE_CHANGED'
      const message =
        problem === 'stock'
          ? 'A disponibilidade mudou. Revise e confirme novamente.'
          : problem === 'expired'
            ? 'A cotação expirou. Confira os valores atualizados e confirme novamente.'
            : 'Os valores mudaram desde a revisão. Confira e confirme novamente.'
      return HttpResponse.json<StaleQuoteErrorBody>({ error: { code, message }, quote: fresh.quote }, { status: 409 })
    }

    const now = Date.now()
    const order: Order = {
      id: `ord_${crypto.randomUUID().slice(0, 10)}`,
      status: 'pending',
      version: 1,
      createdAt: new Date(now).toISOString(),
      settledAt: null,
      txHash: null,
      failureReason: null,
      wallet: { address: connection.address, provider: connection.provider, network: connection.network },
      buyer: buyer.data,
      lines: stored.quote.lines,
      coupon: stored.quote.coupon,
      summary: stored.quote.summary,
    }
    db.orders.save({
      order,
      userId,
      settleAt: new Date(now + SETTLE_DELAY_MS).toISOString(),
      outcome: mockConfig.scenario === 'payment-declined' ? 'declined' : 'confirmed',
    })
    db.orders.idempotency.save(userId, key, { orderId: order.id, fingerprint })
    reserveStock(order)

    // The order exists, but the response arrives after the client gave up.
    if (mockConfig.scenario === 'order-timeout') await delay(TIMEOUT_SCENARIO_DELAY_MS)
    return HttpResponse.json<Order>(order, { status: 201 })
  }),

  http.get<{ id: string }>(`${API}/me/orders/:id`, async ({ request, params }) => {
    const failure = await applyNetwork(request, 'orders')
    if (failure) return failure
    const auth = authenticate(request)
    if (!auth.ok) return auth.response

    settleDueOrders()
    const record = db.orders.find(params.id)
    // Another user's order is reported as missing (no existence leak).
    if (!record || record.userId !== auth.user.id) return apiError(404, 'NOT_FOUND', 'Pedido não encontrado.')
    return HttpResponse.json<Order>(record.order)
  }),
]
