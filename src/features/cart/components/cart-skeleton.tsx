import { Skeleton } from '@/components/ui/skeleton'

/** Same footprint as the cart rows and summary, so loading → content doesn't shift. */
export function CartLinesSkeleton() {
  return (
    <ul className="space-y-3" aria-hidden>
      {Array.from({ length: 3 }, (_, i) => (
        <li key={i} className="bg-card flex h-[100px] items-center gap-4 rounded-xl md:h-[70px] md:rounded-none">
          <Skeleton className="h-full w-[100px] rounded-none md:w-[70px]" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </li>
      ))}
    </ul>
  )
}

export function CartSummarySkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <Skeleton className="hidden h-7 w-1/2 md:block" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-11 w-full" />
    </div>
  )
}
