import Link from 'next/link'
import { headers } from 'next/headers'
import { Car, Search, MessageCircle } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { CinematicVehicleCard } from '@/components/vehicles'
import { getWhatsAppUrl } from '@/lib/constants'
import { loadListedInventory } from '@/app/api/llm/_inventory'
import { semelhantesDoSlug } from '@/lib/veiculos-semelhantes'

/**
 * Página para veículo que não está mais no estoque (ou nunca existiu).
 *
 * O status é 404 de verdade — o `notFound()` da rota. Já foi redirecionamento, e
 * o efeito para buscador era ruim: o redirect acontece durante o streaming e a
 * resposta saía com HTTP 200, então QUALQUER slug inventado virava página válida
 * e o site passava a ter um número infinito de URLs indexáveis.
 *
 * O que mudou foi o CONTEÚDO. Um assistente recomendou
 * `/veiculo/porsche-911-2019-950539` com `utm_source=chatgpt.com` depois de o
 * carro ter sido vendido, e quem clicou encontrou um 404 sem um único link para
 * outro veículo. Carro é peça única: essa situação não é exceção, é o destino de
 * toda ficha, e a recomendação continua circulando muito depois da venda.
 *
 * O slug chega por `x-pathname`, carimbado no middleware — um `not-found.tsx`
 * não recebe params de outra forma. Sem ele a página ainda funciona, só sem
 * saber qual carro foi pedido.
 */
export default async function VeiculoNaoEncontrado() {
  const caminho = (await headers()).get('x-pathname') ?? ''
  const slug = caminho.split('/').filter(Boolean).pop() ?? ''

  let semelhantes: Awaited<ReturnType<typeof carregar>> = { veiculos: [], marca: null, modelo: null }
  try {
    semelhantes = await carregar(slug)
  } catch {
    // Estoque indisponível não pode transformar um 404 amparado num erro 500.
  }

  const { veiculos, marca, modelo } = semelhantes
  const oQueProcurava = [marca, modelo].filter(Boolean).join(' ')

  const mensagemWhatsApp = oQueProcurava
    ? `Olá! Vi um ${oQueProcurava} no site que não está mais disponível. Podem me ajudar a encontrar algo parecido?`
    : 'Olá! Vi um veículo no site que não está mais disponível. Podem me ajudar a encontrar algo parecido?'

  return (
    <main className="py-16 lg:py-20">
      <Container>
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-primary/10 p-5 rounded-full inline-flex mb-6">
            <Car className="w-10 h-10 text-primary" />
          </div>

          <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            {oQueProcurava
              ? `Este ${oQueProcurava} não está mais disponível`
              : 'Este veículo não está mais disponível'}
          </h1>
          <p className="text-lg text-foreground-secondary leading-relaxed">
            {veiculos.length > 0
              ? 'O carro saiu do estoque — nosso giro é rápido. Estes são os mais próximos do que você procurava, disponíveis agora.'
              : 'O carro que você procurava saiu do estoque ou o endereço mudou. Vale conferir o que temos agora ou nos dizer o que procura.'}
          </p>
        </div>

        {veiculos.length > 0 && (
          <section className="mt-12" aria-label="Veículos semelhantes disponíveis">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {veiculos.map(veiculo => (
                <CinematicVehicleCard key={veiculo.id} vehicle={veiculo} />
              ))}
            </div>
          </section>
        )}

        <div className="mt-12 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/veiculos"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            <Search className="w-5 h-5" />
            Ver estoque completo
          </Link>
          <Link
            href="/solicitar-veiculo"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-border text-foreground rounded-lg hover:border-primary/50 transition-colors font-medium"
          >
            Procurar um veículo específico
          </Link>
        </div>

        <div className="mt-6 text-center">
          <a
            href={getWhatsAppUrl(mensagemWhatsApp)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-primary hover:underline"
          >
            <MessageCircle className="w-4 h-4" />
            Falar com um especialista
          </a>
        </div>
      </Container>
    </main>
  )
}

async function carregar(slug: string) {
  if (!slug) return { veiculos: [], marca: null, modelo: null }
  const { vehicles } = await loadListedInventory()
  return semelhantesDoSlug(vehicles, slug, 4)
}
