import { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/ui/container'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { pageTitle } from '@/lib/seo/page-metadata'
import {
  SITE_URL, getWhatsAppUrl, ADDRESS, PHONE_DISPLAY, PHONE_DISPLAY_2,
  CELLPHONE_DISPLAY, EMAIL, HORARIO_RESUMIDO, GEO, MAPA_URL,
} from '@/lib/constants'
import { ArrowRight, MessageCircle, MapPin, Clock, Phone } from 'lucide-react'

/**
 * Página local — Uberlândia, Triângulo Mineiro e Minas Gerais.
 *
 * Existe porque havia um vazio medido: nenhuma página do site mencionava a
 * praça, enquanto 76 das conversões vêm de Uberlândia e Belo Horizonte contra
 * 16 de São Paulo. O monitoramento de resposta de LLM também não cobria
 * geografia nenhuma, e disputar "loja em São Paulo" é competir no quintal de
 * concorrentes com sinal local que a Attra não tem.
 *
 * Aqui a Attra tem o sinal e ninguém disputa.
 */

const TITULO = 'Loja de carros de luxo e importados em Uberlândia (MG)'
const META_TITLE = 'Carros de Luxo e Importados em Uberlândia (MG) | Attra Veículos'
const META_DESC =
  'Loja de carros de luxo, importados e esportivos em Uberlândia, Minas Gerais. Showroom na Av. Rondon Pacheco, procedência verificada e entrega em todo o Brasil.'

export const metadata: Metadata = {
  title: pageTitle(META_TITLE),
  description: META_DESC,
  keywords: [
    'loja de carros importados em uberlandia',
    'carros de luxo uberlandia',
    'loja de carros esportivos minas gerais',
    'concessionaria carros importados uberlandia',
    'onde comprar carro de luxo em minas gerais',
    'revenda de carros de luxo triangulo mineiro',
  ],
  alternates: { canonical: `${SITE_URL}/carros-de-luxo-uberlandia` },
  openGraph: {
    title: META_TITLE,
    description: META_DESC,
    url: `${SITE_URL}/carros-de-luxo-uberlandia`,
    type: 'website',
  },
}

/**
 * Cidades de onde os compradores efetivamente vêm, na ordem observada no
 * tráfego do site. Não é lista aspiracional: é de onde partem os contatos.
 */
const REGIOES = [
  { nome: 'Uberlândia', detalhe: 'Showroom na Av. Rondon Pacheco — atendimento presencial' },
  { nome: 'Belo Horizonte', detalhe: 'Atendimento remoto e entrega' },
  { nome: 'Uberaba e Triângulo Mineiro', detalhe: 'Cerca de uma hora de Uberlândia' },
  { nome: 'Goiânia e Catalão', detalhe: 'Divisa com Goiás, entrega frequente' },
  { nome: 'Brasília', detalhe: 'Entrega em caminhão fechado' },
  { nome: 'Ribeirão Preto e Campinas', detalhe: 'Interior de São Paulo' },
]

export default function CarrosDeLuxoUberlandiaPage() {
  /**
   * JSON-LD específico da página, com o endereço e a coordenada verificados.
   * A entidade AutoDealer já é declarada no layout raiz; aqui a referência é
   * por @id, para a página local não criar uma segunda empresa no grafo.
   */
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${SITE_URL}/carros-de-luxo-uberlandia`,
    name: META_TITLE,
    description: META_DESC,
    about: { '@id': `${SITE_URL}/#organization` },
    mainEntity: {
      '@type': 'AutoDealer',
      '@id': `${SITE_URL}/#organization`,
      areaServed: REGIOES.map(r => ({ '@type': 'City', name: r.nome })),
      geo: { '@type': 'GeoCoordinates', latitude: GEO.latitude, longitude: GEO.longitude },
      hasMap: MAPA_URL,
    },
  }

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <section className="relative py-16 lg:py-24 bg-gradient-to-b from-background to-background-card">
        <Container>
          <Breadcrumb items={[{ label: 'Uberlândia (MG)' }]} className="mb-8" />
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-5 h-5 text-primary" />
              <span className="text-sm text-primary font-medium uppercase tracking-wider">
                Uberlândia · Minas Gerais
              </span>
            </div>
            <h1 className="text-3xl lg:text-5xl font-bold text-foreground mb-4 tracking-tight">
              {TITULO}
            </h1>
            <p className="text-lg text-foreground-secondary leading-relaxed">
              A Attra fica na Av. Rondon Pacheco, em Uberlândia, e trabalha com carros de luxo,
              importados e superesportivos. O showroom recebe visita com hora marcada, e a
              entrega é feita em todo o Brasil para quem compra à distância.
            </p>
          </div>
        </Container>
      </section>

      <section className="py-12 lg:py-16">
        <Container>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl">
            <div className="bg-background-card border border-border rounded-xl p-6">
              <MapPin className="w-6 h-6 text-primary mb-3" />
              <h2 className="text-lg font-semibold text-foreground mb-2">Endereço</h2>
              <p className="text-foreground-secondary leading-relaxed">
                {ADDRESS.street}
                <br />
                {ADDRESS.neighborhood}
                <br />
                {ADDRESS.city} — {ADDRESS.state}
                <br />
                CEP {ADDRESS.postalCode}
              </p>
              <a
                href={MAPA_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-3 text-sm text-primary hover:underline"
              >
                Ver no mapa <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            <div className="bg-background-card border border-border rounded-xl p-6">
              <Clock className="w-6 h-6 text-primary mb-3" />
              <h2 className="text-lg font-semibold text-foreground mb-2">Horário</h2>
              <p className="text-foreground-secondary leading-relaxed">{HORARIO_RESUMIDO}</p>
              <p className="text-foreground-secondary mt-2 text-sm">Domingo: fechado</p>
            </div>

            <div className="bg-background-card border border-border rounded-xl p-6">
              <Phone className="w-6 h-6 text-primary mb-3" />
              <h2 className="text-lg font-semibold text-foreground mb-2">Contato</h2>
              <p className="text-foreground-secondary leading-relaxed">
                {PHONE_DISPLAY}
                <br />
                {PHONE_DISPLAY_2}
                <br />
                WhatsApp {CELLPHONE_DISPLAY}
                <br />
                {EMAIL}
              </p>
            </div>
          </div>
        </Container>
      </section>

      <section className="py-12 lg:py-16 bg-background-card">
        <Container>
          <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4">
            De onde vêm os compradores
          </h2>
          <p className="text-foreground-secondary mb-8 max-w-3xl leading-relaxed">
            Uberlândia é a base, mas boa parte das negociações acontece com compradores de
            fora — de Belo Horizonte ao interior paulista. A compra à distância segue o mesmo
            processo: verificação de procedência antes do pagamento e transporte com seguro.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl">
            {REGIOES.map(r => (
              <div key={r.nome} className="border border-border rounded-lg p-4">
                <h3 className="font-semibold text-foreground">{r.nome}</h3>
                <p className="text-sm text-foreground-secondary mt-1">{r.detalhe}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-12 lg:py-16">
        <Container>
          <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-6">Onde continuar</h2>
          <div className="flex flex-wrap gap-3 mb-8">
            {[
              { nome: 'Estoque completo', href: '/veiculos' },
              { nome: 'Onde comprar carros de luxo', href: '/onde-comprar-carros-de-luxo' },
              { nome: 'Carros de luxo usados', href: '/comprar/condicao/carros-de-luxo-usados' },
              { nome: 'Sobre a Attra', href: '/sobre' },
              { nome: 'Contato', href: '/contato' },
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
            href={getWhatsAppUrl('Olá! Quero agendar uma visita ao showroom em Uberlândia.')}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            <MessageCircle className="w-5 h-5" />
            Agendar visita ao showroom
          </a>
        </Container>
      </section>
    </main>
  )
}
