import type { QueryClient } from '@tanstack/react-query'
import type { AnyRouter } from '@tanstack/react-router'
import { toast } from 'sonner'

import { setAccessTokenGetter, setAuthFailureHandler } from '@/lib/api/http'

import { endSession } from './api'
import { tokenStore } from './token-store'

/** Whether the URL currently shown belongs to a private (guarded) route. */
function isOnPrivateRoute(router: AnyRouter) {
  // Matched from the URL itself rather than router.state.matches, which can still hold the
  // previous screen's matches right after a programmatic history push.
  return router
    .matchRoutes(router.state.location)
    .some((match) => match.routeId.startsWith('/_auth'))
}

/**
 * Wires the HTTP layer to the session lifecycle (called once at app start):
 * - every request carries the stored bearer token;
 * - when an authenticated request comes back UNAUTHENTICATED / SESSION_EXPIRED, the local
 *   session is torn down and, on a private screen, the user is sent to /login with the
 *   current URL so they resume exactly where they were after signing in again.
 */
export function installSessionHandling(router: AnyRouter, queryClient: QueryClient) {
  setAccessTokenGetter(tokenStore.get)

  setAuthFailureHandler((error) => {
    if (!tokenStore.get()) return // already handled by a concurrent request
    void endSession(queryClient)

    toast.warning(
      error.code === 'SESSION_EXPIRED'
        ? 'Sua sessão expirou. Entre novamente para continuar.'
        : 'Sua sessão foi encerrada. Entre novamente para continuar.',
      { id: 'session-ended' },
    )

    if (isOnPrivateRoute(router)) {
      void router.navigate({
        to: '/login',
        search: { redirect: router.state.location.href, reason: 'expired' },
      })
    }
  })
}
