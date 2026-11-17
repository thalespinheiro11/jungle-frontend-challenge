import Decimal from 'decimal.js'

import {
  NETWORKS,
  NFT_CATEGORIES,
  type EditionId,
  type Nft,
  type NftEdition,
} from '@/lib/api/contracts'

/**
 * Deterministic catalog fixture. The layout only ships four illustrations, reused under
 * different names (as in the Figma), so each entry picks one of them.
 * Everything is derived from a fixed seed: same input → same catalog on every reset.
 */

const ART = {
  emerald: {
    src: '/nfts/ape-emerald.webp',
    alt: 'Ilustração de um macaco de pelagem marrom com óculos redondos verdes e jaqueta college verde.',
  },
  sage: {
    src: '/nfts/gorilla-sage.webp',
    alt: 'Ilustração de um gorila cinza sorridente com chapéu bucket verde-claro e moletom lilás.',
  },
  ivory: {
    src: '/nfts/gorilla-ivory.webp',
    alt: 'Ilustração de um gorila de pelagem preta com blazer bege e gola alta verde-escura.',
  },
  golden: {
    src: '/nfts/ape-golden.webp',
    alt: 'Ilustração de um macaco de pelagem dourada com fones de ouvido verdes e jaqueta creme.',
  },
} as const
type ArtKey = keyof typeof ART

/** Names and prices visible in the layout come first, so the default view matches the Figma. */
const SEED: Array<{ name: string; art: ArtKey; price: string; compareAt?: string }> = [
  { name: 'Emerald Ape #042', art: 'emerald', price: '1.19' },
  { name: 'Sage Nomad #009', art: 'sage', price: '1.69' },
  { name: 'Neon Vessel #552', art: 'ivory', price: '1.99', compareAt: '2.29' },
  { name: 'Cosmic Bloom #118', art: 'sage', price: '1.29' },
  { name: 'Violet Nomad #314', art: 'sage', price: '1.39' },
  { name: 'Ivory Baron #088', art: 'ivory', price: '1.79' },
  { name: 'Golden Beat #207', art: 'golden', price: '0.99' },
  { name: 'Golden Frequency #071', art: 'golden', price: '0.89' },
  { name: 'Golden Signal #160', art: 'golden', price: '0.39' },
  { name: 'Jade Monarch #233', art: 'emerald', price: '2.45' },
  { name: 'Velvet Echo #417', art: 'sage', price: '0.74' },
  { name: 'Obsidian Pilot #305', art: 'ivory', price: '3.10' },
  { name: 'Amber Pulse #128', art: 'golden', price: '0.58' },
  { name: 'Moss Oracle #064', art: 'emerald', price: '1.05' },
  { name: 'Lilac Drifter #276', art: 'sage', price: '0.92' },
  { name: 'Onyx Regent #019', art: 'ivory', price: '4.20', compareAt: '4.80' },
  { name: 'Saffron Groove #341', art: 'golden', price: '0.47' },
  { name: 'Verdant Sage #150', art: 'emerald', price: '1.88' },
  { name: 'Misty Wanderer #099', art: 'sage', price: '0.66' },
  { name: 'Charcoal Count #212', art: 'ivory', price: '2.75' },
  { name: 'Honey Tempo #383', art: 'golden', price: '0.31' },
  { name: 'Forest Crown #007', art: 'emerald', price: '5.50' },
  { name: 'Plum Voyager #190', art: 'sage', price: '1.12' },
  { name: 'Shadow Duke #266', art: 'ivory', price: '2.10' },
  { name: 'Citrus Wave #054', art: 'golden', price: '0.22' },
  { name: 'Emerald Echo #499', art: 'emerald', price: '1.64' },
  { name: 'Lavender Scout #133', art: 'sage', price: '0.81' },
  { name: 'Graphite Lord #078', art: 'ivory', price: '3.65' },
  { name: 'Golden Remix #222', art: 'golden', price: '0.53' },
  { name: 'Clover Chief #311', art: 'emerald', price: '2.02' },
  { name: 'Heather Monk #145', art: 'sage', price: '0.97' },
  { name: 'Ebony Marquis #400', art: 'ivory', price: '6.30' },
  { name: 'Sunburst Loop #287', art: 'golden', price: '0.12' },
  { name: 'Pine Maverick #036', art: 'emerald', price: '1.37' },
  { name: 'Iris Pilgrim #258', art: 'sage', price: '1.21' },
  { name: 'Slate Baron #171', art: 'ivory', price: '12.30' },
  { name: 'Topaz Rhythm #090', art: 'golden', price: '0.02' },
  { name: 'Fern Keeper #333', art: 'emerald', price: '0.88' },
  { name: 'Mauve Rover #048', art: 'sage', price: '0.45' },
  { name: 'Ink Sovereign #500', art: 'ivory', price: '7.75' },
  { name: 'Brass Melody #105', art: 'golden', price: '0.69' },
  { name: 'Ivy Champion #219', art: 'emerald', price: '2.99' },
]

const COLLECTIONS = ['Kurio Apes', 'Kurio Editions', 'Nomad Club', 'Golden Sound', 'Baron Society']
const CREATORS = ['Nova Sato', 'Iara Mendes', 'Leo Vasconcelos', 'Kai Moreau', 'Ana Ribeiro']
const ATTRIBUTES: Record<ArtKey, string[]> = {
  emerald: ['Óculos', 'Esmeralda', 'Raro'],
  sage: ['Chapéu bucket', 'Moletom', 'Incomum'],
  ivory: ['Blazer', 'Gola alta', 'Épico'],
  golden: ['Fones', 'Jaqueta', 'Comum'],
}

