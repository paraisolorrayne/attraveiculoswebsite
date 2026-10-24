import type { CSSProperties } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { VehicleImage } from '@/components/ui/vehicle-image'
import { VehicleCardCTAs } from './vehicle-card-ctas'
import { BreadcrumbItem, Vehicle } from '@/types'
import { cn, formatMileage, formatPrice } from '@/lib/utils'
import { larguraDaMarca } from '@/lib/largura-da-marca'

interface FeaturedVehicleHeroProps {
  vehicle: Vehicle
  /** Breadcrumb da página: fica dentro do destaque, com as letras da marca começando atrás dele. */
  breadcrumb: BreadcrumbItem[]
}

/**
 * Destaque do topo de /veiculos: o nome da marca gigante atrás do carro, com
 * a foto (sempre com o fundo da loja) num card que cobre a parte de baixo das
 * letras. Baixo o bastante para a ponta da lista aparecer na primeira tela,
 * senão a página parece dedicada a um carro só.
 *
 * No celular e no tablet a foto fica ao lado do nome; no computador, a foto
 * em 2:1 à direita e o texto logo ao lado. Mais panorâmico que isso corta pneu
 * ou teto (ver `.destaque-foto` em src/styles/hero.css). Tamanho e posição da
 * palavra: `.destaque-marca`, no mesmo arquivo.
 *
 * Desde 23/10/2026 a foto e o texto crescem com a tela a partir de ~1700 px
 * (`.destaque-foto-moldura`). Antes a foto parava em 720 px, encostada na
 * direita, e o texto ficava na outra ponta: em 2560 px sobravam ~900 px vazios
 * entre o preço e o carro. Até 1536 px nada mudou, nem a dobra.
 */

/**
 * Versão curta vai na linha do modelo ("296 GTS", "Corvette Z06"): é o nome do
 * carro. Longa ("V8 Bi-Turbo" do Temerário, "AMG S E Performance Aut.") fica
 * na linha de baixo; na mesma linha, com o modelo a 96 px, estourava a coluna.
 */
const MAX_TITULO_NUMA_LINHA = 14

