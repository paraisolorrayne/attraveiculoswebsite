'use client'

import { VehicleImage } from '@/components/ui/vehicle-image'
import Link from 'next/link'
import { ArrowRight, MessageCircle, Gauge, CalendarDays } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { SectionKicker, SectionHeading } from '@/components/ui/brand'
import { Vehicle } from '@/types'
import { formatPrice, formatMileage } from '@/lib/utils'
import { getWhatsAppUrl } from '@/lib/constants'

interface EditorialSelectionProps {
  vehicles?: Vehicle[]
}

const SUPERCAR_BRANDS = ['ferrari', 'lamborghini', 'mclaren', 'bugatti', 'pagani', 'koenigsegg']

function curationReason(vehicle: Vehicle): string {
  const currentYear = new Date().getFullYear()
  const brand = vehicle.brand?.toLowerCase() || ''

  if (vehicle.is_new || vehicle.mileage === 0) {
    return '0 km, pronto para entrega imediata'
  }
  if (vehicle.mileage > 0 && vehicle.mileage < 5000) {
    return 'Baixíssima rodagem — praticamente novo'
  }
  if (vehicle.price >= 2_000_000) {
    return 'Peça de acervo, rara no mercado brasileiro'
  }
  if (SUPERCAR_BRANDS.some((b) => brand.includes(b))) {
    return 'Superesportivo com procedência verificada'
  }
  if (vehicle.year_model && vehicle.year_model >= currentYear - 1) {
    return 'Ano/modelo recente com documentação impecável'
  }
  if (vehicle.horsepower && vehicle.horsepower >= 500) {
    return 'Motorização disputada em estado superior'
  }
  return 'Configuração rara selecionada à mão'
}

function vehicleWhatsAppUrl(v: Vehicle) {
  const msg = `Olá, Attra. Tenho interesse no ${v.brand} ${v.model}${
    v.year_model ? ` ${v.year_model}` : ''
  }. Gostaria de falar com um consultor.`
  return getWhatsAppUrl(msg)
}

