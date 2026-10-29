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
 * anúncio; saía "premium" em minúscula).
 *
 * Quando o marketing preenche a Descrição Customizada da AutoConf no molde
 * (`ficha-do-anuncio.ts`), os campos dela vencem os do cadastro ("Prata
 * High-Tech Metálico" no lugar de "Prata") e entram tração, freios, interior,
 * rodas, som e os diferenciais. Sem molde, a ficha fica como era.
 *
 * O subtítulo diz "dados do anúncio", e não "dados oficiais do fabricante",
 * porque os campos são preenchidos pela equipe no Autoconf.
 *
 * Desde 23/10/2026 é um bloco aberto (`SecaoDaFicha`), sem card. Mecânica,
 * Exemplar e Diferenciais dividem a largura da coluna: um embaixo do outro
 * no celular, dois lado a lado e, com a coluna bem larga, os três.
 * No mesmo dia a letra cresceu (valor 15→17 px, rótulo 14→16 px, título do
 * grupo 11→13 px): ao lado da referência da Shiftcar, a ficha lia pequena.
 */

import type { Vehicle } from '@/types'
import { formatMileage } from '@/lib/utils'
import { SecaoDaFicha } from './secao-da-ficha'

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
  const ficha = vehicle.ficha
  const mecanica = preenchidos([
    { label: 'Motor', value: ficha?.motor ?? vehicle.engine ?? '' },
    { label: 'Potência', value: ficha?.potencia ?? (vehicle.horsepower ? `${vehicle.horsepower} cv` : '') },
    { label: 'Torque', value: ficha?.torque ?? (vehicle.torque ? `${vehicle.torque} Nm` : '') },
    { label: '0–100 km/h', value: ficha?.aceleracao_0_100 ?? (vehicle.acceleration ? `${vehicle.acceleration} s` : '') },
    { label: 'Velocidade máxima', value: ficha?.velocidade_maxima ?? (vehicle.top_speed ? `${vehicle.top_speed} km/h` : '') },
    { label: 'Câmbio', value: ficha?.cambio ?? vehicle.transmission ?? '' },
    { label: 'Tração', value: ficha?.tracao ?? '' },
    { label: 'Combustível', value: vehicle.fuel_type ?? '' },
    { label: 'Freios', value: ficha?.freios ?? '' },
  ])

  const exemplar = preenchidos([
    { label: 'Ano', value: `${vehicle.year_manufacture}/${vehicle.year_model}` },
    { label: 'Quilometragem', value: vehicle.mileage === 0 ? '0 km' : formatMileage(vehicle.mileage) },
    { label: 'Cor', value: ficha?.cor ?? vehicle.color ?? '' },
    { label: 'Interior', value: ficha?.interior ?? '' },
    { label: 'Rodas', value: ficha?.rodas ?? '' },
    { label: 'Som', value: ficha?.som ?? '' },
    { label: 'Carroceria', value: vehicle.body_type ?? '' },
  ])

  const diferenciais = ficha?.diferenciais ?? []

  if (mecanica.length === 0 && exemplar.length === 0 && diferenciais.length === 0) return null

  const modelName = `${vehicle.brand} ${vehicle.model}${vehicle.version ? ` ${vehicle.version}` : ''}`
  const grupos = [
    { titulo: 'Mecânica', itens: mecanica },
    { titulo: 'Exemplar', itens: exemplar },
  ].filter((g) => g.itens.length > 0)

  return (
    <SecaoDaFicha titulo="Ficha técnica" subtitulo={`${modelName}, dados do anúncio`}>
      <div className="grid gap-x-12 gap-y-10 @xl:grid-cols-2 @[78rem]:grid-cols-3">
        {grupos.map((grupo) => (
          <div key={grupo.titulo}>
            <h3 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-foreground-secondary">
              {grupo.titulo}
            </h3>
            <dl className="mt-2">
              {grupo.itens.map((spec) => (
                <div
                  key={spec.label}
                  className="flex items-baseline justify-between gap-6 border-b border-border/70 py-3.5 last:border-b-0"
                >
                  <dt className="text-base text-foreground-secondary">{spec.label}</dt>
                  <dd className="text-right text-[17px] font-medium text-foreground">{spec.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}

        {diferenciais.length > 0 && (
          <div>
            <h3 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-foreground-secondary">
              Diferenciais
            </h3>
            <ul className="mt-2">
              {diferenciais.map((item) => (
                <li
                  key={item}
                  className="border-b border-border/70 py-3.5 text-[17px] font-medium text-foreground last:border-b-0"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </SecaoDaFicha>
  )
}
