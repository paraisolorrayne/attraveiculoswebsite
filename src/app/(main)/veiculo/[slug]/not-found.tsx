import Link from 'next/link'
import { Car, Search, MessageCircle } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { getWhatsAppUrl } from '@/lib/constants'

/**
 * Página para veículo que não está mais no estoque (ou nunca existiu).
 *
 * Antes, a rota redirecionava para /veiculos?veiculo_indisponivel=true e um
 * toast explicava a ausência. A intenção era boa, mas o efeito para buscador
 * era ruim: como o redirect acontece durante o streaming, a resposta saía com
 * HTTP 200 — então QUALQUER slug inventado virava uma página válida e vazia, e
 * o site passava a ter um número infinito de URLs indexáveis.
 *
 * Aqui o status é 404 de verdade (o `notFound()` da rota), e o visitante
 * continua amparado: entende o que houve, sem perder o contexto de que estava
 * procurando um carro específico.
 */
export default function VeiculoNaoEncontrado() {
  return (
    <main className="py-20 lg:py-28">
      <Container>
        <div className="max-w-xl mx-auto text-center">
          <div className="bg-primary/10 p-5 rounded-full inline-flex mb-6">
            <Car className="w-10 h-10 text-primary" />
          </div>

          <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Este veículo não está mais disponível
          </h1>
          <p className="text-lg text-foreground-secondary mb-8 leading-relaxed">
            O carro que você procurava saiu do estoque ou o endereço mudou. Nosso estoque
            gira rápido — vale conferir o que temos agora ou nos dizer o que procura.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
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

          <a
            href={getWhatsAppUrl('Olá! Vi um veículo no site que não está mais disponível. Podem me ajudar a encontrar algo parecido?')}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-6 text-primary hover:underline"
          >
            <MessageCircle className="w-4 h-4" />
            Falar com um especialista
          </a>
        </div>
      </Container>
    </main>
  )
}
