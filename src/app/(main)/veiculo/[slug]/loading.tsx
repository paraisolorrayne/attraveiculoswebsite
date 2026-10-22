import { Container } from '@/components/ui/container'
import { Skeleton } from '@/components/ui/skeleton'

// Esqueleto da ficha no formato dela (galeria, título, preço, coluna lateral).
// A ficha é montada a cada acesso (~1 s no servidor); sem isto, o clique num
// carro deixava a listagem parada na tela até a ficha inteira chegar.
export default function FichaCarregando() {
  return (
    <div className="min-h-screen bg-background">
      <div className="pt-24 lg:pt-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Skeleton className="aspect-[4/3] w-full rounded-xl sm:aspect-[16/9] lg:aspect-auto lg:h-[62vh]" />
          <div className="mt-4 flex gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-24 shrink-0 rounded-lg" />
            ))}
          </div>
        </div>
      </div>

      <Container className="py-8 lg:py-12">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            <div className="space-y-3 lg:hidden">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-9 w-48" />
            </div>
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-72 w-full rounded-xl" />
          </div>
          <div className="hidden space-y-4 lg:block">
            <Skeleton className="h-80 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        </div>
      </Container>
    </div>
  )
}
