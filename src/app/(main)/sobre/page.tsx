import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Award, Users, Shield, Building2, Globe, Car, ArrowRight, Handshake, Target, MessageCircle } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { getWhatsAppUrl } from '@/lib/constants'
import { HistoryGallery, type HistoryEra } from '@/components/about/history-gallery'
import { CabecalhoSecao, MONTSERRAT } from '@/components/ui/cabecalho-secao'
import { NumeroQueSobe } from '@/components/ui/numero-que-sobe'
import { LinhaDoTempo } from '@/components/attra/linha-do-tempo'
import { EquipeNoCarro } from '@/components/attra/equipe-no-carro'
import { PostInstagram } from '@/components/attra/post-instagram'
import { canonicalUrl } from '@/lib/seo/page-metadata'
import { anosDeMercado } from '@/lib/constants'

// Página estática que exibe os anos de mercado (calculados a partir do ano
// corrente). Sem revalidação ela ficaria com o número do último build — e o
// número mudaria só no próximo deploy, não na virada do ano.
export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Sobre a Attra Veículos | Loja de Veículos Premium em Uberlândia',
  description: 'Conheça a Attra Veículos. Curadoria e comercialização de veículos nacionais, importados, esportivos e supercarros, com operação em Uberlândia e atendimento em todo o Brasil.',
  keywords: ['Attra Veículos Uberlândia', 'loja de veículos premium', 'supercarros Minas Gerais', 'loja de carros de luxo', 'referência em veículos premium'],
  alternates: { canonical: canonicalUrl('/sobre') },
}

// A entidade AutoDealer não é redeclarada aqui: o layout raiz já emite o nó
// canônico com @id em todo documento. Este bloco declarava um segundo
// AutoDealer, com endereço e priceRange divergentes do nó canônico.

const commitments = [
  {
    icon: Shield,
    title: 'Transparência como processo',
    description: 'Histórico completo, documentação verificada e laudo técnico detalhado. Cada informação é compartilhada antes da decisão, sem surpresas.',
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
    description: 'A relação com o cliente não termina na entrega. Muitos retornam para novas aquisições e nos indicam, o que reforça a confiança construída.',
  },
]

const differentials = [
  { icon: Award, title: 'Referência em MG', description: 'Maior dealer de veículos premium do Triângulo Mineiro, com atendimento que alcança os 27 estados do Brasil.' },
  { icon: Globe, title: 'Atendimento nacional', description: 'Logística especializada com seguro premium e rastreamento em tempo real para qualquer cidade do Brasil.' },
  { icon: Shield, title: 'Procedência verificada', description: 'Cada veículo passa por inspeção rigorosa e verificação completa de histórico antes de entrar no showroom.' },
  { icon: Users, title: 'Equipe especializada', description: 'Consultores com experiência em cada marca, oferecendo atendimento consultivo e personalizado.' },
  { icon: Car, title: '+500 veículos por ano', description: `Mais de 500 veículos comercializados anualmente, resultado da confiança construída ao longo de ${anosDeMercado()} anos.` },
  { icon: Building2, title: '5.000 m² de estrutura', description: 'Showroom climatizado com iluminação profissional projetado para exibir cada veículo como patrimônio.' },
]

