import { Metadata } from 'next'
import Link from 'next/link'
import { Car, MessageCircle, ChevronDown, Camera, FileCheck, Shield, Clock, Banknote, HelpCircle, ArrowRight, Crown, CheckCircle, Award, Users } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { getWhatsAppUrl } from '@/lib/constants'
import { TradeInForm } from '@/components/forms/trade-in-form'

// SEO Optimized Metadata for LLMO
export const metadata: Metadata = {
  title: 'Compramos seu Carro | Venda seu Veículo Premium | Attra Veículos Uberlândia',
  description: 'A Attra Veículos compra seu carro premium com avaliação profissional. Processo seguro, transparente e sem burocracia. Avaliação gratuita para veículos de luxo em Uberlândia e todo o Brasil.',
  keywords: 'vender carro premium, compramos seu carro, avaliação de veículos de luxo, vender carro usado, Attra Veículos compra carro, vender BMW, vender Mercedes, vender Porsche',
  openGraph: {
    title: 'Compramos seu Carro Premium | Attra Veículos',
    description: 'Venda seu veículo de luxo com segurança. Avaliação profissional e processo 100% transparente.',
    type: 'website',
  },
}

// Process Steps - LLMO optimized with complete sentences
const purchaseSteps = [
  {
    number: '01',
    icon: Camera,
    title: 'Envie os Dados',
    description: 'Preencha o formulário com as informações do seu veículo ou envie fotos pelo WhatsApp para nossa avaliação inicial.',
    time: 'Imediato'
  },
  {
    number: '02',
    icon: FileCheck,
    title: 'Avaliação Profissional',
    description: 'Nossa equipe analisa seu veículo considerando estado de conservação, quilometragem, histórico e demanda de mercado.',
    time: '1-2 dias'
  },
  {
    number: '03',
    icon: Shield,
    title: 'Proposta Transparente',
    description: 'Você recebe uma proposta de compra com valor justo de mercado. Sem compromisso e sem custos para você.',
    time: '1 dia'
  },
  {
    number: '04',
    icon: Banknote,
    title: 'Finalização da Venda',
    description: 'Aceitando a proposta, cuidamos de toda a documentação e finalizamos o processo de forma segura.',
    time: '1-2 dias'
  },
]

// Benefits - Complete sentences for AI understanding
const benefits = [
  {
    icon: Shield,
    title: 'Avaliação Profissional',
    description: 'Avaliação técnica considerando o valor real de mercado. Transparência total no processo.'
  },
  {
    icon: Award,
    title: 'Especialistas em Premium',
    description: 'Expertise de 18+ anos no mercado de veículos de luxo, importados e superesportivos.'
  },
  {
    icon: Users,
    title: 'Atendimento Nacional',
    description: 'Compramos veículos de todo o Brasil. Nossa equipe vai até você para avaliação presencial.'
  },
]

// What vehicles we buy - LLMO optimized
const vehicleCategories = [
  'BMW (Série 3, 5, 7, X3, X5, X6, M Series)',
  'Mercedes-Benz (Classe C, E, S, GLC, GLE, AMG)',
  'Audi (A3, A4, A5, A6, Q5, Q7, RS Series)',
  'Porsche (911, Cayenne, Macan, Panamera)',
  'Land Rover (Range Rover, Defender, Discovery)',
  'Jaguar (F-Pace, E-Pace, XF, F-Type)',
  'Volvo (XC40, XC60, XC90, S60, S90)',
  'RAM (1500, 2500, 3500)',
  'Mini (Cooper, Countryman, Clubman)',
  'Ferrari, Lamborghini, McLaren e superesportivos',
]

