import { createFileRoute } from '@tanstack/react-router'
import { useId, useState } from 'react'

import { AccountLayout } from '@/components/layout/account-layout'
import { QueryError } from '@/components/layout/route-states'
import { Skeleton } from '@/components/ui/skeleton'
import { useWallets } from '@/features/wallets/api'
import { WalletForm } from '@/features/wallets/components/wallet-form'
import { toFormValues, type WalletFormValues } from '@/features/wallets/schemas'

export const Route = createFileRoute('/_auth/account/wallets')({
  component: WalletsPage,
})

function WalletsPage() {
  const wallets = useWallets()

  return (
    <AccountLayout title="Carteiras">
      {wallets.isPending ? (
        <div className="space-y-4" aria-busy="true">
          <span role="status" className="sr-only">Carregando carteiras…</span>
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-[420px] w-full" />
        </div>
      ) : wallets.isError ? (
        <QueryError error={wallets.error} onRetry={() => wallets.refetch()} />
      ) : (
        <div className="space-y-12">
          <WalletSection
            title="Carteira principal"
            description="Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados."
            slot="primary"
            initial={toFormValues(wallets.data.primary)}
            exists={Boolean(wallets.data.primary)}
          />
          <WalletSection
            title="Carteira secundária"
            description={
              wallets.data.secondary ? 'Usada como alternativa no pagamento.' : 'Você ainda não adicionou uma carteira secundária.'
            }
            slot="secondary"
            initial={toFormValues(wallets.data.secondary)}
            exists={Boolean(wallets.data.secondary)}
            copyFrom={wallets.data.primary ? toFormValues(wallets.data.primary) : null}
          />
        </div>
      )}
    </AccountLayout>
  )
}

function WalletSection({
  title,
  description,
  slot,
  initial,
  exists,
  copyFrom,
}: {
  title: string
  description: string
  slot: 'primary' | 'secondary'
  initial: WalletFormValues
  exists: boolean
  copyFrom?: WalletFormValues | null
}) {
  const [open, setOpen] = useState(exists)
  const [sameAsPrimary, setSameAsPrimary] = useState(false)
  const headingId = useId()
  // "Igual à carteira principal" copies the profile data; address and nickname stay distinct.
  const values: WalletFormValues =
    sameAsPrimary && copyFrom ? { ...copyFrom, address: initial.address, nickname: initial.nickname } : initial

  return (
    <section aria-labelledby={headingId}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id={headingId} className="text-lg font-bold">{title}</h2>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
        <div className="flex items-center gap-4">
          {copyFrom && open && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={sameAsPrimary}
                onChange={(e) => setSameAsPrimary(e.target.checked)}
                className="accent-primary size-4"
              />
              Igual à carteira principal
            </label>
          )}
          {!open && (
            <button type="button" onClick={() => setOpen(true)} className="text-primary font-bold hover:underline">
              Adicionar
            </button>
          )}
        </div>
      </div>
      {open && <WalletForm key={sameAsPrimary ? 'copy' : 'own'} slot={slot} initial={values} />}
    </section>
  )
}
