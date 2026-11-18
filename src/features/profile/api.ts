import { queryOptions, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'

import { privateKeys, sessionKeys } from '@/features/session/api'
import { useSession } from '@/features/session/use-session'
import type {
  ChangePasswordRequest,
  Profile,
  Session,
  UpdateProfileRequest,
} from '@/lib/api/contracts'
import { api } from '@/lib/api/http'

export const profileKeys = {
  detail: (userId: string) => [...privateKeys.user(userId), 'profile'] as const,
}

export const profileQuery = (userId: string) =>
  queryOptions({
    queryKey: profileKeys.detail(userId),
    queryFn: ({ signal }) => api.get<Profile>('/me/profile', { signal }),
  })

export function useProfile() {
  const { user } = useSession()
  return useQuery({ ...profileQuery(user?.id ?? 'anonymous'), enabled: Boolean(user) })
}

/**
 * A saved profile updates both caches: the profile itself and the session user, which feeds
 * the header (name, username, avatar) — no refetch, no stale header after saving.
 */
function storeProfile(queryClient: QueryClient, profile: Profile) {
  queryClient.setQueryData(profileKeys.detail(profile.id), profile)
  queryClient.setQueryData<Session | null>(sessionKeys.current, (session) =>
    session && session.user.id === profile.id
      ? {
          ...session,
          user: {
            ...session.user,
            name: profile.displayName,
            username: profile.username,
            email: profile.email,
            avatarUrl: profile.avatarUrl,
          },
        }
      : session,
  )
}

function useProfileMutation<TVars>(mutationFn: (vars: TVars) => Promise<Profile>) {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn, onSuccess: (profile) => storeProfile(queryClient, profile) })
}

export const useUpdateProfile = () =>
  useProfileMutation((body: UpdateProfileRequest) => api.patch<Profile>('/me/profile', body))
export const useUpdateAvatar = () =>
  useProfileMutation((dataUrl: string) => api.put<Profile>('/me/avatar', { dataUrl }))
export const useRemoveAvatar = () => useProfileMutation(() => api.delete<Profile>('/me/avatar'))

export const useChangePassword = () =>
  useMutation({ mutationFn: (body: ChangePasswordRequest) => api.post<void>('/me/password', body) })
