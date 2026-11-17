import { Link } from '@tanstack/react-router'
import { useId } from 'react'

import { Field, TextInput } from '@/components/form/form-field'
import type { WalletList } from '@/lib/api/contracts'
import { cn } from '@/lib/utils'
import { NETWORK_LABEL, shortAddress } from '@/features/wallets/schemas'

export type WalletChoiceValue = 'primary' | 'secondary' | 'other'

/** "Carteira conectada": registered wallets as radio cards, or another address. */
export function WalletChoice({
  wallets,
  value,
  onChange,
  otherAddress,
  onOtherAddressChange,
  otherAddressError,
}: {
  wallets: WalletList
  value: WalletChoiceValue
  onChange: (value: WalletChoiceValue) => void
  otherAddress: string
  onOtherAddressChange: (value: string) => void
  otherAddressError?: string
}) {
  const name = useId()
  const saved = (['primary', 'secondary'] as const).flatMap((slot) => {
    const wallet = wallets[slot]
    return wallet ? [{ slot, wallet }] : []
  })

  return (
    <fieldset className="space-y-3">
      <div className="flex items-center justify-between">
        <legend className="text-lg font-bold">Carteira conectada</legend>
        <Link to="/account/wallets" className="text-primary text-sm font-bold hover:underline">
          Gerenciar carteiras
        </Link>
      </div>

      {saved.length === 0 && (
        <p className="bg-secondary rounded-md p-3 text-sm">
          Você ainda não cadastrou carteiras.{' '}
          <Link to="/account/wallets" className="text-primary underline underline-offset-4">
            Cadastre uma carteira
          </Link>{' '}
          ou informe outro endereço abaixo.
        </p>
      )}

      {saved.map(({ slot, wallet }) => (
        <label
          key={slot}
          className={cn(
            'bg-card flex cursor-pointer items-start gap-3 rounded-xl border p-4',
            'has-[:focus-visible]:outline-ring has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2',
            value === slot ? 'border-primary' : 'border-transparent',
          )}
        >
          <input
            type="radio"
            name={name}
            checked={value === slot}
            onChange={() => onChange(slot)}
            className="accent-primary mt-1 size-4"
          />
          <span>
            <span className="block font-bold">{wallet.nickname}</span>
            <span className="text-muted-foreground block text-sm">
              {wallet.ensOrSecondary ?? shortAddress(wallet.address)}
            </span>
            <span className="text-subtle-foreground block text-sm">
              Rede {NETWORK_LABEL[wallet.network]} · {slot === 'primary' ? 'principal' : 'secundária'}
            </span>
          </span>
        </label>
      ))}

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={value === 'other'}
          onChange={(e) => onChange(e.target.checked ? 'other' : (saved[0]?.slot ?? 'other'))}
          disabled={saved.length === 0}
          className="accent-primary size-4"
        />
        Usar outra carteira?
      </label>

      {value === 'other' && (
        <Field label="Endereço da carteira" required error={otherAddressError}>
          {({ inputId, describedBy, invalid, required }) => (
            <TextInput
              id={inputId}
              value={otherAddress}
              onChange={(e) => onOtherAddressChange(e.target.value)}
              placeholder="Endereço 0x da carteira"
              autoComplete="off"
              aria-invalid={invalid}
              aria-required={required}
              aria-describedby={describedBy}
            />
          )}
        </Field>
      )}
    </fieldset>
  )
}
