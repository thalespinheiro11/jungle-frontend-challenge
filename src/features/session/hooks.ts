import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'

import { mergeGuestCart } from '@/features/cart/api'
import type { LoginRequest, SignupRequest } from '@/lib/api/contracts'

import { endSession, safeRedirect, sessionApi, startSession } from './api'

export { useSession } from './use-session'

/** Login and signup share the post-auth flow: install session, then resume where the user was. */
function useAuthMutation<TBody>(
  request: (body: TBody) => ReturnType<typeof sessionApi.login>,
  successMessage: (name: string) => string,
) {
  const queryClient = useQueryClient()
  const router = useRouter()
  return useMutation({
    mutationFn: request,
    // Toast + navigation live here (not in mutate callbacks): the auth screen unmounts on
    // navigation, and per-call callbacks of an unmounted component are not invoked.
    onSuccess: async (session) => {
      // The visitor's cart follows them into the account (merged before the session is
      // published, so the UI never fetches the user's cart mid-merge).
      await startSession(queryClient, session, () =>
        mergeGuestCart(queryClient, session.user.id).catch(() => {
          toast.warning(
            'Não foi possível trazer os itens do carrinho de visitante agora. Eles continuam salvos e serão incluídos no próximo login.',
          )
        }),
      )
      toast.success(successMessage(session.user.name))
      const search = router.state.location.search as { redirect?: string }
      router.history.push(safeRedirect(search.redirect))
    },
  })
}

export const useLogin = () =>
  useAuthMutation<LoginRequest>(sessionApi.login, (name) => `Bem-vindo de volta, ${name}!`)
export const useSignup = () =>
  useAuthMutation<SignupRequest>(sessionApi.signup, () => 'Conta criada! Boas-vindas à Kurio.')

export function useLogout() {
  const queryClient = useQueryClient()
  const router = useRouter()
  return useMutation({
    // Server revocation is best effort: local teardown happens even if the call fails,
    // so a logout can never leave private data on screen.
    mutationFn: () => sessionApi.logout().catch(() => undefined),
    onSettled: async () => {
      await endSession(queryClient)
      toast.success('Você saiu da sua conta.')
      await router.navigate({ to: '/' })
    },
  })
}
