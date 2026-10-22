'use client'

import Link from 'next/link'
import { ArrowRight, Search, FileCheck, Truck, CheckCircle } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { Button } from '@/components/ui/button'
import { anosDeMercado } from '@/lib/constants'

const journeySteps = [
  {
    number: '1',
    icon: Search,
    title: 'Seleção Personalizada',
    description: 'Consultoria dedicada para encontrar o veículo perfeito conforme seu perfil e necessidades.',
  },
  {
    number: '2',
    icon: FileCheck,
    title: 'Inspeção Rigorosa',
    description: 'Análise técnica de 200+ itens, verificação documental completa e histórico checado.',
  },
  {
    number: '3',
    icon: Truck,
    title: 'Logística Nacional',
    description: 'Transporte seguro em caminhão fechado com seguro premium até a porta da sua casa.',
  },
  {
    number: '4',
    icon: CheckCircle,
    title: 'Entrega das Chaves',
    description: 'Atendimento final com orientações sobre o veículo e suporte pós-venda exclusivo.',
  },
]

export function JourneyPreview() {


  return (
    <section
      className="py-24 lg:py-32 bg-gradient-to-br from-primary/5 via-background to-background"
      id="jornada-attra"
    >
      <Container size="2xl">
        {/* Section Header */}
        <div className={`text-center mb-16`}>
          <span className="text-primary font-medium tracking-wide uppercase text-sm">Jornada Attra</span>
          <h2 className="text-4xl lg:text-5xl font-bold text-foreground mt-4 mb-6">
            Da Seleção à Entrega na Sua Garagem
          </h2>
          <p className="text-foreground-secondary text-lg max-w-3xl mx-auto">
            Uma experiência completa e personalizada onde cada detalhe é pensado para colecionadores exigentes.
            Atendimento nacional a partir de Uberlândia.
          </p>
        </div>

        {/* Journey Steps */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-12">
          {journeySteps.map((step) => (
            <div
              key={step.number}
              className={`group bg-background-card border border-border rounded-2xl p-6 lg:p-7
                hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 transition-all`}
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <step.icon className="w-6 h-6 text-primary" />
                  </div>
                </div>
                <div className="flex-shrink-0 text-3xl font-bold text-primary/30 group-hover:text-primary/50 transition-colors">
                  {step.number}
                </div>
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                {step.title}
              </h3>
              <p className="text-sm text-foreground-secondary leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className={`text-center`}>
          <Button asChild size="lg">
            <Link href="/jornada" className="flex items-center gap-2">
              Conheça a Jornada Completa <ArrowRight className="w-5 h-5" />
            </Link>
          </Button>
          <p className="text-foreground-secondary text-sm mt-4">
            Explore cada etapa em detalhes, históricos de clientes e nossa trajetória de {anosDeMercado()} anos
          </p>
        </div>
      </Container>
    </section>
  )
}
