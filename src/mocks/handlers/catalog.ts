import Decimal from 'decimal.js'
import { http, HttpResponse } from 'msw'

import {
  NETWORKS,
  NFT_CATEGORIES,
  NFT_SORTS,
  NFT_TABS,
  type CatalogFacets,
  type Nft,
  type NftCategory,
  type NftSummary,
  type Network,
  type Paginated,
} from '@/lib/api/contracts'

import { mockConfig } from '../config'
import { db } from '../db'
import { apiError, applyNetwork } from '../http-utils'

const API = '*/api'
const DEFAULT_PAGE_SIZE = 9

function toSummary(nft: Nft): NftSummary {
  const { id, name, image, imageAlt, category, network, price, compareAtPrice, tags, listedAt, version } = nft
  return { id, name, image, imageAlt, category, network, price, compareAtPrice, tags, listedAt, version }
}

function parseList<T extends string>(values: string[], allowed: readonly T[]): T[] {
  return values.filter((v): v is T => (allowed as readonly string[]).includes(v))
}

function catalogItems() {
  return mockConfig.scenario === 'empty-catalog' ? [] : db.nfts.all()
}

export const catalogHandlers = [
  http.get(`${API}/nfts`, async ({ request }) => {
    const failure = await applyNetwork(request, 'catalog')
    if (failure) return failure

    const url = new URL(request.url)
    const q = url.searchParams.get('q')?.trim().toLowerCase() ?? ''
    const categories = parseList<NftCategory>(url.searchParams.getAll('category'), NFT_CATEGORIES)
    const networks = parseList<Network>(url.searchParams.getAll('network'), NETWORKS)
    const sort = parseList(url.searchParams.getAll('sort'), NFT_SORTS)[0] ?? 'recent'
    const tab = parseList(url.searchParams.getAll('tab'), NFT_TABS)[0] ?? 'all'
    const minPrice = url.searchParams.get('minPrice')
    const maxPrice = url.searchParams.get('maxPrice')
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
    const pageSize = Math.min(48, Math.max(1, Number(url.searchParams.get('pageSize')) || DEFAULT_PAGE_SIZE))

    if ((minPrice && !isDecimal(minPrice)) || (maxPrice && !isDecimal(maxPrice))) {
      return apiError(400, 'VALIDATION_ERROR', 'Faixa de preço inválida.')
    }

    let items = catalogItems().filter((nft) => {
      if (q && !`${nft.name} ${nft.collection} ${nft.creator}`.toLowerCase().includes(q)) return false
      if (categories.length && !categories.includes(nft.category)) return false
      if (networks.length && !networks.includes(nft.network)) return false
      if (minPrice && new Decimal(nft.price).lt(minPrice)) return false
      if (maxPrice && new Decimal(nft.price).gt(maxPrice)) return false
      if (tab === 'new' && !nft.tags.includes('new')) return false
      if (tab === 'trending' && !nft.tags.includes('trending')) return false
      return true
    })

    items = items.sort((a, b) => {
      switch (sort) {
        case 'price-asc':
          return new Decimal(a.price).cmp(b.price) || a.id.localeCompare(b.id)
        case 'price-desc':
          return new Decimal(b.price).cmp(a.price) || a.id.localeCompare(b.id)
        case 'name':
          return a.name.localeCompare(b.name)
        default:
          return b.listedAt.localeCompare(a.listedAt)
      }
    })

    const total = items.length
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const body: Paginated<NftSummary> = {
      items: items.slice((page - 1) * pageSize, page * pageSize).map(toSummary),
      page,
      pageSize,
      total,
      totalPages,
    }
    return HttpResponse.json(body)
  }),

  http.get(`${API}/nfts/facets`, async ({ request }) => {
    const failure = await applyNetwork(request, 'facets')
    if (failure) return failure

    const items = catalogItems()
    const count = <T extends string>(values: readonly T[], pick: (n: Nft) => T) =>
      values.map((value) => ({ value, count: items.filter((n) => pick(n) === value).length }))
    const prices = items.map((n) => new Decimal(n.price))
    const body: CatalogFacets = {
      categories: count(NFT_CATEGORIES, (n) => n.category),
      networks: count(NETWORKS, (n) => n.network),
      priceRange: {
        min: prices.length ? Decimal.min(...prices).toString() : '0',
        max: prices.length ? Decimal.max(...prices).toString() : '0',
      },
    }
    return HttpResponse.json(body)
  }),

  http.get(`${API}/nfts/:id`, async ({ request, params }) => {
    const failure = await applyNetwork(request, 'nft-detail')
    if (failure) return failure

    const nft = db.nfts.find(String(params.id))
    if (!nft) return apiError(404, 'NOT_FOUND', 'NFT não encontrado.')
    return HttpResponse.json(nft)
  }),
]

function isDecimal(value: string) {
  return /^\d+(\.\d+)?$/.test(value)
}
