import { createFileRoute, Link } from '@tanstack/react-router'

import { AccountLayout } from '@/components/layout/account-layout'
import { QueryError } from '@/components/layout/route-states'
import { Button } from '@/components/ui/button'
import { NftCard, NftCardSkeleton } from '@/features/catalog/components/nft-card'
import { useFavorites } from '@/features/favorites/api'

export const Route = createFileRoute('/_auth/account/favorites')({
  component: FavoritesPage,
})

/** "Lista de interesse": the signed-in user's favorites (persisted per user by the API). */
function FavoritesPage() {
  const { query } = useFavorites()

  return (
    <AccountLayout title="Lista de interesse">
      <h2 className="mb-6 font-bold">Lista de interesse</h2>
      {query.isPending ? (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-3" aria-busy="true">
          <span role="status" className="sr-only">Carregando favoritos…</span>
          {Array.from({ length: 3 }, (_, i) => (
            <li key={i}>
              <NftCardSkeleton />
            </li>
          ))}
        </ul>
      ) : query.isError ? (
        <QueryError error={query.error} onRetry={() => query.refetch()} />
      ) : query.data.items.length === 0 ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-muted-foreground">Você ainda não favoritou nenhum NFT.</p>
          <Button asChild>
            <Link to="/" hash="catalogo">Explorar NFTs</Link>
          </Button>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-3">
          {query.data.items.map((nft) => (
            <li key={nft.id}>
              <NftCard nft={nft} />
            </li>
          ))}
        </ul>
      )}
    </AccountLayout>
  )
}
