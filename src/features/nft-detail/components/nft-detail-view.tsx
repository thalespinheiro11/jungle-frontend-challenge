import { Link, useRouter } from '@tanstack/react-router'
import { ChevronLeft, Mail, ShoppingCart } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FavoriteButton } from '@/features/favorites/favorite-button'
import type { Nft } from '@/lib/api/contracts'
import { formatEth } from '@/lib/money'

import { usePurchaseSelection } from '../use-purchase-selection'
import { EditionPicker } from './edition-picker'
import { NftGallery } from './nft-gallery'
import { QuantityStepper } from './quantity-stepper'
import { RatingStars } from './rating-stars'

const NETWORK_NAME = { ethereum: 'Ethereum', polygon: 'Polygon', solana: 'Solana' } as const

export function NftDetailView({ nft }: { nft: Nft }) {
  const router = useRouter()
  const selection = usePurchaseSelection(nft)
  const { edition, soldOut } = selection
  const unitPrice = edition?.price ?? nft.price

  // Cart lands in the next step; until then the action says so instead of faking success.
  const onBuy = () => toast.info('O carrinho está em construção — a compra chega na próxima etapa.')

  const goBack = () => (window.history.length > 1 ? router.history.back() : void router.navigate({ to: '/' }))

  return (
    <article>
      {/* Mobile top bar over the image */}
      <div className="container-page flex items-center justify-between pt-4 md:hidden">
        <button type="button" onClick={goBack} aria-label="Voltar" className="border-border grid size-9 place-items-center rounded-full border">
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <FavoriteButton nft={nft} className="border-border size-9 rounded-full border" />
      </div>

      <div className="container-page pt-4 md:pt-8">
        <nav aria-label="Trilha de navegação" className="mb-4 hidden text-sm font-bold md:block">
          <ol className="flex gap-2">
            <li>
              <Link to="/" className="hover:text-primary">Início</Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              <Link to="/" hash="catalogo" className="hover:text-primary">Mercado</Link>
            </li>
          </ol>
        </nav>

        <div className="grid gap-6 md:grid-cols-[minmax(0,572px)_1fr] md:gap-8">
          <NftGallery nft={nft} />

          <div className="bg-card -mx-4 rounded-t-3xl px-6 pt-6 md:mx-0 md:rounded-none md:bg-transparent md:p-0">
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-xl font-bold md:text-[1.75rem]">{nft.name}</h1>
              <span className="border-primary flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-sm md:hidden">
                <RatingStars rating={nft.rating} className="[&>svg:nth-child(n+2)]:hidden" />
                {nft.rating.toFixed(1)} ({nft.reviewsCount})
              </span>
            </div>

            <div className="border-border mt-2 hidden items-center justify-between border-b pb-3 md:flex">
              <p className="text-primary text-xl font-bold">
                {formatEth(unitPrice)}
                {nft.compareAtPrice && unitPrice === nft.price && (
                  <s className="text-subtle-foreground ml-2 text-base font-normal">
                    <span className="sr-only">Preço anterior: </span>
                    {formatEth(nft.compareAtPrice)}
                  </s>
                )}
              </p>
              <a href="#avaliacoes" className="flex items-center gap-2 text-sm hover:underline">
                <RatingStars rating={nft.rating} />
                {nft.reviewsCount} avaliações de colecionadores
              </a>
            </div>

            <h2 className="mt-4 hidden font-bold md:block">Sobre este NFT:</h2>
            <p className="text-muted-foreground mt-2 text-sm leading-6">{nft.description}</p>

            <div className="mt-4">
              <EditionPicker editions={nft.editions} value={selection.editionId} onChange={selection.selectEdition} />
            </div>

            {/* Realtime changes and limits, announced politely. */}
            <div role="status" aria-live="polite" className="mt-3 space-y-1 text-sm empty:hidden">
              {selection.notice && <p className="text-primary">{selection.notice}</p>}
              {soldOut && <p className="text-destructive">Nenhuma edição disponível no momento.</p>}
              {!soldOut && selection.quantity >= selection.max && selection.max > 1 && (
                <p className="text-subtle-foreground">Máximo disponível para esta edição: {selection.max}.</p>
              )}
            </div>

            {/* Desktop actions */}
            <div className="mt-4 hidden flex-wrap items-center justify-between gap-4 md:flex">
              <QuantityStepper value={selection.quantity} max={selection.max} onChange={selection.setQuantity} disabled={soldOut} />
              <div className="flex gap-2">
                <Button className="h-10 w-[130px] font-bold" onClick={onBuy} disabled={soldOut}>
                  COMPRAR
                </Button>
                <FavoriteButton nft={nft} className="border-primary text-primary h-10 rounded-md border px-4 text-sm">
                  {() => 'Favoritar'}
                </FavoriteButton>
              </div>
            </div>
            {selection.quantity > 1 && (
              <p className="text-subtle-foreground mt-2 hidden text-sm md:block">
                Total: <span className="text-foreground">{formatEth(selection.total)}</span>
              </p>
            )}

            <dl className="text-muted-foreground mt-6 space-y-3 text-sm md:text-base">
              <div className="flex gap-1"><dt>ID do token:</dt><dd>{nft.tokenId}</dd></div>
              <div className="flex gap-1"><dt>Coleção:</dt><dd>{nft.collection}</dd></div>
              <div className="flex gap-1"><dt>Atributos:</dt><dd>{nft.attributes.join(', ')}</dd></div>
            </dl>
            <ShareLinks nft={nft} />
          </div>
        </div>

        <DetailTabs nft={nft} />
      </div>

      {/* Mobile sticky purchase bar */}
      <div className="bg-card fixed inset-x-0 bottom-0 z-40 rounded-t-3xl px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:hidden">
        <div className="flex items-center justify-between">
          <QuantityStepper value={selection.quantity} max={selection.max} onChange={selection.setQuantity} label="Qtd." showLabel disabled={soldOut} />
          <p className="text-primary text-xl font-bold" aria-label={`Total ${formatEth(selection.total)}`}>
            {formatEth(soldOut ? unitPrice : selection.total)}
          </p>
        </div>
        <div className="mt-4 flex gap-3">
          <Button className="h-14 flex-1 rounded-3xl text-base font-bold" onClick={onBuy} disabled={soldOut}>
            Comprar NFT
          </Button>
          <Button variant="outline" className="size-14 rounded-full" onClick={onBuy} disabled={soldOut} aria-label="Adicionar ao carrinho">
            <ShoppingCart aria-hidden />
          </Button>
        </div>
      </div>
    </article>
  )
}

