'use client'

import { useRef, useEffect, useState } from 'react'
import { Repeat, MapPin, Search, TrendingUp } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { SectionKicker, SectionHeading } from '@/components/ui/brand'

const pillars = [
  {
    icon: Repeat,
    title: 'Confiança',
    subtitle: 'Desde 2008',
    description: 'Cada negociação bem conduzida e cada indicação espontânea ajudaram a formar uma rede sólida de clientes e parceiros.',
  },
  {
    icon: TrendingUp,
    title: 'Recorrência',
    subtitle: '500+ Veículos/Ano',
    description: 'Crescimento orgânico baseado em algo que não pode ser comprado nem acelerado: a confiança acumulada.',
  },
  {
    icon: MapPin,
    title: 'Alcance',
    subtitle: '27 Estados',
    description: 'Presença em todo o território nacional com logística especializada e garantia de entrega segura.',
  },
  {
    icon: Search,
    title: 'Critério',
    subtitle: '200+ Itens',
    description: 'Cada veículo passa por seleção e análise criteriosa antes de integrar o acervo.',
  },
]

const metrics = [
  { value: '16+', label: 'Anos no Mercado' },
  { value: '500+', label: 'Veículos/Ano' },
  { value: '27', label: 'Estados' },
  { value: '5.0', label: 'Google Rating' },
]

export function ProofOfSolidity() {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true)
      },
      { threshold: 0.1 }
    )
    if (sectionRef.current) observer.observe(sectionRef.current)

    // Fallback: garante que o conteúdo aparece mesmo sem scroll (mobile)
    const timeout = setTimeout(() => setIsVisible(true), 1500)

    return () => {
      observer.disconnect()
      clearTimeout(timeout)
    }
  }, [])

  return (
    <section
      ref={sectionRef}
      className="py-24 lg:py-32 bg-gradient-to-br from-background via-background to-primary/5"
      id="prova-solidez"
    >
      <Container size="2xl">
        {/* Section Header */}
        <div className={`text-center mb-16 opacity-0 ${isVisible ? 'animate-fade-in-up' : ''}`}>
          <SectionKicker className="mb-4">Reputação</SectionKicker>
          <SectionHeading as="h2" size="lg" className="mb-6">
            Construindo reputação, carro a carro
          </SectionHeading>
          <p className="text-foreground-secondary text-lg max-w-3xl mx-auto">
            Desde 2008, a Attra cresceu de forma orgânica, baseada em algo que não pode ser comprado
            nem acelerado: a confiança. Cada negociação bem conduzida, cada indicação espontânea e cada
            parceria consolidada ajudaram a formar uma rede sólida de clientes, parceiros e instituições financeiras.
          </p>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-20">
          {metrics.map((metric, index) => (
            <div
              key={metric.label}
              className={`institutional-card p-6 text-center hover:border-primary/40 transition-all
                opacity-0 ${isVisible ? `animate-fade-in-up stagger-${index + 1}` : ''}`}
            >
              <div className="type-display-lg text-primary mb-2">{metric.value}</div>
              <p className="type-label">{metric.label}</p>
            </div>
          ))}
        </div>

        {/* Pillars Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {pillars.map((pillar, index) => (
            <div
              key={pillar.title}
              className={`group institutional-card p-6 lg:p-8
                hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 transition-all
                opacity-0 ${isVisible ? `animate-fade-in-up stagger-${index + 1}` : ''}`}
            >
              <div className="mb-4">
                <div className="w-12 h-12 lg:w-14 lg:h-14 bg-primary/10 rounded-xl lg:rounded-2xl flex items-center justify-center
                              group-hover:bg-primary/20 transition-colors mb-4">
                  <pillar.icon className="w-6 h-6 lg:w-7 lg:h-7 text-primary" />
                </div>
                <h3 className="type-display-md text-lg lg:text-xl group-hover:text-primary transition-colors">
                  {pillar.title}
                </h3>
                <p className="text-xs lg:text-sm text-primary font-medium mt-1">{pillar.subtitle}</p>
              </div>
              <p className="text-sm lg:text-base text-foreground-secondary leading-relaxed">
                {pillar.description}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}
