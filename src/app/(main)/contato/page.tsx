import { Metadata } from 'next'
import Link from 'next/link'
import { MapPin, Phone, Mail, Clock, MessageCircle, Globe, CheckCircle, Star, Building2 } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { ContactForm } from '@/components/forms/contact-form'
import { WHATSAPP_NUMBER, getWhatsAppUrl, PHONE_NUMBER, PHONE_DISPLAY, PHONE_NUMBER_2, PHONE_DISPLAY_2, CELLPHONE_NUMBER, CELLPHONE_DISPLAY, HORARIO_UMA_LINHA, HORARIO_SEMANA, HORARIO_SABADO } from '@/lib/constants'
import { canonicalUrl } from '@/lib/seo/page-metadata'

export const metadata: Metadata = {
  title: 'Contato | Showroom em Uberlândia e Atendimento Nacional',
  description: 'Entre em contato com a Attra Veículos. Showroom de 5.000m² em Uberlândia com atendimento nacional para colecionadores de todo o Brasil. WhatsApp, telefone e visita agendada.',
  keywords: ['contato Attra Veículos', 'showroom Uberlândia', 'loja de carros premium', 'atendimento nacional veículos'],
  alternates: { canonical: canonicalUrl('/contato') },
}

// A entidade AutoDealer não é redeclarada aqui: o layout raiz já emite o nó
// canônico com @id em todo documento. Este bloco declarava um segundo
// AutoDealer, com endereço e horário divergentes do nó canônico.

const locations = [
  {
    name: 'Showroom Principal',
    subtitle: '5.000m² de estrutura premium',
    address: 'Av. Rondon Pacheco',
    city: 'Uberlândia - MG',
    phone: PHONE_DISPLAY,
    cellphone: CELLPHONE_DISPLAY,
    whatsapp: WHATSAPP_NUMBER,
    hours: HORARIO_UMA_LINHA,
    mapUrl: 'https://maps.app.goo.gl/wBpftykDQRQJmB1z8',
    features: ['Showroom climatizado', 'Estacionamento privativo', 'Ambiente exclusivo para negociação'],
  },
]

const contactChannels = [
  {
    icon: MessageCircle,
    label: 'WhatsApp',
    value: '(34) 99944-4747',
    href: getWhatsAppUrl('Olá! Gostaria de mais informações sobre veículos.'),
    description: 'Resposta rápida',
    primary: true,
  },
  {
    icon: Phone,
    label: 'Telefone',
    value: PHONE_DISPLAY,
    secondValue: PHONE_DISPLAY_2,
    thirdValue: CELLPHONE_DISPLAY,
    href: `tel:${PHONE_NUMBER}`,
    secondHref: `tel:${PHONE_NUMBER_2}`,
    thirdHref: `tel:${CELLPHONE_NUMBER}`,
    description: 'Atendimento comercial',
    primary: false,
  },
  {
    icon: Mail,
    label: 'E-mail',
    value: 'faleconosco@attraveiculos.com.br',
    href: 'mailto:faleconosco@attraveiculos.com.br',
    description: 'Para propostas e documentos',
    primary: false,
  },
  {
    icon: Clock,
    label: 'Horário',
    value: HORARIO_SEMANA,
    href: null,
    description: HORARIO_SABADO,
    primary: false,
  },
]

const nationalReach = [
  'São Paulo', 'Rio de Janeiro', 'Brasília', 'Belo Horizonte', 'Curitiba', 'Porto Alegre', 'Salvador', 'Recife', 'Fortaleza', 'Goiânia',
]

