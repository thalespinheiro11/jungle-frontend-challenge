import { createFileRoute } from '@tanstack/react-router'

import { AccountLayout } from '@/components/layout/account-layout'

export const Route = createFileRoute('/_auth/account/profile')({
  component: () => (
    <AccountLayout title="Perfil do colecionador">
      <p className="text-lg font-bold">Dados do perfil</p>
      <p className="text-muted-foreground mt-2">Dados pessoais, avatar e senha.</p>
      <p className="text-subtle-foreground mt-2 text-sm">Tela em construção.</p>
    </AccountLayout>
  ),
})
