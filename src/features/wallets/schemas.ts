import { z } from 'zod'

import { NETWORKS, WALLET_PROVIDERS, type Wallet } from '@/lib/api/contracts'
import { emailSchema } from '@/features/session/schemas'

/** Shared by the wallet form and the mock API (server-side validation). */
export const walletAddressSchema = z
  .string()
  .trim()
  .min(1, 'Informe o endereço da carteira.')
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Use um endereço 0x com 40 caracteres hexadecimais.')

export const walletInputSchema = z.object({
  displayName: z.string().trim().min(2, 'Informe o nome de exibição.').max(40, 'Máximo de 40 caracteres.'),
  nickname: z.string().trim().min(2, 'Informe um apelido para a carteira.').max(30, 'Máximo de 30 caracteres.'),
  network: z.enum(NETWORKS, { error: 'Selecione uma rede.' }),
  profileName: z.string().trim().min(2, 'Informe o nome do perfil.').max(40, 'Máximo de 40 caracteres.'),
  address: walletAddressSchema,
  ensOrSecondary: z
    .string()
    .trim()
    .max(64, 'Máximo de 64 caracteres.')
    .refine((v) => !v || /^0x[a-fA-F0-9]{40}$/.test(v) || /^[a-z0-9-]+(\.[a-z0-9-]+)*\.eth$/i.test(v), {
      message: 'Use um nome ENS (ex.: nome.eth) ou um endereço 0x.',
    })
    .transform((v) => v || null)
    .nullable(),
  provider: z.enum(WALLET_PROVIDERS, { error: 'Selecione o tipo de carteira.' }),
  referralCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9]{4,12}$/, 'O código de indicação tem de 4 a 12 letras ou números.'),
  email: emailSchema,
  ensName: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{3,32}$/, 'Use de 3 a 32 letras minúsculas, números ou hífen.'),
})

export type WalletFormValues = z.input<typeof walletInputSchema>

export const PROVIDER_LABEL = {
  metamask: 'MetaMask',
  walletconnect: 'WalletConnect',
  coinbase: 'Coinbase Wallet',
} as const

export const NETWORK_LABEL = { ethereum: 'Ethereum', polygon: 'Polygon', solana: 'Solana' } as const

export const shortAddress = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`

/** Form values for a wallet (empty strings for a new one). */
export function toFormValues(wallet: Wallet | null | undefined): WalletFormValues {
  return {
    displayName: wallet?.displayName ?? '',
    nickname: wallet?.nickname ?? '',
    network: wallet?.network ?? ('' as WalletFormValues['network']),
    profileName: wallet?.profileName ?? '',
    address: wallet?.address ?? '',
    ensOrSecondary: wallet?.ensOrSecondary ?? '',
    provider: wallet?.provider ?? ('' as WalletFormValues['provider']),
    referralCode: wallet?.referralCode ?? '',
    email: wallet?.email ?? '',
    ensName: wallet?.ensName ?? '',
  }
}
