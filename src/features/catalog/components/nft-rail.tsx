import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useId, useRef } from 'react'

import type { NftSummary } from '@/lib/api/contracts'

import { NftCard, NftCardSkeleton } from './nft-card'

/** Horizontal NFT row (scroll-snap) with previous/next controls. Hidden when empty. */
export function NftRail({
  title,
  items,
  isPending,
  className,
}: {
  title: string
  items: NftSummary[] | undefined
  isPending: boolean
  className?: string
}) {
  const titleId = useId()
  const track = useRef<HTMLUListElement>(null)
  const scroll = (direction: 1 | -1) =>
    track.current?.scrollBy({ left: direction * track.current.clientWidth, behavior: 'smooth' })

  if (!isPending && !items?.length) return null

  return (
    <section aria-labelledby={titleId} className={className ?? 'container-page mt-16 md:mt-24'}>
      <div className="border-border mb-8 flex items-center justify-between border-b pb-3">
        <h2 id={titleId} className="text-primary text-lg font-bold">
          {title}
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
      <ul ref={track} className="-mx-1 flex snap-x snap-mandatory gap-6 overflow-x-auto px-1 pb-2 [scrollbar-width:none]">
        {isPending
          ? Array.from({ length: 5 }, (_, i) => (
              <li key={i} className="w-[46%] shrink-0 sm:w-[30%] lg:w-[calc(20%-1.2rem)]">
                <NftCardSkeleton />
              </li>
            ))
          : (items ?? []).map((nft) => (
              <li key={nft.id} className="w-[46%] shrink-0 snap-start sm:w-[30%] lg:w-[calc(20%-1.2rem)]">
                <NftCard nft={nft} />
              </li>
            ))}
      </ul>
    </section>
  )
}
