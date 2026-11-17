import { useId } from 'react'

import type { EditionId, NftEdition } from '@/lib/api/contracts'
import { cn } from '@/lib/utils'

/**
 * Edition choice as a native radio group (arrow-key navigation for free). Sold-out editions
 * are disabled and marked by strike-through + text, not by color alone.
 */
export function EditionPicker({
  editions,
  value,
  onChange,
}: {
  editions: NftEdition[]
  value: EditionId | null
  onChange: (id: EditionId) => void
}) {
  const name = useId()
  return (
    <fieldset>
      <legend className="mb-2 font-bold">Edição:</legend>
      <div className="flex flex-wrap gap-2">
        {editions.map((edition) => {
          const soldOut = edition.available <= 0
          const checked = edition.id === value
          return (
            <label
              key={edition.id}
              title={soldOut ? 'Edição esgotada' : undefined}
              className={cn(
                'relative rounded-full border px-2.5 py-0.5 text-sm transition-colors',
                'has-[:focus-visible]:outline-ring has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2',
                checked ? 'border-primary text-primary bg-primary/10' : 'border-border',
                soldOut ? 'text-subtle-foreground cursor-not-allowed line-through' : 'cursor-pointer',
              )}
            >
              <input
                type="radio"
                name={name}
                value={edition.id}
                checked={checked}
                disabled={soldOut}
                onChange={() => onChange(edition.id)}
                className="sr-only"
              />
              {edition.label}
              {soldOut && <span className="sr-only"> (esgotada)</span>}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
