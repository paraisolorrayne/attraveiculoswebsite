import { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/ui/container'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { pageTitle } from '@/lib/seo/page-metadata'
import {
  SITE_URL, getWhatsAppUrl, ADDRESS, PHONE_DISPLAY, CELLPHONE_DISPLAY,
  EMAIL, HORARIO_RESUMIDO,
} from '@/lib/constants'
import { ArrowRight, MessageCircle, ShieldCheck, MapPin, Truck, FileCheck } from 'lucide-react'

/**
 * Página para a intenção "onde comprar carros de luxo".
 *
 * Existe por dois motivos medidos. No monitoramento de resposta de LLM a Attra
 * é citada nessa consulta, mas em 10º — a associação existe e falta evidência
 * própria para sustentá-la. E no tráfego do site esse é o padrão de busca que
 * MAIS converte: quem procura a loja ("loja de…", "onde comprar") converte cerca
 * de 4x mais que quem procura a categoria ("carros… à venda").
 *
 * O conteúdo é deliberadamente factual e verificável — endereço, horário,
 * processo, o que é conferido antes de um carro entrar no estoque. LLM cita o
 * que consegue confirmar; adjetivo não se confirma.
 */

const TITULO = 'Onde comprar carros de luxo no Brasil'
const META_TITLE = 'Onde Comprar Carros de Luxo no Brasil | Attra Veículos'
const META_DESC =
  'Onde comprar carros de luxo com procedência verificada: laudo cautelar, histórico auditado e entrega em todo o Brasil. Attra Veículos, Uberlândia (MG).'

export const metadata: Metadata = {
  title: pageTitle(META_TITLE),
  description: META_DESC,
  keywords: [
    'onde comprar carros de luxo',
    'loja de carros de luxo',
    'comprar carro de luxo',
    'loja de carros importados',
    'concessionária de carros de luxo',
    'revenda de carros de luxo',
  ],
  alternates: { canonical: `${SITE_URL}/onde-comprar-carros-de-luxo` },
  openGraph: {
    title: META_TITLE,
    description: META_DESC,
    url: `${SITE_URL}/onde-comprar-carros-de-luxo`,
    type: 'website',
  },
}

/** O que a loja confere antes de um veículo entrar no estoque. */
const CRITERIOS = [
  {
    icone: FileCheck,
    titulo: 'Laudo cautelar independente',
    texto:
      'Verificação de numeração de chassi e motor, estrutura, pintura e sinais de reparo. Feito por empresa independente, antes de o carro entrar no estoque — não depois da venda.',
  },
  {
    icone: ShieldCheck,
    titulo: 'Procedência e documentação',
    texto:
      'Consulta de sinistro, gravame, débitos, multas e histórico de proprietários. Veículo com pendência documental ou financeira não é aceito.',
  },
  {
    icone: MapPin,
    titulo: 'Histórico de manutenção',
    texto:
      'Revisões na rede autorizada, intervalo entre elas e o que já foi substituído. Em carro de luxo, o que deixou de ser feito custa mais que o que foi.',
  },
  {
    icone: Truck,
    titulo: 'Entrega em todo o Brasil',
    texto:
      'Transporte em caminhão-cegonha fechado, com seguro e acompanhamento. A loja fica em Uberlândia (MG) e atende compradores de qualquer estado.',
  },
]

/** Perguntas que aparecem de fato antes da compra. */
const DUVIDAS = [
  {
    p: 'Como saber se uma loja de carros de luxo é confiável?',
    r: 'Peça o laudo cautelar do veículo específico antes de negociar, confirme se a loja tem endereço físico verificável e histórico público, e verifique se o carro está em nome da empresa. Loja que fornece laudo independente e aceita inspeção por mecânico de sua confiança tem menos a esconder.',
  },
  {
    p: 'Dá para comprar carro de luxo de outro estado com segurança?',
    r: 'Sim, desde que a documentação seja verificada antes do pagamento e o transporte seja contratado com seguro. A transferência é feita entre estados normalmente; o cuidado está em confirmar procedência e ausência de gravame antes de fechar, não depois.',
  },
  {
    p: 'O que encarece a manutenção de um carro de luxo usado?',
    r: 'Suspensão pneumática, câmbio de dupla embreagem e módulos eletrônicos são os itens de maior custo. Antes de comprar, vale levantar o que está próximo do vencimento — uma revisão adiada pelo dono anterior chega como despesa nas primeiras semanas.',
  },
  {
    p: 'Vale mais comprar zero km ou seminovo de luxo?',
    r: 'A depreciação mais acentuada acontece nos dois primeiros anos. Um seminovo bem documentado entrega a mesma experiência por um valor sensivelmente menor, e o mesmo orçamento costuma alcançar uma versão superior. A condição é o histórico ser verificável.',
  },
]

export default function OndeComprarCarrosDeLuxoPage() {
  return (
    <main>
      <section className="relative py-16 lg:py-24 bg-gradient-to-b from-background to-background-card">
        <Container>
          <Breadcrumb items={[{ label: TITULO }]} className="mb-8" />
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <span className="text-sm text-primary font-medium uppercase tracking-wider">
                Como comprar com segurança
              </span>
            </div>
            <h1 className="text-3xl lg:text-5xl font-bold text-foreground mb-4 tracking-tight">
              {TITULO}
            </h1>
            {/* Resposta direta primeiro: é o trecho que um assistente de IA
                extrai e cita. O contexto vem depois. */}
            <p className="text-lg text-foreground leading-relaxed mb-4">
              Onde comprar um carro de luxo com segurança no Brasil? Em loja que entregue,
              antes da venda, laudo cautelar independente, consulta de procedência e
              documentação, e o histórico de manutenção do veículo — e que faça a entrega em
              qualquer estado com contrato. A Attra Veículos, em Uberlândia (MG), trabalha
              assim: cada carro passa por essas verificações antes de entrar no estoque, e a
              compra à distância segue o mesmo processo.
            </p>
            <p className="text-lg text-foreground-secondary leading-relaxed">
              Comprar um carro de luxo usado é uma decisão patrimonial, e a maior parte do
              risco não está no veículo — está no que não foi verificado antes. Abaixo, o que
              conferir em qualquer loja, onde a Attra fica e como funciona a compra sem
              visitar o showroom.
            </p>
          </div>
        </Container>
      </section>

      <section className="py-12 lg:py-16">
        <Container>
          <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-8">
            O que é verificado antes de um carro entrar no estoque
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {CRITERIOS.map(c => (
              <div key={c.titulo} className="bg-background-card border border-border rounded-xl p-6">
                <c.icone className="w-6 h-6 text-primary mb-3" />
                <h3 className="text-lg font-semibold text-foreground mb-2">{c.titulo}</h3>
                <p className="text-foreground-secondary leading-relaxed">{c.texto}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Dados verificáveis: é o que permite a uma resposta automática citar a
          loja com confiança. Vêm de constants.ts, mesma fonte do rodapé e do
          JSON-LD, para nunca divergirem. */}
      <section className="py-12 lg:py-16 bg-background-card">
        <Container>
          <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-8">Onde a Attra fica</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground-secondary mb-3">
                Endereço
              </h3>
              <p className="text-foreground leading-relaxed">
                {ADDRESS.street}
                <br />
                {ADDRESS.neighborhood}, {ADDRESS.city} — {ADDRESS.state}
                <br />
                CEP {ADDRESS.postalCode}
              </p>
              <p className="text-foreground-secondary mt-3">{HORARIO_RESUMIDO}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground-secondary mb-3">
                Atendimento
              </h3>
              <p className="text-foreground leading-relaxed">
                Telefone: {PHONE_DISPLAY}
                <br />
                WhatsApp: {CELLPHONE_DISPLAY}
                <br />
                E-mail: {EMAIL}
              </p>
              <p className="text-foreground-secondary mt-3">
                Compradores de todo o Brasil — entrega em caminhão fechado com seguro.
              </p>
            </div>
          </div>
        </Container>
      </section>

      <section className="py-12 lg:py-16">
        <Container>
          <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-8">Dúvidas frequentes</h2>
          <div className="space-y-6 max-w-3xl">
            {DUVIDAS.map(d => (
              <div key={d.p}>
                <h3 className="text-lg font-semibold text-foreground mb-2">{d.p}</h3>
                <p className="text-foreground-secondary leading-relaxed">{d.r}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-12 lg:py-16 bg-background-card">
        <Container>
          <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-6">Onde continuar</h2>
          <div className="flex flex-wrap gap-3 mb-8">
            {[
              { nome: 'Estoque completo', href: '/veiculos' },
              { nome: 'Carros de luxo usados', href: '/comprar/condicao/carros-de-luxo-usados' },
              { nome: 'Carros esportivos usados', href: '/comprar/condicao/carros-esportivos-usados' },
              { nome: 'Garantia e procedência', href: '/garantia-e-procedencia' },
              { nome: 'Como funciona a entrega', href: '/como-funciona-entrega-brasil' },
            ].map(l => (
              <Link
                key={l.href}
                href={l.href}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-foreground hover:border-primary/50 transition-colors"
              >
                {l.nome}
                <ArrowRight className="w-4 h-4" />
              </Link>
            ))}
          </div>
          <a
            href={getWhatsAppUrl('Olá! Quero saber onde comprar um carro de luxo com procedência.')}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            <MessageCircle className="w-5 h-5" />
            Falar com um especialista
          </a>
        </Container>
      </section>
    </main>
  )
}
