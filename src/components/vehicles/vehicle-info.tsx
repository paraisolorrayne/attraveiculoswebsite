import { Badge } from '@/components/ui/badge'
import { Vehicle } from '@/types'
import { formatPrice } from '@/lib/utils'

interface VehicleInfoProps {
  vehicle: Vehicle
}

// Get badges for vehicle info
function getInfoBadges(vehicle: Vehicle) {
  const badges: { label: string; variant: 'primary' | 'success' | 'warning' | 'sold' }[] = []
  const brandLower = vehicle.brand.toLowerCase()

  // Status badges (always shown first)
  if (vehicle.status === 'sold') {
    badges.push({ label: 'Vendido', variant: 'sold' })
    return badges
  }
  if (vehicle.status === 'reserved') {
    badges.push({ label: 'Reservado', variant: 'warning' })
  }

  // 0 km badge
  if (vehicle.is_new || vehicle.mileage === 0) {
    badges.push({ label: '0 km', variant: 'success' })
  }

  // Category badges based on brand
  const supercarBrands = ['ferrari', 'lamborghini', 'mclaren', 'bugatti', 'pagani', 'koenigsegg']
  const luxuryBrands = ['bentley', 'rolls-royce', 'maybach']
  const sportsBrands = ['porsche', 'aston martin', 'maserati', 'lotus']

  if (supercarBrands.some(b => brandLower.includes(b))) {
    badges.push({ label: 'Superesportivo', variant: 'primary' })
  } else if (luxuryBrands.some(b => brandLower.includes(b))) {
    badges.push({ label: 'Ultra Luxo', variant: 'warning' })
  } else if (sportsBrands.some(b => brandLower.includes(b))) {
    badges.push({ label: 'Esportivo', variant: 'primary' })
  }

  return badges.slice(0, 2)
}

export function VehicleInfo({ vehicle }: VehicleInfoProps) {
  const badges = getInfoBadges(vehicle)

  return (
    <div className="bg-background-card border border-border rounded-xl p-6 sticky top-24">
      {/* Status badges */}
      {badges.length > 0 && (
        <div className="mb-4 flex gap-2 flex-wrap">
          {badges.map((badge, i) => (
            <Badge key={i} variant={badge.variant}>{badge.label}</Badge>
          ))}
        </div>
      )}

      {/* Título da sidebar (visível só em desktop). É h2, não h1: o h1 único da
          ficha vive no bloco de título da página. Classes inalteradas — o
          Tailwind zera font-size/weight de h2 no preflight, então o visual é
          idêntico ao que era com h1. */}
      <h2 className="text-2xl font-bold text-foreground mb-1">
        {vehicle.brand} {vehicle.model}
      </h2>
      <p className="text-foreground-secondary mb-6">
        {vehicle.version && `${vehicle.version} • `}
        {vehicle.year_manufacture}/{vehicle.year_model}
      </p>

      {/* Price */}
      <div className="mb-6">
        <p className="text-sm text-foreground-secondary mb-1">Valor</p>
        <p className="text-3xl font-bold text-primary">
          {formatPrice(vehicle.price)}
        </p>
      </div>

      {/* Quick specs */}
      <div className="grid grid-cols-2 gap-4 py-4 border-t border-border">
        <div>
          <p className="text-sm text-foreground-secondary">Quilometragem</p>
          <p className="font-medium text-foreground">
            {vehicle.mileage === 0 ? '0 km (Novo)' : `${vehicle.mileage.toLocaleString('pt-BR')} km`}
          </p>
        </div>
        <div>
          <p className="text-sm text-foreground-secondary">Cor</p>
          <p className="font-medium text-foreground">{vehicle.color}</p>
        </div>
        <div>
          <p className="text-sm text-foreground-secondary">Combustível</p>
          <p className="font-medium text-foreground">{vehicle.fuel_type}</p>
        </div>
        <div>
          <p className="text-sm text-foreground-secondary">Câmbio</p>
          <p className="font-medium text-foreground">{vehicle.transmission}</p>
        </div>
      </div>

      {/* Sold message */}
      {vehicle.status === 'sold' && (
        <div className="mt-4 p-4 bg-foreground-secondary/10 rounded-lg">
          <p className="text-sm text-foreground-secondary">
            Este veículo já foi vendido. Confira veículos similares em nosso acervo.
          </p>
        </div>
      )}
    </div>
  )
}

