import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Container } from '@/components/ui/container'
import { Button } from '@/components/ui/button'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { MapPin, Award, Clock, Star, Users, Truck, Search, FileCheck, CheckCircle, Phone, MessageCircle, ArrowRight, Shield, Handshake, Eye, FileText, CreditCard, HeadphonesIcon, Play, Youtube, Trophy, Sparkles, Car } from 'lucide-react'
import { getWhatsAppUrl } from '@/lib/constants'
import { ICONIC_CARS, getCategoryLabel } from '@/lib/iconic-cars'

export const metadata: Metadata = {
  title: 'Jornada Attra | Curadoria de Supercarros, Acervo Icônico e Entrega Nacional',
  description: 'Jornada de compra de veículos premium com curadoria completa de supercarros. Conheça os carros icônicos que já passaram pela Attra — Ferrari, Lamborghini, Porsche, McLaren e mais. Da seleção à entrega nacional.',
  keywords: ['jornada de compra de veículos premium', 'curadoria completa de supercarros', 'atendimento nacional para colecionadores', 'entrega de veículos premium', 'compra de supercarros Brasil', 'carros icônicos Attra', 'histórico supercarros'],
}

// Schema markup para SEO
function JornadaSchema() {
  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Jornada Attra - Curadoria Premium de Veículos',
    provider: {
      '@type': 'AutoDealer',
      name: 'Attra Veículos',
      address: { '@type': 'PostalAddress', addressLocality: 'Uberlândia', addressRegion: 'MG', addressCountry: 'BR' },
    },
    description: 'Jornada completa de compra de veículos premium: curadoria personalizada, vistoria técnica, logística nacional e entrega na sua garagem.',
    areaServed: { '@type': 'Country', name: 'Brasil' },
    serviceType: ['Curadoria de Veículos Premium', 'Logística Nacional', 'Vistoria Técnica', 'Consultoria Automotiva'],
  }

  const iconicListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Carros Icônicos que Passaram pela Attra',
    description: 'Acervo histórico de veículos premium e supercarros marcantes comercializados pela Attra Veículos.',
    numberOfItems: ICONIC_CARS.length,
    itemListElement: ICONIC_CARS.map((car, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Vehicle',
        name: `${car.brand} ${car.model}`,
        description: car.editorial,
        image: car.photo,
        vehicleModelDate: String(car.year),
        ...(car.engine ? { vehicleEngine: { '@type': 'EngineSpecification', name: car.engine } } : {}),
        brand: { '@type': 'Brand', name: car.brand },
        model: car.model,
        color: car.color,
        mileageFromOdometer: { '@type': 'QuantitativeValue', value: parseInt(car.mileage.replace(/\./g, '')) || 0, unitCode: 'KMT' },
      },
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(iconicListSchema) }} />
    </>
  )
}

const journeySteps = [
  {
    icon: Search,
    step: '01',
    title: 'Curadoria Personalizada',
    subtitle: 'Seleção',
    description: 'Nossa jornada começa com um briefing detalhado sobre suas preferências. Realizamos busca ativa no mercado nacional e internacional, com consultoria especializada para encontrar exatamente o supercarro que você procura.',
    benefits: ['Briefing personalizado', 'Busca nacional e internacional', 'Consultoria especializada'],
  },
  {
    icon: FileCheck,
    step: '02',
    title: 'Vistoria e Verificação',
    subtitle: 'Análise',
    description: 'Cada veículo passa por inspeção técnica de 200 itens, verificação completa de documentação, histórico e procedência. Transparência total antes da sua decisão de compra.',
    benefits: ['200 itens de inspeção', 'Verificação de procedência', 'Histórico completo'],
  },
  {
    icon: Handshake,
    step: '03',
    title: 'Negociação e Documentação',
    subtitle: 'Conclusão',
    description: 'Conduzimos toda a negociação com segurança e transparência. Cuidamos de toda a documentação, transferência e regularização do veículo para você.',
    benefits: ['Negociação segura', 'Documentação completa', 'Transferência facilitada'],
  },
  {
    icon: Truck,
    step: '04',
    title: 'Logística Nacional',
    subtitle: 'Entrega',
    description: 'Transporte em caminhão fechado, seguro premium específico para supercarros e rastreamento em tempo real. Entrega na porta da sua casa, em qualquer cidade do Brasil.',
    benefits: ['Caminhão fechado', 'Seguro premium', 'Rastreamento em tempo real'],
  },
]

