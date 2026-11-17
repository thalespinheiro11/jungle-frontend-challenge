import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { privateKeys } from '@/features/session/api'
import { useSession } from '@/features/session/use-session'
import type { Wallet, WalletInput, WalletList, WalletSlot } from '@/lib/api/contracts'
import { api } from '@/lib/api/http'

export const walletKeys = {
  list: (userId: string) => [...privateKeys.user(userId), 'wallets'] as const,
}

export const walletsQuery = (userId: string) =>
  queryOptions({
    queryKey: walletKeys.list(userId),
    queryFn: ({ signal }) => api.get<WalletList>('/me/wallets', { signal }),
  })

export function useWallets() {
  const { user } = useSession()
  return useQuery({ ...walletsQuery(user?.id ?? 'anonymous'), enabled: Boolean(user) })
}

export function useSaveWallet(slot: WalletSlot) {
  const queryClient = useQueryClient()
  const { user } = useSession()
  return useMutation({
    mutationFn: (input: WalletInput) => api.put<Wallet>(`/me/wallets/${slot}`, input),
    onSuccess: (wallet) => {
      if (!user) return
      queryClient.setQueryData<WalletList>(walletKeys.list(user.id), (current) => ({
        primary: current?.primary ?? null,
        secondary: current?.secondary ?? null,
        [slot]: wallet,
      }))
    },
  })
}
