/**
 * VehicleSpecsFallback — a ficha técnica da página do veículo, só com os
 * dados do anúncio no Autoconf (motor, câmbio, KM, combustível etc.).
 *
 * Desde 20/10/2026 é a única ficha da página. A outra, montada com o catálogo
 * curado de `vehicle-datasheet.ts`, tinha uma versão por modelo e completava o
 * anúncio por semelhança de nome: o 911 Carrera GTS Cabriolet saía com peso,
 * dimensões e destaques do Carrera base. O catálogo segue nas páginas de
 * modelo, onde é apresentado como referência do modelo, não do exemplar.
 *
 * O subtítulo diz "dados do anúncio", e não "dados oficiais do fabricante",
 * porque os campos são preenchidos pela equipe no Autoconf.
 */

import {
  Gauge, Zap, RotateCw, Fuel, Car, Shield, ArrowUpRight, Cog,
  CircleGauge, BookOpen, Calendar, Palette,
} from 'lucide-react'
import type { Vehicle } from '@/types'
import { formatMileage } from '@/lib/utils'

interface VehicleSpecsFallbackProps {
  vehicle: Vehicle
}

interface SpecItem {
  icon: typeof Gauge
  label: string
  value: string
}

export function VehicleSpecsFallback({ vehicle }: VehicleSpecsFallbackProps) {
  // Motor e Performance — campos técnicos do veículo. Filtra null/vazio
  // pra não mostrar specs incompletos.
  const primarySpecs: SpecItem[] = [
    { icon: Cog, label: 'Motor', value: vehicle.engine ?? '' },
    { icon: Zap, label: 'Potência', value: vehicle.horsepower ? `${vehicle.horsepower} cv` : '' },
    { icon: RotateCw, label: 'Torque', value: vehicle.torque ? `${vehicle.torque} Nm` : '' },
    { icon: Gauge, label: '0–100 km/h', value: vehicle.acceleration ? `${vehicle.acceleration} s` : '' },
    { icon: ArrowUpRight, label: 'Velocidade máxima', value: vehicle.top_speed ? `${vehicle.top_speed} km/h` : '' },
    { icon: Car, label: 'Transmissão', value: vehicle.transmission ?? '' },
    { icon: Fuel, label: 'Combustível', value: vehicle.fuel_type ?? '' },
    { icon: Shield, label: 'Carroceria', value: vehicle.body_type ?? '' },
  ].filter((s) => s.value.trim().length > 0)

  // Detalhes do anúncio — quilometragem, ano, cor.
  const detailSpecs: SpecItem[] = [
    {
      icon: CircleGauge,
      label: 'Quilometragem',
      value: vehicle.mileage === 0 ? '0 km' : formatMileage(vehicle.mileage),
    },
    {
      icon: Calendar,
      label: 'Ano',
      value: `${vehicle.year_manufacture}/${vehicle.year_model}`,
    },
    { icon: Palette, label: 'Cor', value: vehicle.color ?? '' },
  ].filter((s) => s.value.trim().length > 0)

  // Se não há sequer 1 dado válido, melhor não renderizar nada que
  // não mostrar um card vazio (improvável mas defensivo).
  if (primarySpecs.length === 0 && detailSpecs.length === 0) {
    return null
  }

  const modelName = `${vehicle.brand} ${vehicle.model}${vehicle.version ? ` ${vehicle.version}` : ''}`

  return (
    <section className="bg-background-card border border-border rounded-xl overflow-hidden">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Ficha Técnica</h2>
            <p className="text-sm text-foreground-secondary">
              {modelName} — dados do anúncio
            </p>
          </div>
        </div>
      </div>

      {primarySpecs.length > 0 && (
        <div className="p-6 border-b border-border">
          <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
            Motor e Performance
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {primarySpecs.map((spec) => (
              <div key={spec.label} className="p-3 bg-background rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <spec.icon className="w-4 h-4 text-primary flex-shrink-0" aria-hidden="true" />
                  <span className="text-xs text-foreground-secondary">{spec.label}</span>
                </div>
                <p className="text-sm font-medium text-foreground">{spec.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {detailSpecs.length > 0 && (
        <div className="p-6">
          <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
            Detalhes do Veículo
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {detailSpecs.map((spec) => (
              <div key={spec.label} className="p-3 bg-background rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <spec.icon className="w-4 h-4 text-primary flex-shrink-0" aria-hidden="true" />
                  <span className="text-xs text-foreground-secondary">{spec.label}</span>
                </div>
                <p className="text-sm font-medium text-foreground">{spec.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
