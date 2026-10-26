import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Container } from '@/components/ui/container'
import { Button } from '@/components/ui/button'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Truck, CheckCircle, MessageCircle, ArrowRight, Eye, FileText, CreditCard, HeadphonesIcon, Youtube } from 'lucide-react'
import { NumeroQueSobe } from '@/components/ui/numero-que-sobe'
import { VideoConheca } from '@/components/jornada/video-conheca'
import { VideoEmPe } from '@/components/ui/video-em-pe'
import { CabecalhoSecao as Cabecalho, MONTSERRAT } from '@/components/ui/cabecalho-secao'
import { LinhaDoTempo } from '@/components/attra/linha-do-tempo'
import { EquipeAttra } from '@/components/attra/equipe-attra'
import { getWhatsAppUrl } from '@/lib/constants'
import { organizationRef } from '@/lib/schema-entity'
import { ICONIC_CARS, getCategoryLabel } from '@/lib/iconic-cars'
import { canonicalUrl } from '@/lib/seo/page-metadata'
import { anosDeMercado } from '@/lib/constants'

// Página estática que exibe os anos de mercado (calculados a partir do ano
// corrente). Sem revalidação ela ficaria com o número do último build — e o
// número mudaria só no próximo deploy, não na virada do ano.
export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Jornada Attra | Curadoria de Supercarros, Acervo Icônico e Entrega Nacional',
  description: 'Jornada de compra de veículos premium com curadoria completa de supercarros. Conheça os carros icônicos que já passaram pela Attra: Ferrari, Lamborghini, Porsche, McLaren e mais. Da seleção à entrega nacional.',
  keywords: ['jornada de compra de veículos premium', 'curadoria completa de supercarros', 'atendimento nacional para colecionadores', 'entrega de veículos premium', 'compra de supercarros Brasil', 'carros icônicos Attra', 'histórico supercarros'],
  alternates: { canonical: canonicalUrl('/jornada') },
}

