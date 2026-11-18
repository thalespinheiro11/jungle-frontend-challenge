import { Link } from '@tanstack/react-router'

import { Skeleton } from '@/components/ui/skeleton'
import { FavoriteButton } from '@/features/favorites/favorite-button'
import type { NftSummary } from '@/lib/api/contracts'
import { formatEth } from '@/lib/money'

/** Badge for the scarcer tiers ("RARO" in the layout); common tiers show none. */
const RARITY_BADGE: Record<NftSummary['rarity'], string | null> = {
  common: null,
  uncommon: null,
  rare: 'RARO',
  epic: 'ÉPICO',
}

export function NftCard({ nft, priority = false }: { nft: NftSummary; priority?: boolean }) {
  return (
    <article className="group relative">
      <FavoriteButton
        nft={nft}
        className="bg-background/85 text-foreground absolute top-3 right-3 z-10 size-9 rounded-md"
      />
      <Link
        to="/nfts/$nftId"
        params={{ nftId: nft.id }}
        className="block rounded-md focus-visible:outline-offset-4"
      >
        <div className="bg-card relative p-1 md:p-1">
          {RARITY_BADGE[nft.rarity] && (
            <span className="bg-primary text-primary-foreground absolute top-4 left-1 z-[1] px-2 py-0.5 text-xs font-bold md:text-sm">
              <span className="sr-only">Raridade: </span>
              {RARITY_BADGE[nft.rarity]}
            </span>
          )}
          <img
            src={nft.image}
            alt={nft.imageAlt}
            width={250}
            height={250}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            decoding="async"
            className="aspect-square w-full rounded-xl object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        </div>
        <h3 className="mt-3 text-base">{nft.name}</h3>
      </Link>
      <p className="mt-1 flex flex-wrap items-baseline gap-2 font-bold">
        <span className="text-primary">{formatEth(nft.price)}</span>
        {nft.compareAtPrice && (
          <s className="text-subtle-foreground font-normal">
            <span className="sr-only">Preço anterior: </span>
            {formatEth(nft.compareAtPrice)}
          </s>
        )}
      </p>
    </article>
  )
}

/** Same footprint as NftCard so swapping skeleton → content causes no layout shift. */
export function NftCardSkeleton() {
  return (
    <div>
      <div className="bg-card p-1">
        <Skeleton className="aspect-square w-full rounded-xl" />
      </div>
      <Skeleton className="mt-3 h-6 w-3/4" />
      <Skeleton className="mt-1 h-6 w-1/3" />
    </div>
  )
}
