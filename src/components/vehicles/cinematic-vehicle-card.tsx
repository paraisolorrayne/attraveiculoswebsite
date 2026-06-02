'use client'

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

export function CinematicVehicleCard({ vehicle, layout = 'horizontal' }: CinematicVehicleCardProps) {
  const badges = getPremiumBadges(vehicle)

  if (layout === 'vertical') {
    return (
      <div className="group bg-background-card border border-border rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-black/10 hover:-translate-y-1">
        {/* Image container with consistent 4:3 aspect ratio - clickable link */}
        <Link href={`/veiculo/${vehicle.slug}`} className="relative aspect-[4/3] overflow-hidden bg-background-soft vehicle-image-container block">
          <VehicleImage
            src={vehicle.photos?.[0]}
            alt={`${vehicle.brand} ${vehicle.model}`}
            fill
            className="card-vehicle-image transition-transform duration-500 group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          {/* Badges - positioned to not cover car */}
          {badges.length > 0 && (
            <div className="absolute top-3 left-3 flex gap-2">
              {badges.map((badge, i) => (
                <Badge key={i} variant={badge.variant} className="text-xs">{badge.label}</Badge>
              ))}
            </div>
          )}
        </Link>

        {/* Content */}
        <div className="p-5">
          <Link href={`/veiculo/${vehicle.slug}`} className="block">
            <p className="text-primary text-xs font-medium mb-1 uppercase tracking-wider">{vehicle.brand}</p>
            <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-1">
              {vehicle.model}
            </h3>
            <p className="text-foreground-secondary text-sm mb-3">
              {vehicle.year_model} • {formatMileage(vehicle.mileage)}
            </p>
            <p className="text-xl font-bold text-foreground mb-3">
              {formatPrice(vehicle.price)}
            </p>
          </Link>
          {/* CTA Buttons - outside link to avoid nested <a> */}
          <VehicleCardCTAs vehicle={vehicle} variant="compact" />
        </div>
      </div>
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

