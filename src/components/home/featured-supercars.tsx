'use client'

import { useRef, useEffect, useState } from 'react'
import { VehicleImage } from '@/components/ui/vehicle-image'
import Link from 'next/link'
import { ArrowRight, Zap } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatPrice } from '@/lib/utils'
import { Vehicle } from '@/types'
import { VehicleCardCTAs } from '@/components/vehicles/vehicle-card-ctas'

interface FeaturedSupercarsProps {
  vehicles?: Vehicle[]
}

// Get badges for featured supercar cards
function getSupercarssBadges(vehicle: Vehicle) {
  const badges: { label: string; variant: 'primary' | 'success' | 'warning' | 'sold' }[] = []
  const brandLower = vehicle.brand.toLowerCase()

  // 0 km badge
  if (vehicle.is_new || vehicle.mileage === 0) {
    badges.push({ label: '0 km', variant: 'success' })
  }

  // Category badges based on brand
  const supercarBrands = ['ferrari', 'lamborghini', 'mclaren', 'bugatti', 'pagani', 'koenigsegg']
  const luxuryBrands = ['bentley', 'rolls-royce', 'maybach']
  const sportsBrands = ['porsche', 'aston martin', 'maserati', 'lotus']

  if (supercarBrands.some(b => brandLower.includes(b)) || vehicle.category === 'supercar') {
    badges.push({ label: 'Superesportivo', variant: 'primary' })
  } else if (luxuryBrands.some(b => brandLower.includes(b)) || vehicle.category === 'luxury') {
    badges.push({ label: 'Ultra Luxo', variant: 'warning' })
  } else if (sportsBrands.some(b => brandLower.includes(b)) || vehicle.category === 'sports') {
    badges.push({ label: 'Esportivo', variant: 'primary' })
  }

  return badges.slice(0, 2)
}

export function FeaturedSupercars({ vehicles = [] }: FeaturedSupercarsProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true)
      },
      { threshold: 0.15 }
    )
    if (sectionRef.current) observer.observe(sectionRef.current)

    // Fallback: garante que o conteúdo aparece mesmo sem scroll (mobile)
    const timeout = setTimeout(() => setIsVisible(true), 1500)

    return () => {
      observer.disconnect()
      clearTimeout(timeout)
    }
  }, [])

  // Take first 3 vehicles for display
  const displayVehicles = vehicles.slice(0, 3)

  if (displayVehicles.length === 0) {
    return null // Don't render section if no vehicles
  }

  return (
    <section ref={sectionRef} className="py-12 md:py-24 bg-background relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />

      <Container className="relative z-10">
        {/* Section Header */}
        <div className={`mb-16 opacity-0 ${isVisible ? 'animate-fade-in-up' : ''}`}>
          <div className="flex items-center gap-3 mb-4">
            <Zap className="w-6 h-6 text-primary" />
            <span className="text-primary font-medium tracking-wide uppercase text-sm">Destaques</span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Supercarros e Veículos Premium em Destaque
          </h2>
          <p className="text-foreground-secondary text-lg max-w-2xl">
            Estoque de supercarros e carros de luxo com curadoria rigorosa, prontos para entrega nacional
          </p>
        </div>

        {/* Featured Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {displayVehicles.map((vehicle, index) => (
            <div
              key={vehicle.id}
              className={`group card-premium bg-background-card border border-border rounded-2xl overflow-hidden opacity-0 ${
                isVisible ? `animate-fade-in-up stagger-${index + 1}` : ''
              }`}
            >
              {/* Image container - clickable link */}
              <Link href={`/veiculo/${vehicle.slug}`} className="block">
                <div className="relative aspect-[4/3] overflow-hidden bg-background-soft vehicle-image-container">
                  <VehicleImage
                    src={vehicle.photos?.[0]}
                    alt={`${vehicle.brand} ${vehicle.model}`}
                    fill
                    className="card-vehicle-image transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  {/* Badges */}
                  {(() => {
                    const badges = getSupercarssBadges(vehicle)
                    return badges.length > 0 ? (
                      <div className="absolute top-4 left-4 flex gap-2">
                        {badges.map((badge, i) => (
                          <Badge key={i} variant={badge.variant}>{badge.label}</Badge>
                        ))}
                      </div>
                    ) : null
                  })()}
                </div>
              </Link>

              {/* Content */}
              <div className="p-6">
                <Link href={`/veiculo/${vehicle.slug}`} className="block">
                  <p className="text-primary text-sm font-medium mb-1">{vehicle.brand}</p>
                  <h3 className="text-2xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                    {vehicle.model}
                  </h3>
                  <p className="text-foreground-secondary mb-4">
                    {vehicle.year_model} • {vehicle.mileage === 0 ? '0 km' : `${vehicle.mileage?.toLocaleString('pt-BR')} km`}
                  </p>
                  <p className="text-3xl font-bold text-foreground mb-4">
                    {formatPrice(vehicle.price || 0)}
                  </p>
                </Link>

                {/* WhatsApp CTA - outside Link to avoid nested <a> */}
                <VehicleCardCTAs vehicle={vehicle} variant="compact" />
              </div>
            </div>
          ))}
        </div>

        {/* View All CTA */}
        <div className={`mt-12 text-center opacity-0 ${isVisible ? 'animate-fade-in-up stagger-5' : ''}`}>
          <Button asChild variant="outline" size="lg">
            <Link href="/veiculos" className="flex items-center gap-2">
              Veja todo o nosso estoque premium de carros de luxo <ArrowRight className="w-5 h-5" />
            </Link>
          </Button>
        </div>
      </Container>
    </section>
  )
}

