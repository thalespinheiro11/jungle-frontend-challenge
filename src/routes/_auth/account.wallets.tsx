import { createFileRoute } from '@tanstack/react-router'

import { PlaceholderPage } from '@/components/layout/placeholder-page'

export const Route = createFileRoute('/_auth/account/wallets')({
  component: () => <PlaceholderPage title="Carteiras" description="Carteiras principal e secundária." />,
})
