import { Container } from '@/components/ui/container'
import { Skeleton, BlogGridSkeleton } from '@/components/ui/skeleton'

// Em blog/(lista)/ e não em blog/: um loading.tsx em blog/ também envolveria
// blog/[slug], e o post inexistente voltaria a responder 200 (ver a página do post).

export default function BlogLoading() {
  return (
    <main className="bg-background min-h-screen">
      {/* Hero Section - matches pt-28 pb-12 from actual page */}
      <section className="pt-28 pb-12 bg-gradient-to-b from-background-soft to-background">
        <Container>
          {/* Breadcrumb */}
          <div className="flex gap-2 mb-6">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-16" />
          </div>
          {/* Title */}
          <Skeleton className="h-10 lg:h-14 w-72 mb-4" />
          {/* Description */}
          <div className="max-w-2xl space-y-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-3/4" />
          </div>
          <Skeleton className="h-4 w-96 mt-3" />
        </Container>
      </section>

      {/* Blog Content - Tabs skeleton */}
      <section className="py-12">
        <Container>
          {/* Tab buttons */}
          <div className="flex gap-4 mb-8 border-b border-border">
            <Skeleton className="h-10 w-28 rounded-t-lg" />
            <Skeleton className="h-10 w-28 rounded-t-lg" />
          </div>
          {/* Grid */}
          <BlogGridSkeleton count={6} />
        </Container>
      </section>
    </main>
  )
}

