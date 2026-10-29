import type { Vehicle } from '@/types'
import { formatMileage, formatPrice } from '@/lib/utils'

interface TituloDaFichaProps {
  vehicle: Vehicle
}

interface Numero {
  rotulo: string
  valor: string
}

/**
 * Os números que vão grandes embaixo do nome: ano, quilometragem, potência e
 * câmbio, com o combustível no lugar de quem faltar. Potência e câmbio da
 * ficha do molde vencem os do cadastro, como na ficha técnica.
 */
export function numerosDoTitulo(vehicle: Vehicle): Numero[] {
  const ficha = vehicle.ficha
  const numeros: Numero[] = [
    { rotulo: 'Ano', valor: `${vehicle.year_manufacture}/${vehicle.year_model}` },
    { rotulo: 'Quilometragem', valor: vehicle.mileage === 0 ? '0 km' : formatMileage(vehicle.mileage) },
    { rotulo: 'Potência', valor: ficha?.potencia ?? (vehicle.horsepower ? `${vehicle.horsepower} cv` : '') },
    { rotulo: 'Câmbio', valor: ficha?.cambio ?? vehicle.transmission ?? '' },
    { rotulo: 'Combustível', valor: vehicle.fuel_type ?? '' },
  ]
  return numeros.filter((n) => n.valor.trim()).slice(0, 4)
}

const MONTSERRAT = { fontFamily: 'var(--font-montserrat)' }

/**
 * Título da ficha: marca, modelo, versão e ano, e os números grandes embaixo.
 *
 * Até 23/10/2026 só existia no celular; no computador o nome do carro aparecia
 * apenas na lateral, com o mesmo tamanho de "Sobre este veículo", e a página
 * ficava sem título visível (e sem h1 para leitor de tela, já que o bloco era
 * `display: none`). Agora é o mesmo bloco nos dois, no alto da coluna
 * principal. No computador o preço não entra aqui: ele abre a lateral, na
 * mesma altura do título, e não aparece duas vezes na mesma tela.
 *
 * Este é o ÚNICO h1 do documento. Marca, modelo, versão e ano ficam DENTRO
 * dele: o texto do h1 identifica o veículo inteiro em vez do modelo curto
 * ("911"), que era sinal de entidade ambíguo para buscador e LLM.
 *
 * No celular o preço vem logo depois do nome, antes da trilha: ali ele ficava
 * na borda de baixo da primeira tela. O `id="preco-ficha"` é o que a barra
 * fixa de preço observa para aparecer.
 */
export function TituloDaFicha({ vehicle }: TituloDaFichaProps) {
  const numeros = numerosDoTitulo(vehicle)

  return (
    <div className="@container">
      <h1>
        {vehicle.brand && (
          <span className="mb-2 block text-sm font-semibold uppercase tracking-[0.16em] text-primary">
            {vehicle.brand}
          </span>
        )}
        <span
          className="block text-[32px] leading-tight font-semibold tracking-tight text-foreground lg:text-5xl 2xl:text-6xl"
          style={MONTSERRAT}
        >
          {vehicle.model || vehicle.brand || 'Veículo premium'}
        </span>
        <span className="mt-2 block text-foreground-secondary lg:mt-3 lg:text-lg">
          {vehicle.version && `${vehicle.version} • `}
          {vehicle.year_manufacture}/{vehicle.year_model}
        </span>
      </h1>

      <p id="preco-ficha" className="mt-4 text-3xl font-bold text-foreground lg:hidden">
        {formatPrice(vehicle.price)}
      </p>

      {/* Pela largura da coluna (@container), não da tela: a lateral alarga
          em 1536 px e a coluna encolhe. Quatro numa linha a partir de 704 px de
          coluna; abaixo disso "QUILOMETRAGEM" e "Automático" passavam da célula. */}
      {numeros.length > 0 && (
        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 lg:mt-8 @[44rem]:grid-cols-4">
          {numeros.map((numero) => (
            <div
              key={numero.rotulo}
              className="min-w-0 @[44rem]:border-l @[44rem]:border-border @[44rem]:pl-6 @[44rem]:first:border-l-0 @[44rem]:first:pl-0"
            >
              <dt className="text-[13px] font-medium uppercase tracking-[0.12em] text-foreground-secondary">
                {numero.rotulo}
              </dt>
              <dd
                className="mt-1 text-xl font-medium text-foreground @md:text-2xl @[44rem]:text-[22px] @[56rem]:text-[26px]"
                style={MONTSERRAT}
              >
                {numero.valor}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}
