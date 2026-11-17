import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from '@tanstack/react-router'
import { CheckCircle2, Loader2, PlugZap, Unplug } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useForm, useWatch, type Path } from 'react-hook-form'
import { toast } from 'sonner'
import type { z } from 'zod'

import { Field, FormError, SelectInput, TextArea, TextInput } from '@/components/form/form-field'
import { Button } from '@/components/ui/button'
import { applyApiError } from '@/features/session/form-errors'
import { NETWORK_LABEL, PROVIDER_LABEL, shortAddress, walletAddressSchema } from '@/features/wallets/schemas'
import {
  NETWORKS,
  WALLET_PROVIDERS,
  type Cart,
  type CheckoutQuote,
  type Network,
  type SessionUser,
  type WalletConnection,
  type WalletList,
  type WalletProvider,
} from '@/lib/api/contracts'
import { ApiError } from '@/lib/api/http'
import { formatEth } from '@/lib/money'
import { cn } from '@/lib/utils'

import { checkoutApi, staleQuoteOf, useConnectWallet, useCreateQuote, usePlaceOrder } from '../api'
import { draftStore } from '../attempt-store'
import { buyerSchema, type BuyerFormValues } from '../schemas'
import { OrderLines, SummaryRows } from './order-lines'
import { WalletChoice, type WalletChoiceValue } from './wallet-choice'

type BuyerOutput = z.output<typeof buyerSchema>
const BUYER_FIELDS: Path<BuyerFormValues>[] = ['displayName', 'username', 'email', 'referralCode', 'note']

interface Draft {
  buyer: Partial<BuyerFormValues>
  walletChoice: WalletChoiceValue
  otherAddress: string
  provider: WalletProvider
  network: Network
}

function draftDefaults(user: SessionUser): BuyerFormValues {
  return { displayName: user.name, username: user.username, email: user.email, referralCode: '', note: '' }
}

const reasonOf = (error: unknown, fallback: string) => (error instanceof ApiError ? error.message : fallback)

/**
 * Payment screen. Flow: collector data + wallet/network → simulated connection →
 * "Revisar pedido" (server quote, i.e. revalidation) → "Confirmar compra" (idempotent order).
 * Any change detected by the server sends the user back to review with the new values.
 */
