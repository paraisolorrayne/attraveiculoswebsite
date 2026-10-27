import Link from 'next/link'
import { ArrowRight, MessageCircle } from 'lucide-react'
import { VehicleImage } from '@/components/ui/vehicle-image'
import { Container } from '@/components/ui/container'
import { Button } from '@/components/ui/button'
import { CabecalhoSecao, MONTSERRAT } from '@/components/ui/cabecalho-secao'
import { Vehicle } from '@/types'
import { formatPrice, formatMileage } from '@/lib/utils'
import { getWhatsAppUrl } from '@/lib/constants'
import { anoDoVeiculo, versaoDoVeiculo } from '@/lib/identidade-do-veiculo'

interface EditorialSelectionProps {
  vehicles?: Vehicle[]
  /** Total do estoque (o mesmo número de /veiculos), no bloco "Ver todo o acervo". */
  totalEstoque?: number
}

const SUPERCAR_BRANDS = ['ferrari', 'lamborghini', 'mclaren', 'bugatti', 'pagani', 'koenigsegg']

function curationReason(vehicle: Vehicle): string {
  const currentYear = new Date().getFullYear()
  const brand = vehicle.brand?.toLowerCase() || ''

  if (vehicle.is_new || vehicle.mileage === 0) {
    return '0 km, pronto para entrega imediata'
  }
  if (vehicle.mileage > 0 && vehicle.mileage < 5000) {
    return 'Baixíssima rodagem, praticamente novo'
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

const km = (v: Vehicle) => (v.mileage === 0 ? '0 km' : formatMileage(v.mileage))
const ROTULO = 'text-[13px] font-semibold uppercase tracking-[0.16em] text-primary'
const atraso = (s: number) => ({ ['--d' as string]: `${s}s` })

/**
 * Seleção editorial da home (redesenhada em 27/10/2026, direção "Vitrine com
 * ficha"): a foto do carro limpa, no 4:3 da AutoConf, e as informações ao
 * lado ou embaixo, nunca por cima. As fotos da Attra trazem faixas gravadas
 * no canto de baixo ("PPF FULL", "BLINDADO B5S"), e o nome e o preço escritos
 * sobre a foto brigavam com elas. Um carro em destaque com ficha e os dois
 * botões, dois secundários com o essencial, e o "Ver todo o acervo" como
 * bloco grande no fim, com o total do estoque.
 *
 * Os carros são as posições 7 a 9 do estoque por preço (page.tsx): mudam com
 * o estoque, não por semana. Por isso saiu o "Atualizada semanalmente".
 */
export function EditorialSelection({ vehicles = [], totalEstoque }: EditorialSelectionProps) {
  const [main, ...rest] = vehicles
  const secondary = rest.slice(0, 2)

  if (!main) return null

  return (
    <section className="bg-background py-20 lg:py-28">
      <Container>
        <div data-revelar className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <CabecalhoSecao
            rotulo="Seleção editorial"
            titulo={<>{vehicles.length >= 3 ? 'Três peças do acervo' : 'Peças do acervo'} <span className="text-foreground/45">que merecem sua atenção</span></>}
            texto="Curadoria feita à mão. Cada veículo entra por mérito, raridade, estado, procedência ou oportunidade."
          />
          <Link
            href="/veiculos"
            className="hidden shrink-0 items-center gap-2 whitespace-nowrap text-[15px] font-medium text-foreground hover:text-primary lg:inline-flex"
          >
            Ver todo o acervo <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Destaque */}
        <article className="mt-12 grid gap-8 lg:mt-16 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center lg:gap-14 xl:gap-16">
          <Link
            href={`/veiculo/${main.slug}`}
            data-revelar="cortina"
            className="group relative block aspect-[4/3] overflow-hidden rounded-2xl bg-background-soft"
          >
            <VehicleImage
              src={main.photos?.[0]}
              alt={`${main.brand} ${main.model}`}
              fill
              esqueleto
              sizes="(min-width: 1024px) 58vw, 100vw"
              className="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.03]"
            />
            {/* No alto à esquerda: a marca d'água fica no alto à direita e as faixas, embaixo. */}
            <span className="absolute left-4 top-4 rounded-full bg-black/70 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur-sm">
              Em destaque
            </span>
          </Link>

          <div>
            <p data-revelar className={ROTULO}>{main.brand}</p>
            <h3 data-revelar style={{ ...MONTSERRAT, ...atraso(0.1) }} className="mt-3 text-4xl font-semibold leading-[1.05] tracking-tight text-foreground lg:text-5xl">
              <Link href={`/veiculo/${main.slug}`} className="hover:text-primary">{main.model}</Link>
            </h3>
            {versaoDoVeiculo(main) && (
              <p data-revelar style={atraso(0.1)} className="mt-2 text-lg text-foreground-secondary">{versaoDoVeiculo(main)}</p>
            )}
            <p data-revelar style={atraso(0.2)} className="mt-6 flex gap-3 text-[17px] leading-relaxed text-foreground">
              <span aria-hidden="true" className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rotate-45 bg-primary" />
              {curationReason(main)}.
            </p>
            <div data-revelar style={atraso(0.3)}>
              <dl className="mt-8 grid grid-cols-2 border-t border-border">
                <div className="py-4">
                  <dt className="text-[11px] uppercase tracking-[0.16em] text-foreground-secondary">Ano</dt>
                  <dd className="mt-1 font-semibold tabular-nums text-foreground">{anoDoVeiculo(main)}</dd>
                </div>
                <div className="border-l border-border py-4 pl-5">
                  <dt className="text-[11px] uppercase tracking-[0.16em] text-foreground-secondary">Quilometragem</dt>
                  <dd className="mt-1 font-semibold tabular-nums text-foreground">{km(main)}</dd>
                </div>
              </dl>
              <p className="border-t border-border pt-5 text-[28px] font-semibold tabular-nums tracking-tight text-foreground lg:text-[32px]" style={MONTSERRAT}>
                {formatPrice(main.price)}
              </p>
              {/* Em 1024 os dois botões não cabem lado a lado na coluna: empilham. */}
              <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row [&>*]:whitespace-nowrap">
                <Button asChild size="lg" className="text-base">
                  <a href={vehicleWhatsAppUrl(main)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2">
                    <MessageCircle className="h-5 w-5" aria-hidden="true" />
                    Falar com consultor
                  </a>
                </Button>
                <Button asChild size="lg" variant="outline" className="text-base">
                  <Link href={`/veiculo/${main.slug}`} className="inline-flex items-center justify-center gap-2">
                    Ver veículo <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </article>

        {secondary.length > 0 && (
          <ul className="mt-16 grid gap-12 sm:grid-cols-2 sm:gap-8 lg:mt-24 lg:gap-14">
            {secondary.map((v, i) => (
              <li key={v.id}>
                <SecondaryPick vehicle={v} atrasoFoto={i * 0.15} />
              </li>
            ))}
          </ul>
        )}

        {/* "Ver todo o acervo" em destaque: bloco largo com o total do estoque. */}
        <Link href="/veiculos" className="group relative mt-16 flex items-center justify-between gap-6 border-y border-border py-8 lg:mt-24 lg:py-12">
          <span aria-hidden="true" data-revelar="linha" className="absolute inset-x-0 -top-px h-px bg-primary" />
          <span className="min-w-0">
            <span className={`block ${ROTULO}`}>
              {totalEstoque ? `${totalEstoque} ${totalEstoque === 1 ? 'veículo' : 'veículos'} em estoque` : 'Estoque completo'}
            </span>
            <span className="mt-2 block text-balance text-[32px] font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-[64px]" style={MONTSERRAT}>
              Ver todo o acervo
            </span>
          </span>
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-primary text-white transition-[transform,background-color] duration-500 group-hover:translate-x-1.5 group-hover:bg-primary-hover lg:h-20 lg:w-20">
            <ArrowRight className="h-6 w-6 lg:h-7 lg:w-7" aria-hidden="true" />
          </span>
        </Link>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-md text-[15px] text-foreground-secondary">
            Não encontrou a peça certa? Fazemos a busca personalizada na rede nacional, fora do estoque visível.
          </p>
          <Link href="#captacao" className="inline-flex items-center gap-2 whitespace-nowrap text-[15px] font-medium text-foreground hover:text-primary">
            Solicitar um veículo <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Container>
    </section>
  )
}

function SecondaryPick({ vehicle: v, atrasoFoto }: { vehicle: Vehicle; atrasoFoto: number }) {
  const versao = versaoDoVeiculo(v)
  return (
    <Link href={`/veiculo/${v.slug}`} className="group block">
      <div data-revelar="cortina" style={atraso(atrasoFoto)} className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-background-soft">
        <VehicleImage
          src={v.photos?.[0]}
          alt={`${v.brand} ${v.model}`}
          fill
          esqueleto
          sizes="(min-width: 640px) 45vw, 100vw"
          className="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.03]"
        />
      </div>
      <p className={`mt-5 ${ROTULO}`}>{v.brand}</p>
      {/* No celular o preço desce: ao lado ele espremia a versão. */}
      <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
        <h3 className="text-2xl font-semibold tracking-tight text-foreground lg:text-[28px]" style={MONTSERRAT}>{v.model}</h3>
        <p className="text-lg font-semibold tabular-nums text-foreground lg:text-xl" style={MONTSERRAT}>{formatPrice(v.price)}</p>
      </div>
      {versao && <p className="mt-1 text-[15px] text-foreground-secondary">{versao}</p>}
      <p className="mt-3 text-[14px] text-foreground-secondary">{[anoDoVeiculo(v), km(v)].filter(Boolean).join(' · ')}</p>
      <p className="mt-3 flex gap-2.5 text-[15px] text-foreground">
        <span aria-hidden="true" className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rotate-45 bg-primary" />
        {curationReason(v)}.
      </p>
      <span className="mt-4 inline-flex items-center gap-2 text-[15px] font-medium text-foreground group-hover:text-primary">
        Ver veículo <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </span>
    </Link>
  )
}
