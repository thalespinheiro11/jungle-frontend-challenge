import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import { useRef } from 'react'

import { QueryError } from '@/components/layout/route-states'
import { Button } from '@/components/ui/button'
import { useCart } from '@/features/cart/api'
import { CartLineRow } from '@/features/cart/components/cart-line-row'
import { CartLinesSkeleton, CartSummarySkeleton } from '@/features/cart/components/cart-skeleton'
import { CartSummary } from '@/features/cart/components/cart-summary'
import { nftListQuery } from '@/features/catalog/api'
import { NftRail } from '@/features/catalog/components/nft-rail'
import type { Cart } from '@/lib/api/contracts'
import { formatEth } from '@/lib/money'

export const Route = createFileRoute('/cart')({
  component: CartPage,
})

const SUGGESTIONS = { tab: 'trending', sort: 'recent', page: 1, pageSize: 10 } as const

function CartPage() {
  const router = useRouter()
  const cart = useCart()
  const suggestions = useQuery(nftListQuery(SUGGESTIONS))
  const headingRef = useRef<HTMLHeadingElement>(null)

  const goBack = () => (window.history.length > 1 ? router.history.back() : void router.navigate({ to: '/' }))

  return (
    <div className="container-page pt-4 md:pt-8">
      <nav aria-label="Trilha de navegação" className="mb-2 hidden text-sm font-bold md:block">
        <ol className="flex gap-2">
          <li><Link to="/" className="hover:text-primary">Início</Link></li>
          <li aria-hidden>/</li>
          <li><Link to="/" hash="catalogo" className="hover:text-primary">Mercado</Link></li>
          <li aria-hidden>/</li>
          <li aria-current="page">Carrinho</li>
        </ol>
      </nav>

      <div className="relative mb-4 flex items-center justify-center md:justify-start">
        <button type="button" onClick={goBack} aria-label="Voltar" className="bg-card absolute left-0 grid size-9 place-items-center rounded-full md:hidden">
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <h1 ref={headingRef} tabIndex={-1} className="text-lg font-bold outline-none md:sr-only">
          Carrinho de NFTs
        </h1>
      </div>

      {cart.isError ? (
        <QueryError error={cart.error} onRetry={() => cart.refetch()} />
      ) : cart.data && cart.data.lines.length === 0 ? (
        <EmptyCart />
      ) : (
        <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_332px] md:gap-16">
          <div>
            <div aria-hidden className="border-border text-foreground hidden grid-cols-[minmax(0,1fr)_140px_136px_140px_48px] gap-x-3 border-b pb-3 font-bold md:grid">
              <span>NFTs</span>
              <span>Preço</span>
              <span>Edições</span>
              <span>Total</span>
            </div>
            {cart.data ? (
              <>
                <CartAnnouncer cart={cart.data} />
                <ul className="mt-3 space-y-3" aria-label="Itens do carrinho">
                  {cart.data.lines.map((line) => (
                    <CartLineRow key={line.id} line={line} onRemoved={() => headingRef.current?.focus()} />
                  ))}
                </ul>
              </>
            ) : (
              <div className="mt-3">
                <span role="status" className="sr-only">Carregando carrinho…</span>
                <CartLinesSkeleton />
              </div>
            )}
          </div>
          {cart.data ? <CartSummary cart={cart.data} /> : <CartSummarySkeleton />}
        </div>
      )}

      <NftRail title="Colecionadores também viram" items={suggestions.data?.items} isPending={suggestions.isPending} />
    </div>
  )
}

/** Politely announces price/availability changes that arrive while the cart is open. */
function CartAnnouncer({ cart }: { cart: Cart }) {
  const messages = cart.lines.flatMap((line) => {
    if (line.issue === 'sold_out') return [`${line.name}: a edição ${line.editionLabel} esgotou.`]
    if (line.issue === 'insufficient') return [`${line.name}: restam ${line.maxQuantity} unidades.`]
    if (line.priceChange) return [`${line.name}: preço mudou para ${formatEth(line.priceChange.to)}.`]
    return []
  })
  return (
    <p role="status" aria-live="polite" className="sr-only">
      {messages.length ? `Seu carrinho foi atualizado. ${messages.join(' ')}` : ''}
    </p>
  )
}

function EmptyCart() {
  return (
    <section className="flex flex-col items-center gap-3 py-16 text-center">
      <p className="text-lg font-bold">Seu carrinho está vazio</p>
      <p className="text-muted-foreground text-sm">Explore o catálogo e adicione NFTs para continuar.</p>
      <Button asChild className="mt-2">
        <Link to="/" hash="catalogo">Explorar NFTs</Link>
      </Button>
    </section>
  )
}
