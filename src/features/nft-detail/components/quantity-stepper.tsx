import { Minus, Plus } from 'lucide-react'
import { useId } from 'react'

import { cn } from '@/lib/utils'

/** Integer quantity between 1 and `max`, editable by buttons or typing. */
export function QuantityStepper({
  value,
  max,
  onChange,
  label = 'Quantidade',
  showLabel = false,
  disabled = false,
  className,
}: {
  value: number
  max: number
  onChange: (value: number) => void
  label?: string
  showLabel?: boolean
  disabled?: boolean
  className?: string
}) {
  const id = useId()
  const clamp = (n: number) => Math.min(Math.max(1, Math.trunc(n) || 1), Math.max(1, max))
  const buttonClass =
    'bg-primary text-primary-foreground grid size-8 place-items-center rounded-full disabled:opacity-40 md:h-10 md:w-8'

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <label htmlFor={id} className={cn('text-sm font-medium', !showLabel && 'sr-only')}>
        {label}
      </label>
      <button
        type="button"
        className={buttonClass}
        onClick={() => onChange(clamp(value - 1))}
        disabled={disabled || value <= 1}
        aria-label="Diminuir quantidade"
        aria-controls={id}
      >
        <Minus className="size-4" aria-hidden />
      </button>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={1}
        max={max}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(clamp(Number(e.target.value)))}
        className="w-8 [appearance:textfield] bg-transparent text-center text-lg [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button
        type="button"
        className={buttonClass}
        onClick={() => onChange(clamp(value + 1))}
        disabled={disabled || value >= max}
        aria-label="Aumentar quantidade"
        aria-controls={id}
      >
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  )
}
