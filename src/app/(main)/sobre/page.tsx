import { Metadata } from 'next'
import Link from 'next/link'
import { Award, MapPin, Users, Shield, Building2, Globe, Car, ArrowRight, Star, CheckCircle, Handshake, Target, Heart, MessageCircle, Camera } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { getWhatsAppUrl } from '@/lib/constants'
import { HistoryGallery, type HistoryEra } from '@/components/about/history-gallery'

export const metadata: Metadata = {
  title: 'Sobre a Attra Veículos | Loja de Veículos Premium em Uberlândia',
  description: 'Conheça a Attra Veículos. Curadoria e comercialização de veículos nacionais, importados, esportivos e supercarros, com operação em Uberlândia e atendimento em todo o Brasil.',
  keywords: ['Attra Veículos Uberlândia', 'loja de veículos premium', 'supercarros Minas Gerais', 'loja de carros de luxo', 'referência em veículos premium'],
}

// Schema markup para SEO
function SobreSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'AutoDealer',
    name: 'Attra Veículos',
    description: 'Loja de veículos premium em Uberlândia, referência em supercarros, importados e seminovos de alto padrão com atendimento nacional.',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Av. Rondon Pacheco',
      addressLocality: 'Uberlândia',
      addressRegion: 'MG',
      postalCode: '38408-343',
      addressCountry: 'BR',
    },
    telephone: '+55-34-3014-3232',
    url: 'https://attraveiculos.com.br',
    foundingDate: '2008',
    areaServed: { '@type': 'Country', name: 'Brasil' },
    priceRange: '$$$$$',
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
}

const timeline = [
  {
    year: 2008,
    title: 'Fundação em Uberlândia',
    description: 'A Attra Veículos nasce em Uberlândia com a missão de oferecer veículos premium com atendimento diferenciado. Desde o início, o foco foi a curadoria rigorosa e o relacionamento duradouro com cada cliente.',
  },
  {
    year: 2015,
    title: 'Primeiro Ferrari Comercializado',
    description: 'Marco histórico com a venda do primeiro superesportivo italiano. Este momento consolidou a Attra como referência para colecionadores de supercarros no Brasil.',
  },
  {
    year: 2018,
    title: 'Inauguração do Showroom de 5.000m²',
    description: 'Expansão significativa com a inauguração do novo showroom climatizado. Estrutura projetada para exibir cada veículo como uma obra de arte, com iluminação profissional e ambiente exclusivo.',
  },
  {
    year: 2023,
    title: 'Marco de 500+ Supercarros Vendidos',
    description: 'Celebração de mais de 500 supercarros comercializados para colecionadores de todo o Brasil. Reconhecimento da confiança depositada por clientes de todos os estados.',
  },
  {
    year: 2024,
    title: 'Maior Dealer do Triângulo Mineiro',
    description: 'Consolidação como o maior dealer de veículos premium do Triângulo Mineiro, com atendimento nacional e presença digital fortalecida para atender colecionadores de qualquer cidade do Brasil.',
  },
]

const commitments = [
  {
    icon: Shield,
    title: 'Transparência como processo',
    description: 'Histórico completo, documentação verificada e laudo técnico detalhado. Cada informação é compartilhada antes da decisão — sem surpresas.',
  },
  {
    icon: Target,
    title: 'Curadoria com critério',
    description: 'Apenas veículos que atendem aos padrões da Attra entram no showroom. Inspeção rigorosa, verificação de procedência e análise de histórico.',
  },
  {
    icon: Shield,
    title: 'Segurança em cada etapa',
    description: 'Transações seguras, documentação organizada e logística com seguro premium. Cada etapa é conduzida com responsabilidade.',
  },
  {
    icon: Handshake,
    title: 'Relacionamento contínuo',
    description: 'A relação com o cliente não termina na entrega. Muitos retornam para novas aquisições e nos indicam — o que reforça a confiança construída.',
  },
]

const differentials = [
  { icon: Award, title: 'Referência em MG', description: 'Maior dealer de veículos premium do Triângulo Mineiro, com atendimento que alcança os 27 estados do Brasil.' },
  { icon: Globe, title: 'Atendimento Nacional', description: 'Logística especializada com seguro premium e rastreamento em tempo real para qualquer cidade do Brasil.' },
  { icon: Shield, title: 'Procedência Verificada', description: 'Cada veículo passa por inspeção rigorosa e verificação completa de histórico antes de entrar no showroom.' },
  { icon: Users, title: 'Equipe Especializada', description: 'Consultores com experiência em cada marca, oferecendo atendimento consultivo e personalizado.' },
  { icon: Car, title: '+500 Veículos/Ano', description: 'Mais de 500 veículos comercializados anualmente — resultado de confiança construída ao longo de 18+ anos.' },
  { icon: Building2, title: '5.000m² de Estrutura', description: 'Showroom climatizado com iluminação profissional projetado para exibir cada veículo como patrimônio.' },
]

