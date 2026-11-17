import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

import { sessionQuery } from '@/features/session/api'

/**
 * Pathless layout guarding private routes (checkout, orders, profile, wallets).
 * Anonymous visitors go to /login with the attempted URL, so login returns them to it.
 */
export const Route = createFileRoute('/_auth')({
  beforeLoad: async ({ context: { queryClient }, location }) => {
    const session = await queryClient.ensureQueryData(sessionQuery())
    if (!session) {
      throw redirect({ to: '/login', search: { redirect: location.href } })
    }
    return { session }
  },
  component: Outlet,
})
