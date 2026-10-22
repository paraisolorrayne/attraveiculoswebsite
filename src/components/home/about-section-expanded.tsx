'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Award, Users, MapPin, Calendar, CheckCircle } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { Button } from '@/components/ui/button'
import { SectionKicker, SectionHeading } from '@/components/ui/brand'
import { anosDeMercado } from '@/lib/constants'

const stats = [
  { value: String(anosDeMercado()), label: 'Anos de Mercado', icon: Calendar },
  { value: '500+', label: 'Veículos/Ano', icon: Award },
  { value: '27', label: 'Estados Atendidos', icon: MapPin },
  { value: '5.0', label: 'Avaliação Google', icon: Users },
]

const pillars = [
  'Curadoria antes de catálogo',
  'Relação antes de transação',
  'Procedência antes de pressa',
]

export function AboutSectionExpanded() {
  // Animação ao rolar (revelar-ao-rolar.tsx + motion.css): cada peça entra na
  // sua vez, com `--d` escalonando; a foto do Thiago abre como cortina e, onde
  // o navegador permite, acompanha a rolagem. Antes a seção inteira aparecia
  // de uma vez, 1,5 s depois de a página abrir, com ninguém olhando para ela.
  const atraso = (ms: number) => ({ ['--d' as string]: `${ms}ms` })

  return (
    <section className="py-20 lg:py-28 bg-background-soft" id="sobre">
      <Container size="2xl">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left - Content */}
          <div>
            <div data-revelar>
              <SectionKicker className="mb-3">Posicionamento</SectionKicker>
            </div>
            <div data-revelar style={atraso(80)}>
              <SectionHeading as="h2" size="lg" className="mb-6">
                Mais do que carros. Uma visão.
              </SectionHeading>
            </div>

            {/* 1 parágrafo principal */}
            <p data-revelar style={atraso(180)} className="text-foreground-secondary leading-relaxed mb-6">
              A história da Attra começa com uma inquietação simples: por que a compra de um carro
              extraordinário tantas vezes vinha acompanhada de uma experiência comum? A empresa nasceu
              para corrigir esse desalinhamento, tratando cada veículo como patrimônio e cada cliente
              com o nível de atenção que esse tipo de decisão exige.
            </p>

            {/* 3 bullets – pilares */}
            <div className="space-y-3 mb-8">
              {pillars.map((item, i) => (
                <div key={item} data-revelar style={atraso(280 + i * 110)} className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-primary shrink-0" />
                  <span className="text-foreground font-medium">{item}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div data-revelar style={atraso(640)}>
              <Button asChild size="lg">
                <Link href="/sobre" className="flex items-center gap-2">
                  Conheça o posicionamento completo <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Right - Stats & Image */}
          <div>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              {stats.map((stat, i) => (
                <div
                  key={stat.label}
                  data-revelar
                  style={atraso(120 + i * 100)}
                  className="institutional-card p-5 text-center hover:border-primary/30 transition-colors"
                >
                  <stat.icon className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="type-display-md">{stat.value}</p>
                  <p className="type-label">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* CEO Photo - Thiago: revelada aos poucos */}
            <div
              data-revelar="cortina"
              style={atraso(200)}
              className="cortina-na-rolagem relative aspect-[4/3] rounded-2xl overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5 border border-border"
            >
              <Image
                src="/about/attra-ceo-thiago-fundador-2026.jpg"
                alt="Thiago - CEO Attra Veículos"
                fill
                className="object-cover object-center"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                <p className="text-lg font-semibold text-white">Thiago</p>
                <p className="text-sm text-white/80">CEO - Attra Veículos</p>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}

