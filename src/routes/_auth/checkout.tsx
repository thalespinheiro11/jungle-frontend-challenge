import { createFileRoute, Link, Navigate, useRouter } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import { useEffect, useState } from 'react'

import { QueryError } from '@/components/layout/route-states'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useCart } from '@/features/cart/api'
import { usePlacingOrder } from '@/features/checkout/api'
import { attemptStore } from '@/features/checkout/attempt-store'
import { CheckoutView } from '@/features/checkout/components/checkout-view'
import { useOrder } from '@/features/orders/api'
import { useWallets } from '@/features/wallets/api'

export const Route = createFileRoute('/_auth/checkout')({
  component: CheckoutPage,
})

function CheckoutPage() {
  const { session } = Route.useRouteContext()
  const user = session.user
  const router = useRouter()
  const cart = useCart()
  const wallets = useWallets()
  // Changes that happen once the user is in checkout are handled inside it (notice + new
  // quote); only arriving with an unreviewed cart sends them back to the cart.
  const [entered, setEntered] = useState(false)
  const placing = usePlacingOrder()
  const canEnter = Boolean(cart.data && cart.data.lines.length > 0 && !cart.data.needsReview)
  // Adjusting state while rendering (React's pattern for derived state; no extra effect pass).
  if (canEnter && !entered) setEntered(true)

  // Recovery: an attempt that already produced a pending order resumes on its status page
  // instead of allowing a second purchase (refresh, reconnection, back button).
  const attempt = attemptStore.get(user.id)
  const previousOrder = useOrder(attempt?.orderId ?? '')
  const previousStatus = attempt?.orderId ? previousOrder.data?.status : undefined
  useEffect(() => {
    if (previousStatus === 'confirmed' || previousStatus === 'declined') attemptStore.clear(user.id)
  }, [previousStatus, user.id])

  if (previousStatus === 'pending' && attempt?.orderId) {
    return <Navigate to="/orders/$orderId" params={{ orderId: attempt.orderId }} replace />
  }

  const goBack = () => (window.history.length > 1 ? router.history.back() : void router.navigate({ to: '/cart' }))

  return (
    <div className="container-page pt-4 pb-16 md:pt-8">
      <nav aria-label="Trilha de navegação" className="mb-4 hidden text-sm font-bold md:block">
        <ol className="flex gap-2">
          <li><Link to="/" className="hover:text-primary">Início</Link></li>
          <li aria-hidden>/</li>
          <li><Link to="/cart" className="hover:text-primary">Carrinho</Link></li>
          <li aria-hidden>/</li>
          <li aria-current="page">Pagamento</li>
        </ol>
      </nav>
      <div className="relative mb-6 flex items-center justify-center md:justify-start">
        <button type="button" onClick={goBack} aria-label="Voltar" className="bg-card absolute left-0 grid size-9 place-items-center rounded-full md:hidden">
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <h1 className="text-lg font-bold md:sr-only">Pagamento com carteira</h1>
      </div>

      {cart.isError || wallets.isError ? (
        <QueryError
          error={cart.error ?? wallets.error}
          onRetry={() => {
            void cart.refetch()
            void wallets.refetch()
          }}
        />
      ) : !cart.data || !wallets.data || (attempt?.orderId && previousOrder.isPending) ? (
        <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_405px]" aria-busy="true">
          <span role="status" className="sr-only">Carregando pagamento…</span>
          <Skeleton className="h-[520px] w-full" />
          <Skeleton className="h-[520px] w-full" />
        </div>
      ) : cart.data.lines.length === 0 && !(entered && placing) ? (
        <section className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-lg font-bold">Seu carrinho está vazio</p>
          <Button asChild><Link to="/" hash="catalogo">Explorar NFTs</Link></Button>
        </section>
      ) : cart.data.needsReview && !entered ? (
        <section role="alert" className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-lg font-bold">Seu carrinho tem alterações para revisar</p>
          <p className="text-muted-foreground text-sm">Preços ou disponibilidade mudaram. Revise o carrinho antes de pagar.</p>
          <Button asChild><Link to="/cart">Revisar carrinho</Link></Button>
        </section>
      ) : (
        <CheckoutView user={user} cart={cart.data} wallets={wallets.data} />
      )}
    </div>
  )
}
