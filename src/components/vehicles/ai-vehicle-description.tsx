import { Vehicle } from '@/types'
import { generateVehicleDescription } from '@/lib/vehicle-description-generator'
import { CopyVehicleButton } from './copy-vehicle-button'
import { SecaoDaFicha } from './secao-da-ficha'

interface VehicleDescriptionProps {
  vehicle: Vehicle
}

/**
 * Vehicle Description Component
 * Generates descriptions deterministically from structured vehicle data
 * No external API dependencies - instant, consistent results
 */
export function VehicleDescription({ vehicle }: VehicleDescriptionProps) {
  // Generate description from vehicle data (synchronous, no API calls)
  const description = generateVehicleDescription(vehicle)

  return (
    <SecaoDaFicha titulo="Sobre este veículo" acao={<CopyVehicleButton vehicle={vehicle} />}>
      <p className="max-w-[70ch] text-lg leading-[1.75] text-foreground-secondary">
        {description}
      </p>
    </SecaoDaFicha>
  )
}

// Keep async version for backward compatibility (same implementation)
export async function AIVehicleDescription({ vehicle }: VehicleDescriptionProps) {
  return <VehicleDescription vehicle={vehicle} />
}

// Loading skeleton for Suspense fallback (simplified since generation is instant)
export function AIVehicleDescriptionSkeleton() {
  return (
    <div>
      <div className="h-6 w-48 bg-foreground-secondary/10 rounded animate-pulse mb-4" />
      <div className="space-y-3">
        <div className="h-4 bg-foreground-secondary/10 rounded animate-pulse" />
        <div className="h-4 bg-foreground-secondary/10 rounded animate-pulse w-11/12" />
        <div className="h-4 bg-foreground-secondary/10 rounded animate-pulse w-10/12" />
      </div>
    </div>
  )
}

// Export the new component as default
export { VehicleDescription as default }

