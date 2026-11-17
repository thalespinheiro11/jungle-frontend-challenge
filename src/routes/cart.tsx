import { createFileRoute } from '@tanstack/react-router'

import { PlaceholderPage } from '@/components/layout/placeholder-page'

export const Route = createFileRoute('/cart')({
  component: () => <PlaceholderPage title="Carrinho de NFTs" description="Itens, quantidades, cupom e resumo de valores." />,
})