const testimonials = [
  {
    quote: 'A jornada de comprar meu primeiro Ferrari com a Attra foi impecável. Desde a negociação até a entrega, cada detalhe foi pensado para colecionadores.',
    author: 'Roberto M.',
    location: 'São Paulo, SP',
    vehicle: 'Ferrari 488 Pista',
  },
  {
    quote: 'Comprei meu Porsche GT3 RS de Uberlândia para o Rio. Transporte perfeito, veículo entregue exatamente como prometido. Atendimento de excelência.',
    author: 'Carlos A.',
    location: 'Rio de Janeiro, RJ',
    vehicle: 'Porsche 911 GT3 RS',
  },
  {
    quote: 'A equipe Attra entende de supercarros. Não é apenas venda, é consultoria especializada para colecionadores que valorizam cada detalhe.',
    author: 'Marcos P.',
    location: 'Belo Horizonte, MG',
    vehicle: 'Lamborghini Huracán',
  },
]

const achievements = [
  {
    year: 2009,
    title: 'Fundação',
    description:
      'A Attra Veículos nasceu com o propósito de oferecer uma experiência diferenciada na compra e venda de veículos, unindo transparência, credibilidade e atendimento personalizado. Fundada como uma empresa familiar, a Attra foi construída sobre valores sólidos, com foco em profissionalização, respeito aos processos e compromisso com o cliente.',
  },
  {
    year: 2015,
    title: 'Primeiro Ferrari',
    description:
      'Comercialização do primeiro superesportivo italiano.',
  },
  {
    year: 2018,
    title: 'Novo Showroom',
    description:
      'Inauguração do showroom de 5.000m² climatizado.',
  },
  {
    year: 2023,
    title: '500+ Supercarros',
    description:
      'Marco de 500 supercarros vendidos para todo Brasil.',
  },
  {
    year: 2024,
    title: 'Consolidação de Estrutura Empresarial',
    description:
      'A gestão da empresa é conduzida de forma estruturada, com papéis bem definidos e hierarquia clara, garantindo decisões estratégicas eficientes e um crescimento sustentável. Essa postura profissional permitiu à Attra Veículos consolidar sua reputação no mercado, sendo a maior dealer premium do Triângulo Mineiro.',
  },
  {
    year: 2025,
    title: 'Expansão de Alcance Nacional',
    description:
      'Ano marcado por expansão de alcance nacional, com a Attra cada vez mais presente no radar dos principais compradores e entusiastas de supercarros em todo o Brasil.',
  },
  {
    year: 2026,
    title: 'Nova Expansão e Estrutura',
    description:
      'Segunda grande expansão da estrutura física, com um novo espaço dedicado à experiência do cliente e à curadoria de supercarros, reforçando a presença da Attra como referência premium em nível nacional.',
  },
];