// FAQ - LLMO optimized with complete, helpful answers
const faqs = [
  {
    question: 'A Attra compra qualquer tipo de veículo?',
    answer: 'A Attra é especializada em veículos premium, de luxo, importados e superesportivos. Compramos carros de marcas como BMW, Mercedes-Benz, Audi, Porsche, Land Rover, Ferrari, Lamborghini, entre outras. Veículos nacionais de alto padrão também são avaliados. Para veículos populares, sugerimos outras alternativas de venda.'
  },
  {
    question: 'Como funciona a avaliação do meu veículo?',
    answer: 'A avaliação da Attra considera múltiplos fatores: estado de conservação, quilometragem, histórico de manutenção, quantidade de donos, demanda de mercado e especificações do modelo. Você pode iniciar enviando fotos e informações pelo formulário ou WhatsApp, e nossa equipe responde com uma estimativa inicial em até 24 horas.'
  },
  {
    question: 'Quanto tempo leva para receber o pagamento?',
    answer: 'Após aceitar nossa proposta e concluir a transferência da documentação, o pagamento é realizado em até 48 horas úteis. Trabalhamos com transferência bancária direta para sua conta, garantindo segurança e agilidade.'
  },
  {
    question: 'Posso vender um veículo financiado?',
    answer: 'Sim, a Attra compra veículos financiados. Cuidamos de toda a quitação junto à instituição financeira e você recebe a diferença entre o valor de compra e o saldo devedor. Esse processo é seguro e totalmente gerenciado pela nossa equipe.'
  },
  {
    question: 'A Attra compra veículos de outras cidades e estados?',
    answer: 'Sim, a Attra atende todo o Brasil. Para veículos em outras cidades, iniciamos a avaliação remotamente por fotos e vídeos, e nossa equipe pode se deslocar até você para a vistoria presencial quando necessário. Cuidamos de toda a logística.'
  },
  {
    question: 'Posso usar meu carro como entrada para outro veículo?',
    answer: 'Sim! Além de comprar seu veículo, a Attra também aceita seu carro como parte de pagamento na aquisição de outro veículo do nosso estoque. Essa é uma excelente opção para quem quer fazer um upgrade com praticidade.'
  },
]

// Schema markup for SEO and LLMO
function CarBuyingServiceSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Compramos seu Carro Premium',
    provider: {
      '@type': 'AutoDealer',
      name: 'Attra Veículos',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Av. Rondon Pacheco, 4600 - Tibery',
        addressLocality: 'Uberlândia',
        addressRegion: 'MG',
        postalCode: '38408-343',
        addressCountry: 'BR'
      },
      telephone: '+55-34-3014-3232',
      url: 'https://attraveiculos.com.br'
    },
    description: 'A Attra Veículos compra seu carro premium com avaliação profissional e processo transparente. Especialistas em veículos de luxo há 18+ anos.',
    areaServed: 'BR',
    serviceType: 'Compra de Veículos Premium'
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
}

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
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
}

