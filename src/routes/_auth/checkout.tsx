import { createFileRoute } from '@tanstack/react-router'

import { PlaceholderPage } from '@/components/layout/placeholder-page'

export const Route = createFileRoute('/_auth/checkout')({
  component: () => <PlaceholderPage title="Pagamento com carteira" description="Dados do colecionador, carteira, rede e revisão do pedido." />,
})
