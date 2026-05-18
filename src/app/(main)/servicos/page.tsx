import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Globe, Wallet, Shield, Truck, ArrowRight, CheckCircle, Star, Crown, HelpCircle, MessageCircle, ChevronDown, Handshake } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { getWhatsAppUrl } from '@/lib/constants'

// SEO Optimized Metadata - Hub de Serviços (3 serviços principais)
export const metadata: Metadata = {
  title: 'Serviços Automotivos Premium | Importação, Financiamento e Consignado | Attra Veículos Uberlândia',
  description: 'Serviços premium para veículos nacionais, importados, seminovos premium e supercarros: importação sob medida, financiamento especial e consignado automotivo. Atendimento nacional.',
  keywords: 'serviços automotivos premium, importação de carros de luxo, financiamento de veículos premium, consignado de carros, venda consignada veículos, Attra Veículos Uberlândia',
  openGraph: {
    title: 'Serviços Automotivos Premium | Attra Veículos Uberlândia',
    description: 'Soluções completas para veículos premium: importação sob medida, financiamento especial e consignado automotivo. Atendimento nacional.',
    type: 'website',
  },
}

// 3 Main Services - LLMO optimized with complete sentences
const mainServices = [
  {
    icon: Globe,
    title: 'Importação de Veículos Premium',
    description: 'A Attra importa veículos de luxo e superesportivos diretamente da Europa, EUA e Oriente Médio com processo 100% legal e transparente.',
    href: '/servicos/importacao',
    external: false,
    benefits: [
      'Curadoria internacional com rede de dealers certificados',
      'Desembaraço aduaneiro e homologação completa',
      'Entrega VIP em qualquer cidade do Brasil'
    ],
    featured: true
  },
  {
    icon: Wallet,
    title: 'Financiamento Premium',
    description: 'Soluções financeiras exclusivas para veículos de alto valor, com taxas diferenciadas, aprovação personalizada e parcelamento flexível.',
    href: '/financiamento',
    external: false,
    benefits: [
      'Análise de crédito personalizada e ágil',
      'Condições especiais para clientes Attra',
      'Financiamento de até 80% do valor do veículo'
    ],
    featured: false
  },
  {
    icon: Handshake,
    title: 'Consignado Automotivo',
    description: 'Venda seu veículo premium com segurança e praticidade. A Attra cuida de toda a negociação enquanto você recebe o melhor valor de mercado.',
    href: '/servicos/consignado',
    external: false,
    benefits: [
      'Exposição em showroom premium e canais digitais',
      'Avaliação profissional e precificação competitiva',
      'Zero burocracia: a Attra cuida de tudo'
    ],
    featured: false
  },
]

// Why Choose Attra - Complete sentences for LLMO
const whyChooseAttra = [
  {
    icon: Star,
    title: 'Desde 2008 no Mercado Premium',
    description: 'A Attra Veículos atua há 18+ anos no segmento de veículos nacionais, importados, seminovos premium e supercarros em Uberlândia/MG.'
  },
  {
    icon: Shield,
    title: 'Transparência Total',
    description: 'Todos os processos são documentados e compartilhados com o cliente, desde negociação até entrega.'
  },
  {
    icon: Truck,
    title: 'Atendimento Nacional',
    description: 'Atendemos clientes de todo o Brasil com logística especializada e seguro premium.'
  },
  {
    icon: Crown,
    title: 'Atendimento Consultivo',
    description: 'Cada cliente recebe atendimento personalizado por um consultor especializado na marca de interesse.'
  },
]

