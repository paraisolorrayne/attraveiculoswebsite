import { Metadata } from 'next'
import Link from 'next/link'
import { Globe, MessageCircle, ChevronDown, Ship, FileCheck, Truck, Shield, Clock, Users, Award, HelpCircle, ArrowRight, Crown } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { getWhatsAppUrl } from '@/lib/constants'
import { organizationRef } from '@/lib/schema-entity'
import { canonicalUrl } from '@/lib/seo/page-metadata'

// SEO Optimized Metadata
export const metadata: Metadata = {
  title: 'Importação de Veículos Premium | Carros de Luxo e Superesportivos',
  description: 'Importação sob medida de veículos de luxo e superesportivos da Europa, EUA e Oriente Médio. Processo 100% legal com desembaraço aduaneiro, homologação e entrega em todo Brasil.',
  keywords: 'importação de carros de luxo, importar veículos premium, importação de superesportivos, importar Ferrari, importar Porsche, importar Lamborghini',
  openGraph: {
    title: 'Importação de Veículos Premium | Attra Veículos',
    description: 'Importe seu veículo de luxo ou superesportivo com a Attra. Processo completo, legal e transparente.',
    type: 'website',
  },
  alternates: { canonical: canonicalUrl('/servicos/importacao') },
}

// Import Process Steps
const importSteps = [
  { number: '01', icon: Users, title: 'Consultoria Personalizada', description: 'Entendemos suas preferências, orçamento e necessidades para encontrar o veículo ideal.', time: '1-2 dias' },
  { number: '02', icon: Globe, title: 'Curadoria Internacional', description: 'Buscamos em nossa rede de dealers certificados na Europa, EUA e Oriente Médio.', time: '3-7 dias' },
  { number: '03', icon: FileCheck, title: 'Negociação e Fechamento', description: 'Negociamos as melhores condições e cuidamos de toda a documentação.', time: '2-5 dias' },
  { number: '04', icon: Ship, title: 'Logística Internacional', description: 'Transporte marítimo ou aéreo com seguro completo e rastreamento.', time: '20-40 dias' },
  { number: '05', icon: Shield, title: 'Desembaraço e Homologação', description: 'Cuidamos de toda a burocracia aduaneira e homologação junto ao INMETRO.', time: '15-30 dias' },
  { number: '06', icon: Truck, title: 'Entrega VIP', description: 'Entregamos seu veículo em qualquer cidade do Brasil com agilidade e qualidade.', time: '1-3 dias' },
]

// Benefits
const benefits = [
  { icon: Globe, title: 'Rede Global de Dealers', description: 'Acesso a dealers certificados em mais de 15 países.' },
  { icon: Shield, title: 'Processo 100% Legal', description: 'Toda documentação e homologação em conformidade com a legislação.' },
  { icon: Clock, title: 'Prazo Transparente', description: 'Cronograma detalhado com atualizações em tempo real.' },
  { icon: Award, title: '18 Anos de Experiência', description: 'Mais de 500 veículos importados com sucesso.' },
]

// FAQ
const faqs = [
  { question: 'Quanto tempo leva para importar um veículo?', answer: 'O prazo médio de importação é de 60 a 90 dias, desde a curadoria até a entrega. Esse prazo pode variar dependendo da origem do veículo, disponibilidade e complexidade da homologação.' },
  { question: 'Quais veículos podem ser importados?', answer: 'Podemos importar qualquer veículo de luxo ou superesportivo, incluindo modelos que não são comercializados oficialmente no Brasil. Trabalhamos com marcas como Ferrari, Lamborghini, Porsche, McLaren, Bentley, Rolls-Royce, entre outras.' },
  { question: 'O veículo importado pode ser emplacado no Brasil?', answer: 'Sim, todos os veículos importados pela Attra passam pelo processo completo de homologação junto ao INMETRO e podem ser emplacados normalmente em qualquer estado brasileiro.' },
  { question: 'Quais são os custos envolvidos na importação?', answer: 'Os custos incluem o valor do veículo, frete internacional, impostos de importação (II, IPI, PIS, COFINS, ICMS), taxas de homologação e logística nacional. Fornecemos orçamento detalhado antes de iniciar o processo.' },
  { question: 'A Attra oferece garantia em veículos importados?', answer: 'Sim, oferecemos garantia de motor e câmbio de 90 dias para todos os veículos importados. Também disponibilizamos garantia estendida opcional de até 24 meses.' },
]

// Schema markup
function ImportServiceSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Importação de Veículos Premium',
    // Referencia a entidade canônica do layout raiz em vez de redeclará-la.
    provider: organizationRef(),
    description: 'Importação sob medida de veículos de luxo e superesportivos da Europa, EUA e Oriente Médio com processo 100% legal.',
    areaServed: 'BR',
    serviceType: 'Importação de Veículos'
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
}

function FAQSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({ '@type': 'Question', name: faq.question, acceptedAnswer: { '@type': 'Answer', text: faq.answer } }))
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
}

export default function ImportacaoPage() {
  return (
    <>
      <ImportServiceSchema />
      <FAQSchema />

      {/* HERO SECTION */}
      <section className="relative pt-28 pb-20 lg:pt-32 lg:pb-28 bg-gradient-to-br from-background via-background-soft to-background overflow-hidden">
        <Container className="relative z-10 mb-8">
          <Breadcrumb items={[{ label: 'Serviços', href: '/servicos' }, { label: 'Importação', href: '/servicos/importacao' }]} afterHero />
        </Container>
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary rounded-full blur-3xl" />
        </div>
        <Container className="relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full mb-6">
              <Globe className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Importação Premium</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
              Importação de Veículos <span className="text-metallic text-metallic-animate">Premium</span>
            </h1>
            <p className="text-lg lg:text-xl text-foreground-secondary mb-8 max-w-3xl mx-auto leading-relaxed">
              Importe seu veículo de luxo ou superesportivo diretamente da <strong>Europa</strong>, <strong>EUA</strong> ou <strong>Oriente Médio</strong>.
              Processo 100% legal com desembaraço aduaneiro, homologação e entrega em qualquer cidade do Brasil.
            </p>
            <div className="flex flex-wrap justify-center gap-8 lg:gap-12 mb-10">
              <div className="text-center"><p className="text-3xl lg:text-4xl font-bold text-primary">500+</p><p className="text-sm text-foreground-secondary">Veículos Importados</p></div>
              <div className="text-center"><p className="text-3xl lg:text-4xl font-bold text-primary">15+</p><p className="text-sm text-foreground-secondary">Países de Origem</p></div>
              <div className="text-center"><p className="text-3xl lg:text-4xl font-bold text-primary">100%</p><p className="text-sm text-foreground-secondary">Processo Legal</p></div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="text-lg px-8 py-6">
                <Link href={getWhatsAppUrl('Olá! Gostaria de saber mais sobre importação de veículos.')} target="_blank">
                  <MessageCircle className="w-5 h-5 mr-2" />Solicitar Orçamento
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6">
                <a href="#como-funciona">Como Funciona<ChevronDown className="w-5 h-5 ml-2" /></a>
              </Button>
            </div>
          </div>
        </Container>
      </section>

      {/* BENEFITS SECTION */}
      <section className="py-16 bg-background">
        <Container>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit) => (
              <div key={benefit.title} className="text-center p-6">
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <benefit.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{benefit.title}</h3>
                <p className="text-sm text-foreground-secondary">{benefit.description}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* PROCESS SECTION */}
      <section className="py-20 bg-background-soft" id="como-funciona">
        <Container>
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full mb-4">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Processo</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">Como Funciona a Importação</h2>
            <p className="text-foreground-secondary max-w-2xl mx-auto">Processo transparente em 6 etapas, do sonho à realidade em 60 a 90 dias.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {importSteps.map((step) => (
              <div key={step.number} className="bg-background border border-border rounded-xl p-6 hover:border-primary/50 transition-all">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                    <step.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-primary">ETAPA {step.number}</span>
                    <p className="text-xs text-foreground-secondary">{step.time}</p>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-foreground-secondary">{step.description}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* FAQ SECTION */}
      <section className="py-16 bg-background" id="perguntas-frequentes">
        <Container>
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full mb-4">
                <HelpCircle className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">FAQ</span>
              </div>
              <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4">Perguntas Frequentes sobre Importação</h2>
              <p className="text-foreground-secondary">Tire suas dúvidas sobre o processo de importação de veículos.</p>
            </div>
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div key={index} className="bg-background-soft border border-border rounded-xl overflow-hidden">
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-3">{faq.question}</h3>
                    <p className="text-foreground-secondary leading-relaxed">{faq.answer}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* CTA FINAL */}
      <section className="py-20 bg-gradient-to-r from-primary to-primary/90">
        <Container>
          <div className="max-w-3xl mx-auto text-center">
            <Crown className="w-12 h-12 text-white/80 mx-auto mb-6" />
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">Pronto para Importar seu Veículo dos Sonhos?</h2>
            <p className="text-lg text-white/80 mb-8 leading-relaxed">
              Fale com nossos especialistas e receba um orçamento personalizado para importação do seu veículo de luxo ou superesportivo.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90 text-lg px-8 py-6 font-semibold">
                <Link href={getWhatsAppUrl('Olá! Gostaria de um orçamento para importação de veículo.')} target="_blank">
                  <MessageCircle className="w-5 h-5 mr-2" />Solicitar Orçamento
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-white/30 text-white hover:bg-white/10 text-lg px-8 py-6">
                <Link href="/servicos">Outros Serviços<ArrowRight className="w-5 h-5 ml-2" /></Link>
              </Button>
            </div>
          </div>
        </Container>
      </section>
    </>
  )
}

