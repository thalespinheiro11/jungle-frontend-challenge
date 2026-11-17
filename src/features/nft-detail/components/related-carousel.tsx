import { useQuery } from '@tanstack/react-query'

import { relatedNftsQuery } from '@/features/catalog/api'
import { NftRail } from '@/features/catalog/components/nft-rail'

export function RelatedCarousel({ nftId }: { nftId: string }) {
  const query = useQuery(relatedNftsQuery(nftId))
  return <NftRail title="Mais desta coleção" items={query.data} isPending={query.isPending} />
}