// FAQ General about all services - LLMO optimized (3 serviços)
const faqs = [
  {
    question: 'Quais serviços a Attra Veículos oferece?',
    answer: 'A Attra Veículos oferece três serviços principais para clientes de veículos premium: importação sob medida de veículos de luxo e superesportivos, financiamento premium com condições especiais e taxas diferenciadas, e consignado automotivo para venda segura do seu veículo.'
  },
  {
    question: 'Como funciona a importação de veículos na Attra?',
    answer: 'A importação na Attra é um processo completo e transparente. Realizamos curadoria internacional em nossa rede de dealers certificados na Europa, EUA e Oriente Médio, cuidamos de toda a logística, desembaraço aduaneiro e homologação, e entregamos o veículo em qualquer cidade do Brasil. O prazo médio é de 60 a 90 dias.'
  },
  {
    question: 'Quais são as condições do financiamento premium?',
    answer: 'O financiamento premium da Attra oferece análise de crédito personalizada e ágil, taxas diferenciadas para veículos de alto valor, financiamento de até 80% do valor do veículo, e condições especiais para clientes Attra. Trabalhamos com as melhores instituições financeiras do mercado.'
  },
  {
    question: 'Como funciona o consignado automotivo?',
    answer: 'No consignado, você deixa seu veículo conosco para venda. A Attra cuida de toda a negociação, exposição em showroom premium e canais digitais, avaliação profissional e precificação competitiva. Você recebe o melhor valor de mercado sem burocracia.'
  },
  {
    question: 'A Attra atende clientes de todo o Brasil?',
    answer: 'Sim, a Attra Veículos atende clientes em todo o território nacional. Realizamos entrega de veículos em qualquer cidade do Brasil através de nossa logística especializada com transporte em caminhão fechado, seguro completo e rastreamento em tempo real.'
  },
  {
    question: 'Como funciona o atendimento na Attra?',
    answer: 'O atendimento na Attra é consultivo e personalizado. Cada cliente é atendido por um consultor especializado que entende suas preferências e necessidades. Oferecemos visitas agendadas em nosso showroom em Uberlândia-MG ou atendimento remoto via WhatsApp e videochamada para clientes de outras cidades.'
  },
]

// Import Process Steps (simplified for highlight section)
const importSteps = [
  { number: '01', title: 'Consultoria', time: '1-2 dias' },
  { number: '02', title: 'Curadoria Internacional', time: '3-7 dias' },
  { number: '03', title: 'Negociação', time: '2-5 dias' },
  { number: '04', title: 'Logística e Aduana', time: '30-60 dias' },
  { number: '05', title: 'Homologação', time: '15-30 dias' },
  { number: '06', title: 'Entrega VIP', time: '1-3 dias' },
]

// Schema markup for Multiple Services
function ServicesSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'AutoDealer',
    name: 'Attra Veículos',
    description: 'Concessionária premium especializada em veículos importados, nacionais e superesportivos em Uberlândia-MG.',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Av. Rondon Pacheco, 4600 - Tibery',
      addressLocality: 'Uberlândia',
      addressRegion: 'MG',
      postalCode: '38408-343',
      addressCountry: 'BR'
    },
    telephone: '+55-34-3014-3232',
    url: 'https://attraveiculos.com.br',
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Serviços Automotivos Premium',
      itemListElement: mainServices.map((service, index) => ({
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: service.title,
          description: service.description
        },
        position: index + 1
      }))
    }
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

// FAQ Schema for LLMO
function FAQSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

