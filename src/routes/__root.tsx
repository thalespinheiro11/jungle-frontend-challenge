import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Outlet, useRouterState } from '@tanstack/react-router'

import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'
import { NotFound } from '@/components/layout/route-states'
import { Toaster } from '@/components/ui/sonner'
import { useSession } from '@/features/session/hooks'
import { useSessionExpiry } from '@/features/session/use-session-expiry'
import { useRealtimeSync } from '@/lib/realtime/use-realtime-sync'

export interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: () => <NotFound />,
})

function RootLayout() {
  const { session, isPending } = useSession()
  // Wait for the stored session to resolve so the first socket already carries the token.
  useRealtimeSync(session?.accessToken ?? null, !isPending)
  useSessionExpiry()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const isAuthScreen = pathname === '/login' || pathname === '/signup'

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#conteudo"
        className="bg-primary text-primary-foreground sr-only z-50 rounded px-4 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Pular para o conteúdo
      </a>
      <SiteHeader />
      <main id="conteudo" tabIndex={-1} className="flex-1 outline-none">
        <Outlet />
      </main>
      <div className={isAuthScreen ? 'hidden md:block' : undefined}>
        <SiteFooter />
      </div>
      <Toaster position="bottom-right" />
    </div>
  )
}
