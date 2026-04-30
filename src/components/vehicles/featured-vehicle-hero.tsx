'use client'

import { VehicleImage } from '@/components/ui/vehicle-image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Vehicle } from '@/types'
import { formatPrice, formatMileage } from '@/lib/utils'

interface FeaturedVehicleHeroProps {
  vehicle: Vehicle
}

export function FeaturedVehicleHero({ vehicle }: FeaturedVehicleHeroProps) {
  return (
    <section className="relative w-full bg-gradient-to-b from-background-soft via-background to-background overflow-hidden">
      <div className="max-w-[90%] lg:max-w-[68%] mx-auto py-5 sm:py-8 lg:py-16">
        <div className="relative flex flex-col lg:flex-row items-center gap-4 sm:gap-6 lg:gap-0">

          {/* Background brand watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04] select-none">
            <span className="text-[7rem] sm:text-[10rem] lg:text-[20rem] font-black uppercase tracking-tighter text-foreground whitespace-nowrap">
              {vehicle.brand}
            </span>
          </div>

          {/* Left: Brand + Model info */}
          <div className="relative z-10 text-center lg:text-left lg:w-2/5 space-y-1.5 sm:space-y-3 lg:space-y-4">
            <p className="text-primary text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em]">
              {vehicle.brand}
            </p>
            <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-foreground tracking-tight leading-[0.95]">
              {vehicle.model}
            </h1>
            {vehicle.version && (
              <p className="text-foreground-secondary text-xs sm:text-sm lg:text-base">
                {vehicle.version}
              </p>
            )}
            <Link
              href={`/veiculo/${vehicle.slug}`}
              className="inline-flex items-center gap-1.5 sm:gap-2 mt-2 sm:mt-4 text-primary font-semibold text-xs sm:text-sm hover:underline transition-colors"
            >
              Ver detalhes <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Link>
          </div>

          {/* Center: Vehicle image */}
          <div className="relative z-10 lg:w-2/5 flex justify-center w-full">
            <div className="relative w-full aspect-[16/9] sm:aspect-[16/9] max-w-[280px] sm:max-w-md lg:max-w-lg rounded-xl sm:rounded-2xl overflow-hidden shadow-xl shadow-black/15 border border-border/50">
              <VehicleImage
                src={vehicle.photos?.[0]}
                alt={`${vehicle.brand} ${vehicle.model}`}
                fill
                className="object-cover drop-shadow-2xl mix-blend-lighten"
                sizes="(max-width: 640px) 280px, (max-width: 768px) 90vw, 40vw"
                priority
              />
            </div>
          </div>

          {/* Right: Specs card */}
          <div className="relative z-10 lg:w-1/5 flex justify-center lg:justify-end w-full sm:w-auto">
            <div className="bg-background-card border border-border rounded-xl p-3 sm:p-5 shadow-lg min-w-[180px] w-full sm:w-auto">
              <div className="flex sm:block gap-4 sm:gap-0 justify-between sm:space-y-4">
                <div className="flex-1 sm:flex-none">
                  <span className="text-[10px] uppercase tracking-wider text-foreground-secondary font-medium">Ano</span>
                  <p className="text-sm sm:text-lg font-bold text-foreground">{vehicle.year_manufacture}/{vehicle.year_model}</p>
                </div>
                <div className="flex-1 sm:flex-none border-l sm:border-l-0 sm:border-t border-border pl-4 sm:pl-0 sm:pt-3">
                  <span className="text-[10px] uppercase tracking-wider text-foreground-secondary font-medium">Km</span>
                  <p className="text-sm sm:text-lg font-bold text-foreground">{vehicle.mileage === 0 ? '0 km' : formatMileage(vehicle.mileage)}</p>
                </div>
                <div className="flex-1 sm:flex-none border-l sm:border-l-0 sm:border-t border-border pl-4 sm:pl-0 sm:pt-3">
                  <span className="text-[10px] uppercase tracking-wider text-foreground-secondary font-medium">Valor</span>
                  <p className="text-sm sm:text-lg font-bold text-primary">{formatPrice(vehicle.price)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
