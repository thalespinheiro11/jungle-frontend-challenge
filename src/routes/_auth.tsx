import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

import { sessionQuery } from '@/features/session/api'
import { tokenStore } from '@/features/session/token-store'

/**
 * Pathless layout guarding private routes (checkout, orders, profile, wallets).
 * The session is re-validated with the API on every private navigation (staleTime 0), so an
 * expired session is caught on navigation and not only on the next private request.
 * Visitors without a valid session go to /login with the attempted URL, so login returns
 * them to it; `reason=expired` tells them why when they did have a session.
 */
export const Route = createFileRoute('/_auth')({
  beforeLoad: async ({ context: { queryClient }, location }) => {
    const hadToken = Boolean(tokenStore.get())
    const session = await queryClient.fetchQuery({ ...sessionQuery(), staleTime: 0 })
    if (!session) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href, reason: hadToken ? 'expired' : undefined },
      })
    }
    return { session }
  },
  component: Outlet,
})