export function CheckoutView({ user, cart, wallets }: { user: SessionUser; cart: Cart; wallets: WalletList }) {
  const [draft] = useState(() => draftStore.get<Draft>(user.id))
  const defaultWallet = wallets.primary ?? wallets.secondary

  const form = useForm<BuyerFormValues, unknown, BuyerOutput>({
    resolver: zodResolver(buyerSchema),
    defaultValues: draft?.buyer ? { ...draftDefaults(user), ...draft.buyer } : {
      displayName: defaultWallet?.displayName ?? user.name,
      username: user.username,
      email: user.email,
      referralCode: defaultWallet?.referralCode ?? '',
      note: '',
    },
    // Validate on submit, then live: blur validation shifts the layout under the pointer.
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  })
  const { errors } = form.formState

  const [walletChoice, setWalletChoice] = useState<WalletChoiceValue>(
    draft?.walletChoice ?? (wallets.primary ? 'primary' : wallets.secondary ? 'secondary' : 'other'),
  )
  const [otherAddress, setOtherAddress] = useState(draft?.otherAddress ?? '')
  const [otherAddressError, setOtherAddressError] = useState<string>()
  const [provider, setProvider] = useState<WalletProvider>(draft?.provider ?? defaultWallet?.provider ?? 'metamask')
  const [network, setNetwork] = useState<Network>(draft?.network ?? defaultWallet?.network ?? 'ethereum')
  const [connection, setConnection] = useState<WalletConnection | null>(null)
  const [connectionMessage, setConnectionMessage] = useState<string | null>(null)
  const [step, setStep] = useState<'edit' | 'review'>('edit')
  const [quote, setQuote] = useState<CheckoutQuote | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const connect = useConnectWallet()
  const createQuote = useCreateQuote()
  const placeOrder = usePlaceOrder()
  const reviewHeading = useRef<HTMLHeadingElement>(null)
  const connectButton = useRef<HTMLButtonElement>(null)

  const address =
    walletChoice === 'other' ? otherAddress.trim() : (wallets[walletChoice]?.address ?? '')

  // Keep a draft so an expired session (re-login) resumes with everything filled in.
  const buyerValues = useWatch({ control: form.control })
  useEffect(() => {
    draftStore.set(user.id, { buyer: buyerValues, walletChoice, otherAddress, provider, network } satisfies Draft)
  }, [user.id, buyerValues, walletChoice, otherAddress, provider, network])

  /** Any change to wallet, provider or network invalidates the current connection. */
  const dropConnection = (reason?: string) => {
    if (!connection) return
    void checkoutApi.disconnect(connection.id).catch(() => undefined)
    setConnection(null)
    setConnectionMessage(reason ?? null)
    setStep('edit')
  }

  const chooseWallet = (choice: WalletChoiceValue) => {
    setWalletChoice(choice)
    const wallet = choice === 'other' ? null : wallets[choice]
    if (wallet) {
      setProvider(wallet.provider)
      setNetwork(wallet.network)
    }
    dropConnection('A carteira mudou. Conecte novamente.')
  }

  const onConnect = () => {
    setConnectionMessage(null)
    if (walletChoice === 'other') {
      const parsed = walletAddressSchema.safeParse(otherAddress)
      if (!parsed.success) {
        setOtherAddressError(parsed.error.issues[0]?.message)
        return
      }
      setOtherAddressError(undefined)
    }
    connect.mutate(
      { address, provider, network },
      {
        onSuccess: (result) => {
          setConnection(result)
          toast.success(`${PROVIDER_LABEL[provider]} conectada.`)
        },
        onError: (error) =>
          setConnectionMessage(
            error instanceof ApiError && error.code === 'WALLET_REJECTED'
              ? 'A conexão foi recusada na carteira. Tente novamente ou escolha outra carteira.'
              : reasonOf(error, 'Não foi possível conectar a carteira.'),
          ),
      },
    )
  }

  const onDisconnect = () => {
    dropConnection()
    toast.info('Carteira desconectada.')
  }

  const onReview = async () => {
    setFormError(null)
    const valid = await form.trigger(undefined, { shouldFocus: true })
    if (!valid) return
    if (!connection) {
      setConnectionMessage('Conecte sua carteira para revisar o pedido.')
      connectButton.current?.focus()
      return
    }
    createQuote.mutate(undefined, {
      onSuccess: (fresh) => {
        setQuote(fresh)
        // Compare with what the user last saw: the previous quote, or the cart on first review.
        const baseline = quote?.summary.total ?? cart.summary.total
        setNotice(
          fresh.summary.total !== baseline
            ? `Os valores foram atualizados: total ${formatEth(baseline)} → ${formatEth(fresh.summary.total)}.`
            : null,
        )
        setStep('review')
      },
      onError: (error) => setFormError(reasonOf(error, 'Não foi possível revisar o pedido.')),
    })
  }

  const onConfirm = () => {
    if (!quote || !connection) return
    setFormError(null)
    const buyer = buyerSchema.parse(form.getValues())
    placeOrder.mutate(
      { quoteId: quote.id, connectionId: connection.id, buyer },
      {
        onError: (error) => {
          const fresh = staleQuoteOf(error)
          if (fresh) {
            // Values changed on the server: show them and require a new confirmation.
            setQuote(fresh)
            setNotice(reasonOf(error, 'Os valores mudaram. Confira e confirme novamente.'))
                return
          }
          if (error instanceof ApiError && error.code === 'CONFLICT') {
            setConnection(null)
            setStep('edit')
            setConnectionMessage(error.message)
            return
          }
          if (error instanceof ApiError && error.code === 'VALIDATION_ERROR') {
            setStep('edit')
            setFormError(applyApiError(error, form.setError, BUYER_FIELDS))
            return
          }
          setFormError(
            error instanceof ApiError && (error.code === 'TIMEOUT' || error.code === 'NETWORK_ERROR')
              ? 'Não conseguimos confirmar o envio do pedido. Tente novamente: se ele já foi criado, você será levado a ele, sem cobrança duplicada.'
              : reasonOf(error, 'Não foi possível concluir a compra.'),
          )
        },
      },
    )
  }

  const busy = connect.isPending || createQuote.isPending || placeOrder.isPending

  // Realtime: while reviewing, the cart (refetched on nft.updated) may drift from the quote.
  // A drifted quote can't be confirmed: the user must refresh it and see the new values.
  const quoteOutdated =
    step === 'review' &&
    quote !== null &&
    (cart.summary.total !== quote.summary.total ||
      quote.lines.some((ql) => {
        const cl = cart.lines.find((l) => l.nftId === ql.nftId && l.editionId === ql.editionId)
        return !cl || cl.issue !== null || cl.unitPrice !== ql.unitPrice || cl.quantity !== ql.quantity
      }))
  const lines = step === 'review' && quote ? quote.lines : cart.lines
  const summary = step === 'review' && quote ? quote.summary : cart.summary

  return (
    <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_405px] md:gap-8">
      <div className="space-y-10">
        {step === 'edit' ? (
          <>
            <BuyerSection form={form} errors={errors} />
            <WalletChoice
              wallets={wallets}
              value={walletChoice}
              onChange={chooseWallet}
              otherAddress={otherAddress}
              onOtherAddressChange={(v) => {
                setOtherAddress(v)
                setOtherAddressError(undefined)
                dropConnection('A carteira mudou. Conecte novamente.')
              }}
              otherAddressError={otherAddressError}
            />
          </>
        ) : (
          quote && (
            <ReviewSection
              headingRef={reviewHeading}
              quote={quote}
              notice={notice}
              buyer={form.getValues()}
              connection={connection}
              onEdit={() => setStep('edit')}
            />
          )
        )}
      </div>

      <aside aria-label="Resumo do pedido" className="space-y-5">
        <h2 className="text-lg font-bold">Seus NFTs</h2>
        <OrderLines lines={lines} />
        {step === 'edit' && (
          <p className="text-center text-sm">
            Tem um código promocional?{' '}
            <Link to="/cart" className="text-primary underline underline-offset-4">
              Aplique aqui
            </Link>
          </p>
        )}
        <SummaryRows summary={summary} />

        <WalletAndNetwork
          provider={provider}
          network={network}
          disabled={busy || step === 'review'}
          onProviderChange={(p) => {
            setProvider(p)
            dropConnection('O tipo de carteira mudou. Conecte novamente.')
          }}
          onNetworkChange={(n) => {
            setNetwork(n)
            dropConnection('A rede mudou. Conecte novamente.')
          }}
        />

        <div className="bg-card space-y-3 rounded-md p-4" aria-live="polite">
          {connection ? (
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="text-success size-4" aria-hidden />
                <span>
                  Conectada: <strong>{shortAddress(connection.address)}</strong> · {NETWORK_LABEL[connection.network]}
                </span>
              </p>
              <Button variant="outline" size="sm" onClick={onDisconnect} disabled={placeOrder.isPending}>
                <Unplug aria-hidden /> Desconectar
              </Button>
            </div>
          ) : (
            <Button ref={connectButton} variant="outline" className="w-full" onClick={onConnect} disabled={busy || !address && walletChoice !== 'other'}>
              {connect.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <PlugZap aria-hidden />}
              {connect.isPending ? 'Aguardando a carteira…' : `Conectar ${PROVIDER_LABEL[provider]}`}
            </Button>
          )}
          {connectionMessage && <p className="text-destructive text-sm">{connectionMessage}</p>}
        </div>

        <FormError message={formError} />
        {quoteOutdated && (
          <p role="alert" className="border-primary bg-primary/10 rounded-md border px-3 py-2 text-sm">
            Os preços ou a disponibilidade mudaram enquanto você revisava. Atualize a cotação para ver os novos
            valores antes de confirmar.
          </p>
        )}

        {step === 'edit' || quoteOutdated ? (
          <Button className="h-11 w-full text-base font-bold max-md:h-14 max-md:rounded-3xl" onClick={onReview} disabled={busy}>
            {createQuote.isPending && <Loader2 className="animate-spin" aria-hidden />}
            {quoteOutdated ? 'Atualizar cotação' : 'Revisar pedido'}
          </Button>
        ) : (
          <Button
            className="h-11 w-full text-base font-bold max-md:h-14 max-md:rounded-3xl"
            onClick={onConfirm}
            disabled={busy || !connection}
          >
            {placeOrder.isPending && <Loader2 className="animate-spin" aria-hidden />}
            {placeOrder.isPending ? 'Enviando pedido…' : 'Confirmar compra'}
          </Button>
        )}
      </aside>
    </div>
  )
}