export function versaoNaLinhaDoModelo(vehicle: Pick<Vehicle, 'model' | 'version'>): boolean {
  const versao = vehicle.version?.trim()
  return !!versao && `${vehicle.model} ${versao}`.length <= MAX_TITULO_NUMA_LINHA
}
export function FeaturedVehicleHero({ vehicle, breadcrumb }: FeaturedVehicleHeroProps) {
  const nome = `${vehicle.brand} ${vehicle.model}`
  const href = `/veiculo/${vehicle.slug}`
  const km = vehicle.mileage === 0 ? '0 km' : formatMileage(vehicle.mileage)
  const preco = formatPrice(vehicle.price)
  const larguraDoNome = larguraDaMarca(vehicle.brand ?? '')
  const rotulo = 'mb-1.5 block text-[11px] font-medium uppercase leading-none tracking-[0.14em] text-foreground-secondary xl:text-[clamp(11px,0.62cqw,14px)]'
  const versaoNaLinha = versaoNaLinhaDoModelo(vehicle)
  const titulo = versaoNaLinha ? `${vehicle.model} ${vehicle.version?.trim()}` : vehicle.model

  return (
    <section className="@container relative w-full overflow-hidden bg-gradient-to-b from-background-soft to-background pt-20 font-sans">
      <div className="w-full lg:w-[82%] mx-auto px-4 sm:px-6 lg:px-8 pb-4 lg:pb-5">
        <div className="relative z-10 pt-3 lg:pt-5">
          <Breadcrumb items={breadcrumb} className="py-0" />
        </div>

        {/* A palavra se posiciona a partir do topo desta linha: mudar a margem
            de cima ou a altura do breadcrumb pede ajuste em .destaque-marca. */}
        <div className="relative mt-10 flex items-center gap-3.5 lg:mt-[76px] lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-0">
          {larguraDoNome > 0 && (
            <div
              aria-hidden
              className="destaque-marca-faixa pointer-events-none absolute bottom-full select-none"
            >
              <span
                className="destaque-marca block whitespace-nowrap pr-[0.05em] text-center font-black uppercase leading-none tracking-[-0.05em]"
                style={{ '--marca-em': larguraDoNome } as CSSProperties}
              >
                {vehicle.brand}
              </span>
            </div>
          )}

          <div className="relative z-10 min-w-0 flex-1 self-end sm:self-center lg:self-auto lg:pr-4 xl:pr-7">
            <p className="mb-[5px] text-[9px] font-bold uppercase leading-none tracking-[0.2em] text-primary sm:text-[11px] lg:mb-2.5 lg:text-[clamp(12px,0.75cqw,16px)]">
              {vehicle.brand}
            </p>
            <h1
              className={cn(
                'text-[22px] font-black leading-[0.95] tracking-[-0.025em] text-foreground sm:text-[32px]',
                titulo.length > 14 ? 'lg:text-[clamp(40px,2.8cqw,72px)]' : 'lg:text-[clamp(52px,3.6cqw,96px)]',
              )}
            >
              {vehicle.model}
              {/* inline-block: sem espaço, a versão nunca se parte; desce inteira. */}
              {versaoNaLinha && (
                <>
                  {' '}
                  <span className="inline-block font-normal tracking-[-0.01em]">{vehicle.version?.trim()}</span>
                </>
              )}
            </h1>

            {/* Celular: ano · km, preço e o link */}
            <div className="lg:hidden">
              <p className="mt-1 text-xs leading-snug text-foreground-secondary sm:text-sm">
                {vehicle.year_model} · {km}
              </p>
              <p className="mt-1.5 text-base font-bold leading-tight text-foreground sm:text-xl">{preco}</p>
              <Link
                href={href}
                className="inline-flex min-h-9 items-center gap-1.5 text-[13px] font-semibold text-primary hover:underline sm:text-sm"
              >
                Ver detalhes <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Computador: versão, ano/km/valor numa linha e os dois botões */}
            <div className="hidden lg:block">
              {vehicle.version && !versaoNaLinha && (
                <p className="mt-2 text-[clamp(20px,1.45cqw,34px)] font-semibold leading-tight tracking-[-0.01em] text-foreground">
                  {vehicle.version}
                </p>
              )}
              <dl className="mt-[clamp(18px,1.4cqw,32px)] flex flex-wrap items-end gap-x-5 gap-y-3 whitespace-nowrap xl:gap-x-[clamp(1.75rem,2.2cqw,3.5rem)]">
                <div>
                  <dt className={rotulo}>Ano</dt>
                  <dd className="text-base font-bold leading-tight text-foreground xl:text-[clamp(16px,1.15cqw,28px)]">
                    {vehicle.year_manufacture}/{vehicle.year_model}
                  </dd>
                </div>
                <div>
                  <dt className={rotulo}>Km</dt>
                  <dd className="text-base font-bold leading-tight text-foreground xl:text-[clamp(16px,1.15cqw,28px)]">{km}</dd>
                </div>
                <div>
                  <dt className={rotulo}>Valor</dt>
                  <dd className="text-xl font-bold leading-none text-foreground xl:text-[clamp(24px,1.6cqw,40px)]">{preco}</dd>
                </div>
              </dl>
              <div className="mt-[clamp(18px,1.4cqw,32px)] flex flex-wrap gap-2.5">
                <VehicleCardCTAs vehicle={vehicle} variant="outline" />
                <Link
                  href={href}
                  className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
                >
                  Ver detalhes <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* Foto com o fundo da loja, num card que cobre a parte de baixo das letras */}
          <Link
            href={href}
            tabIndex={-1}
            className="relative z-10 order-first block aspect-[4/3] shrink-0 basis-[46%] overflow-hidden rounded-[10px] shadow-[0_12px_24px_-10px_rgba(0,0,0,0.4)] destaque-foto-moldura lg:order-none lg:aspect-[2/1] lg:justify-self-end lg:rounded-2xl lg:shadow-[0_24px_48px_-16px_rgba(0,0,0,0.35)]"
          >
            <VehicleImage
              src={vehicle.photos?.[0]}
              alt={nome}
              fill
              esqueleto
              priority
              sizes="(min-width: 2200px) 1120px, (min-width: 1700px) 52vw, (min-width: 1024px) 41vw, 46vw"
              className="destaque-foto object-cover"
            />
          </Link>
        </div>
      </div>
    </section>
  )
}
