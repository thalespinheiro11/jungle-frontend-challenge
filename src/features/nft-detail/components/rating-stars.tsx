import { Star } from 'lucide-react'

import { cn } from '@/lib/utils'

export function RatingStars({ rating, className }: { rating: number; className?: string }) {
  const label = `Avaliação ${rating.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} de 5`
  return (
    <span role="img" aria-label={label} className={cn('inline-flex gap-0.5', className)}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          aria-hidden
          className={cn('size-4', i < Math.round(rating) ? 'fill-primary text-primary' : 'text-subtle-foreground')}
        />
      ))}
    </span>
  )
}
