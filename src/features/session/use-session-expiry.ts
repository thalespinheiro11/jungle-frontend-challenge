import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { sessionKeys } from './api'
import { useSession } from './hooks'

/**
 * Detects expiry while the user is idle on a page: when `expiresAt` passes, the session is
 * re-validated with the API. An expired answer flows through the normal auth-failure path
 * (toast + redirect from private screens), so there is a single expiry behaviour.
 */
export function useSessionExpiry() {
  const queryClient = useQueryClient()
  const { session } = useSession()
  const expiresAt = session?.expiresAt

  useEffect(() => {
    if (!expiresAt) return
    const delay = Math.max(0, Date.parse(expiresAt) - Date.now()) + 500
    const timer = setTimeout(() => {
      void queryClient.invalidateQueries({ queryKey: sessionKeys.current })
    }, delay)
    return () => clearTimeout(timer)
  }, [expiresAt, queryClient])
}
