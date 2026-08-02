import { Metadata } from 'next'
import Link from 'next/link'
import { Handshake, MessageCircle, ChevronDown, Camera, FileCheck, Shield, Clock, Users, Award, HelpCircle, ArrowRight, Crown, Eye, Banknote } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { getWhatsAppUrl } from '@/lib/constants'
import { organizationRef } from '@/lib/schema-entity'
import { canonicalUrl } from '@/lib/seo/page-metadata'

// SEO Optimized Metadata
export const metadata: Metadata = {
  title: 'Consignado Automotivo | Venda seu Veículo Premium com Segurança',
  description: 'Venda seu veículo de luxo em consignação com a Attra. Exposição em showroom premium, avaliação profissional, precificação competitiva e zero burocracia. Atendemos todo o Brasil.',
  keywords: 'consignado automotivo, venda consignada de carros, consignação de veículos de luxo, vender carro premium, consignado Uberlândia',
  openGraph: {
    title: 'Consignado Automotivo | Attra Veículos',
    description: 'Venda seu veículo premium com segurança e praticidade. A Attra cuida de toda a negociação.',
    type: 'website',
  },
  alternates: { canonical: canonicalUrl('/servicos/consignado') },
}

// Process Steps
const consignadoSteps = [
  { number: '01', icon: Camera, title: 'Avaliação Profissional', description: 'Avaliamos seu veículo com critérios técnicos e de mercado para definir o melhor preço.', time: '1-2 dias' },
  { number: '02', icon: FileCheck, title: 'Contrato Transparente', description: 'Assinamos contrato claro com todas as condições, prazos e valores acordados.', time: '1 dia' },
  { number: '03', icon: Eye, title: 'Exposição Premium', description: 'Seu veículo fica exposto em nosso showroom e em todos os nossos canais digitais.', time: 'Contínuo' },
  { number: '04', icon: Users, title: 'Negociação Especializada', description: 'Nossa equipe cuida de todas as negociações com potenciais compradores.', time: 'Contínuo' },
  { number: '05', icon: Shield, title: 'Venda Segura', description: 'Cuidamos de toda a documentação e transferência com segurança jurídica.', time: '1-3 dias' },
  { number: '06', icon: Banknote, title: 'Pagamento Rápido', description: 'Você recebe o valor acordado em até 48h após a conclusão da venda.', time: '1-2 dias' },
]

// Benefits
const benefits = [
  { icon: Eye, title: 'Exposição Máxima', description: 'Showroom premium + site + redes sociais + portais automotivos.' },
  { icon: Shield, title: 'Segurança Total', description: 'Contrato transparente e processo jurídico completo.' },
  { icon: Clock, title: 'Sem Burocracia', description: 'A Attra cuida de toda a documentação e transferência.' },
  { icon: Award, title: 'Melhor Preço', description: 'Avaliação profissional e precificação competitiva de mercado.' },
]

// FAQ
const faqs = [
  { question: 'Como funciona o consignado automotivo?', answer: 'No consignado, você deixa seu veículo conosco para venda. A Attra cuida de toda a exposição, negociação e documentação. Você só paga uma comissão após a venda ser concluída.' },
  { question: 'Qual é a comissão cobrada pela Attra?', answer: 'A comissão varia de acordo com o valor e características do veículo. Definimos o percentual no momento da avaliação, antes de assinar o contrato. Não há custos antecipados.' },
  { question: 'Quanto tempo meu veículo fica em consignação?', answer: 'O prazo padrão é de 60 dias, renovável por acordo mútuo. Veículos bem precificados costumam ser vendidos em 30 a 45 dias.' },
  { question: 'Posso continuar usando o veículo durante a consignação?', answer: 'Não, para garantir a melhor apresentação e disponibilidade para test-drives, o veículo fica em nosso showroom durante todo o período de consignação.' },
  { question: 'Quais veículos a Attra aceita em consignação?', answer: 'Aceitamos veículos premium, de luxo e superesportivos em bom estado de conservação. Fazemos uma avaliação prévia para verificar se o veículo se enquadra em nosso perfil de estoque.' },
]

