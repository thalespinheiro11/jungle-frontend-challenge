import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import { NotFound, QueryError } from '@/components/layout/route-states'
import { nftDetailQuery, relatedNftsQuery } from '@/features/catalog/api'
import { DetailSkeleton } from '@/features/nft-detail/components/detail-skeleton'
import { NftDetailView } from '@/features/nft-detail/components/nft-detail-view'
import { RelatedCarousel } from '@/features/nft-detail/components/related-carousel'
import { ApiError } from '@/lib/api/http'

export const Route = createFileRoute('/nfts/$nftId')({
  loader: ({ context: { queryClient }, params }) => {
    void queryClient.prefetchQuery(nftDetailQuery(params.nftId))
    void queryClient.prefetchQuery(relatedNftsQuery(params.nftId))
  },
  component: NftDetailPage,
})

function NftDetailPage() {
  const { nftId } = Route.useParams()
  const query = useQuery(nftDetailQuery(nftId))

  if (query.isPending) return <DetailSkeleton />
  if (query.isError) {
    if (query.error instanceof ApiError && query.error.code === 'NOT_FOUND') {
      return <NotFound title="NFT não encontrado" description="Este NFT não existe ou foi removido." />
    }
    return (
      <div className="container-page">
        <QueryError error={query.error} onRetry={() => query.refetch()} />
      </div>
    )
  }

  return (
    <>
      {/* key: a different NFT starts with a fresh edition/quantity selection. */}
      <NftDetailView key={query.data.id} nft={query.data} />
      <RelatedCarousel nftId={nftId} />
    </>
  )
}