/** mulberry32 — tiny deterministic PRNG. */
function prng(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const EDITION_LABEL: Record<EditionId, string> = {
  '1-1': '1/1',
  '1-10': '1/10',
  '1-50': '1/50',
  open: 'ABERTA',
}

function buildEditions(base: Decimal, rand: () => number, index: number): NftEdition[] {
  const editions: NftEdition[] = [
    { id: '1-1', label: EDITION_LABEL['1-1'], price: base.times(4).toFixed(2), available: rand() < 0.3 ? 0 : 1 },
    { id: '1-10', label: EDITION_LABEL['1-10'], price: base.times(2).toFixed(2), available: Math.floor(rand() * 4) },
    { id: '1-50', label: EDITION_LABEL['1-50'], price: base.toFixed(2), available: 3 + Math.floor(rand() * 12) },
  ]
  // Every third NFT also has an open edition; the first one has it sold out (unavailable edition case).
  if (index % 3 === 0) {
    editions.push({
      id: 'open',
      label: EDITION_LABEL.open,
      price: base.toFixed(2),
      available: index === 0 ? 0 : 99,
    })
  }
  return editions
}

export function minAvailablePrice(editions: NftEdition[]): string {
  const prices = editions.filter((e) => e.available > 0).map((e) => new Decimal(e.price))
  const pool = prices.length > 0 ? prices : editions.map((e) => new Decimal(e.price))
  return Decimal.min(...pool).toString()
}

const REVIEWERS = ['Marina T.', 'Joaquim R.', 'Lia P.', 'Davi M.', 'Helena C.', 'Otávio B.']
const COMMENTS = [
  'Arte impecável e procedência verificada. Chegou na carteira em minutos.',
  'Detalhes incríveis na alta resolução. Vale cada ETH.',
  'Coleção consistente e criador muito presente na comunidade.',
  'Ótimo para começar a colecionar; edição bem equilibrada.',
  'Os atributos raros fazem diferença. Recomendo.',
]

function buildReviews(rand: () => number, index: number): Nft['reviews'] {
  return Array.from({ length: 3 }, (_, i) => ({
    id: `rev_${index}_${i}`,
    author: REVIEWERS[(index + i) % REVIEWERS.length]!,
    rating: 4 + (rand() < 0.6 ? 1 : 0),
    comment: COMMENTS[(index * 2 + i) % COMMENTS.length]!,
    createdAt: new Date(Date.UTC(2026, 10, 10 - i * 3, 15)).toISOString(),
  }))
}

function contractAddress(rand: () => number) {
  const hex = () => Math.floor(rand() * 0x10000).toString(16).toUpperCase().padStart(4, '0')
  return `0x${hex()}...${hex()}`
}

export function buildNftFixtures(): Nft[] {
  const rand = prng(42)
  // Separate stream so detail-only data never shifts the catalog fixture.
  const detailRand = prng(7)
  const firstListed = Date.UTC(2026, 10, 15, 12)

  return SEED.map((entry, index) => {
    const art = ART[entry.art]
    const num = entry.name.split('#')[1] ?? '000'
    const base = new Decimal(entry.price)
    const editions = buildEditions(base, rand, index)
    const category = NFT_CATEGORIES[Math.floor(rand() * NFT_CATEGORIES.length)]!
    const network = index < 6 ? 'ethereum' : NETWORKS[Math.floor(rand() * NETWORKS.length)]!
    const collection = index === 0 ? 'Kurio Apes' : COLLECTIONS[index % COLLECTIONS.length]!
    const creator = index === 0 ? 'Nova Sato' : CREATORS[index % CREATORS.length]!
    const listedAt = new Date(firstListed - index * 36 * 3_600_000).toISOString()
    const tags: Nft['tags'] = []
    if (index < 12) tags.push('new')
    if (index % 4 === 1) tags.push('trending')
    if (index === 1) tags.push('featured')
    // Two draws previously used for rating/reviews; kept so the catalog stream stays identical.
    rand()
    rand()

    return {
      id: entry.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      name: entry.name,
      tokenId: `#${num.padStart(4, '0')}`,
      image: art.src,
      imageAlt: art.alt,
      gallery: [art.src, art.src, art.src, art.src],
      category,
      network,
      collection,
      creator,
      price: minAvailablePrice(editions),
      compareAtPrice: entry.compareAt ?? null,
      editions,
      tags,
      listedAt,
      // Emerald Ape matches the Figma (4.8 · 19 reviews).
      rating: index === 0 ? 4.8 : 4 + Math.round(detailRand() * 10) / 10,
      reviewsCount: index === 0 ? 19 : 3 + Math.floor(detailRand() * 40),
      reviews: buildReviews(detailRand, index),
      contractAddress: index === 0 ? '0x7A42...19E8' : contractAddress(detailRand),
      attributes: ATTRIBUTES[entry.art],
      description: `Um colecionável digital finalizado à mão da coleção ${collection}, verificado na ${
        network === 'ethereum' ? 'Ethereum' : network === 'polygon' ? 'Polygon' : 'Solana'
      }, com arte desbloqueável e acesso para colecionadores.`,
      details: `${entry.name} é uma obra digital finalizada à mão da coleção ${collection}. Cada atributo fica armazenado nos metadados do token e verificado na rede. A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência. ${creator} recebe 5% de direitos autorais nas vendas secundárias.`,
      version: 1,
    }
  })
}
