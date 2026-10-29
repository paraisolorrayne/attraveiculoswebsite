import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        // Brilho que passa (`.esqueleto` em motion.css), não pisca-pisca.
        'esqueleto rounded-md',
        className
      )}
    />
  )
}

interface PhotoSkeletonProps extends SkeletonProps {
  /** Foto já chegou: o esqueleto some por baixo dela e para de animar. */
  loaded?: boolean
  /** Fundo sempre preto (tela cheia da galeria), independente do tema. */
  dark?: boolean
}

/**
 * Lugar de foto carregando: a marca Attra em cinza, com a cunha vermelha
 * cruzando o "A" (`.esqueleto-attra` em esqueleto-attra.css). Em áreas com
 * menos de 200px de largura (miniaturas) mostra só o "A".
 */
export function PhotoSkeleton({ className, loaded = false, dark = false }: PhotoSkeletonProps) {
  return (
    <div
      className={cn('esqueleto-attra', dark && 'esqueleto-attra--escuro', className)}
      data-loaded={loaded || undefined}
      aria-hidden="true"
    />
  )
}

export function VehicleCardSkeleton() {
  return (
    <div className="bg-background-card border border-border rounded-xl overflow-hidden">
      <PhotoSkeleton className="aspect-[16/10]" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-16" />
        </div>
        <Skeleton className="h-6 w-1/3" />
      </div>
    </div>
  )
}

export function VehicleGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <VehicleCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function VehicleHorizontalCardSkeleton() {
  return (
    <div className="bg-background-card rounded-2xl overflow-hidden flex flex-col md:flex-row">
      <PhotoSkeleton className="aspect-[16/10] md:w-1/2" />
      <div className="p-8 flex-1 space-y-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-4 mt-4">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-24" />
        </div>
        <Skeleton className="h-10 w-36 mt-4" />
      </div>
    </div>
  )
}

export function VehicleListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: count }).map((_, i) => (
        <VehicleHorizontalCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function BlogCardSkeleton() {
  return (
    <div className="bg-background-card border border-border rounded-xl overflow-hidden">
      <PhotoSkeleton className="aspect-[16/10]" />
      <div className="p-6 space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  )
}

export function BlogGridSkeleton({ count = 9 }: { count?: number }) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
      {Array.from({ length: count }).map((_, i) => (
        <BlogCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function BlogPostSkeleton() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Featured image */}
      <PhotoSkeleton className="w-full aspect-[16/9] rounded-2xl mb-8" />
      {/* Title */}
      <Skeleton className="h-10 w-3/4 mb-4" />
      <Skeleton className="h-10 w-1/2 mb-6" />
      {/* Meta info */}
      <div className="flex gap-4 mb-8">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-20" />
      </div>
      {/* Content paragraphs */}
      <div className="space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-9/12" />
        <Skeleton className="h-8 w-0" /> {/* spacer */}
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-10/12" />
      </div>
    </div>
  )
}

export function VehicleDetailSkeleton() {
  return (
    <div>
      {/* Gallery skeleton */}
      <PhotoSkeleton className="h-[60vh] lg:h-[70vh] w-full" />

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 lg:py-12">
        {/* Breadcrumb */}
        <div className="flex gap-2 mb-8">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Title block (mobile) */}
            <div className="lg:hidden space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-8 w-32" />
            </div>

            {/* AI Description skeleton */}
            <div className="bg-background-card border border-border rounded-xl p-6">
              <Skeleton className="h-6 w-48 mb-4" />
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-11/12" />
                <Skeleton className="h-4 w-10/12" />
              </div>
            </div>

            {/* Specs skeleton */}
            <div className="bg-background-card border border-border rounded-xl p-6">
              <Skeleton className="h-6 w-36 mb-6" />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-5 w-28" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column - sidebar */}
          <div className="hidden lg:block">
            <div className="sticky top-24 space-y-6">
              {/* Vehicle info card */}
              <div className="bg-background-card border border-border rounded-xl p-6 space-y-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-10 w-40 mt-4" />
              </div>
              {/* Contact buttons */}
              <div className="space-y-3">
                <Skeleton className="h-12 w-full rounded-lg" />
                <div className="flex gap-2">
                  <Skeleton className="h-10 flex-1 rounded-lg" />
                  <Skeleton className="h-10 flex-1 rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Related vehicles skeleton */}
      <div className="py-16 bg-background-soft">
        <div className="max-w-7xl mx-auto px-4">
          <Skeleton className="h-8 w-48 mb-8" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <VehicleCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function RelatedVehiclesSkeleton() {
  return (
    <div className="py-16 bg-background-soft mt-16">
      {/* Mesma largura e grade de RelatedVehicles, para a troca não pular. */}
      <div className="mx-auto w-full max-w-[max(80%,1280px)] px-4 sm:px-6 lg:px-8">
        <Skeleton className="h-8 w-48 mb-8" />
        <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 xl:grid-cols-4 2xl:gap-x-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <VehicleGridCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}

export function EngineSoundSkeleton() {
  return (
    <section className="py-24 bg-background-soft relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Skeleton className="h-6 w-6 rounded" />
            <Skeleton className="h-4 w-36" />
          </div>
          <Skeleton className="h-12 w-64 mx-auto mb-4" />
          <Skeleton className="h-5 w-96 mx-auto" />
        </div>
        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-background-card border border-border rounded-2xl overflow-hidden">
              <PhotoSkeleton className="aspect-[4/3]" />
              <div className="p-5 space-y-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function FiltersSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-32 mb-4" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ))}
      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
  )
}

/** Card em grade de /veiculos (layout "vertical" do CinematicVehicleCard). */
export function VehicleGridCardSkeleton() {
  return (
    <div>
      <PhotoSkeleton className="aspect-[4/3] w-full rounded-xl" />
      <div className="pt-4 space-y-2.5">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-4 mt-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-10 w-44 rounded-lg" />
        </div>
      </div>
    </div>
  )
}