function BuyerSection({
  form,
  errors,
}: {
  form: ReturnType<typeof useForm<BuyerFormValues, unknown, BuyerOutput>>
  errors: ReturnType<typeof useForm<BuyerFormValues, unknown, BuyerOutput>>['formState']['errors']
}) {
  const field = (name: Path<BuyerFormValues>, label: string, opts: { type?: string; required?: boolean; autoComplete?: string } = {}) => (
    <Field label={label} required={opts.required ?? true} error={errors[name as keyof typeof errors]?.message}>
      {({ inputId, describedBy, invalid, required }) => (
        <TextInput
          id={inputId}
          type={opts.type ?? 'text'}
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
    <section aria-labelledby="buyer-title" className="space-y-5">
      <h2 id="buyer-title" className="text-lg font-bold">
        Perfil do colecionador
      </h2>
      <div className="grid gap-x-7 gap-y-5 md:grid-cols-2">
        {field('displayName', 'Nome de exibição', { autoComplete: 'name' })}
        {field('username', 'Nome de usuário', { autoComplete: 'username' })}
        {field('email', 'E-mail', { type: 'email', autoComplete: 'email' })}
        {field('referralCode', 'Código de indicação (opcional)', { required: false })}
      </div>
      <Field label="Observação do colecionador (opcional)" error={errors.note?.message} className="max-w-[350px]">
        {({ inputId, describedBy, invalid }) => (
          <TextArea id={inputId} aria-invalid={invalid} aria-describedby={describedBy} {...form.register('note')} />
        )}
      </Field>
    </section>
  )
}

function WalletAndNetwork({
  provider,
  network,
  disabled,
  onProviderChange,
  onNetworkChange,
}: {
  provider: WalletProvider
  network: Network
  disabled: boolean
  onProviderChange: (p: WalletProvider) => void
  onNetworkChange: (n: Network) => void
}) {
  const name = useId()
  return (
    <fieldset className="space-y-3" disabled={disabled}>
      <legend className="mb-3 w-full text-center text-lg font-bold">Carteira e rede</legend>
      {WALLET_PROVIDERS.map((p) => (
        <label
          key={p}
          className={cn(
            'bg-card flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3',
            'has-[:focus-visible]:outline-ring has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2',
            provider === p ? 'border-foreground' : 'border-border',
          )}
        >
          <input type="radio" name={name} checked={provider === p} onChange={() => onProviderChange(p)} className="accent-primary size-4" />
          {PROVIDER_LABEL[p]}
        </label>
      ))}
      <Field label="Rede" required>
        {({ inputId, required }) => (
          <SelectInput id={inputId} aria-required={required} value={network} onChange={(e) => onNetworkChange(e.target.value as Network)}>
            {NETWORKS.map((n) => (
              <option key={n} value={n}>{NETWORK_LABEL[n]}</option>
            ))}
          </SelectInput>
        )}
      </Field>
    </fieldset>
  )
}

function ReviewSection({
  headingRef,
  quote,
  notice,
  buyer,
  connection,
  onEdit,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>
  quote: CheckoutQuote
  notice: string | null
  buyer: BuyerFormValues
  connection: WalletConnection | null
  onEdit: () => void
}) {
  // Focus the review on entry and whenever a new quote replaces it (values changed).
  useEffect(() => {
    headingRef.current?.focus()
  }, [headingRef, quote.id])

  return (
    <section aria-labelledby="review-title" className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 id="review-title" ref={headingRef} tabIndex={-1} className="text-lg font-bold outline-none">
          Revise seu pedido
        </h2>
        <button type="button" onClick={onEdit} className="text-primary text-sm font-bold hover:underline">
          Voltar e editar
        </button>
      </div>
      {notice && (
        <p role="alert" className="border-primary bg-primary/10 rounded-md border px-3 py-2 text-sm">
          {notice}
        </p>
      )}
      <dl className="bg-card grid gap-4 rounded-md p-4 text-sm sm:grid-cols-2">
        <div><dt className="text-subtle-foreground">Colecionador</dt><dd>{buyer.displayName} (@{buyer.username})</dd></div>
        <div><dt className="text-subtle-foreground">E-mail</dt><dd>{buyer.email}</dd></div>
        <div>
          <dt className="text-subtle-foreground">Carteira</dt>
          <dd>{connection ? `${PROVIDER_LABEL[connection.provider]} · ${shortAddress(connection.address)}` : '—'}</dd>
        </div>
        <div><dt className="text-subtle-foreground">Rede</dt><dd>{connection ? NETWORK_LABEL[connection.network] : '—'}</dd></div>
        {quote.coupon && <div><dt className="text-subtle-foreground">Cupom</dt><dd>{quote.coupon.label}</dd></div>}
        <div>
          <dt className="text-subtle-foreground">Cotação válida até</dt>
          <dd>{new Date(quote.expiresAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</dd>
        </div>
      </dl>
      <p className="text-muted-foreground text-sm">
        Ao confirmar, o valor de <strong className="text-foreground">{formatEth(quote.summary.total)}</strong> será
        solicitado à sua carteira. Os NFTs são transferidos após a confirmação na rede.
      </p>
    </section>
  )
}
