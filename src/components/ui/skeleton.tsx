import { cn } from '@/lib/utils'

/**
 * Loading placeholder with the shimmer effect required by the brief.
 * Callers must give it the final content's dimensions to avoid layout shift.
 * Animation is disabled under prefers-reduced-motion (see `shimmer` utility).
 */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn('shimmer rounded-md', className)}
      {...props}
    />
  )
}

export { Skeleton }
