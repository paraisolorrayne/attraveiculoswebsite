import Link from 'next/link'
import { ArrowRight, Car, Wallet, Search, Globe } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { Button } from '@/components/ui/button'

const ctaItems = [
  {
    icon: Globe,
    title: 'Importação Exclusiva',
    description: 'Desde 2008 trazendo Ferrari, Lamborghini, Porsche, McLaren e outros supercarros para o Brasil com segurança e procedência.',
    href: '/servicos#importacao',
    cta: 'Quero importar um supercarro',
    featured: true,
  },
  {
    icon: Wallet,
    title: 'Financiamento Premium',
    description: 'Condições especiais para veículos de luxo e alto padrão. Taxas competitivas, análise personalizada e agilidade.',
    href: '/financiamento',
    cta: 'Simular meu financiamento premium',
  },
  {
    icon: Car,
    title: 'Venda com Curadoria',
    description: 'Avaliação especializada e discreta para seu veículo premium, com pagamento ágil e seguro.',
    href: '/compramos-seu-carro',
    cta: 'Avaliar meu carro com a Attra',
  },
  {
    icon: Search,
    title: 'Busca Personalizada',
    description: 'Não encontrou o modelo ideal? Nossa equipe busca exatamente o carro de luxo que você procura em todo o Brasil.',
    href: '/solicitar-veiculo',
    cta: 'Solicitar busca personalizada de veículo',
  },
]

export function CTASection() {
  return (
    <section className="py-16 lg:py-24 bg-gradient-to-br from-primary via-primary to-primary-hover">
      <Container size="2xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-2">
            Como podemos ajudar?
          </h2>
          <p className="text-white/80 max-w-2xl mx-auto">
            Soluções premium para cada etapa da sua experiência automotiva
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {ctaItems.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className={`group backdrop-blur-sm border rounded-xl p-6 transition-all hover:scale-[1.02] ${
                item.featured
                  ? 'bg-white border-white shadow-xl'
                  : 'bg-white/10 hover:bg-white/20 border-white/20'
              }`}
            >
              {/* Featured card uses hardcoded dark colors for contrast against white background */}
              <item.icon className={`w-10 h-10 mb-4 ${item.featured ? 'text-primary' : 'text-white'}`} />
              <h3 className={`text-lg font-semibold mb-2 ${item.featured ? 'text-gray-900' : 'text-white'}`}>
                {item.title}
              </h3>
              <p className={`mb-4 text-sm ${item.featured ? 'text-gray-600' : 'text-white/80'}`}>
                {item.description}
              </p>
              <span className={`inline-flex items-center font-medium group-hover:gap-2 transition-all text-sm ${
                item.featured ? 'text-primary' : 'text-white'
              }`}>
                {item.cta} <ArrowRight className="w-4 h-4 ml-1" />
              </span>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  )
}

