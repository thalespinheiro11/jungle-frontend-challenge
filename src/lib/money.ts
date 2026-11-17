import Decimal from 'decimal.js'

import type { EthAmount } from '@/lib/api/contracts'

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP })

export const eth = (value: EthAmount | number) => new Decimal(value)

export function addEth(...values: EthAmount[]): EthAmount {
  return values.reduce((sum, v) => sum.plus(v), new Decimal(0)).toString()
}

export function mulEth(value: EthAmount, quantity: number): EthAmount {
  return new Decimal(value).times(quantity).toString()
}

/** Formats like the layout: "1.19 ETH" (dot separator, at least 2 and at most 4 decimals). */
export function formatEth(value: EthAmount, { unit = true }: { unit?: boolean } = {}) {
  const d = new Decimal(value)
  const decimals = Math.min(Math.max(d.decimalPlaces(), 2), 4)
  const text = d.toFixed(decimals)
  return unit ? `${text} ETH` : text
}