// Schema markup para SEO
function JornadaSchema() {
  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Jornada Attra - Curadoria Premium de Veículos',
    // Referencia a entidade canônica do layout raiz em vez de redeclará-la.
    provider: organizationRef(),
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
    // `Thing`, não `Vehicle`: são carros já vendidos, sem oferta, e o Google lê
    // Vehicle como produto e exige offers/review/aggregateRating — eram 8 dos
    // 32 erros críticos de Snippets do produto (out/2026).
    itemListElement: ICONIC_CARS.map((car, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Thing',
        name: `${car.brand} ${car.model} ${car.year}`,
        description: car.editorial,
        image: car.photo,
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
    step: '01',
    title: 'Curadoria personalizada',
    subtitle: 'Seleção',
    description: 'Nossa jornada começa com um briefing detalhado sobre suas preferências. Realizamos busca ativa no mercado nacional e internacional, com consultoria especializada para encontrar exatamente o supercarro que você procura.',
    benefits: ['Briefing personalizado', 'Busca nacional e internacional', 'Consultoria especializada'],
  },
  {
    step: '02',
    title: 'Vistoria e verificação',
    subtitle: 'Análise',
    description: 'Cada veículo passa por inspeção técnica de 200 itens, verificação completa de documentação, histórico e procedência. Transparência total antes da sua decisão de compra.',
    benefits: ['200 itens de inspeção', 'Verificação de procedência', 'Histórico completo'],
  },
  {
    step: '03',
    title: 'Negociação e documentação',
    subtitle: 'Conclusão',
    description: 'Conduzimos toda a negociação com segurança e transparência. Cuidamos de toda a documentação, transferência e regularização do veículo para você.',
    benefits: ['Negociação segura', 'Documentação completa', 'Transferência facilitada'],
  },
  {
    step: '04',
    title: 'Logística nacional',
    subtitle: 'Entrega',
    description: 'Transporte em caminhão fechado, seguro premium específico para supercarros e rastreamento em tempo real. Entrega na porta da sua casa, em qualquer cidade do Brasil.',
    benefits: ['Caminhão fechado', 'Seguro premium', 'Rastreamento em tempo real'],
  },
]

// Depoimentos: a Attra ainda vai confirmar que são de clientes reais
// (23/10/2026). Se não forem, saem antes de ir ao ar.
const testimonials = [
  {
    quote: 'Era minha primeira Ferrari e eu tinha muita dúvida. Explicaram tudo com calma, da documentação ao transporte, e o carro chegou em São Paulo do jeito que tinham me mostrado.',
    author: 'Roberto M.',
    location: 'São Paulo, SP',
    vehicle: 'Ferrari 488 Pista',
  },
  {
    quote: 'Comprei o GT3 RS daqui do Rio, sem ir a Uberlândia. Resolvemos tudo pelo WhatsApp, e o carro chegou de caminhão fechado, no dia combinado.',
    author: 'Carlos A.',
    location: 'Rio de Janeiro, RJ',
    vehicle: 'Porsche 911 GT3 RS',
  },
  {
    quote: 'Dá para ver que a equipe entende de carro. Tiraram minhas dúvidas sobre o Huracán sem pressa e sem forçar a venda.',
    author: 'Marcos P.',
    location: 'Belo Horizonte, MG',
    vehicle: 'Lamborghini Huracán',
  },
]

const diferenciais = [
  {
    icon: Eye,
    title: 'Curadoria rigorosa',
    description: 'Selecionamos apenas veículos premium e supercarros que atendem aos mais altos padrões de qualidade, procedência e estado de conservação.',
  },
  {
    icon: CheckCircle,
    title: 'Inspeção técnica e documental',
    description: 'A documentação vem primeiro: carro com pendência não chega a ser avaliado. Depois, mecânica, funilaria e originalidade: veículo de leilão, com histórico suspeito, remap ou repintura total não entra no acervo.',
  },
  {
    icon: FileText,
    title: 'Documentação 100% verificada',
    description: 'Verificamos histórico completo, procedência, regularidade fiscal e documental de cada veículo de alto valor, garantindo total segurança jurídica.',
  },
  {
    icon: Truck,
    title: 'Entrega nacional com seguro',
    description: 'Logística especializada com caminhão fechado, seguro premium e rastreamento em tempo real. Entregamos supercarros em qualquer cidade do Brasil.',
  },
  {
    icon: CreditCard,
    title: 'Financiamento diferenciado',
    description: 'Condições especiais para veículos premium: taxas diferenciadas, financiamento de até 80% do valor e análise de crédito personalizada.',
  },
  {
    icon: HeadphonesIcon,
    title: 'Atendimento concierge',
    description: 'Consultoria personalizada do primeiro contato à entrega das chaves. Atendimento exclusivo, discreto e dedicado a cada cliente.',
  },
]

export default function JornadaPage() {
  const breadcrumbItems = [{ label: 'Jornada Attra', href: '/jornada' }]

  return (
    <>
      <JornadaSchema />

      {/* Topo. Até 26/10/2026 tinha a fachada à noite de fundo e ficava escuro
          nos dois temas; a dona achou a foto ruim mesmo tratada, e o lugar dela
          ficou com o vídeo de apresentação da Attra (em pé, com legenda
          gravada). Sem a foto, o topo segue o tema, como o do /sobre. No
          computador: texto à esquerda, o vídeo e, na ponta direita, os números
          empilhados. As entradas e o movimento ao rolar são os do topo da home
          (motion.css). */}
      <section className="relative isolate flex min-h-[680px] flex-col overflow-hidden bg-background-soft pt-24 lg:min-h-[min(88svh,1000px)] lg:pt-28">
        <Container className="hero-conteudo hero-conteudo-alto relative flex flex-1 flex-col">
          <Breadcrumb items={breadcrumbItems} afterHero />
          <div className="my-auto grid gap-12 py-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-12 xl:gap-20">
            <div className="max-w-2xl">
              <p className="hero-entra text-[13px] font-semibold uppercase tracking-[0.18em] text-primary">Além do automóvel</p>
              <h1
                className="hero-entra mt-4 text-[40px] font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-[clamp(44px,4.2vw,64px)]"
                style={{ ...MONTSERRAT, ['--d' as string]: '0.08s' }}
              >
                Da seleção ao desembarque <span className="text-foreground/45">na sua garagem</span>
              </h1>
              <p className="hero-entra mt-6 max-w-xl text-lg leading-relaxed text-foreground-secondary" style={{ ['--d' as string]: '0.16s' }}>
                Uma jornada exclusiva de compra de veículos premium, com curadoria completa de supercarros,
                para quem não aceita menos que o extraordinário. <strong className="font-semibold text-foreground">Atendimento nacional</strong> a partir de Uberlândia.
              </p>
              {/* Em 1024 px a coluna do texto não comporta os dois botões lado a
                  lado: o segundo desce inteiro em vez de quebrar o texto. */}
              <div className="hero-entra mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap [&>*]:whitespace-nowrap" style={{ ['--d' as string]: '0.24s' }}>
                <Button asChild size="lg">
                  <Link href={getWhatsAppUrl('Olá! Gostaria de agendar uma visita VIP ao showroom.')} target="_blank">
                    <MessageCircle className="mr-2 h-5 w-5" />Agendar visita VIP
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href={getWhatsAppUrl('Olá! Gostaria de iniciar uma curadoria à distância.')} target="_blank">
                    Curadoria à distância
                  </Link>
                </Button>
              </div>
            </div>

            {/* O vídeo e os números. No celular, um embaixo do outro (números em
                linha); a partir do tablet, os números viram coluna ao lado do
                vídeo, alinhados pela base dele. */}
            <div className="flex flex-col gap-10 sm:flex-row sm:items-end sm:gap-10 xl:gap-14">
              <VideoEmPe
                noTopo
                video="/videos/jornada-apresentacao.mp4"
                quadro="/images/jornada-apresentacao-quadro.jpg"
                alt="Apresentação da Attra Veículos no showroom, em Uberlândia"
                assunto="de apresentação da Attra"
                sizes="(min-width: 1024px) 380px, (min-width: 640px) 300px, 90vw"
                className="hero-entra jornada-hero-video mx-auto w-full max-w-[340px] sm:mx-0 sm:w-[300px] sm:max-w-none"
                style={{ ['--d' as string]: '0.2s' }}
              />

              {/* Números que já estão no site (/servicos e as etapas abaixo), com o
                  contador. Ficam no topo no lugar da seção "Você pode estar em
                  qualquer cidade do Brasil", que repetia /contato. */}
              <dl
                className="hero-entra grid grid-cols-3 gap-4 border-t border-border pt-6 sm:flex sm:flex-col sm:gap-0 sm:border-t-0 sm:pt-0"
                style={{ ['--d' as string]: '0.32s' }}
              >
                {[
                  { valor: anosDeMercado(), rotulo: 'anos de mercado' },
                  { valor: 200, rotulo: 'itens de inspeção' },
                  { valor: 27, rotulo: 'estados atendidos' },
                ].map((n) => (
                  <div key={n.rotulo} className="sm:border-t sm:border-border sm:py-6 sm:last:pb-0">
                    <dt className="sr-only">{n.rotulo}</dt>
                    <dd>
                      <NumeroQueSobe valor={n.valor} className="block text-3xl font-semibold text-foreground sm:text-4xl lg:text-5xl" />
                      <span className="mt-1 block text-[13px] uppercase tracking-[0.12em] text-foreground-secondary">{n.rotulo}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </Container>
      </section>

      {/* A jornada em 4 etapas, logo depois do topo: é o assunto da página.
          A linha entre os números se desenha quando a seção entra na tela. */}
      <section className="py-20 lg:py-28 bg-background" id="processo">
        <Container>
          <Cabecalho
            rotulo="Processo"
            titulo="A jornada completa"
            texto="A Attra cuida de tudo até o veículo estar estacionado na sua garagem. Do primeiro contato à entrega das chaves, cada detalhe é pensado para colecionadores exigentes."
          />
          <div className="relative mt-14 lg:mt-20">
            <div aria-hidden="true" data-revelar="linha" className="absolute left-0 right-0 top-7 hidden h-px bg-primary/40 lg:block" />
            <ol className="relative grid gap-12 md:grid-cols-2 lg:grid-cols-4 lg:gap-10">
              {journeySteps.map((step, i) => (
                <li key={step.step} data-revelar="" style={{ ['--d' as string]: `${0.15 + i * 0.12}s` }}>
                  <span className="inline-flex h-14 items-center bg-background pr-4 text-5xl font-semibold text-primary" style={MONTSERRAT}>
                    {step.step}
                  </span>
                  <p className="mt-6 text-[13px] font-semibold uppercase tracking-[0.16em] text-foreground-secondary">{step.subtitle}</p>
                  <h3 className="mt-2 text-xl font-semibold text-foreground" style={MONTSERRAT}>{step.title}</h3>
                  <p className="mt-3 leading-relaxed text-foreground-secondary">{step.description}</p>
                  <ul className="mt-5 space-y-2.5">
                    {step.benefits.map((benefit) => (
                      <li key={benefit} className="flex items-center gap-2.5 text-[15px] text-foreground">
                        <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </div>
        </Container>
      </section>

      {/* Diferenciais: blocos abertos, separados por um fio, sem caixa. */}
      <section className="py-20 lg:py-28 bg-background-soft">
        <Container>
          <Cabecalho
            rotulo="Diferenciais"
            titulo="Por que escolher a Attra"
            texto="Cada detalhe do nosso processo foi desenhado para garantir segurança, transparência e uma experiência à altura de quem busca o extraordinário."
          />
          <ul className="mt-14 grid gap-x-12 gap-y-12 sm:grid-cols-2 lg:mt-16 lg:grid-cols-3">
            {diferenciais.map((item) => (
              <li key={item.title} className="border-t border-border pt-7">
                <item.icon className="h-6 w-6 text-primary" />
                <h3 className="mt-5 text-lg font-semibold text-foreground" style={MONTSERRAT}>{item.title}</h3>
                <p className="mt-2 leading-relaxed text-foreground-secondary">{item.description}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* Vídeo institucional: o player do YouTube só entra no clique. */}
      <section className="py-20 lg:py-28 bg-background">
        <Container>
          <Cabecalho
            centro
            rotulo="Conheça a Attra"
            titulo="A experiência por trás de cada entrega"
            texto="Veja de perto como a Attra opera, da curadoria à entrega do seu veículo."
          />
          <div className="mx-auto mt-12 max-w-4xl">
            <VideoConheca />
            <p className="mt-6 text-center">
              <a
                href="https://www.youtube.com/@attraveiculos"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[15px] font-medium text-foreground hover:text-primary"
              >
                <Youtube className="h-5 w-5 text-red-600" />
                Mais vídeos no canal da Attra no YouTube
              </a>
            </p>
          </div>
        </Container>
      </section>

      {/* Carros icônicos: grade no computador, carrossel com rolagem para o
          lado no celular (eram ~6.000 px de cards um embaixo do outro). */}
      <section className="py-20 lg:py-28 bg-background-soft overflow-hidden">
        <Container>
          <Cabecalho
            rotulo="Acervo histórico"
            titulo="Carros icônicos que passaram pela Attra"
            texto="Um registro permanente dos veículos mais notáveis que já fizeram parte do nosso acervo. Cada um deles representa um capítulo da história automotiva que tivemos o privilégio de intermediar."
          />

          <ul className="jornada-carrossel -mx-4 mt-12 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0 sm:pb-0 lg:mt-14 lg:grid-cols-3">
            {ICONIC_CARS.map((car) => (
              <li key={car.id} className="w-[84%] shrink-0 snap-start sm:w-auto">
                <article className="group h-full overflow-hidden rounded-2xl border border-border bg-background-card">
                  <div className="relative aspect-[4/3] bg-background-soft">
                    <Image
                      src={car.photo}
                      alt={`${car.brand} ${car.model} ${car.version || ''} ${car.year}, na Attra Veículos`}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                      sizes="(max-width: 640px) 84vw, (max-width: 1024px) 50vw, 33vw"
                    />
                    <div className="absolute left-3 top-3 flex gap-2">
                      <span className="rounded-full bg-black/70 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                        {getCategoryLabel(car.category)} · {car.year}
                      </span>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-primary">{car.brand}</p>
                      <span className="whitespace-nowrap text-[13px] text-foreground-secondary">{car.mileage}</span>
                    </div>
                    <h3 className="mt-1.5 text-xl font-semibold text-foreground" style={MONTSERRAT}>
                      {car.model} {car.version && <span className="font-normal text-foreground-secondary">{car.version}</span>}
                    </h3>
                    <p className="mt-1 text-[13px] text-foreground-secondary">{car.engine} · {car.power}</p>
                    <p className="mt-4 text-[15px] leading-relaxed text-foreground-secondary">{car.editorial}</p>
                    <ul className="mt-4 space-y-1.5">
                      {car.highlights.map((h) => (
                        <li key={h} className="flex gap-2.5 text-[14px] text-foreground">
                          <span aria-hidden="true" className="mt-[0.55em] h-1 w-1 shrink-0 rounded-full bg-primary" />
                          {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-center text-[13px] text-foreground-secondary sm:hidden">Arraste para o lado para ver os outros carros</p>

          {/* Editorial claim — based on cumulative inventory since 2008 */}
          <p className="mt-12 text-center text-foreground-secondary">
            Mais de <NumeroQueSobe valor={500} className="font-semibold text-foreground" /> <strong className="font-semibold text-foreground">supercarros</strong> já passaram pela Attra desde 2008.
            Acima estão alguns dos destaques mais recentes.
          </p>
        </Container>
      </section>

      {/* Depoimentos: abertos, com a aspa grande. Sem as 5 estrelas: elas
          sugerem uma nota de avaliação que estas falas não têm. */}
      <section className="py-20 lg:py-28 bg-background">
        <Container>
          <Cabecalho rotulo="Aficionados Attra" titulo="Histórias de quem já viveu a jornada" />
          <ul className="mt-14 grid gap-12 md:grid-cols-3 md:gap-10 lg:mt-16">
            {testimonials.map((t) => (
              <li key={t.author} className="border-t border-border pt-8">
                <span aria-hidden="true" className="block h-8 font-serif text-7xl leading-[0.9] text-primary">&ldquo;</span>
                <blockquote className="mt-2 text-lg leading-relaxed text-foreground">{t.quote}</blockquote>
                <p className="mt-6 font-semibold text-foreground">{t.author}</p>
                <p className="text-sm text-foreground-secondary">{t.location} · <span className="text-primary">{t.vehicle}</span></p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* Quem está por trás: as pessoas da Attra, cada foto abrindo em cortina
          com um pequeno atraso. No celular, carrossel com rolagem para o lado.
          Botão outline para /sobre, sem competir com os CTAs principais. */}
      <section className="py-20 lg:py-28 bg-background-soft overflow-hidden">
        <Container>
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <Cabecalho
              rotulo="Quem está por trás"
              titulo="Conheça a Attra"
              texto={`${anosDeMercado()} anos curando veículos premium, uma operação própria e uma equipe dedicada a transformar cada compra em experiência. Saiba mais sobre a história, o time e os valores por trás da curadoria.`}
            />
            <Button asChild size="lg" variant="outline" className="shrink-0 self-start lg:self-end">
              <Link href="/sobre" className="inline-flex items-center gap-2">
                Conhecer a Attra
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <EquipeAttra className="mt-12 lg:mt-14" />
        </Container>
      </section>

      {/* Linha do tempo numa coluna só: o ano grande à esquerda e o texto
          alinhado à esquerda. Em duas colunas alternadas, os textos de
          tamanhos diferentes deixavam buracos e metade ficava alinhada à
          direita. A linha vermelha cresce com a rolagem (motion.css). Fica
          depois da equipe: primeiro as pessoas, depois a história delas. */}
      <section className="py-20 lg:py-28 bg-background">
        <Container>
          <Cabecalho rotulo="Nossa trajetória" titulo="Construindo história" />
          <LinhaDoTempo className="mt-14 lg:mt-16" />
        </Container>
      </section>

      {/* CTA */}
      <section className="py-20 lg:py-24 bg-gradient-to-r from-primary to-primary/90">
        <Container>
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl lg:text-[40px] font-semibold tracking-tight text-white mb-4" style={MONTSERRAT}>Pronto para sua jornada?</h2>
            <p className="text-lg text-white/80 max-w-2xl mx-auto mb-8 leading-relaxed">
              Agende uma visita ao showroom em Uberlândia ou comece sua curadoria à distância agora mesmo.
              Atendemos clientes de todo o Brasil com a mesma excelência.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90">
                <Link href={getWhatsAppUrl('Olá! Gostaria de agendar uma visita VIP ao showroom.')} target="_blank">
                  <MessageCircle className="w-5 h-5 mr-2" />Agendar visita VIP
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-white/30 bg-transparent text-white hover:bg-white/10">
                <Link href={getWhatsAppUrl('Olá! Gostaria de iniciar uma curadoria à distância.')} target="_blank">
                  Curadoria à distância
                </Link>
              </Button>
            </div>
          </div>
        </Container>
      </section>
    </>
  )
}