const historyEras: HistoryEra[] = [
  {
    label: 'Attra Veículos — Hoje',
    description: 'Referência nacional em veículos premium',
    slides: [
      { image: '/about/attra-fachada-showroom-atual.jpg', year: '2026', caption: 'Showroom renovado com presença digital consolidada', alt: 'Attra Veículos showroom moderno em 2026' },
      { image: '/about/attra-acervo-veiculos-premium.jpg', year: '2022', caption: 'Attra digital — nova marca mesmos valores', alt: 'Attra Veículos mudança de branding' },
      { image: '/about/attra-curadoria-veiculos.jpg', year: '2025', caption: 'Fachada atual do showroom de 5.000m² em Uberlândia', alt: 'Fachada do showroom Attra Veículos Uberlândia' },
      { image: '/about/attra-colecao-supercarros-showroom.jpg', year: '2025', caption: 'Coleção de supercarros no showroom climatizado', alt: 'Coleção de supercarros Attra Veículos' },
      { image: '/about/attra-porsche-exposicao.jpg', year: '2025', caption: 'Lamborghini em destaque — curadoria de cada detalhe', alt: 'Lamborghini em exposição no showroom Attra' },
      { image: '/about/attra-ferrari-destaque-showroom.jpg', year: '2024', caption: 'Importação como peça central do cliente', alt: 'Importação em destaque no showroom Attra Veículos' },
      { image: '/about/attra-entrega-veiculo-premium.jpg', year: '2024', caption: 'Momento de entrega — cada veículo tratado como patrimônio', alt: 'Entrega de veículo premium Attra Veículos' },
      { image: '/about/attra-showroom-iluminacao-noturna.jpg', year: '2024', caption: 'Iluminação profissional — cada carro como obra de arte', alt: 'Showroom Attra Veículos com iluminação noturna' },
      { image: '/about/attra-operacao-nacional-logistica.jpg', year: '2023', caption: 'Operação nacional com logística especializada', alt: 'Logística e operação nacional Attra Veículos' },
      { image: '/about/attra-estrutura-5000m-uberlandia.jpg', year: '2023', caption: 'Estrutura completa de 5.000m² consolidada', alt: 'Estrutura de 5000m² Attra Veículos Uberlândia' },
      { image: '/about/attra-inicio-uberlandia.jpg', year: '2022', caption: 'As primeiras mudanças', alt: 'Início da Attra em Uberlândia 2008' },
    ],
  },
  {
    label: 'Attra Exclusive — Origens',
    description: 'De onde tudo começou',
    slides: [
      { image: '/about/attra-evento-lancamento.jpg', year: 'Attra Exclusive', caption: 'Eventos que marcaram o início da trajetória', alt: 'Evento da época Attra Exclusive' },
      { image: '/about/attra-presenca-digital-2026.png', year: 'Attra Exclusive', caption: 'Primeiros veículos premium do acervo', alt: 'Acervo de veículos Attra Exclusive' },
      { image: '/about/attra-showroom-moderno-2026.png', year: 'Attra Exclusive', caption: 'Curadoria como convicção desde o primeiro dia', alt: 'Curadoria de veículos Attra Exclusive' },
      { image: '/about/attra-expansao-showroom.jpg', year: 'Attra Exclusive', caption: 'A primeira expansão — crescendo com propósito', alt: 'Expansão do showroom Attra Exclusive' },
      { image: '/about/attra-equipe-fundadores.jpg', year: 'Attra Exclusive', caption: 'A equipe que construiu a Attra desde o início', alt: 'Equipe fundadora Attra Exclusive' },
      { image: '/about/attra-primeiro-superesportivo.jpg', year: 'Attra Exclusive', caption: 'O primeiro superesportivo — o marco que mudou tudo', alt: 'Primeiro superesportivo Attra Exclusive' },
      { image: '/about/attra-showroom-primeiros-anos.jpg', year: 'Attra Exclusive', caption: 'Os primeiros anos — estrutura enxuta, visão clara', alt: 'Showroom Attra Exclusive primeiros anos' },
    ],
  },
]

