import { createFileRoute } from '@tanstack/react-router'

import { PlaceholderPage } from '@/components/layout/placeholder-page'

export const Route = createFileRoute('/_auth/orders/$orderId')({
  component: () => <PlaceholderPage title="Confirmação do pedido" description="Resultado, transação, itens, taxas e total." />,
})
