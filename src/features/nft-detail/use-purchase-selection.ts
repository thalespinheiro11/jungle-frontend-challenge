import Decimal from 'decimal.js'
import { useEffect, useRef, useState } from 'react'

import type { EditionId, Nft, NftEdition } from '@/lib/api/contracts'
import { formatEth } from '@/lib/money'

/** Per-order cap on top of edition availability. */
export const MAX_PER_ORDER = 10

function cheapestAvailable(editions: NftEdition[]): EditionId | null {
  const available = editions.filter((e) => e.available > 0)
  if (!available.length) return null
  return available.reduce((min, e) => (new Decimal(e.price).lt(min.price) ? e : min)).id
}

/**
 * Edition + quantity selection for the detail page. It stays valid when realtime updates
 * change prices or availability: quantity is clamped to the new limit and a notice
 * describes what changed (announced through a live region by the caller).
 */
export function usePurchaseSelection(nft: Nft) {
  const [editionId, setEditionId] = useState<EditionId | null>(() => cheapestAvailable(nft.editions))
  const [requested, setQuantity] = useState(1)
  const [notice, setNotice] = useState<string | null>(null)

  const edition = nft.editions.find((e) => e.id === editionId) ?? null
  const soldOut = !edition || edition.available <= 0
  const max = soldOut ? 1 : Math.min(edition.available, MAX_PER_ORDER)
  // Derived, not synced through an effect: a smaller limit immediately caps the quantity.
  const quantity = Math.min(requested, max)

  // Describe realtime changes to the selected edition (price or availability).
  const previous = useRef<{ id: EditionId; price: string; available: number } | null>(null)
  useEffect(() => {
    if (!edition) return
    const prev = previous.current
    if (prev && prev.id === edition.id) {
      if (edition.available <= 0 && prev.available > 0) {
        setNotice(`A edição ${edition.label} acabou de esgotar.`)
      } else if (prev.price !== edition.price) {
        setNotice(
          `Preço da edição ${edition.label} atualizado: ${formatEth(prev.price)} → ${formatEth(edition.price)}.`,
        )
      } else if (edition.available < prev.available) {
        setNotice(`Restam ${edition.available} unidades da edição ${edition.label}.`)
      }
    }
    previous.current = { id: edition.id, price: edition.price, available: edition.available }
  }, [edition])

  const selectEdition = (id: EditionId) => {
    setEditionId(id)
    setNotice(null)
  }

  return {
    edition,
    editionId,
    selectEdition,
    quantity,
    setQuantity,
    max,
    soldOut,
    notice,
    total: edition ? new Decimal(edition.price).times(quantity).toString() : '0',
  }
}
