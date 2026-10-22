'use client'

import { useState } from 'react'
import Link from 'next/link'
import { VehicleImage } from '@/components/ui/vehicle-image'
import { Fuel, Gauge, Settings, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Vehicle } from '@/types'
import { formatPrice, formatMileage } from '@/lib/utils'
import { VehicleCardCTAs } from './vehicle-card-ctas'

interface CinematicVehicleCardProps {
  vehicle: Vehicle
  layout?: 'horizontal' | 'vertical'
  /** Primeiro card visível da lista: a foto dele costuma ser o LCP da página. */
  priority?: boolean
}

// Premium badges based on vehicle characteristics
function getPremiumBadges(vehicle: Vehicle) {
  const badges: { label: string; variant: 'primary' | 'success' | 'warning' | 'sold'; priority: number }[] = []
  const brandLower = vehicle.brand.toLowerCase()

  // Status badges (highest priority)
  if (vehicle.status === 'sold') {
    badges.push({ label: 'Vendido', variant: 'sold', priority: 0 })
  }
  if (vehicle.status === 'reserved') {
    badges.push({ label: 'Reservado', variant: 'warning', priority: 1 })
  }

  // 0 km badge
  if (vehicle.is_new || vehicle.mileage === 0) {
    badges.push({ label: '0 km', variant: 'success', priority: 2 })
  }

  // Category badges based on brand/characteristics
  const supercarBrands = ['ferrari', 'lamborghini', 'mclaren', 'bugatti', 'pagani', 'koenigsegg']
  const luxuryBrands = ['bentley', 'rolls-royce', 'maybach']
  const sportsBrands = ['porsche', 'aston martin', 'maserati', 'lotus']

  if (supercarBrands.some(b => brandLower.includes(b)) || vehicle.category === 'supercar') {
    badges.push({ label: 'Superesportivo', variant: 'primary', priority: 3 })
  } else if (luxuryBrands.some(b => brandLower.includes(b)) || vehicle.category === 'luxury') {
    badges.push({ label: 'Ultra Luxo', variant: 'warning', priority: 3 })
  } else if (sportsBrands.some(b => brandLower.includes(b)) || vehicle.category === 'sports') {
    badges.push({ label: 'Esportivo', variant: 'primary', priority: 4 })
  }

  // High performance badge (only if no category badge)
  if (vehicle.horsepower && vehicle.horsepower >= 500 && !badges.some(b => b.priority === 3 || b.priority === 4)) {
    badges.push({ label: `${vehicle.horsepower} cv`, variant: 'primary', priority: 5 })
  }

  // Low mileage badge for used cars (not 0km)
  if (vehicle.mileage > 0 && vehicle.mileage <= 5000 && !badges.some(b => b.label === '0 km')) {
    badges.push({ label: 'Semi-novo', variant: 'success', priority: 6 })
  }

  // Sort by priority and return max 2
  return badges.sort((a, b) => a.priority - b.priority).slice(0, 2)
}

