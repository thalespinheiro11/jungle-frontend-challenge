import { Skeleton } from '@/components/ui/skeleton'

/** Mirrors the detail layout (gallery + info column) so content swaps in without shifting. */
export function DetailSkeleton() {
  return (
    <div className="container-page pt-4 md:pt-8" aria-busy="true">
      <span role="status" className="sr-only">
        Carregando NFT…
      </span>
      <Skeleton className="mb-4 hidden h-5 w-32 md:block" />
      <div className="grid gap-6 md:grid-cols-[minmax(0,572px)_1fr] md:gap-8">
        <div className="flex gap-7">
          <div className="hidden flex-col gap-4 md:flex">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="size-[100px]" />
            ))}
          </div>
          <div className="bg-card flex-1 md:p-5">
            <Skeleton className="aspect-square w-full rounded-[24px]" />
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-7 w-1/3" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </div>
  )
}
