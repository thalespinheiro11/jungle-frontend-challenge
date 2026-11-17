import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'

import { NotFound, PageSkeleton, QueryError } from '@/components/layout/route-states'
import { nftDetailQuery } from '@/features/catalog/api'
import { ApiError } from '@/lib/api/http'
import { formatEth } from '@/lib/money'

export const Route = createFileRoute('/nfts/$nftId')({
  loader: ({ context: { queryClient }, params }) => {
    void queryClient.prefetchQuery(nftDetailQuery(params.nftId))
  },
  component: NftDetailPage,
})

/** Skeleton page for now: proves direct access, 404 handling and realtime price updates. */
function NftDetailPage() {
  const { nftId } = Route.useParams()
  const query = useQuery(nftDetailQuery(nftId))

  if (query.isPending) return <PageSkeleton />
  if (query.isError) {
    if (query.error instanceof ApiError && query.error.code === 'NOT_FOUND') {
      return <NotFound title="NFT não encontrado" description="Este NFT não existe ou foi removido." />
    }
    return <QueryError error={query.error} onRetry={() => query.refetch()} />
  }

  const nft = query.data
  return (
    <div className="container-page py-8">
      <nav aria-label="Trilha de navegação" className="mb-4 text-sm font-medium">
        <Link to="/" className="hover:text-primary">
          Início
        </Link>{' '}
        / <span aria-current="page">Mercado</span>
      </nav>
      <div className="grid gap-8 md:grid-cols-2">
        <img
          src={nft.image}
          alt={nft.imageAlt}
          width={430}
          height={430}
          className="bg-card aspect-square w-full rounded-xl object-cover"
        />
        <div>
          <h1 className="text-3xl font-bold">{nft.name}</h1>
          <p className="text-primary mt-2 text-2xl font-bold">{formatEth(nft.price)}</p>
          <p className="text-muted-foreground mt-4">{nft.description}</p>
        </div>
      </div>
    </div>
  )
}
