import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { Button } from '@/components/ui/button'
import { CinematicVehicleCard } from './cinematic-vehicle-card'
import { Vehicle } from '@/types'
import { getRelatedVehicles } from '@/lib/autoconf-api'

interface RelatedVehiclesProps {
  vehicle: Vehicle
}

/**
 * "Veículos Similares" da ficha. Desde 23/10/2026 acompanha a largura da
 * ficha logo acima (80% da tela, nunca menos que 1280 px) e usa o card do
 * estoque (/veiculos): presa em 1280 px, num monitor de 2560 px a fileira
 * ocupava metade da tela, com um card antigo de etiquetas coloridas.
 */
export async function RelatedVehicles({ vehicle }: RelatedVehiclesProps) {
  const relatedVehicles = await getRelatedVehicles(vehicle, 4)

  if (relatedVehicles.length === 0) return null

  return (
    <section className="py-16 bg-background-soft mt-16">
      <Container className="max-w-[max(80%,1280px)]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-1">
              Veículos Similares
            </h2>
            <p className="text-foreground-secondary">
              Outros veículos que podem interessar você
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/veiculos" className="flex items-center gap-2">
              Ver todos <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>

        {/* Quatro lado a lado só a partir de 1280 px; abaixo, dois por linha,
            com o card perto do tamanho que ele tem no estoque. */}
        <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 xl:grid-cols-4 2xl:gap-x-8">
          {relatedVehicles.map((related) => (
            <CinematicVehicleCard key={related.id} vehicle={related} layout="vertical" />
          ))}
        </div>
      </Container>
    </section>
  )
}
