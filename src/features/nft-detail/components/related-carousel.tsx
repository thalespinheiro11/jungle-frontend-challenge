import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRef } from 'react'

import { relatedNftsQuery } from '@/features/catalog/api'
import { NftCard, NftCardSkeleton } from '@/features/catalog/components/nft-card'

/** "Mais desta coleção": scroll-snap row with previous/next controls. */
export function RelatedCarousel({ nftId }: { nftId: string }) {
  const query = useQuery(relatedNftsQuery(nftId))
  const track = useRef<HTMLUListElement>(null)

  const scroll = (direction: 1 | -1) =>
    track.current?.scrollBy({ left: direction * track.current.clientWidth, behavior: 'smooth' })

  if (query.isSuccess && query.data.length === 0) return null

  return (
    <section aria-labelledby="related-title" className="container-page mt-16 md:mt-24">
      <div className="border-border mb-8 flex items-center justify-between border-b pb-3">
        <h2 id="related-title" className="text-primary text-lg font-bold">
          Mais desta coleção
        </h2>
        <div className="flex gap-2">
          <button type="button" onClick={() => scroll(-1)} aria-label="Anteriores" className="border-border grid size-8 place-items-center rounded-full border">
            <ChevronLeft className="size-4" aria-hidden />
          </button>
          <button type="button" onClick={() => scroll(1)} aria-label="Próximos" className="border-border grid size-8 place-items-center rounded-full border">
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </div>
      </div>
      <ul
        ref={track}
        className="-mx-1 flex snap-x snap-mandatory gap-6 overflow-x-auto px-1 pb-2 [scrollbar-width:none]"
      >
        {query.isPending
          ? Array.from({ length: 5 }, (_, i) => (
              <li key={i} className="w-[46%] shrink-0 sm:w-[30%] lg:w-[calc(20%-1.2rem)]">
                <NftCardSkeleton />
              </li>
            ))
          : (query.data ?? []).map((nft) => (
              <li key={nft.id} className="w-[46%] shrink-0 snap-start sm:w-[30%] lg:w-[calc(20%-1.2rem)]">
                <NftCard nft={nft} />
              </li>
            ))}
      </ul>
    </section>
  )
}
