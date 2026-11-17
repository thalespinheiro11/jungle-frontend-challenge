import type { CartSummary, OrderLine } from '@/lib/api/contracts'
import { formatEth } from '@/lib/money'
import { cn } from '@/lib/utils'

/** Items list used by checkout ("Seus NFTs"), review and the receipt. */
export function OrderLines({ lines, className }: { lines: OrderLine[]; className?: string }) {
  return (
    <ul className={cn('space-y-2', className)}>
      {lines.map((line) => (
        <li key={`${line.nftId}-${line.editionId}`} className="bg-card flex items-center gap-3 pr-3">
          <img src={line.image} alt="" width={70} height={70} className="size-[70px] shrink-0 object-cover" />
          <div className="min-w-0 flex-1">
            <p className="font-bold break-words">{line.name}</p>
            <p className="text-subtle-foreground text-sm">
              ID do token: {line.tokenId} · {line.editionLabel}
            </p>
          </div>
          <span className="text-muted-foreground text-sm">
            <span className="sr-only">Quantidade: </span>(x {line.quantity})
          </span>
          <span className="text-primary shrink-0 text-right font-bold">{formatEth(line.lineTotal)}</span>
        </li>
      ))}
    </ul>
  )
}

export function SummaryRows({ summary, compact = false }: { summary: CartSummary; compact?: boolean }) {
  return (
    <dl className="space-y-2">
      {!compact && (
        <>
          <Row label="Subtotal" value={formatEth(summary.subtotal)} />
          <Row label="Desconto do lançamento" value={`(-) ${formatEth(summary.discount)}`} />
        </>
      )}
      <Row label="Taxa de rede" value={formatEth(summary.networkFee)} />
      {!compact && <p className="text-primary text-right text-xs">Taxa estimada</p>}
      <div className="border-border flex items-center justify-between border-t pt-3 font-bold">
        <dt>Total</dt>
        <dd className="text-primary text-lg">{formatEth(summary.total)}</dd>
      </div>
    </dl>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}
