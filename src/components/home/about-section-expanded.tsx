import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { CabecalhoSecao, MONTSERRAT } from '@/components/ui/cabecalho-secao'

const FOTO = '/about/attra-ceo-thiago-fundador-2026.jpg'
const ALT = 'Thiago, CEO da Attra Veículos, entre duas Ferrari no showroom da Attra'
const PILARES = [
  { termo: 'Curadoria', resto: 'antes de catálogo' },
  { termo: 'Relação', resto: 'antes de transação' },
  { termo: 'Procedência', resto: 'antes de pressa' },
]
const atraso = (s: number) => ({ ['--d' as string]: `${s}s` })

/**
 * Posicionamento da home, direção "Tríptico" (escolhida em 27/10/2026 entre
 * três do design; as outras eram Cinema e Manifesto). A foto do Thiago já tem
 * três partes, carro branco, ele e os carros vermelhos, e vira três painéis
 * com um princípio embaixo de cada; "Relação antes de transação" fica sob o
 * Thiago, porque a relação é a pessoa. Nada escrito sobre a foto.
 *
 * Substituiu os cards de números em cima da foto (anos e 27 estados, que o
 * "Por que confiar" logo acima já traz) e o parágrafo longo da esquerda.
 */
export function AboutSectionExpanded() {
  return (
    <section id="sobre" className="bg-background-soft py-20 lg:py-28">
      <Container>
        <div data-revelar className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
          <CabecalhoSecao
            rotulo="Posicionamento"
            titulo={<>Mais do que carros. <span className="text-foreground/45">Uma visão.</span></>}
          />
          <div className="lg:max-w-sm">
            <p className="text-lg leading-relaxed text-foreground-secondary">
              Cada veículo tratado como patrimônio. Cada cliente, com a atenção que uma decisão desse tamanho exige.
            </p>
            <Link href="/sobre" className="mt-4 inline-flex items-center gap-2 whitespace-nowrap text-[15px] font-medium text-foreground hover:text-primary">
              Conhecer a Attra <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Cada painel mostra o seu terço da mesma imagem (300% de largura,
            deslocada), então a cortina continua de um painel para o outro.
            O do Thiago abre primeiro. */}
        <ul className="mt-12 grid grid-cols-3 gap-2 md:gap-3 lg:mt-16 lg:gap-4">
          {PILARES.map((p, i) => (
            <li key={p.termo}>
              <div
                data-revelar="cortina"
                style={atraso(i === 1 ? 0 : 0.18)}
                className="relative aspect-[1/3] overflow-hidden rounded-xl bg-background md:aspect-[3/4] md:rounded-2xl"
              >
                <div className="absolute inset-y-0 w-[300%]" style={{ left: `${-100 * i}%` }}>
                  <Image
                    src={FOTO}
                    alt={i === 1 ? ALT : ''}
                    fill
                    sizes="(min-width: 1280px) 1216px, 100vw"
                    className="object-cover object-[50%_50%] md:object-[50%_12%]"
                  />
                </div>
              </div>
              <div data-revelar style={atraso(0.3 + i * 0.1)} className="mt-6 hidden border-t border-border pt-5 md:block">
                <p className="text-[13px] font-semibold tracking-[0.16em] text-primary">{String(i + 1).padStart(2, '0')}</p>
                <p className="mt-2 text-xl font-semibold leading-snug lg:text-2xl" style={MONTSERRAT}>
                  {p.termo}
                  <br />
                  <span className="text-foreground/45">{p.resto}</span>
                </p>
                {i === 1 && <p className="mt-3 text-[13px] uppercase tracking-[0.14em] text-foreground-secondary">Na foto: Thiago, CEO</p>}
              </div>
            </li>
          ))}
        </ul>

        {/* Celular: os painéis ficam lado a lado como faixas altas e os
            princípios descem em lista. */}
        <p className="mt-3 text-center text-[13px] uppercase tracking-[0.14em] text-foreground-secondary md:hidden">Na foto: Thiago, CEO</p>
        <ol className="mt-8 md:hidden">
          {PILARES.map((p, i) => (
            <li key={p.termo} className="grid grid-cols-[2.5rem_1fr] items-baseline border-t border-border py-5 last:border-b">
              <span className="font-semibold text-primary" style={MONTSERRAT}>{String(i + 1).padStart(2, '0')}</span>
              <span className="text-2xl font-semibold leading-tight" style={MONTSERRAT}>
                <span className="block">{p.termo}</span>
                <span className="block text-foreground/45">{p.resto}</span>
              </span>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  )
}
