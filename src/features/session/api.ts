import { queryOptions, type QueryClient } from '@tanstack/react-query'

import type { LoginRequest, Session, SignupRequest } from '@/lib/api/contracts'
import { ApiError, api } from '@/lib/api/http'

import { tokenStore } from './token-store'

/**
 * Query key conventions:
 * - ['session']           current session (null when anonymous)
 * - ['me', userId, ...]   private data of the signed-in user (favorites, cart, orders,
 *                         profile, wallets). Scoped by user id so data can never be served
 *                         to another user, and dropped wholesale on logout / user switch.
 */
export const sessionKeys = {
  current: ['session'] as const,
}
export const privateKeys = {
  all: ['me'] as const,
  user: (userId: string) => ['me', userId] as const,
}

/** Resolves to `null` for anonymous visitors instead of erroring, so guards can branch on it. */
export const sessionQuery = () =>
  queryOptions({
    queryKey: sessionKeys.current,
    queryFn: async ({ signal }): Promise<Session | null> => {
      if (!tokenStore.get()) return null
      try {
        return await api.get<Session>('/session', { signal })
      } catch (error) {
        if (error instanceof ApiError && error.isAuthError) return null
        throw error
      }
    },
    staleTime: 60_000,
  })

export const sessionApi = {
  login: (body: LoginRequest) => api.post<Session>('/auth/login', body),
  signup: (body: SignupRequest) => api.post<Session>('/auth/signup', body),
  logout: () => api.post<void>('/auth/logout'),
}

/** Drops every private query and in-flight request of the previous user. */
export async function clearPrivateData(queryClient: QueryClient) {
  await queryClient.cancelQueries({ queryKey: privateKeys.all })
  queryClient.removeQueries({ queryKey: privateKeys.all })
}

/**
 * Installs a freshly issued session (login / signup). Handles user switch.
 * `prepare` runs with the new token already active but *before* the session is published to
 * the cache — i.e. before any component switches to the user's private queries. Used to
 * merge the guest cart without racing the user's first cart fetch.
 */
export async function startSession(
  queryClient: QueryClient,
  session: Session,
  prepare?: () => Promise<void>,
) {
  const previous = queryClient.getQueryData<Session | null>(sessionKeys.current)
  if (previous && previous.user.id !== session.user.id) await clearPrivateData(queryClient)
  tokenStore.set(session.accessToken)
  await prepare?.()
  queryClient.setQueryData(sessionKeys.current, session)
}

/**
 * Local teardown shared by logout and expiry. The token and the cached session are cleared
 * synchronously, so any navigation right after this call (e.g. to /login) already sees an
 * anonymous visitor; private data is then cancelled and dropped.
 */
export function endSession(queryClient: QueryClient) {
  tokenStore.clear()
  queryClient.setQueryData(sessionKeys.current, null)
  return clearPrivateData(queryClient)
}

/** Only same-origin paths are accepted as post-login destinations (no open redirects). */
export function safeRedirect(target: string | undefined, fallback = '/') {
  return target && target.startsWith('/') && !target.startsWith('//') ? target : fallback
}
