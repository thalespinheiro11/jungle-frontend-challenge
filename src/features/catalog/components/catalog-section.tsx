import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { useId, type FormEvent } from 'react'

import { QueryError } from '@/components/layout/route-states'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { NFT_SORTS, NFT_TABS, type NftSort } from '@/lib/api/contracts'
import { cn } from '@/lib/utils'

import { facetsQuery, nftListQuery } from '../api'
import { CATEGORY_LABEL, NETWORK_LABEL, SORT_LABEL, TAB_LABEL } from '../labels'
import { toListParams, type CatalogSearch } from '../search'
import { NftCard, NftCardSkeleton } from './nft-card'

function toggle<T>(list: T[] | undefined, value: T): T[] | undefined {
  const next = list?.includes(value) ? list.filter((v) => v !== value) : [...(list ?? []), value]
  return next.length ? next : undefined
}

export function CatalogSection() {
  const search = useSearch({ from: '/' })
  const navigate = useNavigate({ from: '/' })
  const params = toListParams(search)
  const list = useQuery(nftListQuery(params))
  const facets = useQuery(facetsQuery())
  const sortLabelId = useId()

  /** Any filter change resets pagination (page is dropped from the URL). */
  const setFilters = (patch: Partial<CatalogSearch>) =>
    void navigate({ search: (prev) => ({ ...prev, ...patch, page: undefined }), hash: 'catalogo' })

  const onSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const q = String(new FormData(event.currentTarget).get('q') ?? '').trim()
    setFilters({ q: q || undefined })
  }

  return (
    <section id="catalogo" aria-labelledby="catalogo-titulo" className="container-page scroll-mt-4 py-8">
      <h2 id="catalogo-titulo" className="sr-only">
        Catálogo de NFTs
      </h2>

      <form role="search" onSubmit={onSearch} className="mb-6 flex gap-2">
        <label htmlFor="catalog-q" className="sr-only">
          Buscar NFTs
        </label>
        <div className="relative flex-1">
          <Search className="text-subtle-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" aria-hidden />
          <Input
            key={search.q ?? ''}
            id="catalog-q"
            name="q"
            defaultValue={search.q}
            placeholder="Explorar coleções"
            className="bg-card h-11 pl-9"
          />
        </div>
        <Button type="submit" className="h-11">
          Buscar
        </Button>
      </form>

      <div className="grid gap-8 lg:grid-cols-[310px_1fr] lg:gap-12">
        <aside aria-label="Filtros" className="bg-card h-fit space-y-6 p-5">
          <fieldset>
            <legend className="mb-3 text-lg font-medium">Coleções</legend>
            <ul className="space-y-1">
              {(facets.data?.categories ?? []).map(({ value, count }) => {
                const active = search.category?.includes(value) ?? false
                return (
                  <li key={value}>
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => setFilters({ category: toggle(search.category, value) })}
                      className={cn(
                        'flex w-full justify-between rounded px-3 py-2 text-left',
                        active ? 'text-primary font-medium' : 'text-muted-foreground',
                      )}
                    >
                      <span>{CATEGORY_LABEL[value]}</span>
                      <span>({count})</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </fieldset>
          <fieldset>
            <legend className="mb-3 text-lg font-medium">Rede</legend>
            <ul className="space-y-1">
              {(facets.data?.networks ?? []).map(({ value, count }) => {
                const active = search.network?.includes(value) ?? false
                return (
                  <li key={value}>
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => setFilters({ network: toggle(search.network, value) })}
                      className={cn(
                        'flex w-full justify-between rounded px-3 py-2 text-left text-sm',
                        active ? 'text-primary font-medium' : 'text-muted-foreground',
                      )}
                    >
                      <span>{NETWORK_LABEL[value]}</span>
                      <span>({count})</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </fieldset>
        </aside>

        <div>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <nav aria-label="Seções do catálogo" className="flex flex-wrap gap-5">
              {NFT_TABS.map((tab) => (
                <Link
                  key={tab}
                  from="/"
                  search={(prev) => ({ ...prev, tab: tab === 'all' ? undefined : tab, page: undefined })}
                  hash="catalogo"
                  aria-current={params.tab === tab ? 'page' : undefined}
                  className={cn(
                    'border-b-2 pb-0.5 text-sm font-medium',
                    params.tab === tab ? 'text-primary border-primary' : 'border-transparent',
                  )}
                >
                  {TAB_LABEL[tab]}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-2 text-sm">
              <span id={sortLabelId}>Ordenar por:</span>
              <Select
                value={params.sort}
                onValueChange={(value) => setFilters({ sort: value === 'recent' ? undefined : (value as NftSort) })}
              >
                <SelectTrigger aria-labelledby={sortLabelId} className="w-[240px] border-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NFT_SORTS.map((sort) => (
                    <SelectItem key={sort} value={sort}>
                      {SORT_LABEL[sort]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Announces result changes to screen readers without moving focus. */}
          <p role="status" aria-live="polite" className="sr-only">
            {list.isSuccess && `${list.data.total} NFTs encontrados`}
          </p>

          {list.isPending ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-8" aria-busy="true">
              {Array.from({ length: 9 }, (_, i) => (
                <NftCardSkeleton key={i} />
              ))}
            </div>
          ) : list.isError ? (
            <QueryError error={list.error} onRetry={() => list.refetch()} />
          ) : list.data.items.length === 0 ? (
            <div className="py-16 text-center">
              <p className="font-bold">Nenhum NFT encontrado</p>
              <p className="text-muted-foreground mt-2 text-sm">Tente remover filtros ou buscar outro termo.</p>
            </div>
          ) : (
            <>
              <ul
                className={cn(
                  'grid grid-cols-2 gap-x-4 gap-y-10 transition-opacity md:grid-cols-3 md:gap-x-8',
                  list.isPlaceholderData && 'opacity-60',
                )}
                aria-busy={list.isPlaceholderData}
              >
                {list.data.items.map((nft, index) => (
                  <li key={nft.id}>
                    <NftCard nft={nft} priority={index < 3} />
                  </li>
                ))}
              </ul>
              <Pagination page={list.data.page} totalPages={list.data.totalPages} />
            </>
          )}
        </div>
      </div>
    </section>
  )
}

function Pagination({ page, totalPages }: { page: number; totalPages: number }) {
  if (totalPages <= 1) return null
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
  const linkClass =
    'border-border inline-flex size-9 items-center justify-center rounded border text-sm aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground aria-[current=page]:border-primary'
  return (
    <nav aria-label="Paginação" className="mt-10 flex justify-end gap-2">
      {page > 1 && (
        <Link from="/" search={(prev) => ({ ...prev, page: page - 1 })} hash="catalogo" className={linkClass} aria-label="Página anterior">
          <ChevronLeft className="size-4" aria-hidden />
        </Link>
      )}
      {pages.map((p) => (
        <Link
          key={p}
          from="/"
          search={(prev) => ({ ...prev, page: p === 1 ? undefined : p })}
          hash="catalogo"
          aria-current={p === page ? 'page' : undefined}
          aria-label={`Página ${p}`}
          className={linkClass}
        >
          {p}
        </Link>
      ))}
      {page < totalPages && (
        <Link from="/" search={(prev) => ({ ...prev, page: page + 1 })} hash="catalogo" className={linkClass} aria-label="Próxima página">
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      )}
    </nav>
  )
}