export default function ContatoPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative pt-28 pb-20 lg:pt-32 lg:pb-28 bg-gradient-to-br from-background via-background-soft to-background overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary rounded-full blur-3xl" />
        </div>
        <Container className="relative z-10 mb-8">
          <Breadcrumb items={[{ label: 'Contato', href: '/contato' }]} afterHero />
        </Container>
        <Container className="relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full mb-6">
              <Globe className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Uberlândia • Atendimento Nacional</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
              Fale com a <span className="text-metallic text-metallic-animate">Attra Veículos</span>
            </h1>
            <p className="text-lg lg:text-xl text-foreground-secondary mb-8 max-w-3xl mx-auto leading-relaxed">
              Atendemos clientes de todo o Brasil cujos  <strong className="text-foreground">padrões de qualidade são inegociáveis.</strong>.
              Agende uma visita ao nosso showroom em Uberlândia ou inicie sua consultoria personalizada de forma remota
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="text-lg px-8 py-6">
                <Link href={getWhatsAppUrl('Olá! Gostaria de falar com um especialista da Attra.')} target="_blank">
                  <MessageCircle className="w-5 h-5 mr-2" />Falar pelo WhatsApp
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6">
                <a href="#showroom">
                  <Building2 className="w-5 h-5 mr-2" />Ver Showroom
                </a>
              </Button>
            </div>
          </div>
        </Container>
      </section>

      {/* Contact Channels */}
      <section className="py-8 bg-primary">
        <Container>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {contactChannels.map((item) => (
              <div key={item.label} className="text-center text-white">
                <item.icon className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm text-white/80">{item.label}</p>
                {item.href ? (
                  <div className="flex flex-col">
                    <a href={item.href} target={item.label === 'WhatsApp' ? '_blank' : undefined} className="font-medium hover:underline">{item.value}</a>
                    {item.secondValue && item.secondHref && (
                      <a href={item.secondHref} className="font-medium hover:underline text-sm mt-0.5">{item.secondValue}</a>
                    )}
                    {item.thirdValue && item.thirdHref && (
                      <a href={item.thirdHref} className="font-medium hover:underline text-sm mt-0.5">{item.thirdValue}</a>
                    )}
                  </div>
                ) : (
                  <p className="font-medium">{item.value}</p>
                )}
                <p className="text-xs text-white/60 mt-1">{item.description}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* National Reach */}
      <section className="py-12 bg-background-soft">
        <Container>
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full mb-4">
              <Globe className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Atendimento Nacional</span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4">
              Atendemos clientes de Todos os Estados do Brasil
            </h2>
            <p className="text-foreground-secondary max-w-2xl mx-auto">
              Com base em Uberlândia, a Attra oferece atendimento nacional com logística especializada para entrega em qualquer cidade.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {nationalReach.map((city) => (
              <span key={city} className="inline-flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-full text-sm">
                <CheckCircle className="w-4 h-4 text-primary" />
                {city}
              </span>
            ))}
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-sm text-primary font-medium">
              + Todas as capitais e cidades
            </span>
          </div>
        </Container>
      </section>

      {/* Form and Showroom */}
      <section className="py-16 lg:py-24 bg-background" id="showroom">
        <Container>
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Form */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full mb-4">
                <Mail className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">Formulário</span>
              </div>
              <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-6">Envie uma Mensagem</h2>
              <p className="text-foreground-secondary mb-6">
                Preencha o formulário abaixo e nossa equipe entrará em contato em até 24 horas úteis.
              </p>
              <ContactForm />
            </div>

            {/* Showroom */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full mb-4">
                <Building2 className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">Showroom</span>
              </div>
              <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-6">Visite Nosso Showroom</h2>
              <div className="space-y-6">
                {locations.map((location) => (
                  <div key={location.name} className="bg-background-card border border-border rounded-2xl p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                        <MapPin className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-foreground">{location.name}</h3>
                        <p className="text-sm text-primary font-medium">{location.subtitle}</p>
                      </div>
                    </div>
                    <div className="space-y-3 text-foreground-secondary mb-6">
                      <p className="flex items-start gap-2">
                        <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <span>{location.address}, {location.city}</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <Phone className="w-5 h-5 text-primary" />
                        <a href={`tel:${location.phone.replace(/\D/g, '')}`} className="hover:text-primary">{location.phone}</a>
                      </p>
                      <p className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-primary" />
                        <span>{location.hours}</span>
                      </p>
                    </div>
                    <div className="mb-6">
                      <p className="text-sm font-medium text-foreground mb-3">Destaques:</p>
                      <ul className="space-y-2">
                        {location.features.map((feature) => (
                          <li key={feature} className="flex items-center gap-2 text-sm text-foreground-secondary">
                            <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button asChild className="flex-1">
                        <Link href={getWhatsAppUrl('Olá! Gostaria de agendar uma visita ao showroom.')} target="_blank">
                          <MessageCircle className="w-4 h-4 mr-2" />Agendar Visita
                        </Link>
                      </Button>
                      <Button asChild variant="outline" className="flex-1">
                        <a href={location.mapUrl} target="_blank" rel="noopener noreferrer">
                          <MapPin className="w-4 h-4 mr-2" />Ver no Mapa
                        </a>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* CTA Final */}
      <section className="py-20 bg-gradient-to-r from-primary to-primary/90">
        <Container>
          <div className="max-w-3xl mx-auto text-center">
            <Star className="w-12 h-12 text-white/80 mx-auto mb-6" />
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              Pronto para Encontrar seu Próximo Veículo?
            </h2>
            <p className="text-lg text-white/80 mb-8 leading-relaxed">
              Fale com nossos especialistas e descubra como a Attra pode ajudá-lo a encontrar o veículo perfeito para sua coleção.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90 text-lg px-8 py-6 font-semibold">
                <Link href={getWhatsAppUrl('Olá! Gostaria de falar com um especialista da Attra.')} target="_blank">
                  <MessageCircle className="w-5 h-5 mr-2" />Falar com Especialista
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-white/30 text-white hover:bg-white/10 text-lg px-8 py-6">
                <Link href="/veiculos">
                  Ver Todos os Veículos
                </Link>
              </Button>
            </div>
          </div>
        </Container>
      </section>
    </>
  )
}

