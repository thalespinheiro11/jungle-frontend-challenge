import { createFileRoute } from '@tanstack/react-router'

import { PlaceholderPage } from '@/components/layout/placeholder-page'

export const Route = createFileRoute('/_auth/account/profile')({
  component: () => <PlaceholderPage title="Perfil do colecionador" description="Dados pessoais, avatar e senha." />,
})
