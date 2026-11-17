import { Link } from '@tanstack/react-router'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { QuantityStepper } from '@/features/nft-detail/components/quantity-stepper'
import { useIsDesktop } from '@/hooks/use-media-query'
import type { CartLine } from '@/lib/api/contracts'
import { ApiError } from '@/lib/api/http'
import { formatEth } from '@/lib/money'
import { cn } from '@/lib/utils'

import { useRemoveCartLine, useUpdateCartLine } from '../api'

const errorMessage = (error: unknown) =>
  error instanceof ApiError ? error.message : 'Não foi possível atualizar o carrinho.'

/**
 * One cart line. Desktop: table-like row (NFT · Preço · Edições · Total · remover).
 * Mobile: card as in the Figma. Money always comes from the server quote.
 */
export function CartLineRow({ line, onRemoved }: { line: CartLine; onRemoved: () => void }) {
  const update = useUpdateCartLine()
  const remove = useRemoveCartLine()
  // While a change is in flight, show the requested quantity (the server answer replaces it).
  const quantity = (update.isPending && update.variables?.quantity) || line.quantity
  const label = `${line.name} (edição ${line.editionLabel})`

  const setQuantity = (next: number) =>
    update.mutate({ lineId: line.id, quantity: next }, { onError: (e) => toast.error(errorMessage(e)) })

  const onRemove = () =>
    remove.mutate(line.id, {
      onSuccess: () => {
        toast.success(`${line.name} removido do carrinho.`)
        onRemoved()
      },
      onError: (e) => toast.error(errorMessage(e)),
    })

  const soldOut = line.issue === 'sold_out'
  const isDesktop = useIsDesktop()

  return (
    <li
      aria-label={label}
      className={cn(
        'bg-card relative grid grid-cols-[100px_1fr_auto] gap-x-3 overflow-hidden rounded-xl md:grid-cols-[minmax(0,1fr)_140px_136px_140px_48px] md:items-center md:rounded-none md:py-0',
        remove.isPending && 'opacity-50',
      )}
    >
      {/* NFT */}
      <div className="row-span-2 md:row-span-1 md:flex md:items-center md:gap-4">
        <img src={line.image} alt="" width={70} height={70} className="h-full w-[100px] object-cover md:size-[70px] md:shrink-0" />
        <div className="hidden md:block">
          <Link to="/nfts/$nftId" params={{ nftId: line.nftId }} className="font-bold hover:underline">
            {line.name}
          </Link>
          <p className="text-subtle-foreground text-sm">
            ID do token: {line.tokenId} · Edição {line.editionLabel}
          </p>
        </div>
      </div>

      {/* Mobile title block */}
      <div className="py-3 pr-1 md:hidden">
        <Link to="/nfts/$nftId" params={{ nftId: line.nftId }} className="font-bold">
          {line.name}
        </Link>
        <p className="text-subtle-foreground text-sm">Edição: {line.editionLabel}</p>
        <p className="text-primary mt-1 text-lg font-bold">{formatEth(line.lineTotal)}</p>
      </div>

      <p className="text-muted-foreground hidden font-bold md:block">
        <span className="sr-only">Preço unitário: </span>
        {formatEth(line.unitPrice)}
      </p>

      <div className="flex items-center self-end pr-3 pb-3 md:self-center md:p-0">
        <QuantityStepper
          value={quantity}
          max={Math.max(line.maxQuantity, line.quantity)}
          onChange={setQuantity}
          disabled={soldOut || remove.isPending}
          label={`Quantidade de ${label}`}
          compact={!isDesktop}
        />
        <button
          type="button"
          onClick={onRemove}
          disabled={remove.isPending}
          aria-label={`Remover ${label} do carrinho`}
          className="text-muted-foreground hover:text-destructive absolute top-1 right-1 grid size-9 place-items-center md:hidden"
        >
          <Trash2 className="size-4" aria-hidden />
        </button>
      </div>

      <p className="text-primary hidden font-bold md:block">
        <span className="sr-only">Total do item: </span>
        {formatEth(line.lineTotal)}
      </p>

      <button
        type="button"
        onClick={onRemove}
        disabled={remove.isPending}
        aria-label={`Remover ${label} do carrinho`}
        className="text-muted-foreground hover:text-destructive hidden size-10 place-items-center md:grid"
      >
        <Trash2 className="size-5" aria-hidden />
      </button>

      <LineIssue line={line} onFix={setQuantity} />
    </li>
  )
}

function LineIssue({ line, onFix }: { line: CartLine; onFix: (quantity: number) => void }) {
  if (!line.priceChange && !line.issue) return null
  return (
    <div className="col-span-full flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-dashed border-current/20 px-3 py-2 text-sm md:col-start-1 md:px-4">
      <AlertTriangle className="text-primary size-4 shrink-0" aria-hidden />
      {line.issue === 'sold_out' && <span>Esta edição esgotou. Remova o item para continuar.</span>}
      {line.issue === 'insufficient' && (
        <>
          <span>
            {line.maxQuantity === 1
              ? 'Só resta 1 unidade desta edição.'
              : `Só restam ${line.maxQuantity} unidades desta edição.`}
          </span>
          <button type="button" className="text-primary underline underline-offset-4" onClick={() => onFix(line.maxQuantity)}>
            Ajustar para {line.maxQuantity}
          </button>
        </>
      )}
      {line.priceChange && !line.issue && (
        <span>
          Preço alterado: <s>{formatEth(line.priceChange.from)}</s> → <strong>{formatEth(line.priceChange.to)}</strong>
        </span>
      )}
    </div>
  )
}
