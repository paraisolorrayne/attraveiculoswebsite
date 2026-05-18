import Link from 'next/link'
import { ArrowRight, Award, MapPin, Users, Shield } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { Button } from '@/components/ui/button'

const features = [
  {
    icon: Award,
    title: 'Referência em MG',
    description: 'Há 18+ anos sendo referência no mercado de veículos premium em Minas Gerais.',
  },
  {
    icon: MapPin,
    title: 'Atendimento Nacional',
    description: 'Enviamos para todo o Brasil com logística especializada e seguro completo.',
  },
  {
    icon: Users,
    title: 'Equipe Especializada',
    description: 'Consultores especializados em cada marca para melhor atendê-lo.',
  },
  {
    icon: Shield,
    title: 'Garantia de Procedência',
    description: 'Todos os veículos passam por rigorosa inspeção de qualidade.',
  },
]

export function AboutSummary() {
  return (
    <section className="py-16 lg:py-24 bg-background">
      <Container>
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div>
            <span className="text-primary font-medium mb-2 block">Sobre a Attra Veículos</span>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Excelência em veículos premium desde 2008
            </h2>
            <p className="text-foreground-secondary mb-6">
              A Attra Veículos é referência no segmento de veículos nacionais, importados, 
              seminovos e supercarros. Com dois showrooms em Uberlândia e área total de mais 
              de 5.000m², oferecemos a melhor experiência em compra e venda de veículos premium.
            </p>
            <p className="text-foreground-secondary mb-8">
              Especializados em marcas como Porsche, BMW, Mercedes-Benz, Audi, Land Rover, 
              Ferrari e Lamborghini, atendemos clientes de todo o Brasil com logística 
              especializada e pós-venda completo.
            </p>
            <Button asChild>
              <Link href="/sobre" className="flex items-center gap-2">
                Conheça nossa história <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="p-6 bg-background-card border border-border rounded-xl"
              >
                <feature.icon className="w-10 h-10 text-primary mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-foreground-secondary">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  )
}

