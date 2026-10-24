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
    // Sem sticky próprio: quem acompanha a rolagem é o contêiner da coluna na
    // ficha (junto com os botões). Com os dois sticky, no fim da coluna este
    // card ficava parado e cobria o "Falar com consultor" logo abaixo.
    // Sem caixa desde 23/10/2026, como os blocos da coluna principal.
    <div>
      {/* Status badges */}
      {badges.length > 0 && (
        <div className="mb-4 flex gap-2 flex-wrap">
          {badges.map((badge, i) => (
            <Badge key={i} variant={badge.variant}>{badge.label}</Badge>
          ))}
        </div>
      )}

      {/* Desde 23/10/2026 a lateral abre direto no preço, na altura do título
          da coluna principal (TituloDaFicha). Nome, versão, quilometragem,
          cor, combustível e câmbio saíram daqui: o título e os números grandes
          ao lado já mostram, e a ficha técnica logo abaixo também. */}
      <div className="mb-6">
        <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-foreground-secondary mb-1">Valor</p>
        <p className="text-3xl font-bold text-primary xl:text-4xl">
          {formatPrice(vehicle.price)}
        </p>
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

