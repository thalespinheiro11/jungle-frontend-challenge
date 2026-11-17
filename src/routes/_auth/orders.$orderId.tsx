import { createFileRoute, Link } from '@tanstack/react-router'
import { Loader2, X, XCircle } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { NotFound, QueryError } from '@/components/layout/route-states'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { attemptStore } from '@/features/checkout/attempt-store'
import { OrderLines, SummaryRows } from '@/features/checkout/components/order-lines'
import { useOrder } from '@/features/orders/api'
import { NETWORK_LABEL, PROVIDER_LABEL, shortAddress } from '@/features/wallets/schemas'
import type { Order } from '@/lib/api/contracts'
import { ApiError } from '@/lib/api/http'
import { formatEth } from '@/lib/money'

export const Route = createFileRoute('/_auth/orders/$orderId')({
  component: OrderPage,
})

function OrderPage() {
  const { orderId } = Route.useParams()
  const { session } = Route.useRouteContext()
  const order = useOrder(orderId)
  const status = order.data?.status

  // Terminal states end the purchase attempt (a new checkout gets a new idempotency key).
  useEffect(() => {
    if (status === 'confirmed' || status === 'declined') attemptStore.clear(session.user.id)
  }, [status, session.user.id])

  if (order.isPending) {
    return (
      <div className="container-page max-w-[640px] py-10" aria-busy="true">
        <span role="status" className="sr-only">Carregando pedido…</span>
        <Skeleton className="h-[520px] w-full" />
      </div>
    )
  }
  if (order.isError) {
    if (order.error instanceof ApiError && order.error.code === 'NOT_FOUND') {
      return <NotFound title="Pedido não encontrado" description="Este pedido não existe ou não pertence à sua conta." />
    }
    return (
      <div className="container-page">
        <QueryError error={order.error} onRetry={() => order.refetch()} />
      </div>
    )
  }

  return (
    <div className="container-page py-6 md:py-10">
      {/* Status changes (pending → confirmed / declined) are announced politely. */}
      <div aria-live="polite">
        {order.data.status === 'pending' && <PendingOrder order={order.data} />}
        {order.data.status === 'declined' && <DeclinedOrder order={order.data} />}
        {order.data.status === 'confirmed' && <Receipt order={order.data} />}
      </div>
    </div>
  )
}

function PendingOrder({ order }: { order: Order }) {
  return (
    <section className="bg-card mx-auto max-w-[640px] space-y-6 p-6 text-center md:p-10" aria-labelledby="order-title">
      <Loader2 className="text-primary mx-auto size-10 animate-spin" aria-hidden />
      <h1 id="order-title" className="text-xl font-bold">Processando pagamento</h1>
      <p role="status" className="text-muted-foreground">
        Pedido recebido. Aguardando a confirmação na rede {NETWORK_LABEL[order.wallet.network]}. Você pode recarregar ou
        sair desta página: o status continua sendo acompanhado e nenhuma nova cobrança é feita.
      </p>
      <OrderLines lines={order.lines} className="text-left" />
      <SummaryRows summary={order.summary} compact />
    </section>
  )
}

function DeclinedOrder({ order }: { order: Order }) {
  const heading = useFocusOnMount<HTMLHeadingElement>()
  return (
    <section className="bg-card mx-auto max-w-[640px] space-y-6 p-6 text-center md:p-10" aria-labelledby="order-title">
      <XCircle className="text-destructive mx-auto size-10" aria-hidden />
      <h1 id="order-title" ref={heading} tabIndex={-1} className="text-xl font-bold outline-none">
        Pagamento recusado
      </h1>
      <p className="text-muted-foreground">{order.failureReason}</p>
      <p className="text-sm">Seus itens continuam no carrinho.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild><Link to="/checkout">Tentar novamente</Link></Button>
        <Button asChild variant="outline"><Link to="/cart">Voltar ao carrinho</Link></Button>
      </div>
    </section>
  )
}

/** Confirmation (Figma frame 05). Values come from the order snapshot, never from the catalog. */
function Receipt({ order }: { order: Order }) {
  const heading = useFocusOnMount<HTMLHeadingElement>()
  const date = new Date(order.settledAt ?? order.createdAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  const tx = order.txHash ?? ''
  return (
    <section
      aria-labelledby="order-title"
      className="bg-card border-primary relative mx-auto max-w-[580px] border-b-[6px] pt-6 pb-10"
    >
      <Link to="/" aria-label="Fechar e voltar ao início" className="text-primary absolute top-4 right-4 grid size-8 place-items-center">
        <X className="size-5" aria-hidden />
      </Link>
      <div className="px-6 text-center">
        <ThankYouIcon />
        <h1 id="order-title" ref={heading} tabIndex={-1} className="text-muted-foreground mt-3 text-lg font-bold outline-none">
          Seus NFTs agora estão na sua carteira
        </h1>
      </div>

      <dl className="border-primary mt-6 grid grid-cols-2 gap-y-3 border-y px-6 py-4 text-sm sm:grid-cols-4 sm:divide-x sm:divide-current/30">
        <div className="sm:pr-3">
          <dt className="font-bold">ID da transação</dt>
          <dd className="text-muted-foreground" title={tx}>{tx ? shortAddress(tx) : '—'}</dd>
        </div>
        <div className="sm:px-3"><dt>Data</dt><dd className="text-muted-foreground">{date}</dd></div>
        <div className="sm:px-3"><dt>Total</dt><dd className="text-muted-foreground">{formatEth(order.summary.total)}</dd></div>
        <div className="sm:pl-3">
          <dt className="font-bold">Carteira</dt>
          <dd className="text-muted-foreground">{PROVIDER_LABEL[order.wallet.provider]}</dd>
        </div>
      </dl>

      <div className="space-y-4 px-6 pt-6 md:px-11">
        <h2 className="font-bold">Detalhes da transação</h2>
        <p className="text-subtle-foreground text-xs">Pedido {order.id}</p>
        <OrderLines lines={order.lines} />
        <SummaryRows summary={order.summary} />
        <p className="text-muted-foreground border-border border-t pt-4 text-center text-sm">
          Transação confirmada na {NETWORK_LABEL[order.wallet.network]}. A propriedade foi transferida para sua carteira
          conectada ({shortAddress(order.wallet.address)}) e registrada na rede.
        </p>
        <div className="text-center">
          <Button asChild className="h-11 px-4 font-bold">
            <a href={`https://etherscan.io/tx/${tx}`} target="_blank" rel="noopener noreferrer">
              Ver no Etherscan
              <span className="sr-only"> (simulado, abre em nova aba)</span>
            </a>
          </Button>
          <p className="text-subtle-foreground mt-2 text-xs">Transação simulada para demonstração.</p>
        </div>
      </div>
    </section>
  )
}

function useFocusOnMount<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  useEffect(() => ref.current?.focus(), [])
  return ref
}

function ThankYouIcon() {
  return (
    <svg viewBox="0 0 64 64" className="text-primary mx-auto size-16" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M8 26 32 8l24 18v30H8V26Z" strokeLinejoin="round" />
      <path d="m8 26 24 18 24-18" strokeLinejoin="round" />
      <rect x="16" y="14" width="32" height="20" rx="2" fill="var(--card)" />
      <text x="32" y="23" textAnchor="middle" fontSize="7" fontWeight="700" fill="currentColor" stroke="none">THANK</text>
      <text x="32" y="31" textAnchor="middle" fontSize="7" fontWeight="700" fill="currentColor" stroke="none">YOU</text>
    </svg>
  )
}