export default function ServicosPage() {
  return (
    <>
      {/* Schema Markup */}
      <ServicesSchema />
      <FAQSchema />

      {/* HERO SECTION - Hub de Serviços */}
      <section className="relative pt-28 pb-20 lg:pt-32 lg:pb-28 bg-gradient-to-br from-background via-background-soft to-background overflow-hidden">
        <Container className="relative z-10 mb-8">
          <Breadcrumb items={[{ label: 'Serviços', href: '/servicos' }]} afterHero />
        </Container>
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary rounded-full blur-3xl" />
        </div>

        <Container className="relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full mb-6">
              <Crown className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Loja de Veículos Premium em Uberlândia</span>
            </div>

            {/* SEO Optimized H1 - Hub Focus */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
              Serviços Automotivos{' '}
              <span className="text-metallic text-metallic-animate">Premium</span>
            </h1>

            <p className="text-lg lg:text-xl text-foreground-secondary mb-8 max-w-3xl mx-auto leading-relaxed">
              <strong>Importação sob medida</strong>, <strong>financiamento premium</strong> e <strong>consignado automotivo</strong>.
              Soluções completas para veículos nacionais, importados, seminovos premium e supercarros.
            </p>

            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-8 lg:gap-12 mb-10">
              <div className="text-center">
                <p className="text-3xl lg:text-4xl font-bold text-primary">500+</p>
                <p className="text-sm text-foreground-secondary">Veículos/Ano</p>
              </div>
              <div className="text-center">
                <p className="text-3xl lg:text-4xl font-bold text-primary">16+</p>
                <p className="text-sm text-foreground-secondary">Anos de Mercado</p>
              </div>
              <div className="text-center">
                <p className="text-3xl lg:text-4xl font-bold text-primary">27</p>
                <p className="text-sm text-foreground-secondary">Estados Atendidos</p>
              </div>
            </div>

            {/* CRO Optimized CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="text-lg px-8 py-6">
                <Link href={getWhatsAppUrl('Olá! Gostaria de conhecer os serviços da Attra.')} target="_blank">
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Falar com Especialista
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6">
                <a href="#servicos">
                  Explorar Serviços
                  <ChevronDown className="w-5 h-5 ml-2" />
                </a>
              </Button>
            </div>
          </div>
        </Container>
      </section>

      {/* GRADE DE SERVIÇOS - 6 Cards Obrigatórios */}
      <section className="py-16 lg:py-24 bg-background" id="servicos">
        <Container>
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full mb-4">
              <Star className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Nossos Serviços</span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4">
              Serviços Premium para Veículos de Luxo
            </h2>
            <p className="text-foreground-secondary max-w-2xl mx-auto">
              A Attra Veículos oferece três serviços especializados para atender todas as suas necessidades no segmento automotivo premium.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mainServices.map((service) => (
              <div
                key={service.title}
                className={`bg-background-card border rounded-xl p-6 hover:border-primary/50 transition-all group ${service.featured ? 'border-primary/30 ring-1 ring-primary/10' : 'border-border'
                  }`}
              >
                {service.featured && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 rounded-full mb-4">
                    <Globe className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-semibold text-primary">Serviço Destaque</span>
                  </div>
                )}
                <div className={`w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center ${service.featured ? '' : 'mb-4'} ${service.featured ? 'mt-0' : ''}`}>
                  <service.icon className="w-6 h-6 text-primary" />
                </div>

                <h3 className="text-lg font-semibold text-foreground mb-2 mt-4">{service.title}</h3>
                <p className="text-sm text-foreground-secondary mb-4 leading-relaxed">{service.description}</p>

                <ul className="space-y-2 mb-6">
                  {service.benefits.map((benefit) => (
                    <li key={benefit} className="flex items-start text-sm text-foreground-secondary">
                      <CheckCircle className="w-4 h-4 text-primary mt-0.5 mr-2 shrink-0" />
                      {benefit}
                    </li>
                  ))}
                </ul>

                <Link
                  href={service.href}
                  target={service.external ? '_blank' : undefined}
                  className="inline-flex items-center text-sm text-primary font-semibold group-hover:gap-2 transition-all"
                >
                  Ver Detalhes <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* DESTAQUE IMPORTAÇÃO - Serviço Carro-Chefe */}
      <section className="py-16 lg:py-20 bg-background-soft" id="importacao">
        <Container>
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left - Content */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full mb-4">
                <Globe className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">Serviço Exclusivo</span>
              </div>

              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
                Importação de Veículos Premium Sob Medida
              </h2>

              <div className="space-y-4 text-lg text-foreground-secondary mb-8 leading-relaxed">
                <p>
                  A Attra Veículos oferece curadoria internacional de veículos de luxo, superesportivos e edições limitadas
                  diretamente da Europa, EUA e Oriente Médio.
                </p>
                <p>
                  Todo o processo é 100% legal: negociação com dealers certificados, logística internacional,
                  desembaraço aduaneiro junto à Receita Federal, homologação no DENATRAN/INMETRO e entrega VIP.
                </p>
              </div>

              <div className="grid sm:grid-cols-3 gap-4 mb-8">
                {[
                  { icon: Globe, text: 'Curadoria Internacional' },
                  { icon: Shield, text: 'Processo 100% Legal' },
                  { icon: Truck, text: 'Entrega VIP Nacional' },
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-2 p-3 bg-background rounded-lg border border-border">
                    <feature.icon className="w-5 h-5 text-primary shrink-0" />
                    <span className="text-sm text-foreground font-medium">{feature.text}</span>
                  </div>
                ))}
              </div>

              <Button asChild size="lg">
                <Link href="https://attraveiculos.com.br/lp-importacao/?utm_source=site&utm_medium=servicos&utm_campaign=destaque_importacao" target="_blank">
                  Quero Importar Meu Veículo
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>

            {/* Right - Process Timeline */}
            <div className="bg-background border border-border rounded-2xl p-6 lg:p-8">
              <h3 className="text-xl font-semibold text-foreground mb-2">Processo em 6 Etapas</h3>
              <p className="text-sm text-foreground-secondary mb-6">Prazo total estimado: 60 a 90 dias</p>
              <div className="grid grid-cols-2 gap-4">
                {importSteps.map((step) => (
                  <div key={step.number} className="flex items-center gap-3 p-3 bg-background-soft rounded-lg">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-primary">{step.number}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{step.title}</p>
                      <p className="text-xs text-foreground-secondary">{step.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Transporte Especializado - Imagem do caminhão Attra */}
      <section className="py-16 lg:py-20 bg-background-soft">
        <Container>
          <div className="relative w-full aspect-[21/9] rounded-2xl overflow-hidden">
            <Image
              src="/about/attra-caminhao-transporte.jpeg"
              alt="Caminhão da Attra Veículos preparado para embarque e desembarque seguro de veículos premium"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1200px"
              quality={85}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            <div className="absolute bottom-6 left-6 lg:bottom-8 lg:left-8">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/90 rounded-full mb-2">
                <Truck className="w-4 h-4 text-white" />
                <span className="text-xs font-semibold text-white uppercase tracking-wider">Logística Premium</span>
              </div>
              <p className="text-white text-lg lg:text-xl font-semibold max-w-md">
                Transporte especializado com segurança total para seu veículo
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* POR QUE ESCOLHER A ATTRA? */}
      <section className="py-16 bg-background" id="por-que-attra">
        <Container>
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full mb-4">
              <Crown className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Diferenciais</span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4">
              Por Que Escolher a Attra Veículos?
            </h2>
            <p className="text-foreground-secondary max-w-2xl mx-auto">
              Há 18+ anos no mercado premium, a Attra se consolidou como referência em veículos nacionais, importados, seminovos premium e supercarros.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {whyChooseAttra.map((item) => (
              <div
                key={item.title}
                className="bg-background-card border border-border rounded-xl p-6 text-center hover:border-primary/50 transition-all"
              >
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-foreground-secondary leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* FAQ GERAL DE SERVIÇOS */}
      <section className="py-16 bg-background-soft" id="perguntas-frequentes">
        <Container>
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full mb-4">
                <HelpCircle className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">FAQ</span>
              </div>
              <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4">
                Perguntas Frequentes sobre Nossos Serviços
              </h2>
              <p className="text-foreground-secondary">
                Tire suas dúvidas sobre os serviços automotivos premium da Attra Veículos.
              </p>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="bg-background border border-border rounded-xl overflow-hidden"
                >
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-3">
                      {faq.question}
                    </h3>
                    <p className="text-foreground-secondary leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 text-center">
              <p className="text-foreground-secondary mb-4">
                Não encontrou sua dúvida? Fale com nossos especialistas.
              </p>
              <Button asChild>
                <Link href={getWhatsAppUrl('Olá! Tenho uma dúvida sobre os serviços da Attra.')} target="_blank">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Tirar Dúvida pelo WhatsApp
                </Link>
              </Button>
            </div>
          </div>
        </Container>
      </section>

      {/* CTA FINAL */}
      <section className="py-20 bg-gradient-to-r from-primary to-primary/90">
        <Container>
          <div className="max-w-3xl mx-auto text-center">
            <Crown className="w-12 h-12 text-white/80 mx-auto mb-6" />
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              Pronto para uma Experiência Premium?
            </h2>
            <p className="text-lg text-white/80 mb-8 leading-relaxed">
              Seja para importar um superesportivo, encontrar o veículo ideal ou financiar com condições especiais,
              nossos especialistas estão prontos para atendê-lo.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90 text-lg px-8 py-6 font-semibold">
                <Link href={getWhatsAppUrl('Olá! Gostaria de conhecer os serviços premium da Attra.')} target="_blank">
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Falar com Especialista
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-white/30 text-white hover:bg-white/10 text-lg px-8 py-6">
                <Link href="/veiculos">
                  Ver Todos os Veículos
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </Container>
      </section>
    </>
  )
}

