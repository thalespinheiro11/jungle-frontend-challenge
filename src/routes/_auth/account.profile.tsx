import { createFileRoute } from '@tanstack/react-router'

import { AccountLayout } from '@/components/layout/account-layout'
import { QueryError } from '@/components/layout/route-states'
import { Skeleton } from '@/components/ui/skeleton'
import { useProfile } from '@/features/profile/api'
import { ProfileForm } from '@/features/profile/components/profile-form'

export const Route = createFileRoute('/_auth/account/profile')({
  component: ProfilePage,
})

function ProfilePage() {
  const profile = useProfile()

  return (
    <AccountLayout title="Dados do perfil">
      {profile.isPending ? (
        <div className="space-y-6" aria-busy="true">
          <span role="status" className="sr-only">Carregando perfil…</span>
          <Skeleton className="h-6 w-56" />
          <div className="grid gap-6 md:grid-cols-2">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-[70px] w-full" />
            ))}
          </div>
          <Skeleton className="h-[260px] w-full max-w-[417px]" />
        </div>
      ) : profile.isError ? (
        <QueryError error={profile.error} onRetry={() => profile.refetch()} />
      ) : (
        <ProfileForm key={profile.data.id} profile={profile.data} />
      )}
    </AccountLayout>
  )
}