export default function JornadaPage() {
  const breadcrumbItems = [{ label: 'Jornada Attra', href: '/jornada' }]

  return (
    <>
      <JornadaSchema />
      
      {/* Hero Section */}
      <section className="relative min-h-[600px] lg:min-h-[70vh] flex flex-col lg:justify-center pt-24 sm:pt-28 lg:pt-20 pb-12 lg:pb-0">
        {/* Background with fallback gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
          <Image
            src="/experience/attra-rondon.jpg"
            alt="Jornada Attra - Curadoria de Supercarros"
            fill
            className="object-cover"
            priority
          />
          {/* Theme-aware overlays — responsiveness handled in CSS */}
          <div className="absolute inset-0 jornada-hero-overlay" />
          <div className="absolute inset-0 jornada-hero-overlay-gradient" />
        </div>

        <Container className="relative z-10">
          <Breadcrumb items={breadcrumbItems} afterHero />
          <div className="max-w-2xl mt-6 lg:mt-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full mb-6">
              <Star className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary uppercase tracking-wider">Além do Automóvel</span>
            </div>
            <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold jornada-hero-heading mb-6 leading-tight">
              Da seleção ao desembarque <span className="text-metallic text-metallic-animate">na sua garagem</span>
            </h1>
            <p className="text-lg lg:text-xl jornada-hero-text mb-8 leading-relaxed">
              Uma jornada exclusiva de compra de veículos premium, com curadoria completa de supercarros,
              para quem não aceita menos que o extraordinário. <strong className="jornada-hero-text-strong">Atendimento nacional</strong> a partir de Uberlândia.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg" className="text-lg px-8 py-6">
                <Link href={getWhatsAppUrl('Olá! Gostaria de agendar uma visita VIP ao showroom.')} target="_blank">
                  <MessageCircle className="w-5 h-5 mr-2" />Agendar Visita VIP
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6 jornada-hero-btn-outline">
                <Link href={getWhatsAppUrl('Olá! Gostaria de iniciar uma curadoria à distância.')} target="_blank">
                  <Phone className="w-5 h-5 mr-2" />Curadoria à Distância
                </Link>
              </Button>
            </div>
          </div>
        </Container>
      </section>

      {/* Location & Reach Section */}
      <section className="py-16 lg:py-20 bg-background-soft">
        <Container>
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full mb-6">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Uberlândia • Atendimento Nacional</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
              Você pode estar em qualquer cidade do Brasil
            </h2>
            <p className="text-lg text-foreground-secondary leading-relaxed mb-8">
              Com base em Uberlândia, a Attra oferece atendimento nacional para aficionados de todo o Brasil.
              Nossa jornada completa cuida de cada etapa: <strong className="text-foreground">seleção, negociação, documentação, logística</strong> e
              <strong className="text-foreground"> entrega na porta da sua casa</strong>.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              {['Veículos Nacionais', 'Importados', 'Seminovos Premium', 'Supercarros'].map((item) => (
                <span key={item} className="inline-flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-full text-sm">
                  <CheckCircle className="w-4 h-4 text-primary" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* Diferenciais Attra – conteúdo detalhado da curadoria */}
      <section className="py-20 lg:py-28 bg-background">
        <Container>
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full mb-4">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Diferenciais</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Por Que Escolher a Attra para Veículos Premium
            </h2>
            <p className="text-foreground-secondary text-lg max-w-3xl mx-auto">
              Cada detalhe do nosso processo foi desenhado para garantir segurança, transparência e uma experiência à altura de quem busca o extraordinário.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Eye,
                title: 'Curadoria Rigorosa',
                description: 'Selecionamos apenas veículos premium e supercarros que atendem aos mais altos padrões de qualidade, procedência e estado de conservação.',
              },
              {
                icon: CheckCircle,
                title: 'Inspeção Técnica de 150 Pontos',
                description: 'Cada carro de luxo é submetido a uma inspeção completa de 150 itens — mecânica, elétrica, estrutura, pintura e acabamento — antes de integrar nosso acervo.',
              },
              {
                icon: FileText,
                title: 'Documentação 100% Verificada',
                description: 'Verificamos histórico completo, procedência, regularidade fiscal e documental de cada veículo de alto valor, garantindo total segurança jurídica.',
              },
              {
                icon: Truck,
                title: 'Entrega Nacional com Seguro',
                description: 'Logística especializada com caminhão fechado, seguro premium e rastreamento em tempo real. Entregamos supercarros em qualquer cidade do Brasil.',
              },
              {
                icon: CreditCard,
                title: 'Financiamento Diferenciado',
                description: 'Condições especiais para veículos premium: taxas diferenciadas, financiamento de até 80% do valor e análise de crédito personalizada.',
              },
              {
                icon: HeadphonesIcon,
                title: 'Atendimento Concierge',
                description: 'Consultoria personalizada do primeiro contato à entrega das chaves. Atendimento exclusivo, discreto e dedicado a cada cliente.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-background-card border border-border rounded-2xl p-6 hover:border-primary/40 transition-all group"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <item.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">{item.title}</h3>
                <p className="text-foreground-secondary text-sm leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Journey Steps - A Jornada Completa */}
      <section className="py-20 lg:py-28 bg-background-soft">
        <Container>
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full mb-4">
              <ArrowRight className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Processo</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">A Jornada Completa</h2>
            <p className="text-foreground-secondary text-lg max-w-3xl mx-auto">
              A Attra cuida de tudo até o veículo estar estacionado na sua garagem.
              Do primeiro contato à entrega das chaves, cada detalhe é pensado para colecionadores exigentes.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {journeySteps.map((step) => (
              <div key={step.step} className="group bg-background-card border border-border rounded-2xl p-8 hover:border-primary/50 transition-all">
                <div className="flex items-start gap-6 sm:gap-10">
                  <div className="shrink-0 w-16 text-center">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-2">
                      <step.icon className="w-8 h-8 text-primary" />
                    </div>
                    <span className="text-xs font-bold text-primary uppercase tracking-wider block">{step.subtitle}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl font-bold text-primary/30">{step.step}</span>
                      <h3 className="text-xl font-bold text-foreground">{step.title}</h3>
                    </div>
                    <p className="text-foreground-secondary mb-4 leading-relaxed">{step.description}</p>
                    <ul className="space-y-2">
                      {step.benefits.map((benefit) => (
                        <li key={benefit} className="flex items-center gap-2 text-sm text-foreground-secondary">
                          <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Vídeo Institucional */}
      <section className="py-16 lg:py-20 bg-background-soft">
        <Container>
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full mb-4">
              <Play className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Conheça a Attra</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              A experiência por trás de cada entrega
            </h2>
            <p className="text-foreground-secondary text-lg max-w-2xl mx-auto">
              Veja de perto como a Attra opera — da curadoria à entrega do seu veículo.
            </p>
          </div>
          <div className="max-w-4xl mx-auto">
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-background-card border border-border">
              <iframe
                src="https://www.youtube.com/embed/Y1UA3pYc7TE?rel=0&modestbranding=1"
                title="Attra Veículos — Conheça a Attra"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>
          </div>
          {/* CTA YouTube */}
          <div className="text-center mt-8">
            <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6 gap-2">
              <a href="https://www.youtube.com/@attraveiculos" target="_blank" rel="noopener noreferrer">
                <Youtube className="w-5 h-5 text-red-600" />
                Acompanhe nossos vídeos no YouTube
              </a>
            </Button>
          </div>
        </Container>
      </section>

      {/* Timeline */}
      <section className="py-20 lg:py-24 bg-background">
        <Container>
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Clock className="w-6 h-6 text-primary" />
              <span className="text-primary font-medium uppercase tracking-wider text-sm">Nossa Trajetória</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground">Construindo história</h2>
          </div>

          <div className="relative max-w-4xl mx-auto">
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border hidden md:block" />
            <div className="space-y-12">
              {achievements.map((a, i) => (
                <div key={a.year} className={`flex items-center gap-8 ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                  <div className={`flex-1 ${i % 2 === 0 ? 'md:text-right' : 'md:text-left'}`}>
                    <div className="bg-background-card border border-border rounded-2xl p-6 inline-block">
                      <p className="text-primary font-bold text-2xl mb-1">{a.year}</p>
                      <h3 className="text-xl font-bold text-foreground mb-2">{a.title}</h3>
                      <p className="text-foreground-secondary">{a.description}</p>
                    </div>
                  </div>
                  <div className="hidden md:flex w-4 h-4 bg-primary rounded-full shrink-0 relative z-10" />
                  <div className="flex-1 hidden md:block" />
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* Iconic Cars Gallery */}
      <section className="py-20 lg:py-28 bg-background-soft">
        <Container>
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full mb-4">
              <Trophy className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Acervo Histórico</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Carros Icônicos que Passaram pela Attra
            </h2>
            <p className="text-foreground-secondary text-lg max-w-3xl mx-auto">
              Um registro permanente dos veículos mais notáveis que já fizeram parte do nosso acervo.
              Cada um deles representa um capítulo da história automotiva que tivemos o privilégio de intermediar.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {ICONIC_CARS.map((car) => (
              <article
                key={car.id}
                className="group bg-background-card border border-border rounded-2xl overflow-hidden hover:border-primary/40 transition-all"
              >
                <div className="relative aspect-[4/3] bg-background">
                  <Image
                    src={car.photo}
                    alt={`${car.brand} ${car.model} ${car.version || ''} ${car.year} — Attra Veículos`}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  <div className="absolute top-3 left-3 flex gap-2">
                    <span className="px-2.5 py-1 bg-primary/90 text-white text-xs font-semibold rounded-full">
                      {getCategoryLabel(car.category)}
                    </span>
                    <span className="px-2.5 py-1 bg-black/70 text-white text-xs font-medium rounded-full">
                      {car.year}
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-primary text-xs font-semibold uppercase tracking-wider">{car.brand}</p>
                    <span className="text-xs text-foreground-secondary whitespace-nowrap">{car.mileage}</span>
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-1">
                    {car.model} {car.version && <span className="text-foreground-secondary font-normal">{car.version}</span>}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-foreground-secondary mb-3">
                    <Car className="w-3.5 h-3.5" />
                    <span>{car.engine} • {car.power}</span>
                  </div>
                  <p className="text-sm text-foreground-secondary leading-relaxed mb-3">
                    {car.editorial}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {car.highlights.map((h) => (
                      <span key={h} className="inline-flex items-center gap-1 px-2 py-1 bg-primary/5 border border-primary/10 rounded text-xs text-foreground-secondary">
                        <Sparkles className="w-3 h-3 text-primary" />
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-foreground-secondary text-sm">
              Mais de <strong className="text-foreground">500 supercarros</strong> já passaram pela Attra desde 2009.
              Acima estão alguns dos destaques mais recentes.
            </p>
          </div>
        </Container>
      </section>

      {/* Testimonials */}
      <section className="py-20 lg:py-24 bg-background-soft">
        <Container>
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Users className="w-6 h-6 text-primary" />
              <span className="text-primary font-medium uppercase tracking-wider text-sm">Aficionados Attra</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground">Histórias de quem já viveu a jornada</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-background-card border border-border rounded-2xl p-8">
                <div className="flex gap-1 mb-4">{[1,2,3,4,5].map(s => <Star key={s} className="w-4 h-4 text-primary fill-primary" />)}</div>
                <p className="text-foreground text-lg mb-6 italic leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                <div>
                  <p className="font-semibold text-foreground">{t.author}</p>
                  <p className="text-sm text-foreground-secondary">{t.location}</p>
                  <p className="text-sm text-primary font-medium mt-1">{t.vehicle}</p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* CTA */}
      <section className="py-20 lg:py-24 bg-gradient-to-r from-primary to-primary/90">
        <Container>
          <div className="max-w-3xl mx-auto text-center">
            <Award className="w-12 h-12 text-white/80 mx-auto mb-6" />
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">Pronto para sua jornada?</h2>
            <p className="text-lg text-white/80 max-w-2xl mx-auto mb-8 leading-relaxed">
              Agende uma visita ao showroom em Uberlândia ou comece sua curadoria à distância agora mesmo.
              Atendemos clientes de todo o Brasil com a mesma excelência.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90 text-lg px-8 py-6">
                <Link href={getWhatsAppUrl('Olá! Gostaria de agendar uma visita VIP ao showroom.')} target="_blank">
                  <MessageCircle className="w-5 h-5 mr-2" />Agendar Visita VIP
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-white/30 text-white hover:bg-white/10 text-lg px-8 py-6">
                <Link href={getWhatsAppUrl('Olá! Gostaria de iniciar uma curadoria à distância.')} target="_blank">
                  <Phone className="w-5 h-5 mr-2" />Curadoria à Distância
                </Link>
              </Button>
            </div>
          </div>
        </Container>
      </section>
    </>
  )
}

