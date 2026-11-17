import { createFileRoute } from '@tanstack/react-router'

import { facetsQuery, nftListQuery } from '@/features/catalog/api'
import { CatalogSection } from '@/features/catalog/components/catalog-section'
import { HomeHero } from '@/features/catalog/components/home-hero'
import { catalogSearchSchema, toListParams } from '@/features/catalog/search'

export const Route = createFileRoute('/')({
  validateSearch: catalogSearchSchema,
  loaderDeps: ({ search }) => toListParams(search),
  // Prefetch without blocking: the page renders immediately with skeletons.
  loader: ({ context: { queryClient }, deps }) => {
    void queryClient.prefetchQuery(nftListQuery(deps))
    void queryClient.prefetchQuery(facetsQuery())
  },
  component: HomePage,
})

function HomePage() {
  return (
    <>
      <HomeHero />
      <CatalogSection />
    </>
  )
}
