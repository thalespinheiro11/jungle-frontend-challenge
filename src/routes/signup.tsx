import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'

import { safeRedirect, sessionQuery } from '@/features/session/api'
import { AuthShell } from '@/features/session/components/auth-shell'
import { SignupForm } from '@/features/session/components/signup-form'
import { useIsDesktop } from '@/hooks/use-media-query'

export const Route = createFileRoute('/signup')({
  validateSearch: z.object({ redirect: z.string().optional().catch(undefined) }),
  beforeLoad: async ({ context: { queryClient }, search }) => {
    const session = await queryClient.ensureQueryData(sessionQuery())
    if (session) throw redirect({ href: safeRedirect(search.redirect) })
  },
  component: SignupPage,
})

function SignupPage() {
  const { redirect: target } = Route.useSearch()
  const isDesktop = useIsDesktop()
  return (
    <AuthShell mode="signup" redirect={target}>
      {/* Button label follows each frame: "Criar conta" (desktop) / "Criar perfil" (mobile). */}
      <SignupForm submitLabel={isDesktop ? 'Criar conta' : 'Criar perfil'} />
    </AuthShell>
  )
}