export function EditorialSelection({ vehicles = [] }: EditorialSelectionProps) {
  const [main, ...rest] = vehicles
  const secondary = rest.slice(0, 2)

  if (!main) return null

  return (
    <section className="py-20 md:py-28 bg-background relative">
      <Container size="2xl">
        {/* Header */}
        <div className="mb-12 md:mb-16 max-w-2xl">
          <SectionKicker className="mb-4">
            Seleção editorial · Atualizada semanalmente
          </SectionKicker>
          <SectionHeading as="h2" size="lg" className="mb-5">
            Três peças do acervo que merecem sua atenção.
          </SectionHeading>
          <p className="text-foreground-secondary text-base md:text-lg leading-relaxed">
            Curadoria feita à mão. Cada veículo entra por mérito —
            raridade, estado, procedência ou oportunidade.
          </p>
        </div>

        {/* Asymmetric layout */}
        <div className="grid gap-6 md:gap-8 lg:grid-cols-12">
          {/* Main — large */}
          <article className="lg:col-span-7 group">
            <Link
              href={`/veiculo/${main.slug}`}
              className="block relative rounded-2xl overflow-hidden bg-background-card border border-border shadow-lg shadow-black/5"
            >
              <div className="relative aspect-[5/4] md:aspect-[16/11] overflow-hidden">
                <VehicleImage
                  src={main.photos?.[0]}
                  alt={`${main.brand} ${main.model}`}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  sizes="(max-width: 1024px) 100vw, 58vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                {/* Curation reason chip */}
                <div className="absolute top-5 left-5 inline-flex items-center gap-2 bg-background-card/95 backdrop-blur-sm border border-border/60 rounded-full px-4 py-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-foreground">
                    Destaque da semana
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                  <p className="text-white/70 text-xs uppercase tracking-[0.2em] font-semibold mb-1.5">
                    {main.brand}
                  </p>
                  <h3 className="text-2xl md:text-4xl font-bold text-white mb-3 leading-tight">
                    {main.model}
                  </h3>
                  <p className="text-white/85 text-sm md:text-base max-w-xl">
                    {curationReason(main)}.
                  </p>
                </div>
              </div>
            </Link>

            {/* Main footer — specs + CTAs, styled as editorial footer, not listing card */}
            <div className="mt-5 flex flex-wrap items-center gap-5 gap-y-4">
              <MetaItem
                icon={CalendarDays}
                value={`${main.year_manufacture}/${main.year_model}`}
              />
              <MetaItem
                icon={Gauge}
                value={main.mileage === 0 ? '0 km' : formatMileage(main.mileage)}
              />
              <span className="text-foreground font-semibold text-lg md:text-xl tabular-nums">
                {formatPrice(main.price)}
              </span>

              <div className="ml-auto flex gap-2">
                <Link
                  href={`/veiculo/${main.slug}`}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground border border-border hover:border-foreground/30 rounded-lg px-4 py-2.5 transition-colors"
                >
                  Ver veículo
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href={vehicleWhatsAppUrl(main)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg px-4 py-2.5 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  Solicitar atendimento
                </a>
              </div>
            </div>
          </article>

          {/* Secondary — stacked editorial cards (NOT listing grid) */}
          <div className="lg:col-span-5 flex flex-col gap-6 md:gap-8">
            {secondary.map((v) => (
              <SecondaryPick key={v.id} vehicle={v} />
            ))}
          </div>
        </div>

        {/* Closing — editorial, not "see all listings" */}
        <div className="mt-14 md:mt-20 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/60 pt-8">
          <p className="text-foreground-secondary text-sm md:text-base max-w-md">
            Não encontrou a peça certa? Fazemos a busca personalizada na rede
            nacional — fora do estoque visível.
          </p>
          <div className="flex gap-2">
            <Link
              href="#captacao"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground border border-border hover:border-foreground/30 rounded-lg px-5 py-3 transition-colors"
            >
              Solicitar um veículo
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/veiculos"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-background bg-foreground hover:bg-foreground/90 rounded-lg px-5 py-3 transition-colors"
            >
              Ver todo o acervo
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </Container>
    </section>
  )
}

function SecondaryPick({ vehicle }: { vehicle: Vehicle }) {
  return (
    <article className="group grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr] gap-4 sm:gap-5 rounded-2xl border border-border bg-background-card overflow-hidden hover:border-primary/30 transition-colors">
      <Link
        href={`/veiculo/${vehicle.slug}`}
        className="relative aspect-square sm:aspect-[4/5] overflow-hidden"
      >
        <VehicleImage
          src={vehicle.photos?.[0]}
          alt={`${vehicle.brand} ${vehicle.model}`}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
          sizes="(max-width: 640px) 140px, 180px"
        />
      </Link>

      <div className="py-4 pr-4 sm:py-5 sm:pr-5 flex flex-col">
        <p className="text-[10px] uppercase tracking-[0.22em] text-primary font-semibold mb-1">
          {vehicle.brand}
        </p>
        <Link href={`/veiculo/${vehicle.slug}`}>
          <h3 className="text-base sm:text-lg font-bold text-foreground leading-tight group-hover:text-primary transition-colors">
            {vehicle.model}
          </h3>
        </Link>

        <p className="mt-1.5 text-[12px] sm:text-sm text-foreground-secondary leading-snug line-clamp-2">
          {curationReason(vehicle)}.
        </p>

        <div className="mt-auto pt-3 flex items-center gap-3">
          <span className="text-foreground font-semibold text-sm tabular-nums">
            {formatPrice(vehicle.price)}
          </span>
          <span className="ml-auto inline-flex items-center gap-1 text-[12px] font-medium text-primary group-hover:gap-2 transition-all">
            Ver
            <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </article>
  )
}

function MetaItem({
  icon: Icon,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  value: string
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-foreground-secondary">
      <Icon className="w-4 h-4 text-primary/80" />
      <span className="text-foreground font-medium">{value}</span>
    </span>
  )
}