// Schema markup
function ConsignadoServiceSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Consignado Automotivo',
    // Referencia a entidade canônica do layout raiz em vez de redeclará-la.
    provider: organizationRef(),
    description: 'Venda seu veículo premium em consignação com exposição em showroom, avaliação profissional e zero burocracia.',
    areaServed: 'BR',
    serviceType: 'Consignado Automotivo'
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

export default function ConsignadoPage() {
  return (
    <>
      <ConsignadoServiceSchema />
      <FAQSchema />

      {/* HERO SECTION */}
      <section className="relative pt-28 pb-20 lg:pt-32 lg:pb-28 bg-gradient-to-br from-background via-background-soft to-background overflow-hidden">
        <Container className="relative z-10 mb-8">
          <Breadcrumb items={[{ label: 'Serviços', href: '/servicos' }, { label: 'Consignado', href: '/servicos/consignado' }]} afterHero />
        </Container>
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary rounded-full blur-3xl" />
        </div>
        <Container className="relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full mb-6">
              <Handshake className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Consignado Premium</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
              Consignado <span className="text-metallic text-metallic-animate">Automotivo</span>
            </h1>
            <p className="text-lg lg:text-xl text-foreground-secondary mb-8 max-w-3xl mx-auto leading-relaxed">
              Venda seu veículo premium com <strong>segurança</strong> e <strong>praticidade</strong>.
              A Attra cuida de toda a negociação enquanto você recebe o melhor valor de mercado.
            </p>
            <div className="flex flex-wrap justify-center gap-8 lg:gap-12 mb-10">
              <div className="text-center"><p className="text-3xl lg:text-4xl font-bold text-primary">500+</p><p className="text-sm text-foreground-secondary">Veículos Vendidos</p></div>
              <div className="text-center"><p className="text-3xl lg:text-4xl font-bold text-primary">30-45</p><p className="text-sm text-foreground-secondary">Dias Média de Venda</p></div>
              <div className="text-center"><p className="text-3xl lg:text-4xl font-bold text-primary">0%</p><p className="text-sm text-foreground-secondary">Custo Antecipado</p></div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="text-lg px-8 py-6">
                <Link href={getWhatsAppUrl('Olá! Gostaria de saber mais sobre consignado automotivo.')} target="_blank">
                  <MessageCircle className="w-5 h-5 mr-2" />Avaliar Meu Veículo
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
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">Como Funciona o Consignado</h2>
            <p className="text-foreground-secondary max-w-2xl mx-auto">Processo simples e transparente em 6 etapas para vender seu veículo com segurança.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {consignadoSteps.map((step) => (
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

      {/* VIDEO SECTION */}
      <section className="py-16 bg-background-soft">
        <Container>
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4">Conheça Nosso Consignado</h2>
              <p className="text-foreground-secondary">Assista ao vídeo e entenda como funciona o processo de consignação na Attra.</p>
            </div>
            <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl">
              <iframe
                className="absolute inset-0 w-full h-full"
                src="https://www.youtube.com/embed/0Q0nJUjrp1A"
                title="Consignado Automotivo - Attra Veículos"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
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
              <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4">Perguntas Frequentes sobre Consignado</h2>
              <p className="text-foreground-secondary">Tire suas dúvidas sobre o processo de consignação de veículos.</p>
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
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">Pronto para Vender seu Veículo?</h2>
            <p className="text-lg text-white/80 mb-8 leading-relaxed">
              Agende uma avaliação gratuita e descubra quanto seu veículo vale. Sem compromisso e sem custos antecipados.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90 text-lg px-8 py-6 font-semibold">
                <Link href={getWhatsAppUrl('Olá! Gostaria de agendar uma avaliação do meu veículo para consignado.')} target="_blank">
                  <MessageCircle className="w-5 h-5 mr-2" />Agendar Avaliação Gratuita
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

