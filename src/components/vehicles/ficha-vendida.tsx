import Image from 'next/image'
import Link from 'next/link'
import { MessageCircle, Search } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { CinematicVehicleCard } from '@/components/vehicles'
import { loadListedInventory } from '@/app/api/llm/_inventory'
import { semelhantesDoVeiculo } from '@/lib/veiculos-semelhantes'
import { trilhaDoVeiculo } from '@/lib/vehicle-schema'
import { tituloDoVeiculo } from '@/lib/identidade-do-veiculo'
import { getWhatsAppUrl } from '@/lib/constants'
import type { Vehicle } from '@/types'

/**
 * Ficha de um carro que a Attra já vendeu (handoff de SEO de 02/11/2026).
 *
 * Fica no ar por 90 dias depois da venda, com status 200: o endereço segue
 * linkado por fora e recomendado por assistentes, e quem chega encontra o carro
 * (fotos e ficha resumida), o selo de vendido e o caminho para um igual. Sem
 * preço e sem JSON-LD de Vehicle: para o Google, Vehicle é produto, e produto
 * sem oferta é erro crítico. Ver src/lib/veiculos-publicados.ts.
 */
export async function FichaVendida({ veiculo }: { veiculo: Vehicle }) {
  const nome = tituloDoVeiculo(veiculo)
  let semelhantes: Vehicle[] = []
  try {
    semelhantes = semelhantesDoVeiculo((await loadListedInventory()).vehicles, veiculo, 4)
  } catch {
    // Sem estoque, a ficha continua de pé com os botões.
  }

  const km = veiculo.is_new || veiculo.mileage === 0 ? '0 km' : `${veiculo.mileage.toLocaleString('pt-BR')} km`
  const dados = [
    ['Ano', [veiculo.year_manufacture, veiculo.year_model].filter(Boolean).join('/')],
    ['Quilometragem', km],
    ['Cor', veiculo.color],
    ['Motor', veiculo.engine],
    ['Potência', veiculo.horsepower ? `${veiculo.horsepower} cv` : null],
    ['Câmbio', veiculo.transmission],
  ].filter((linha): linha is [string, string] => typeof linha[1] === 'string' && linha[1].trim() !== '')

  const fotos = (veiculo.photos ?? []).slice(0, 5)
  const mensagem = `Olá! Vi no site o ${nome}, que já foi vendido. Procuro um igual ou parecido.`

  return (
    <main className="pt-24 pb-16 lg:pb-20">
      <Container>
        <Breadcrumb items={trilhaDoVeiculo(veiculo)} className="mb-6" />

        <div className="grid gap-8 lg:grid-cols-[3fr_2fr] lg:items-start">
          <div>
            {fotos[0] && (
              <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-background-card">
                <Image
                  src={fotos[0]}
                  alt={nome}
                  fill
                  priority
                  className="object-cover grayscale-[35%]"
                  sizes="(max-width: 1024px) 100vw, 60vw"
                />
                <span className="absolute left-4 top-4 rounded-full bg-foreground px-4 py-1.5 text-sm font-semibold uppercase tracking-wider text-background">
                  Vendido
                </span>
              </div>
            )}
            {fotos.length > 1 && (
              <div className="mt-3 grid grid-cols-4 gap-3">
                {fotos.slice(1).map((foto, i) => (
                  <div key={foto} className="relative aspect-[4/3] overflow-hidden rounded-lg bg-background-card">
                    <Image src={foto} alt={`${nome}, foto ${i + 2}`} fill className="object-cover" sizes="15vw" />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">Vendido pela Attra</p>
            <h1 className="mt-2 text-3xl lg:text-4xl font-bold text-foreground">{nome}</h1>
            <p className="mt-4 text-lg leading-relaxed text-foreground-secondary">
              Este carro já encontrou dono. Se você procura um igual, ou parecido, a Attra busca para você
              com a mesma verificação de procedência e entrega em todo o Brasil.
            </p>

            {dados.length > 0 && (
              <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-border pt-6 text-sm">
                {dados.map(([rotulo, valor]) => (
                  <div key={rotulo}>
                    <dt className="text-foreground-secondary">{rotulo}</dt>
                    <dd className="font-medium text-foreground">{valor}</dd>
                  </div>
                ))}
              </dl>
            )}

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/solicitar-veiculo"
                className="inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-primary px-6 py-3 font-medium text-white transition-colors hover:bg-primary/90"
              >
                <Search className="h-5 w-5" />
                Quero um igual
              </Link>
              <a
                href={getWhatsAppUrl(mensagem)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-border px-6 py-3 font-medium text-foreground transition-colors hover:border-primary/50"
              >
                <MessageCircle className="h-5 w-5" />
                Falar com um especialista
              </a>
            </div>
          </div>
        </div>

        {semelhantes.length > 0 && (
          <section className="mt-16" aria-labelledby="similares-em-estoque">
            <h2 id="similares-em-estoque" className="text-2xl font-bold text-foreground">Similares em estoque</h2>
            <p className="mt-2 text-foreground-secondary">Os mais próximos deste carro, disponíveis agora.</p>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {semelhantes.map(similar => (
                <CinematicVehicleCard key={similar.id} vehicle={similar} layout="vertical" />
              ))}
            </div>
          </section>
        )}
      </Container>
    </main>
  )
}
