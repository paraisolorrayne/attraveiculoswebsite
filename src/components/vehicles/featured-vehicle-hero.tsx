'use client'

import { VehicleImage } from '@/components/ui/vehicle-image'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Vehicle } from '@/types'
import { formatPrice, formatMileage } from '@/lib/utils'

interface FeaturedVehicleHeroProps {
  vehicle: Vehicle
  /**
   * Quando preenchido, renderiza o carro como PNG transparente flutuante
   * (sem container/card/shadow). Vem do cache de remove-bg processado
   * via Replicate. Quando null, cai pra foto original dentro de um card.
   */
  noBgPhotoUrl?: string | null
}

export function FeaturedVehicleHero({ vehicle, noBgPhotoUrl }: FeaturedVehicleHeroProps) {
  const useTransparent = !!noBgPhotoUrl
  return (
    <section className="relative w-full bg-gradient-to-b from-background-soft via-background to-background overflow-hidden">
      <div className="max-w-[92%] lg:max-w-[68%] mx-auto py-3 sm:py-8 lg:py-16">
        {/* Mobile: layout horizontal compacto (imagem esquerda, info direita).
            Desktop (lg): mantém layout em 3 colunas com versão expandida. */}
        <div className="relative flex flex-row lg:flex-row items-center gap-3 sm:gap-6 lg:gap-0">

          {/* Background brand watermark — escondido em mobile pra liberar espaço */}
          <div className="absolute inset-0 hidden sm:flex items-center justify-center pointer-events-none opacity-[0.04] select-none">
            <span className="text-[10rem] lg:text-[20rem] font-black uppercase tracking-tighter text-foreground whitespace-nowrap">
              {vehicle.brand}
            </span>
          </div>

          {/* Center: Vehicle image.
              Aumentei a coluna de lg:w-2/5 → lg:w-1/2 e o max-width da
              foto de lg:max-w-lg (512px) → lg:max-w-2xl (672px) pra dar
              mais destaque ao carro destacado. As outras colunas se ajustam
              proporcionalmente abaixo.
              - Com remove-bg (PNG transparente): carro flutuante sem card.
              - Sem remove-bg (cache miss): cai pro layout com border/shadow. */}
          <div className="relative z-10 lg:w-1/2 lg:order-2 flex justify-center w-2/5 shrink-0">
            {useTransparent ? (
              <div className="relative w-full aspect-[4/3] sm:aspect-[16/9] max-w-full sm:max-w-lg lg:max-w-2xl">
                <Image
                  src={noBgPhotoUrl!}
                  alt={`${vehicle.brand} ${vehicle.model}`}
                  fill
                  className="object-contain drop-shadow-2xl"
                  sizes="(max-width: 640px) 40vw, (max-width: 1024px) 90vw, 50vw"
                  priority
                />
              </div>
            ) : (
              <div className="relative w-full aspect-[4/3] sm:aspect-[16/9] max-w-full sm:max-w-lg lg:max-w-2xl rounded-lg sm:rounded-2xl overflow-hidden shadow-lg sm:shadow-xl shadow-black/15 border border-border/50">
                <VehicleImage
                  src={vehicle.photos?.[0]}
                  alt={`${vehicle.brand} ${vehicle.model}`}
                  fill
                  className="object-cover drop-shadow-2xl mix-blend-lighten"
                  sizes="(max-width: 640px) 40vw, (max-width: 1024px) 90vw, 50vw"
                  priority
                />
              </div>
            )}
          </div>

          {/* Right (mobile): Brand + Model + specs inline.
              Left (desktop): Brand + Model info large.
              Coluna reduzida pra lg:w-[30%] (era 2/5=40%) — sobra do espaço
              foi pra coluna da imagem. */}
          <div className="relative z-10 lg:w-[30%] lg:order-1 flex-1 text-left lg:text-left space-y-1 sm:space-y-3 lg:space-y-4 min-w-0">
            <p className="text-primary text-[9px] sm:text-xs font-bold uppercase tracking-[0.2em]">
              {vehicle.brand}
            </p>
            <h1 className="text-lg sm:text-4xl md:text-5xl lg:text-6xl font-black text-foreground tracking-tight leading-[0.95]">
              {vehicle.model}
            </h1>
            {vehicle.version && (
              <p className="hidden sm:block text-foreground-secondary text-xs sm:text-sm lg:text-base">
                {vehicle.version}
              </p>
            )}
            {/* Mobile-only inline specs (price highlighted) */}
            <div className="sm:hidden flex items-baseline gap-2 pt-0.5">
              <span className="text-base font-bold text-primary">{formatPrice(vehicle.price)}</span>
              <span className="text-[10px] text-foreground-secondary">
                {vehicle.year_model} · {vehicle.mileage === 0 ? '0 km' : formatMileage(vehicle.mileage)}
              </span>
            </div>
            <Link
              href={`/veiculo/${vehicle.slug}`}
              className="inline-flex items-center gap-1.5 sm:gap-2 mt-1 sm:mt-4 text-primary font-semibold text-xs sm:text-sm hover:underline transition-colors"
            >
              Ver detalhes <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Link>
          </div>

          {/* Right (desktop only): Specs card.
              Coluna lg:w-[20%] (era 1/5=20%, mantido) + lg:-ml-8 pra puxar
              pra esquerda e ficar colado no veículo. Total: 30% + 50% + 20% = 100%. */}
          <div className="hidden sm:flex relative z-10 lg:w-[20%] lg:order-3 lg:-ml-8 justify-center lg:justify-end w-full sm:w-auto">
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
