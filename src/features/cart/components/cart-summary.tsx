import { Link, useNavigate } from '@tanstack/react-router'
import { Loader2, X } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Cart } from '@/lib/api/contracts'
import { ApiError } from '@/lib/api/http'
import { formatEth } from '@/lib/money'
import { cn } from '@/lib/utils'

import { useAcknowledgeCart, useApplyCoupon, useCartBusy, useRemoveCoupon } from '../api'

/** "Resumo da carteira": coupon + server quote + checkout entry. */
export function CartSummary({ cart }: { cart: Cart }) {
  const navigate = useNavigate()
  const busy = useCartBusy()
  const acknowledge = useAcknowledgeCart()
  const empty = cart.lines.length === 0
  const hasIssues = cart.lines.some((l) => l.issue)
  const hasPriceChanges = cart.lines.some((l) => l.priceChange)
  const { summary } = cart

  return (
    <section aria-labelledby="summary-title" className="bg-card md:bg-transparent -mx-4 rounded-t-3xl px-4 pt-5 pb-6 md:mx-0 md:p-0">
      <h2 id="summary-title" className="border-border hidden border-b pb-3 text-lg font-bold md:block">
        Resumo da carteira
      </h2>

      <CouponForm cart={cart} />

      <dl aria-busy={busy} className={cn('mt-5 space-y-3 transition-opacity', busy && 'opacity-60')}>
        <Row label="Subtotal" value={formatEth(summary.subtotal)} />
        <Row label="Desconto do lançamento" value={`(-) ${formatEth(summary.discount)}`} />
        <Row label="Taxa de rede" value={formatEth(summary.networkFee)} hint="Taxa estimada" />
        <div className="flex items-center justify-between pt-4 font-bold">
          <dt>Total</dt>
          <dd className="text-primary text-lg">{formatEth(summary.total)}</dd>
        </div>
      </dl>

      {(hasIssues || hasPriceChanges) && (
        <div className="bg-secondary mt-4 space-y-2 rounded-md p-3 text-sm">
          {hasIssues && <p>Alguns itens ficaram indisponíveis. Ajuste-os para continuar.</p>}
          {hasPriceChanges && !hasIssues && (
            <>
              <p>Os preços de alguns itens mudaram desde que você os adicionou.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => acknowledge.mutate(undefined, { onSuccess: () => toast.success('Novos preços confirmados.') })}
                disabled={acknowledge.isPending}
              >
                Aceitar novos preços
              </Button>
            </>
          )}
        </div>
      )}

      <Button
        className="mt-5 h-11 w-full rounded-md text-base font-bold md:rounded-md max-md:h-14 max-md:rounded-3xl"
        disabled={empty || busy || cart.needsReview}
        onClick={() => void navigate({ to: '/checkout' })}
      >
        Conectar e finalizar
      </Button>
      <Link to="/" hash="catalogo" className="text-primary mt-4 hidden text-center hover:underline md:block">
        Continuar explorando
      </Link>
    </section>
  )
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <dt>{label}</dt>
        <dd>{value}</dd>
      </div>
      {hint && <p className="text-primary text-right text-xs">{hint}</p>}
    </div>
  )
}

function CouponForm({ cart }: { cart: Cart }) {
  const apply = useApplyCoupon()
  const remove = useRemoveCoupon()
  const [error, setError] = useState<string | null>(null)
  const inputId = useId()
  const errorId = `${inputId}-error`

  if (cart.coupon) {
    return (
      <div className="mt-5">
        <p className="mb-2 text-sm font-bold">Código promocional</p>
        <div className="border-primary flex items-center justify-between rounded-md border px-3 py-2 text-sm">
          <span>
            <span className="sr-only">Cupom aplicado: </span>
            {cart.coupon.label}
          </span>
          <button
            type="button"
            onClick={() => remove.mutate(undefined, { onSuccess: () => toast.success('Cupom removido.') })}
            disabled={remove.isPending}
            aria-label={`Remover cupom ${cart.coupon.code}`}
            className="hover:text-destructive grid size-6 place-items-center"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      </div>
    )
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const code = String(new FormData(event.currentTarget).get('code') ?? '').trim()
    if (!code) {
      setError('Informe um cupom.')
      return
    }
    setError(null)
    apply.mutate(code, {
      onSuccess: () => toast.success('Cupom aplicado.'),
      onError: (e) =>
        setError(e instanceof ApiError ? (e.fieldErrors.code ?? e.message) : 'Não foi possível aplicar o cupom.'),
    })
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mt-5">
      <label htmlFor={inputId} className="mb-2 hidden text-sm font-bold md:block">
        Código promocional
      </label>
      <div className="flex">
        <Input
          id={inputId}
          name="code"
          autoComplete="off"
          placeholder="Digite o código promocional..."
          aria-label="Código promocional"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          onChange={() => error && setError(null)}
          className="border-primary h-10 rounded-r-none bg-transparent text-xs aria-invalid:border-destructive max-md:h-12 max-md:rounded-l-3xl"
        />
        <Button type="submit" className="h-10 rounded-l-none px-5 font-bold max-md:h-12 max-md:rounded-r-3xl" disabled={apply.isPending}>
          {apply.isPending ? <Loader2 className="animate-spin" aria-label="Aplicando" /> : 'Aplicar'}
        </Button>
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-destructive mt-2 text-xs">
          ⚠ {error}
        </p>
      )}
    </form>
  )
}