export function CinematicVehicleCard({ vehicle, layout = 'horizontal', priority = false }: CinematicVehicleCardProps) {
  const badges = getPremiumBadges(vehicle)
  const [fotoPronta, setFotoPronta] = useState(false)

  if (layout === 'vertical') {
    const linhaTecnica = [vehicle.year_model, formatMileage(vehicle.mileage), vehicle.fuel_type].filter(Boolean)
    return (
      <article className="group flex flex-col">
        {/* Foto: entra suave por cima do esqueleto. O card com `priority` é o
            LCP da página e aparece direto, sem esperar o JavaScript. */}
        <Link href={`/veiculo/${vehicle.slug}`} className="relative block aspect-[4/3] overflow-hidden rounded-xl bg-background-soft">
          {!priority && !fotoPronta && <div className="esqueleto absolute inset-0 rounded-none" aria-hidden="true" />}
          <VehicleImage
            src={vehicle.photos?.[0]}
            alt={`${vehicle.brand} ${vehicle.model}`}
            fill
            onLoad={() => setFotoPronta(true)}
            className={`foto-card object-cover object-center transition-[transform,opacity] duration-700 ease-out group-hover:scale-[1.04] ${
              priority || fotoPronta ? 'opacity-100' : 'opacity-0'
            }`}
            sizes="(max-width: 640px) 100vw, (max-width: 1536px) 40vw, 28vw"
            priority={priority}
            fetchPriority={priority ? 'high' : undefined}
          />
          {/* Selos num estilo só, discreto: a cor de cada um competia com a foto */}
          {badges.length > 0 && (
            <div className="absolute top-3 left-3 flex gap-1.5">
              {badges.map((badge, i) => (
                <span
                  key={i}
                  className="rounded-md bg-black/55 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-white/90 backdrop-blur-sm"
                >
                  {badge.label}
                </span>
              ))}
            </div>
          )}
        </Link>

        <div className="flex flex-1 flex-col pt-4">
          <Link href={`/veiculo/${vehicle.slug}`} className="block">
            <p className="text-[11px] uppercase tracking-[0.24em] text-foreground-secondary">{vehicle.brand}</p>
            <h3
              className="mt-1.5 text-[22px] leading-tight text-foreground line-clamp-1"
              style={{ fontFamily: 'var(--font-montserrat)' }}
            >
              {vehicle.model}
            </h3>
            {vehicle.version && (
              <p className="mt-1 text-sm text-foreground-secondary line-clamp-1">{vehicle.version}</p>
            )}
            <p className="mt-3 text-sm text-foreground-secondary">
              {linhaTecnica.map((item, i) => (
                <span key={i}>
                  {i > 0 && <span className="mx-1.5 text-foreground-secondary/60" aria-hidden="true">·</span>}
                  {item}
                </span>
              ))}
            </p>
          </Link>

          {/* Preço e botão lado a lado; o botão fica fora do link (sem <a> dentro de <a>) */}
          <div className="mt-auto pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4">
              <p className="text-xl font-semibold tabular-nums text-foreground">{formatPrice(vehicle.price)}</p>
              <VehicleCardCTAs vehicle={vehicle} variant="inline" />
            </div>
          </div>
        </div>
      </article>
    )
  }

  // Horizontal layout - Clean design prioritizing vehicle visibility
  return (
    <div className="group bg-background-card border border-border rounded-2xl overflow-hidden flex flex-col md:flex-row transition-all duration-300 hover:shadow-xl hover:shadow-black/10 hover:-translate-y-1">
      {/* Image container - fixed 4:3 aspect + object-cover */}
      <Link href={`/veiculo/${vehicle.slug}`} className="relative aspect-[4/3] md:w-[46%] shrink-0 overflow-hidden bg-background-soft block">
        <VehicleImage
          src={vehicle.photos?.[0]}
          alt={`${vehicle.brand} ${vehicle.model}`}
          fill
          className="object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
          sizes="(max-width: 768px) 100vw, 55vw"
          priority={priority}
          fetchPriority={priority ? 'high' : undefined}
        />

        {/* Badges - positioned bottom-left */}
        {badges.length > 0 && (
          <div className="absolute bottom-4 left-4 flex gap-2">
            {badges.map((badge, i) => (
              <Badge key={i} variant={badge.variant} className="shadow-sm">{badge.label}</Badge>
            ))}
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="p-5 md:p-6 flex-1 min-w-0 flex flex-col justify-center">
        <Link href={`/veiculo/${vehicle.slug}`} className="block">
          <p className="text-primary text-xs font-semibold mb-1 uppercase tracking-wider">{vehicle.brand}</p>
          <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-1 group-hover:text-primary transition-colors line-clamp-1">
            {vehicle.model}
          </h3>
          {vehicle.version && (
            <p className="text-foreground-secondary text-sm mb-3 line-clamp-1">{vehicle.version}</p>
          )}
        </Link>

        {/* Specs row */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-4 text-sm text-foreground-secondary">
          <span className="flex items-center gap-1.5">
            <Gauge className="w-4 h-4 text-primary/70" />
            {vehicle.year_model}
          </span>
          <span className="flex items-center gap-1.5">
            <Settings className="w-4 h-4 text-primary/70" />
            {formatMileage(vehicle.mileage)}
          </span>
          <span className="flex items-center gap-1.5">
            <Fuel className="w-4 h-4 text-primary/70" />
            {vehicle.fuel_type}
          </span>
        </div>

        {/* Price */}
        <Link href={`/veiculo/${vehicle.slug}`}>
          <p className="text-xl lg:text-2xl font-bold text-foreground hover:text-primary transition-colors mb-4">
            {formatPrice(vehicle.price)}
          </p>
        </Link>

        {/* CTA Button */}
        <VehicleCardCTAs vehicle={vehicle} variant="compact" />
      </div>
    </div>
  )
}

