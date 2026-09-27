'use client'

import { useEffect, useRef } from 'react'
import { useVehicleContext } from '@/contexts/vehicle-context'
import { useAnalytics } from '@/hooks/use-analytics'
import { trackVehicle, valorEmReais } from '@/lib/meta-pixel'

interface VehicleContextSetterProps {
  vehicleId: string
  vehicleBrand: string
  vehicleModel: string
  vehicleYear?: string | number
  vehiclePrice?: number
  vehicleSlug?: string
  vehicleCategory?: string
}

/**
 * Client component that sets the current vehicle in the global context
 * This allows the WhatsAppButton to access vehicle data from any page
 * Also tracks vehicle views in analytics
 */
export function VehicleContextSetter({
  vehicleId,
  vehicleBrand,
  vehicleModel,
  vehicleYear,
  vehiclePrice,
  vehicleSlug,
  vehicleCategory,
}: VehicleContextSetterProps) {
  const { setVehicle, clearVehicle } = useVehicleContext()
  const { trackVehicleView } = useAnalytics()
  const hasTracked = useRef(false)

  useEffect(() => {
    // Set vehicle data when component mounts
    setVehicle({
      vehicleId,
      vehicleBrand,
      vehicleModel,
      vehicleYear,
      vehiclePrice,
      vehicleSlug,
    })

    // Track vehicle view only once per mount
    if (!hasTracked.current) {
      trackVehicleView({
        id: vehicleId,
        name: `${vehicleBrand} ${vehicleModel}`,
        brand: vehicleBrand,
        model: vehicleModel,
        year: typeof vehicleYear === 'string' ? parseInt(vehicleYear) : (vehicleYear || new Date().getFullYear()),
        price: vehiclePrice || 0,
        category: vehicleCategory || 'premium',
        slug: vehicleSlug,
      })
      hasTracked.current = true
    }

    // Clear vehicle data when component unmounts (leaving vehicle page)
    return () => {
      clearVehicle()
    }
  }, [vehicleId, vehicleBrand, vehicleModel, vehicleYear, vehiclePrice, vehicleSlug, vehicleCategory, setVehicle, clearVehicle, trackVehicleView])

  /**
   * `ViewContent` do Meta Pixel — o evento que casa a ficha com o catálogo.
   *
   * Aqui e não na página porque a página é componente de servidor, e o pixel
   * precisa do navegador. Este componente já é cliente, já roda só em ficha de
   * veículo e já recebe as duas coisas que o evento pede: `vehicleId`, que é o
   * mesmo número que o feed publica (`autoconf-api.ts` monta o slug com ele no
   * fim), e o preço.
   *
   * Em efeito separado, com dependências só do que o evento usa: o de cima
   * depende de sete props e reexecuta por motivos que não têm nada a ver com
   * medição. A trava contra repetição fica em `trackVehicle`, que ignora o
   * mesmo id duas vezes seguidas — é o que segura o StrictMode, que monta todo
   * efeito duas vezes em desenvolvimento.
   *
   * Trocar de veículo sem recarregar dispara de novo: o Next.js remonta a
   * página, o id muda, e o id novo não é igual ao anterior.
   */
  useEffect(() => {
    trackVehicle('ViewContent', [vehicleId], valorEmReais(vehiclePrice))
  }, [vehicleId, vehiclePrice])

  // This component doesn't render anything
  return null
}

