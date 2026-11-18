import { Link } from '@tanstack/react-router'
import Decimal from 'decimal.js'
import { useId, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Slider } from '@/components/ui/slider'
import type { CatalogFacets, Network, NftCategory, NftSummary } from '@/lib/api/contracts'
import { cn } from '@/lib/utils'

import { CATEGORY_LABEL, NETWORK_LABEL } from '../labels'
import type { CatalogSearch } from '../search'

type Patch = Partial<CatalogSearch>

function toggle<T>(list: T[] | undefined, value: T): T[] | undefined {
  const next = list?.includes(value) ? list.filter((v) => v !== value) : [...(list ?? []), value]
  return next.length ? next : undefined
}

/**
 * The slider works in integer hundredths of ETH: decimal steps (0.01) accumulate float error
 * (0.03 − 0.02 = 0.00999…), which made the thumbs stop one step early. Integers are exact.
 */
const toCents = (eth: string | number) => new Decimal(eth).times(100).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber()
const toEth = (cents: number) => new Decimal(cents).dividedBy(100).toFixed(2)

/** "0,02" — the layout shows the price range with a decimal comma. */
const brl = (cents: number) => toEth(cents).replace('.', ',')

/** Collections, price range and network filters. Each change resets pagination (caller). */
export function CatalogFilters({
  search,
  facets,
  onChange,
  className,
}: {
  search: CatalogSearch
  facets: CatalogFacets | undefined
  onChange: (patch: Patch) => void
  className?: string
}) {
  return (
    <div className={cn('space-y-8', className)}>
      <FacetList<NftCategory>
        title="Coleções"
        items={facets?.categories}
        selected={search.category}
        label={(v) => CATEGORY_LABEL[v]}
        onToggle={(v) => onChange({ category: toggle(search.category, v) })}
      />
      <PriceFilter search={search} facets={facets} onChange={onChange} />
      <FacetList<Network>
        title="Rede"
        small
        items={facets?.networks}
        selected={search.network}
        label={(v) => NETWORK_LABEL[v]}
        onToggle={(v) => onChange({ network: toggle(search.network, v) })}
      />
    </div>
  )
}

function FacetList<T extends string>({
  title,
  items,
  selected,
  label,
  onToggle,
  small = false,
}: {
  title: string
  items: { value: T; count: number }[] | undefined
  selected: T[] | undefined
  label: (value: T) => string
  onToggle: (value: T) => void
  small?: boolean
}) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId}>
      <h3 id={headingId} className="mb-3 text-lg font-medium">
        {title}
      </h3>
      <ul className="space-y-1">
        {items
          ? items.map(({ value, count }) => {
              const active = selected?.includes(value) ?? false
              return (
                <li key={value}>
                  {/* Toggle buttons: state in aria-pressed + colour + weight (not colour alone). */}
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => onToggle(value)}
                    className={cn(
                      'flex w-full justify-between rounded px-3 py-2 text-left',
                      small && 'text-sm',
                      active ? 'text-primary font-bold' : 'text-muted-foreground',
                    )}
                  >
                    <span>{label(value)}</span>
                    <span className={cn(!small && 'font-bold')}>({count})</span>
                  </button>
                </li>
              )
            })
          : Array.from({ length: small ? 3 : 9 }, (_, i) => (
              <li key={i} className="px-3 py-2">
                <Skeleton className="h-5 w-full" />
              </li>
            ))}
      </ul>
    </section>
  )
}

function PriceFilter({
  search,
  facets,
  onChange,
}: {
  search: CatalogSearch
  facets: CatalogFacets | undefined
  onChange: (patch: Patch) => void
}) {
  const headingId = useId()
  const bounds = facets ? ([toCents(facets.priceRange.min), toCents(facets.priceRange.max)] as const) : null
  const applied: [number, number] | null = bounds
    ? [search.minPrice ? toCents(search.minPrice) : bounds[0], search.maxPrice ? toCents(search.maxPrice) : bounds[1]]
    : null
  // Draft range while dragging; "Aplicar" commits it to the URL.
  const [draft, setDraft] = useState<[number, number] | null>(null)
  const value = draft ?? applied
  const active = Boolean(search.minPrice || search.maxPrice)

  const apply = () => {
    if (!bounds || !value) return
    const [min, max] = value
    onChange({
      minPrice: min > bounds[0] ? toEth(min) : undefined,
      maxPrice: max < bounds[1] ? toEth(max) : undefined,
    })
    setDraft(null)
  }

  return (
    <section aria-labelledby={headingId}>
      <h3 id={headingId} className="mb-4 text-lg font-medium">
        Faixa de preço
      </h3>
      {bounds && value ? (
        <>
          <Slider
            min={bounds[0]}
            max={bounds[1]}
            step={1}
            minStepsBetweenThumbs={1}
            value={value}
            onValueChange={(v) => setDraft([v[0]!, v[1]!])}
            thumbLabels={['Preço mínimo', 'Preço máximo']}
            valueText={(cents) => `${brl(cents)} ETH`}
            className="px-1"
          />
          <p className="mt-4 px-3 text-sm" aria-live="polite">
            Preço: {brl(value[0])} - {brl(value[1])} ETH
          </p>
          <div className="mt-3 flex items-center gap-3 px-3">
            <Button size="sm" className="font-bold" onClick={apply} disabled={!draft}>
              Aplicar
            </Button>
            {active && (
              <button
                type="button"
                className="text-primary text-sm underline-offset-4 hover:underline"
                onClick={() => {
                  setDraft(null)
                  onChange({ minPrice: undefined, maxPrice: undefined })
                }}
              >
                Limpar
              </button>
            )}
          </div>
        </>
      ) : (
        <Skeleton className="h-20 w-full" />
      )}
    </section>
  )
}

/** "NFT em destaque · Oferta limitada" (desktop sidebar). */
export function FeaturedNft({ nft }: { nft: NftSummary | null | undefined }) {
  if (!nft) return null
  return (
    <section aria-labelledby="featured-title" className="from-card bg-gradient-to-b to-transparent pt-6">
      <h2 id="featured-title" className="px-5 text-center text-2xl font-bold uppercase">
        <span className="text-primary block">NFT em destaque</span>
        <span className="mt-1 block text-xl">Oferta limitada</span>
      </h2>
      <Link to="/nfts/$nftId" params={{ nftId: nft.id }} className="mt-3 block rounded-[24px] focus-visible:outline-offset-4">
        <img
          src={nft.image}
          alt={`${nft.imageAlt} ${nft.name}`}
          width={310}
          height={366}
          loading="lazy"
          className="aspect-[310/366] w-full rounded-[24px] object-cover"
        />
      </Link>
    </section>
  )
}
