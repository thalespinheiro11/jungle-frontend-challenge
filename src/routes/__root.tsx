import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Outlet, useRouterState } from '@tanstack/react-router'

import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'
import { NotFound } from '@/components/layout/route-states'
import { Toaster } from '@/components/ui/sonner'
import { useSession } from '@/features/session/hooks'
import { useSessionExpiry } from '@/features/session/use-session-expiry'
import { useIsDesktop } from '@/hooks/use-media-query'
import { useRealtimeSync } from '@/lib/realtime/use-realtime-sync'
import { cn } from '@/lib/utils'

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
  useRealtimeSync(session?.accessToken ?? null, session?.user.id ?? null, !isPending)
  useSessionExpiry()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const isAuthScreen = pathname === '/login' || pathname === '/signup'
  const isDetail = pathname.startsWith('/nfts/')
  const isDesktop = useIsDesktop()

  return (
    <div className={cn('flex min-h-dvh flex-col', isDetail && 'pb-40 md:pb-0')}>
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
      {/* Mobile: at the top (bottom toasts would cover the sticky purchase/summary controls),
          offset below the screens' top bars (back / favorite buttons). */}
      <Toaster position={isDesktop ? 'bottom-right' : 'top-center'} mobileOffset={{ top: 72 }} />
    </div>
  )
}
