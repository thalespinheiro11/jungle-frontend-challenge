import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'

import type { LoginRequest, SignupRequest } from '@/lib/api/contracts'

import { endSession, safeRedirect, sessionApi, sessionQuery, startSession } from './api'

export function useSession() {
  const query = useQuery(sessionQuery())
  return { session: query.data ?? null, user: query.data?.user ?? null, isPending: query.isPending }
}

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
      await startSession(queryClient, session)
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
