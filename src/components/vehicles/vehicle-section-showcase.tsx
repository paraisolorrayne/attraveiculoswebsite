/**
 * VehicleSectionShowcase — 3 seções editoriais (OVERVIEW / EXTERIOR DESIGN /
 * INTERIOR) que aparecem entre o painel principal do veículo e a lista de
 * relacionados, inspirado em lamborghinibeverlyhills.com/temerario.
 *
 * Recebe `sections` já pronto do server (vinda de getOrGenerateVehicleSections
 * ou getCachedVehicleSections + fallback). Componente é puro — toda a lógica
 * de cache/IA está em lib/vehicle-sections.ts.
 *
 * Layout:
 *   - Desktop: split 50/50 (foto + texto), alternando lado entre seções
 *   - Mobile: stack vertical (foto em cima, texto embaixo)
 *
 * Quando uma section.copy é null (cache sem copy gerada ainda), mostra
 * descrição estática de fallback baseada nos dados do veículo.
 *
 * Desde 28/10/2026, anúncio com a ficha do molde da AutoConf usa o texto
 * montado dela (`secoesPelaFicha`), como o "Sobre este veículo".
 */

import Image from 'next/image'
import { Container } from '@/components/ui/container'
import { SectionKicker } from '@/components/ui/brand'
import { Vehicle } from '@/types'
import { formatMileage, cn } from '@/lib/utils'
import type { VehicleSections } from '@/lib/vehicle-sections'
import { motorizacao } from '@/lib/taxonomia-veiculo'
import { semTravessao } from '@/lib/sem-travessao'
import { secoesPelaFicha } from '@/lib/vehicle-description-generator'

interface VehicleSectionShowcaseProps {
  vehicle: Vehicle
  sections: VehicleSections
}

type SectionConfig = {
  kicker: string
  title: string
  photo: string
  copy: string
  /** 'left' = foto esquerda, 'right' = foto direita (desktop only) */
  photoSide: 'left' | 'right'
  aspectClass: string
}

/**
 * Fallback estático quando IA não gerou copy ainda — só dados verificáveis,
 * mesmo tom factual do prompt.
 */
function buildFallbackCopy(vehicle: Vehicle, kind: 'overview' | 'exterior' | 'interior'): string {
  const km = vehicle.mileage === 0 ? '0 km' : formatMileage(vehicle.mileage)
  const year = `${vehicle.year_manufacture}/${vehicle.year_model}`

  if (kind === 'overview') {
    const parts = [`${vehicle.brand} ${vehicle.model}${vehicle.version ? ` ${vehicle.version}` : ''} ${year}.`]
    if (km !== '0 km') parts.push(`${km} rodados.`)
    if (vehicle.fuel_type) parts.push(`${vehicle.fuel_type} com câmbio ${vehicle.transmission ?? 'automático'}.`)
    return parts.join(' ')
  }

  if (kind === 'exterior') {
    const parts: string[] = []
    if (vehicle.body_type) parts.push(`Carroceria ${vehicle.body_type.toLowerCase()}.`)
    if (vehicle.color) parts.push(`Cor ${vehicle.color.toLowerCase()}.`)
    if (vehicle.horsepower) parts.push(`${vehicle.horsepower} cv.`)
    return parts.length > 0 ? parts.join(' ') : 'Linhas originais de fábrica preservadas.'
  }

  // interior
  const parts: string[] = []
  if (vehicle.transmission) parts.push(`Câmbio ${vehicle.transmission.toLowerCase()}.`)
  if (vehicle.fuel_type) parts.push(`Motorização ${motorizacao(vehicle.fuel_type)}.`)
  parts.push(`Acabamento original ${vehicle.brand}.`)
  return parts.join(' ')
}

export function VehicleSectionShowcase({ vehicle, sections }: VehicleSectionShowcaseProps) {
  // Com a ficha do molde, o texto vem dela (secoesPelaFicha) e o do Gemini,
  // escrito pelo cadastro, fica de fora: os dois brigavam na cor e na potência.
  const daFicha = vehicle.ficha ? secoesPelaFicha(vehicle, vehicle.ficha) : null
  const texto = (kind: 'overview' | 'exterior' | 'interior') =>
    semTravessao(daFicha ? daFicha[kind] : sections[kind].copy) ?? buildFallbackCopy(vehicle, kind)

  const items: Array<{ key: 'overview' | 'exterior' | 'interior' } & SectionConfig> = [
    {
      key: 'overview',
      kicker: 'Overview',
      title: `${vehicle.brand} ${vehicle.model}`,
      photo: sections.overview.photo_url,
      copy: texto('overview'),
      photoSide: 'right',
      aspectClass: 'aspect-[16/10]',
    },
    {
      key: 'exterior',
      kicker: 'Exterior Design',
      title: vehicle.body_type
        ? `${vehicle.body_type.charAt(0).toUpperCase()}${vehicle.body_type.slice(1).toLowerCase()}`
        : 'Design',
      photo: sections.exterior.photo_url,
      copy: texto('exterior'),
      photoSide: 'left',
      aspectClass: 'aspect-[16/10]',
    },
    {
      key: 'interior',
      kicker: 'Interior',
      title: 'Acabamento',
      photo: sections.interior.photo_url,
      copy: texto('interior'),
      photoSide: 'right',
      aspectClass: 'aspect-[16/10]',
    },
  ]

  return (
    <section className="py-20 lg:py-28 bg-background-soft">
      <Container size="2xl">
        <div className="space-y-20 lg:space-y-28">
          {items.map((item) => (
            <ShowcaseRow key={item.key} {...item} />
          ))}
        </div>
      </Container>
    </section>
  )
}

function ShowcaseRow({ kicker, title, photo, copy, photoSide, aspectClass }: SectionConfig) {
  // Em mobile (< lg), foto sempre em cima. Em desktop, alterna esquerda/direita
  // via order (foto vai pra 1 ou 2). Mantém ordem semântica no markup (foto, texto)
  // para SEO/screen reader — o reorder é puramente visual.
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
      <div className={cn('relative w-full', aspectClass, photoSide === 'right' && 'lg:order-2')}>
        <Image
          src={photo}
          alt={title}
          fill
          className="object-cover rounded-2xl shadow-xl shadow-black/10"
          sizes="(max-width: 1024px) 100vw, 50vw"
        />
      </div>
      <div className={cn(photoSide === 'right' && 'lg:order-1')}>
        <SectionKicker className="mb-4">{kicker}</SectionKicker>
        <h2
          className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground tracking-tight mb-6 leading-[1.05]"
          style={{ fontFamily: 'var(--font-montserrat)' }}
        >
          {title}
        </h2>
        <p className="text-foreground-secondary text-base md:text-lg leading-relaxed max-w-xl">
          {copy}
        </p>
      </div>
    </div>
  )
}

