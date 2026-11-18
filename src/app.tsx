import { QueryClientProvider } from '@tanstack/react-query'
import { createRouter, RouterProvider } from '@tanstack/react-router'

import { RouteError } from '@/components/layout/route-states'
import { installSessionHandling } from '@/features/session/session-handling'
import { createQueryClient } from '@/lib/query-client'
import { parseSearch, stringifySearch } from '@/lib/search-params'

import { routeTree } from './routeTree.gen'

function createAppRouter(queryClient: ReturnType<typeof createQueryClient>) {
  return createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: 'intent',
    // Loaders only seed the Query cache; Query owns freshness, so the router never caches.
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: RouteError,
    scrollRestoration: true,
    // Repeated keys for arrays (?network=ethereum&network=polygon) instead of JSON.
    parseSearch,
    stringifySearch,
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}

// Created once per page load at module level, not in a useState initializer: StrictMode
// calls initializers twice, which would wire session handling to a discarded router.
const queryClient = createQueryClient()
const router = createAppRouter(queryClient)
installSessionHandling(router, queryClient)

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