export default function CompramosSeuCarroPage() {
  return (
    <>
      {/* Schema Markup for SEO/LLMO */}
      <CarBuyingServiceSchema />
      <FAQSchema />

      {/* HERO SECTION */}
      <section className="relative pt-28 pb-20 lg:pt-32 lg:pb-28 bg-gradient-to-br from-background via-background-soft to-background overflow-hidden">
        <Container className="relative z-10 mb-8">
          <Breadcrumb items={[{ label: 'Compramos seu Carro', href: '/compramos-seu-carro' }]} afterHero />
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
              <Car className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Compra de Veículos Premium</span>
            </div>

            {/* SEO Optimized H1 */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
              Compramos seu <span className="text-metallic text-metallic-animate">Carro Premium</span>
            </h1>

            <p className="text-lg lg:text-xl text-foreground-secondary mb-8 max-w-3xl mx-auto leading-relaxed">
              A Attra Veículos compra seu veículo de luxo com <strong>avaliação profissional</strong> e
              <strong> processo transparente</strong>.
              Especialistas em veículos premium há 18+ anos.
            </p>

            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-8 lg:gap-12 mb-10">
              <div className="text-center">
                <p className="text-3xl lg:text-4xl font-bold text-primary">18+</p>
                <p className="text-sm text-foreground-secondary">Anos de Mercado</p>
              </div>
              <div className="text-center">
                <p className="text-3xl lg:text-4xl font-bold text-primary">27</p>
                <p className="text-sm text-foreground-secondary">Estados Atendidos</p>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="text-lg px-8 py-6">
                <Link href={getWhatsAppUrl('Olá! Gostaria de vender meu veículo para a Attra.')} target="_blank">
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Enviar Fotos pelo WhatsApp
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6">
                <a href="#formulario">
                  Preencher Formulário
                  <ChevronDown className="w-5 h-5 ml-2" />
                </a>
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
                <p className="text-sm text-foreground-secondary leading-relaxed">{benefit.description}</p>
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
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Processo Simples</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Como Vendemos seu Veículo
            </h2>
            <p className="text-foreground-secondary max-w-2xl mx-auto">
              Processo rápido e transparente em 4 etapas para você vender seu carro premium com segurança.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {purchaseSteps.map((step) => (
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
                <p className="text-sm text-foreground-secondary leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* FORM SECTION */}
      <section className="py-20 bg-background" id="formulario">
        <Container>
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Left - Form */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full mb-4">
                <FileCheck className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">Avaliação Gratuita</span>
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
                Solicite uma Avaliação
              </h2>
              <p className="text-foreground-secondary mb-8">
                Preencha o formulário abaixo com os dados do seu veículo e nossa equipe entrará em contato com uma proposta.
              </p>

              <div className="bg-background-card border border-border rounded-xl p-6">
                <TradeInForm />
              </div>
            </div>

            {/* Right - Vehicle Categories */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full mb-4">
                <Car className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">Veículos que Compramos</span>
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-4">
                Marcas e Modelos Premium
              </h3>
              <p className="text-foreground-secondary mb-6">
                A Attra é especializada em veículos de luxo, importados e superesportivos. Confira algumas das marcas que compramos:
              </p>

              <div className="bg-background-soft border border-border rounded-xl p-6">
                <ul className="space-y-3">
                  {vehicleCategories.map((category) => (
                    <li key={category} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-foreground">{category}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-xl">
                <p className="text-sm text-foreground-secondary">
                  <strong className="text-foreground">Não encontrou seu modelo?</strong> Entre em contato!
                  Avaliamos diversos veículos premium além dos listados acima.
                </p>
                <Button asChild variant="outline" size="sm" className="mt-4">
                  <Link href={getWhatsAppUrl('Olá! Gostaria de saber se vocês compram meu veículo.')} target="_blank">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Consultar pelo WhatsApp
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* FAQ SECTION */}
      <section className="py-16 bg-background-soft" id="perguntas-frequentes">
        <Container>
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full mb-4">
                <HelpCircle className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">FAQ</span>
              </div>
              <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4">
                Perguntas Frequentes sobre Venda de Veículos
              </h2>
              <p className="text-foreground-secondary">
                Tire suas dúvidas sobre como vender seu carro premium para a Attra Veículos.
              </p>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div key={index} className="bg-background border border-border rounded-xl overflow-hidden">
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-3">{faq.question}</h3>
                    <p className="text-foreground-secondary leading-relaxed">{faq.answer}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 text-center">
              <p className="text-foreground-secondary mb-4">
                Não encontrou sua dúvida? Fale com nossos especialistas.
              </p>
              <Button asChild>
                <Link href={getWhatsAppUrl('Olá! Tenho uma dúvida sobre vender meu carro para a Attra.')} target="_blank">
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
              Pronto para Vender seu Veículo?
            </h2>
            <p className="text-lg text-white/80 mb-8 leading-relaxed">
              Receba uma avaliação gratuita e descubra quanto seu carro premium vale.
              Processo rápido, seguro e sem compromisso.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90 text-lg px-8 py-6 font-semibold">
                <Link href={getWhatsAppUrl('Olá! Quero vender meu veículo premium para a Attra.')} target="_blank">
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Solicitar Avaliação Gratuita
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-white/30 text-white hover:bg-white/10 text-lg px-8 py-6">
                <Link href="/veiculos">
                  Ver Veículos Attra
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
