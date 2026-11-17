import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useForm, type Path } from 'react-hook-form'
import { toast } from 'sonner'
import type { z } from 'zod'

import { Field, FormError, SelectInput, TextInput } from '@/components/form/form-field'
import { Button } from '@/components/ui/button'
import { applyApiError } from '@/features/session/form-errors'
import { NETWORKS, WALLET_PROVIDERS, type WalletSlot } from '@/lib/api/contracts'

import { useSaveWallet } from '../api'
import { NETWORK_LABEL, PROVIDER_LABEL, walletInputSchema, type WalletFormValues } from '../schemas'

type WalletOutput = z.output<typeof walletInputSchema>

const FIELDS: Path<WalletFormValues>[] = [
  'displayName', 'nickname', 'network', 'profileName', 'address',
  'ensOrSecondary', 'provider', 'referralCode', 'email', 'ensName',
]

/** Wallet fields exactly as in the Figma "Carteiras" frame, validated client + server side. */
export function WalletForm({
  slot,
  initial,
  onSaved,
}: {
  slot: WalletSlot
  initial: WalletFormValues
  onSaved?: () => void
}) {
  const save = useSaveWallet(slot)
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<WalletFormValues, unknown, WalletOutput>({
    resolver: zodResolver(walletInputSchema),
    values: initial,
    resetOptions: { keepDirtyValues: true },
    // Validate on submit, then live: blur validation shifts the layout under the pointer.
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  })
  const { errors } = form.formState
  const prefix = slot === 'primary' ? 'Carteira principal' : 'Carteira secundária'

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null)
    save.mutate(values, {
      onSuccess: () => {
        toast.success(`${prefix} salva.`)
        onSaved?.()
      },
      onError: (error) => setFormError(applyApiError(error, form.setError, FIELDS)),
    })
  })

  const text = (name: Path<WalletFormValues>, label: string, opts: { placeholder?: string; type?: string; required?: boolean; autoComplete?: string } = {}) => (
    <Field label={label} required={opts.required ?? true} error={errors[name as keyof typeof errors]?.message}>
      {({ inputId, describedBy, invalid, required }) => (
        <TextInput
          id={inputId}
          type={opts.type ?? 'text'}
          placeholder={opts.placeholder}
          autoComplete={opts.autoComplete ?? 'off'}
          aria-invalid={invalid}
          aria-required={required}
          aria-describedby={describedBy}
          {...form.register(name)}
        />
      )}
    </Field>
  )

  return (
    <form onSubmit={onSubmit} noValidate aria-label={prefix} className="space-y-5">
      <FormError message={formError} />
      <div className="grid gap-x-7 gap-y-5 md:grid-cols-2">
        {text('displayName', 'Nome de exibição', { autoComplete: 'name' })}
        {text('nickname', 'Apelido da carteira')}
        <Field label="Rede" required error={errors.network?.message}>
          {({ inputId, describedBy, invalid, required }) => (
            <SelectInput id={inputId} aria-invalid={invalid} aria-required={required} aria-describedby={describedBy} {...form.register('network')}>
              <option value="">Selecione uma rede</option>
              {NETWORKS.map((n) => (
                <option key={n} value={n}>{NETWORK_LABEL[n]}</option>
              ))}
            </SelectInput>
          )}
        </Field>
        {text('profileName', 'Nome do perfil')}
        {text('address', 'Endereço da carteira', { placeholder: 'Endereço 0x da carteira' })}
        {text('ensOrSecondary', 'ENS ou carteira secundária (opcional)', { placeholder: 'nome.eth ou 0x…', required: false })}
        <Field label="Tipo de carteira" required error={errors.provider?.message}>
          {({ inputId, describedBy, invalid, required }) => (
            <SelectInput id={inputId} aria-invalid={invalid} aria-required={required} aria-describedby={describedBy} {...form.register('provider')}>
              <option value="">Selecione uma carteira</option>
              {WALLET_PROVIDERS.map((p) => (
                <option key={p} value={p}>{PROVIDER_LABEL[p]}</option>
              ))}
            </SelectInput>
          )}
        </Field>
        {text('referralCode', 'Código de indicação')}
        {text('email', 'E-mail', { type: 'email', autoComplete: 'email' })}
        <Field label="Nome ENS" required error={errors.ensName?.message}>
          {({ inputId, describedBy, invalid, required }) => (
            <div className="flex gap-2">
              <span className="border-input text-muted-foreground grid h-11 place-items-center rounded-md border px-3 text-sm" aria-hidden>
                .eth
              </span>
              <TextInput id={inputId} aria-invalid={invalid} aria-required={required} aria-describedby={describedBy} {...form.register('ensName')} />
            </div>
          )}
        </Field>
      </div>
      <Button type="submit" className="h-10 font-bold" disabled={save.isPending}>
        {save.isPending && <Loader2 className="animate-spin" aria-hidden />}
        Salvar carteira
      </Button>
    </form>
  )
}