const historyEras: HistoryEra[] = [
  {
    label: 'Attra Veículos hoje',
    // "Referência nacional" saiu: alegação absoluta e não verificável — o tipo
    // de frase que um LLM repete como se fosse fato apurado sobre a marca.
    description: 'Curadoria de veículos premium, com atendimento em todo o Brasil',
    slides: [
      // Destaque trocado em 23/10/2026: a foto anterior (um Audi R8) não
      // batia com a legenda. Esta foi tratada por scripts/imagens/tratar-foto-diurna.mjs.
      { image: '/about/attra-fachada-lamborghinis-2026.jpg', year: '2026', caption: 'Dois Lamborghini Temerário na fachada do showroom', alt: 'Dois Lamborghini Temerário, um laranja e um roxo, na frente do showroom da Attra Veículos em Uberlândia' },
      { image: '/about/attra-acervo-veiculos-premium.jpg', year: '2022', caption: 'Attra digital: nova marca, mesmos valores', alt: 'Attra Veículos mudança de branding' },
      { image: '/about/attra-curadoria-veiculos.jpg', year: '2025', caption: 'Fachada atual do showroom de 5.000m² em Uberlândia', alt: 'Fachada do showroom Attra Veículos Uberlândia' },
      { image: '/about/attra-colecao-supercarros-showroom.jpg', year: '2025', caption: 'Coleção de supercarros no showroom climatizado', alt: 'Coleção de supercarros Attra Veículos' },
      { image: '/about/attra-porsche-exposicao.jpg', year: '2025', caption: 'Lamborghini em destaque, com curadoria de cada detalhe', alt: 'Lamborghini em exposição no showroom Attra' },
      { image: '/about/attra-ferrari-destaque-showroom.jpg', year: '2024', caption: 'Importação como peça central do cliente', alt: 'Importação em destaque no showroom Attra Veículos' },
      { image: '/about/attra-entrega-veiculo-premium.jpg', year: '2024', caption: 'Momento de entrega: cada veículo tratado como patrimônio', alt: 'Entrega de veículo premium Attra Veículos' },
      { image: '/about/attra-showroom-iluminacao-noturna.jpg', year: '2024', caption: 'Iluminação profissional: cada carro como obra de arte', alt: 'Showroom Attra Veículos com iluminação noturna' },
      { image: '/about/attra-operacao-nacional-logistica.jpg', year: '2023', caption: 'Operação nacional com logística especializada', alt: 'Logística e operação nacional Attra Veículos' },
      { image: '/about/attra-estrutura-5000m-uberlandia.jpg', year: '2023', caption: 'Estrutura completa de 5.000m² consolidada', alt: 'Estrutura de 5000m² Attra Veículos Uberlândia' },
      { image: '/about/attra-inicio-uberlandia.jpg', year: '2022', caption: 'As primeiras mudanças', alt: 'Início da Attra em Uberlândia 2008' },
    ],
  },
  {
    // Sem o print do Instagram (attra-showroom-moderno-2026.png), que mostrava
    // a interface do app com legenda e perfil (23/10/2026).
    label: 'Attra Exclusive, as origens',
    description: 'De onde tudo começou',
    slides: [
      { image: '/about/attra-evento-lancamento.jpg', year: 'Attra Exclusive', caption: 'Eventos que marcaram o início da trajetória', alt: 'Evento da época Attra Exclusive' },
      { image: '/about/attra-presenca-digital-2026.png', year: 'Attra Exclusive', caption: 'Primeiros veículos premium do acervo', alt: 'Acervo de veículos Attra Exclusive' },
      { image: '/about/attra-expansao-showroom.jpg', year: 'Attra Exclusive', caption: 'A primeira expansão, crescendo com propósito', alt: 'Expansão do showroom Attra Exclusive' },
      { image: '/about/attra-equipe-fundadores.jpg', year: 'Attra Exclusive', caption: 'A equipe que construiu a Attra desde o início', alt: 'Equipe fundadora Attra Exclusive' },
      { image: '/about/attra-primeiro-superesportivo.jpg', year: 'Attra Exclusive', caption: 'O primeiro superesportivo: o marco que mudou tudo', alt: 'Primeiro superesportivo Attra Exclusive' },
      { image: '/about/attra-showroom-primeiros-anos.jpg', year: 'Attra Exclusive', caption: 'Os primeiros anos: estrutura enxuta, visão clara', alt: 'Showroom Attra Exclusive primeiros anos' },
    ],
  },
]

