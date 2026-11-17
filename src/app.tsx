import { QueryClientProvider } from '@tanstack/react-query'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { useState } from 'react'

import { RouteError } from '@/components/layout/route-states'
import { createQueryClient } from '@/lib/query-client'

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
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}

export function App() {
  const [queryClient] = useState(createQueryClient)
  const [router] = useState(() => createAppRouter(queryClient))

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