function ShareLinks({ nft }: { nft: Nft }) {
  const url = typeof window === 'undefined' ? '' : `${window.location.origin}/nfts/${nft.id}`
  const text = `${nft.name} na Kurio`
  const links = [
    { label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, icon: <LinkedinIcon /> },
    { label: 'e-mail', href: `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(url)}`, icon: <Mail className="size-4" aria-hidden /> },
    { label: 'X (Twitter)', href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, icon: <XIcon /> },
  ]
  return (
    <div className="mt-4 flex items-center gap-3 text-sm font-bold">
      <span>Compartilhar este NFT:</span>
      <ul className="flex gap-2">
        {links.map((link) => (
          <li key={link.label}>
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Compartilhar por ${link.label} (abre em nova aba)`}
              className="hover:text-primary grid size-6 place-items-center"
            >
              {link.icon}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

// Overrides the shadcn line variant (incl. its dark: rules): active tab orange with an
// orange underline, inactive tab in the regular text color, as in the Figma.
const tabTriggerClass =
  'flex-none rounded-none border-0 px-0 pb-2 text-base md:text-lg after:bg-primary after:bottom-[-1px] ' +
  'text-foreground dark:text-foreground hover:text-primary dark:hover:text-primary ' +
  'data-[state=active]:text-primary dark:data-[state=active]:text-primary ' +
  'data-[state=active]:bg-transparent dark:data-[state=active]:bg-transparent dark:data-[state=active]:border-transparent'

function DetailTabs({ nft }: { nft: Nft }) {
  return (
    <Tabs defaultValue="details" className="mt-12 md:mt-16" id="avaliacoes">
      <TabsList variant="line" className="border-border h-auto w-full max-w-full justify-start gap-6 border-b p-0 md:gap-8">
        <TabsTrigger
          value="details"
          className={tabTriggerClass}
        >
          Detalhes do NFT
        </TabsTrigger>
        <TabsTrigger
          value="reviews"
          className={tabTriggerClass}
        >
          {/* Short label on mobile so the tab row fits 390px without horizontal overflow. */}
          <span className="md:hidden">Avaliações ({nft.reviewsCount})</span>
          <span className="hidden md:inline">Avaliações de colecionadores ({nft.reviewsCount})</span>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="details" className="text-muted-foreground space-y-4 pt-4 text-sm leading-6">
        <p>{nft.details}</p>
        <div>
          <h3 className="text-foreground font-bold">Rede:</h3>
          <p>Cunhado na {NETWORK_NAME[nft.network]} com procedência imutável e metadados armazenados no IPFS.</p>
        </div>
        <div>
          <h3 className="text-foreground font-bold">Contrato:</h3>
          <p>Direitos autorais do criador: 5% nas vendas secundárias, pagos automaticamente pelos mercados compatíveis.</p>
        </div>
        <div>
          <h3 className="text-foreground font-bold">Direitos autorais:</h3>
          <p>{nft.contractAddress} • Contrato inteligente ERC-721 verificado.</p>
        </div>
      </TabsContent>
      <TabsContent value="reviews" className="pt-4">
        <p className="text-subtle-foreground mb-4 text-sm">
          Mostrando as {nft.reviews.length} avaliações mais recentes de {nft.reviewsCount}.
        </p>
        <ul className="space-y-4">
          {nft.reviews.map((review) => (
            <li key={review.id} className="bg-card rounded-md p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="font-bold">{review.author}</span>
                <RatingStars rating={review.rating} />
              </div>
              <p className="text-muted-foreground mt-2 text-sm">{review.comment}</p>
              <time dateTime={review.createdAt} className="text-subtle-foreground mt-2 block text-xs">
                {new Date(review.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </time>
            </li>
          ))}
        </ul>
      </TabsContent>
    </Tabs>
  )
}

function LinkedinIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
      <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm7 0h3.8v1.7h.1c.5-1 1.8-2 3.8-2 4 0 4.8 2.6 4.8 6V21h-4v-5.6c0-1.3 0-3-1.9-3s-2.1 1.4-2.1 2.9V21h-4V9Z" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
      <path d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.3-8.3L2 3h6.4l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5Z" />
    </svg>
  )
}
