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
 * Na prévia de 22/10/2026 ela absorveu os cards de "Ficha Técnica"
 * (`vehicle-specs.tsx`) e o bloco "Performance", que repetiam combustível,
 * câmbio, cor, carroceria, km e ano. Virou lista de rótulo e valor, sem ícone
 * em caixa, e perdeu a "Categoria" (classificação do site, não dado do
 * anúncio; saía "premium" em minúscula). É onde os dados da Descrição
 * Customizada da AutoConf (tração, interior, rodas, freios) entram quando a
 * Attra preencher.
 *
 * O subtítulo diz "dados do anúncio", e não "dados oficiais do fabricante",
 * porque os campos são preenchidos pela equipe no Autoconf.
 */

import type { Vehicle } from '@/types'
import { formatMileage } from '@/lib/utils'

interface VehicleSpecsFallbackProps {
  vehicle: Vehicle
}

interface SpecItem {
  label: string
  value: string
}

function preenchidos(itens: SpecItem[]): SpecItem[] {
  return itens.filter((s) => s.value.trim().length > 0)
}

export function VehicleSpecsFallback({ vehicle }: VehicleSpecsFallbackProps) {
  const mecanica = preenchidos([
    { label: 'Motor', value: vehicle.engine ?? '' },
    { label: 'Potência', value: vehicle.horsepower ? `${vehicle.horsepower} cv` : '' },
    { label: 'Torque', value: vehicle.torque ? `${vehicle.torque} Nm` : '' },
    { label: '0–100 km/h', value: vehicle.acceleration ? `${vehicle.acceleration} s` : '' },
    { label: 'Velocidade máxima', value: vehicle.top_speed ? `${vehicle.top_speed} km/h` : '' },
    { label: 'Câmbio', value: vehicle.transmission ?? '' },
    { label: 'Combustível', value: vehicle.fuel_type ?? '' },
  ])

  const exemplar = preenchidos([
    { label: 'Ano', value: `${vehicle.year_manufacture}/${vehicle.year_model}` },
    { label: 'Quilometragem', value: vehicle.mileage === 0 ? '0 km' : formatMileage(vehicle.mileage) },
    { label: 'Cor', value: vehicle.color ?? '' },
    { label: 'Carroceria', value: vehicle.body_type ?? '' },
  ])

  if (mecanica.length === 0 && exemplar.length === 0) return null

  const modelName = `${vehicle.brand} ${vehicle.model}${vehicle.version ? ` ${vehicle.version}` : ''}`
  const grupos = [
    { titulo: 'Mecânica', itens: mecanica },
    { titulo: 'Exemplar', itens: exemplar },
  ].filter((g) => g.itens.length > 0)

  return (
    <section className="bg-background-card border border-border rounded-xl p-6 lg:p-8">
      <h2 className="text-xl font-semibold text-foreground">Ficha técnica</h2>
      <p className="mt-1 text-sm text-foreground-secondary">{modelName} — dados do anúncio</p>

      <div className="mt-6 grid gap-x-10 gap-y-8 md:grid-cols-2">
        {grupos.map((grupo) => (
          <div key={grupo.titulo}>
            <h3 className="text-[11px] font-medium uppercase tracking-[0.22em] text-foreground-secondary">
              {grupo.titulo}
            </h3>
            <dl className="mt-2">
              {grupo.itens.map((spec) => (
                <div
                  key={spec.label}
                  className="flex items-baseline justify-between gap-6 border-b border-border/70 py-3 last:border-b-0"
                >
                  <dt className="text-sm text-foreground-secondary">{spec.label}</dt>
                  <dd className="text-right text-[15px] font-medium text-foreground">{spec.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </section>
  )
}
