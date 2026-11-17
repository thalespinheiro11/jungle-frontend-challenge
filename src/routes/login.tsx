import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'

import { safeRedirect, sessionQuery } from '@/features/session/api'
import { AuthShell } from '@/features/session/components/auth-shell'
import { LoginForm } from '@/features/session/components/login-form'

export const authSearchSchema = z.object({
  redirect: z.string().optional().catch(undefined),
  reason: z.enum(['expired']).optional().catch(undefined),
})

export const Route = createFileRoute('/login')({
  validateSearch: authSearchSchema,
  // Already signed in: go straight to the destination.
  beforeLoad: async ({ context: { queryClient }, search }) => {
    const session = await queryClient.ensureQueryData(sessionQuery())
    if (session) throw redirect({ href: safeRedirect(search.redirect) })
  },
  component: LoginPage,
})

function LoginPage() {
  const { redirect: target, reason } = Route.useSearch()
  return (
    <AuthShell
      mode="login"
      redirect={target}
      notice={
        reason === 'expired' ? (
          <p role="status" className="bg-secondary rounded-md px-3 py-2 text-sm">
            Sua sessão expirou. Entre novamente para continuar de onde parou.
          </p>
        ) : null
      }
    >
      <LoginForm />
    </AuthShell>
  )
}