export default function SobrePage() {
  return (
    <>
      {/* Topo: texto à esquerda e os números com contador embaixo (eram uma
          faixa vermelha à parte). Sem as bolhas desfocadas nem o selo
          "Referência em Veículos Premium": o rótulo agora é um fato. */}
      <section className="relative overflow-hidden bg-background-soft pt-24 lg:pt-28">
        <Container>
          <Breadcrumb items={[{ label: 'Sobre a Attra', href: '/sobre' }]} afterHero />
          <div className="grid gap-10 pb-12 pt-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end lg:gap-16 lg:pb-16 lg:pt-10">
            <div className="hero-entra">
              <CabecalhoSecao nivel="h1" rotulo="Desde 2008 em Uberlândia" titulo="Sobre a Attra Veículos" />
            </div>
            <div className="hero-entra" style={{ ['--d' as string]: '0.12s' }}>
              <p className="text-lg leading-relaxed text-foreground-secondary">
                Uma operação construída para que grandes carros venham acompanhados de grandes experiências.
                Desde 2008, a Attra atua com <strong className="font-semibold text-foreground">curadoria, transparência e relacionamento</strong> no mercado de veículos premium.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap [&>*]:whitespace-nowrap">
                <Button asChild size="lg">
                  <Link href="/veiculos">
                    <Car className="mr-2 h-5 w-5" />Conhecer nossos veículos
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href={getWhatsAppUrl('Olá! Gostaria de falar com um especialista da Attra.')} target="_blank">
                    <MessageCircle className="mr-2 h-5 w-5" />Falar com especialista
                  </Link>
                </Button>
              </div>
            </div>
          </div>
          <dl className="hero-entra grid grid-cols-2 gap-6 border-t border-border py-8 sm:grid-cols-4 lg:py-10" style={{ ['--d' as string]: '0.24s' }}>
            {[
              { valor: anosDeMercado(), rotulo: 'anos de mercado' },
              { valor: 500, sufixo: '+', rotulo: 'veículos por ano' },
              { valor: 5000, sufixo: ' m²', rotulo: 'de showroom' },
              { valor: 27, rotulo: 'estados atendidos' },
            ].map((n) => (
              <div key={n.rotulo}>
                <dt className="sr-only">{n.rotulo}</dt>
                <dd>
                  <NumeroQueSobe valor={n.valor} sufixo={n.sufixo} className="block text-3xl font-semibold text-foreground sm:text-4xl lg:text-5xl" />
                  <span className="mt-1 block text-[13px] uppercase tracking-[0.12em] text-foreground-secondary">{n.rotulo}</span>
                </dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      {/* Quem somos: título à esquerda, o texto à direita. Os quatro ícones
          que ficavam ao lado ("Veículos Nacionais", "Importados"…) saíram: o
          lugar é das pessoas, na seção seguinte. */}
      <section className="py-20 lg:py-28 bg-background">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
            <CabecalhoSecao rotulo="Quem somos" titulo="Quem é a Attra Veículos" />
            <div className="space-y-5 text-lg leading-relaxed text-foreground-secondary">
              <p>
                A <strong className="font-semibold text-foreground">Attra Veículos</strong> nasceu em 2008 da percepção de que o mercado
                de veículos de alto padrão oferecia grandes carros, mas raramente a mesma qualidade em curadoria,
                transparência e relacionamento. A empresa foi fundada como um negócio familiar em Uberlândia,
                com a convicção de que era possível fazer diferente.
              </p>
              <p>
                Com foco em <strong className="font-semibold text-foreground">atendimento consultivo</strong>, a Attra trata cada veículo
                como patrimônio e cada cliente com o nível de atenção que esse tipo de decisão exige, seja um
                Porsche para uso diário ou uma Ferrari para coleção.
              </p>
              <p>
                O <strong className="font-semibold text-foreground">atendimento nacional</strong> permite que clientes de qualquer
                cidade do Brasil tenham acesso aos melhores veículos premium, com toda a segurança
                da logística especializada e a confiança construída em {anosDeMercado()} anos de operação.
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* A equipe dirigindo, montada como página de revista (EquipeNoCarro).
          Os três olham para a direita, então as fotos ficam à esquerda e o
          texto à direita, para onde eles olham; a seção seguinte inverte
          (texto à esquerda, post à direita). No HTML o texto vem primeiro. */}
      <section className="py-20 lg:py-28 bg-background-soft">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-16">
            <div className="self-start lg:sticky lg:top-32 lg:order-last">
              <CabecalhoSecao
                rotulo="Equipe"
                titulo="Quem faz a Attra"
                texto="Thiago, Cris e Gabriel: as pessoas que você encontra na Attra, em Uberlândia."
              />
              <a
                href={getWhatsAppUrl('Olá! Gostaria de falar com a equipe da Attra.')}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 inline-flex items-center gap-2 text-[15px] font-medium text-foreground hover:text-primary"
              >
                Falar com a equipe no WhatsApp <ArrowRight className="h-4 w-4" />
              </a>
            </div>
            <EquipeNoCarro />
          </div>
        </Container>
      </section>

      {/* O post do Instagram sobre a Porsche do Thiago, incorporado como o
          Instagram mostra (com a legenda). O texto ao lado só repete o que o
          próprio post diz. */}
      <section className="py-20 lg:py-28 bg-background">
        <Container>
          <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_540px] lg:gap-20">
            <div className="lg:sticky lg:top-32">
              <CabecalhoSecao
                rotulo="Fora da vitrine"
                titulo="O carro que não está à venda"
                texto="A Porsche 911 Turbo 997.2 do Thiago, CEO da Attra: 700 cavalos e rodas BBS feitas sob medida. Ele conta a história no nosso Instagram."
              />
              <a
                href="https://www.instagram.com/attra.veiculos/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 inline-flex items-center gap-2 text-[15px] font-medium text-foreground hover:text-primary"
              >
                Seguir @attra.veiculos no Instagram <ArrowRight className="h-4 w-4" />
              </a>
            </div>
            <PostInstagram url="https://www.instagram.com/p/DdkI20LkS5T/" className="mx-auto w-full max-w-[540px]" />
          </div>
        </Container>
      </section>

      {/* Trajetória: a mesma de /jornada (src/lib/trajetoria-attra.ts). */}
      <section className="py-20 lg:py-28 bg-background-soft">
        <Container>
          <CabecalhoSecao
            rotulo="História"
            titulo="Nossa trajetória"
            texto="Uma história de crescimento, excelência e compromisso com colecionadores de todo o Brasil."
          />
          <LinhaDoTempo anel="ring-background-soft" className="mt-14 lg:mt-16" />
        </Container>
      </section>

      {/* Estrutura: texto e destaques à esquerda, a fachada com as Ferraris à
          direita, abrindo em cortina. */}
      <section className="py-20 lg:py-28 bg-background">
        <Container>
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
            <div>
              <CabecalhoSecao rotulo="Infraestrutura" titulo="Nossa estrutura" />
              <div className="mt-6 space-y-4 text-lg leading-relaxed text-foreground-secondary">
                <p>
                  A Attra conta com um <strong className="font-semibold text-foreground">showroom de 5.000 m² em Uberlândia</strong>,
                  projetado para exibir cada veículo com o destaque que ele merece. A estrutura foi pensada para
                  proporcionar clareza, conforto e confiança em cada etapa da negociação.
                </p>
                <p>
                  Localizada em posição estratégica em Minas Gerais, a Attra oferece <strong className="font-semibold text-foreground">atendimento nacional</strong> com
                  logística especializada para entrega em qualquer cidade do Brasil. Clientes de São Paulo, Rio de Janeiro,
                  Brasília e todas as capitais confiam na Attra para suas aquisições.
                </p>
              </div>
              <ul className="mt-8 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                {[
                  'Showroom climatizado de 5.000 m²',
                  'Iluminação profissional em cada detalhe',
                  'Ambiente exclusivo para negociação',
                  'Localização estratégica e fácil acesso',
                  'Estacionamento privativo para clientes',
                  'Equipe especializada em cada marca',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-[15px] text-foreground">
                    <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div data-revelar="cortina" className="cortina-na-rolagem relative aspect-[4/5] overflow-hidden rounded-2xl bg-background-soft lg:aspect-[5/6]">
              <Image
                src="/images/showroom-attra-fachada.jpg"
                alt="Fachada do showroom da Attra Veículos em Uberlândia, com Ferraris estacionadas na frente"
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover object-[50%_45%]"
              />
            </div>
          </div>
        </Container>
      </section>

      {/* Galeria histórica. As legendas ainda serão revisadas com a Attra
          (várias não batem com a foto). */}
      <section className="py-20 lg:py-28 bg-background-soft overflow-hidden">
        <Container>
          <CabecalhoSecao
            rotulo="Documentário visual"
            titulo="De onde viemos. Para onde vamos."
            texto="Percorra nossa evolução em imagens, do presente ao começo de tudo. Uma galeria que mostra o que construímos e de onde veio a confiança."
          />
          <div className="mt-12 lg:mt-14">
            <HistoryGallery eras={historyEras} />
          </div>
        </Container>
      </section>

      {/* Compromisso: blocos abertos, separados por um fio, sem caixa. */}
      <section className="py-20 lg:py-28 bg-background">
        <Container>
          <CabecalhoSecao
            rotulo="Valores"
            titulo="Nosso compromisso"
            texto="Os princípios que sustentam cada negociação e cada relacionamento na Attra."
          />
          <ul className="mt-14 grid gap-x-12 gap-y-12 sm:grid-cols-2 lg:mt-16 lg:grid-cols-4">
            {commitments.map((item) => (
              <li key={item.title} className="border-t border-border pt-7">
                <item.icon className="h-6 w-6 text-primary" />
                <h3 className="mt-5 text-lg font-semibold text-foreground" style={MONTSERRAT}>{item.title}</h3>
                <p className="mt-2 leading-relaxed text-foreground-secondary">{item.description}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* Diferenciais: o mesmo formato. */}
      <section className="py-20 lg:py-28 bg-background-soft">
        <Container>
          <CabecalhoSecao
            rotulo="Diferenciais"
            titulo="Por que escolher a Attra"
            texto="O que sustenta a confiança de quem escolhe a Attra para decisões de alto valor."
          />
          <ul className="mt-14 grid gap-x-12 gap-y-12 sm:grid-cols-2 lg:mt-16 lg:grid-cols-3">
            {differentials.map((item) => (
              <li key={item.title} className="border-t border-border pt-7">
                <item.icon className="h-6 w-6 text-primary" />
                <h3 className="mt-5 text-lg font-semibold text-foreground" style={MONTSERRAT}>{item.title}</h3>
                <p className="mt-2 leading-relaxed text-foreground-secondary">{item.description}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* CTA Final */}
      <section className="py-20 lg:py-24 bg-gradient-to-r from-primary to-primary/90">
        <Container>
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl lg:text-[40px] font-semibold tracking-tight text-white mb-4" style={MONTSERRAT}>
              Visite nosso showroom
            </h2>
            <p className="text-lg text-white/80 mb-8 leading-relaxed">
              Conheça de perto nossa estrutura de 5.000 m² em Uberlândia.
              Uma operação construída para que cada visita seja tão relevante quanto a decisão que ela representa.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90">
                <Link href={getWhatsAppUrl('Olá! Gostaria de agendar uma visita ao showroom da Attra.')} target="_blank">
                  <MessageCircle className="w-5 h-5 mr-2" />Agendar visita
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-white/30 bg-transparent text-white hover:bg-white/10">
                <Link href="/veiculos">
                  Ver todos os veículos <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </Container>
      </section>
    </>
  )
}