export default function SobrePage() {
  return (
    <>
      <SobreSchema />

      {/* Hero - Sobre a Attra Veículos */}
      <section className="relative pt-28 pb-20 lg:pt-32 lg:pb-28 bg-gradient-to-br from-background via-background-soft to-background overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary rounded-full blur-3xl" />
        </div>
        <Container className="relative z-10 mb-8">
          <Breadcrumb items={[{ label: 'Sobre a Attra', href: '/sobre' }]} afterHero />
        </Container>
        <Container className="relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full mb-6">
              <Star className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Referência em Veículos Premium</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
              Sobre a <span className="text-metallic text-metallic-animate">Attra Veículos</span>
            </h1>
            <p className="text-lg lg:text-xl text-foreground-secondary mb-8 max-w-3xl mx-auto leading-relaxed">
              Uma operação construída para que grandes carros venham acompanhados de grandes experiências.
              Desde 2008, a Attra atua com <strong className="text-foreground">curadoria, transparência e relacionamento</strong> no mercado de veículos premium.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="text-lg px-8 py-6">
                <Link href="/veiculos">
                  <Car className="w-5 h-5 mr-2" />Conhecer Nossos Veículos
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6">
                <Link href={getWhatsAppUrl('Olá! Gostaria de falar com um especialista da Attra.')} target="_blank">
                  <MessageCircle className="w-5 h-5 mr-2" />Falar com Especialista
                </Link>
              </Button>
            </div>
          </div>
        </Container>
      </section>

      {/* Stats */}
      <section className="py-12 bg-primary">
        <Container>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
            <div>
              <p className="text-4xl lg:text-5xl font-bold">16+</p>
              <p className="text-white/80">Anos de Mercado</p>
            </div>
            <div>
              <p className="text-4xl lg:text-5xl font-bold">500+</p>
              <p className="text-white/80">Veículos/Ano</p>
            </div>
            <div>
              <p className="text-4xl lg:text-5xl font-bold">5.000m²</p>
              <p className="text-white/80">de Showroom</p>
            </div>
            <div>
              <p className="text-4xl lg:text-5xl font-bold">27</p>
              <p className="text-white/80">Estados Atendidos</p>
            </div>
          </div>
        </Container>
      </section>

      {/* Quem Somos */}
      <section className="py-16 lg:py-24 bg-background">
        <Container>
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full mb-4">
                <Building2 className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">Quem Somos</span>
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
                Quem é a Attra Veículos
              </h2>
              <div className="space-y-4 text-lg text-foreground-secondary leading-relaxed">
                <p>
                  A <strong className="text-foreground">Attra Veículos</strong> nasceu em 2008 da percepção de que o mercado
                  de veículos de alto padrão oferecia grandes carros, mas raramente a mesma qualidade em curadoria,
                  transparência e relacionamento. A empresa foi fundada como um negócio familiar em Uberlândia,
                  com a convicção de que era possível fazer diferente.
                </p>
                <p>
                  Com foco em <strong className="text-foreground">atendimento consultivo</strong>, a Attra trata cada veículo
                  como patrimônio e cada cliente com o nível de atenção que esse tipo de decisão exige — seja um
                  Porsche para uso diário ou um Ferrari para coleção.
                </p>
                <p>
                  O <strong className="text-foreground">atendimento nacional</strong> permite que clientes de qualquer
                  cidade do Brasil tenham acesso aos melhores veículos premium, com toda a segurança
                  da logística especializada e a confiança construída em 18+ anos de operação.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Veículos Nacionais', icon: Car },
                { label: 'Importados', icon: Globe },
                { label: 'Seminovos Premium', icon: Award },
                { label: 'Supercarros', icon: Star },
              ].map((item) => (
                <div key={item.label} className="bg-background-card border border-border rounded-xl p-6 text-center hover:border-primary/50 transition-all">
                  <item.icon className="w-10 h-10 text-primary mx-auto mb-3" />
                  <p className="font-semibold text-foreground">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* Nossa Trajetória */}
      <section className="py-16 lg:py-24 bg-background-soft">
        <Container>
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full mb-4">
              <Award className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">História</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">Nossa Trajetória</h2>
            <p className="text-foreground-secondary max-w-2xl mx-auto">
              Uma história de crescimento, excelência e compromisso com colecionadores de todo o Brasil.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border md:left-1/2 md:-translate-x-1/2" />
              {timeline.map((item, index) => (
                <div key={item.year} className={`relative flex items-start gap-4 mb-10 ${index % 2 === 0 ? 'md:flex-row-reverse md:text-right' : ''}`}>
                  <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm flex-shrink-0 z-10 md:absolute md:left-1/2 md:-translate-x-1/2">
                    {item.year.toString().slice(-2)}
                  </div>
                  <div className={`flex-1 bg-background border border-border rounded-xl p-6 ml-4 md:ml-0 ${index % 2 === 0 ? 'md:mr-16' : 'md:ml-16'}`}>
                    <span className="text-primary font-bold text-lg">{item.year}</span>
                    <h3 className="text-xl font-semibold text-foreground mb-2">{item.title}</h3>
                    <p className="text-foreground-secondary leading-relaxed">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* Nossa Estrutura */}
      <section className="py-16 lg:py-24 bg-background">
        <Container>
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <div className="bg-background-card border border-border rounded-2xl p-8">
                <h3 className="text-xl font-semibold text-foreground mb-6">Destaques da Estrutura</h3>
                <ul className="space-y-4">
                  {[
                    'Showroom climatizado de 5.000m² em Uberlândia',
                    'Iluminação profissional para apreciação de cada detalhe',
                    'Ambiente exclusivo para negociação com privacidade',
                    'Localização estratégica com fácil acesso',
                    'Estacionamento privativo para clientes',
                    'Equipe especializada em cada marca premium',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-foreground-secondary">
                      <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full mb-4">
                <Building2 className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">Infraestrutura</span>
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
                Nossa Estrutura
              </h2>
              <div className="space-y-4 text-lg text-foreground-secondary leading-relaxed">
                <p>
                  A Attra conta com um <strong className="text-foreground">showroom de 5.000m² em Uberlândia</strong>,
                  projetado para exibir cada veículo com o destaque que ele merece. A estrutura foi pensada para
                  proporcionar clareza, conforto e confiança em cada etapa da negociação.
                </p>
                <p>
                  Localizada em posição estratégica em Minas Gerais, a Attra oferece <strong className="text-foreground">atendimento nacional</strong> com
                  logística especializada para entrega em qualquer cidade do Brasil. Clientes de São Paulo, Rio de Janeiro,
                  Brasília e todas as capitais confiam na Attra para suas aquisições.
                </p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Galeria Histórica */}
      <section className="py-16 lg:py-24 bg-background-soft overflow-hidden">
        <Container>
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full mb-4">
              <Camera className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Documentário Visual</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              De onde viemos. Para onde vamos.
            </h2>
            <p className="text-foreground-secondary max-w-2xl mx-auto text-lg leading-relaxed">
              Percorra nossa evolução em imagens — do presente ao começo de tudo.
              Uma galeria que mostra o que construímos e de onde veio a confiança.
            </p>
          </div>
          <HistoryGallery eras={historyEras} />
        </Container>
      </section>

      {/* Nosso Compromisso */}
      <section className="py-16 lg:py-24 bg-background-soft">
        <Container>
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full mb-4">
              <Heart className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Valores</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">Nosso Compromisso</h2>
            <p className="text-foreground-secondary max-w-2xl mx-auto">
              Os princípios que sustentam cada negociação e cada relacionamento na Attra.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {commitments.map((item) => (
              <div key={item.title} className="bg-background border border-border rounded-xl p-6 hover:border-primary/50 transition-all">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                    <item.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                    <p className="text-foreground-secondary leading-relaxed">{item.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Diferenciais */}
      <section className="py-16 lg:py-24 bg-background">
        <Container>
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full mb-4">
              <Award className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Diferenciais</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">Por que Escolher a Attra</h2>
            <p className="text-foreground-secondary max-w-2xl mx-auto">
              O que sustenta a confiança de quem escolhe a Attra para decisões de alto valor.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {differentials.map((item) => (
              <div key={item.title} className="bg-background-card border border-border rounded-xl p-6 text-center hover:border-primary/50 transition-all">
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

      {/* CTA Final */}
      <section className="py-20 bg-gradient-to-r from-primary to-primary/90">
        <Container>
          <div className="max-w-3xl mx-auto text-center">
            <MapPin className="w-12 h-12 text-white/80 mx-auto mb-6" />
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              Visite Nosso Showroom
            </h2>
            <p className="text-lg text-white/80 mb-8 leading-relaxed">
              Conheça de perto nossa estrutura de 5.000m² em Uberlândia.
              Uma operação construída para que cada visita seja tão relevante quanto a decisão que ela representa.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90 text-lg px-8 py-6 font-semibold">
                <Link href={getWhatsAppUrl('Olá! Gostaria de agendar uma visita ao showroom da Attra.')} target="_blank">
                  <MessageCircle className="w-5 h-5 mr-2" />Agendar Visita
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-white/30 text-white hover:bg-white/10 text-lg px-8 py-6">
                <Link href="/veiculos">
                  Ver Todos os Veículos <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </Container>
      </section>
    </>
  )
}

