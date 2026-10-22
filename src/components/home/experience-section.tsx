'use client'

import Link from 'next/link'
import { ArrowRight, Search, HeartHandshake, MapPin, Users } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { Button } from '@/components/ui/button'
import { SectionKicker, SectionHeading } from '@/components/ui/brand'

const pillars = [
  {
    icon: Search,
    title: 'Curadoria rigorosa',
    description: 'Cada veículo passa por seleção e análise criteriosa antes de integrar o acervo.',
  },
  {
    icon: HeartHandshake,
    title: 'Relacionamento contínuo',
    description: 'Um relacionamento de longo prazo conecta cada etapa — da escolha ao pós-entrega — para que você tenha sempre alguém ao lado nas grandes decisões.',
  },
  {
    icon: MapPin,
    title: 'Alcance nacional estruturado',
    description: 'De Uberlândia para o Brasil: operação própria, logística especializada, seguro total e histórico de entregas em 27 estados — incluindo a entrega de um veículo em Manaus.',
  },
  {
    icon: Users,
    title: 'Família Attra ao seu lado',
    description: 'Da primeira conversa à troca do próximo carro, a família Attra mantém um atendimento caloroso, ético e transparente, cuidando da sua família com a mesma atenção que cuida da própria.',
  },
]

export function ExperienceSection() {


  return (
    <section className="py-24 bg-background relative overflow-hidden">
      <Container size="2xl">
        {/* Section Header */}
        <div className={`text-center mb-16`}>
          <SectionKicker className="mb-4">Operação</SectionKicker>
          <SectionHeading as="h2" size="lg" className="mb-4">
            Um novo jeito de operar
          </SectionHeading>
          <p className="text-foreground-secondary text-lg max-w-3xl mx-auto">
            Com o tempo, a Attra evoluiu. O que começou como uma visão clara sobre curadoria cresceu para
            uma operação própria de atendimento, relacionamento contínuo com o cliente e alcance nacional
            estruturado. Hoje, a empresa combina sensibilidade automotiva com uma operação robusta —
            ampliando atendimento em todo o país sem perder proximidade, confiança e atenção aos detalhes.
          </p>
        </div>

        {/* Pillars Grid */}
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          {pillars.map((pillar) => (
            <div
              key={pillar.title}
              className={`group institutional-card overflow-hidden
                transition-all duration-300 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5`}
            >
              <div className="p-5 sm:p-6">
                <div className="flex gap-4">
                  <div className="p-3 bg-primary/10 rounded-xl border border-primary/10
                                  group-hover:bg-primary/15 group-hover:border-primary/20 transition-colors
                                  shrink-0 self-start">
                    <pillar.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="type-display-md text-lg sm:text-xl group-hover:text-primary transition-colors mb-2">
                      {pillar.title}
                    </h3>
                    <p className="text-sm sm:text-base text-foreground-secondary leading-relaxed">
                      {pillar.description}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className={`mt-12 text-center`}>
          <Button asChild size="lg">
            <Link href="/jornada" className="flex items-center gap-2">
              Ver a Jornada Attra em Detalhes <ArrowRight className="w-5 h-5" />
            </Link>
          </Button>
        </div>
      </Container>
    </section>
  )
}

