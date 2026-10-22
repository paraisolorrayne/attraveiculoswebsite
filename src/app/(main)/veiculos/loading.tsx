import { Skeleton, FiltersSkeleton, VehicleGridCardSkeleton } from '@/components/ui/skeleton'

// Mesmo desenho da página: destaque no topo, busca, lateral estreita e grade.
// Aparece na hora do clique, enquanto o servidor monta o estoque (~1 s).
export default function VeiculosLoading() {
  return (
    <>
      <section className="pt-28 pb-8">
        <div className="w-full lg:w-[82%] mx-auto px-4 sm:px-6 lg:px-8">
          <Skeleton className="h-4 w-32 mb-8" />
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <div className="space-y-4">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-10 w-64" />
            </div>
            <Skeleton className="aspect-[2/1] w-full rounded-2xl" />
          </div>
          <Skeleton className="mt-8 h-12 w-full rounded-xl" />
        </div>
      </section>

      <section className="pb-20">
        <div className="w-full lg:w-[82%] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-8">
            <aside className="hidden lg:block lg:w-64 xl:w-72 shrink-0">
              <FiltersSkeleton />
            </aside>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-6">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-9 w-36 rounded-lg" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-x-6 gap-y-12">
                {Array.from({ length: 6 }).map((_, i) => (
                  <VehicleGridCardSkeleton key={i} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
