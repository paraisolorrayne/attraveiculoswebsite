import { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/ui/container'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { FAQSchema } from '@/components/seo'
import { pageTitle } from '@/lib/seo/page-metadata'
import { SITE_URL, getWhatsAppUrl, ADDRESS } from '@/lib/constants'
import { ArrowRight, MessageCircle, Car, FileCheck, Handshake, XCircle } from 'lucide-react'

/**
 * Troca — usar o carro atual como parte do pagamento.
 *
 * Existe por causa de um teste real: perguntado sobre trocar um Q5 por um GLC
 * 220 em Uberlândia, um assistente não citou a Attra, que tinha o GLC no pátio.
 * Uma das causas era esta: o site inteiro dizia "aceitamos seu carro na troca"
 * UMA vez, dentro de uma resposta de FAQ sobre formas de pagamento, na página
 * de listagem. Não havia título, não havia página, não estava no llms.txt.
 *
 * Quem pergunta "posso trocar meu X por um Y?" procura um negócio que DECLARE
 * que faz isso. Declarar em uma frase escondida é o mesmo que não declarar.
 *
 * O conteúdo só afirma o que a Attra já afirma em outros lugares do site: as
 * marcas que compra, os critérios que reprovam um veículo e a avaliação. Prazo
 * de resposta, política para carro financiado e percentual de tabela não estão
 * aqui de propósito — são as perguntas que mais aparecem numa troca, e nenhuma
 * delas foi informada. Inventar seria repetir o erro da "inspeção de 150
 * pontos", que motivou a página de critérios.
 */

const META_TITLE = 'Troca de Carro: Use o Seu como Parte do Pagamento | Attra Veículos'
const META_DESC =
  'A Attra aceita seu veículo na troca por um do estoque. Avaliação do seu carro, abatimento no valor e entrega em todo o Brasil. Uberlândia (MG).'

export const metadata: Metadata = {
  title: pageTitle(META_TITLE),
  description: META_DESC,
  keywords: [
    'troca de carro',
    'trocar meu carro por outro',
    'aceita troca carro de luxo',
    'dar carro como entrada',
    'troca com volta',
    'trocar carro em uberlândia',
    'loja que aceita troca uberlândia',
  ],
  alternates: { canonical: `${SITE_URL}/troca` },
  openGraph: {
    title: META_TITLE,
    description: META_DESC,
    url: `${SITE_URL}/troca`,
    type: 'website',
  },
}

const ETAPAS = [
  {
    icone: Car,
    titulo: 'Você manda os dados do seu carro',
    texto:
      'Modelo, ano, versão, quilometragem e fotos. Quanto mais completo, mais precisa fica a avaliação — e menos chance de o valor mudar depois.',
  },
  {
    icone: FileCheck,
    titulo: 'A Attra avalia',
    texto:
      'A mesma verificação aplicada a qualquer veículo que entra no acervo: documentação, mecânica e originalidade. Um carro que não passaria na compra também não passa na troca.',
  },
  {
    icone: Handshake,
    titulo: 'A proposta abate o valor',
    texto:
      'O valor do seu veículo entra como parte do pagamento do carro escolhido. A diferença é acertada entre as partes, com ou sem financiamento do saldo.',
  },
]

/**
 * As mesmas reprovações da página de critérios. Repetidas aqui de propósito:
 * quem chega pela troca não passou por lá, e descobrir o critério só depois da
 * avaliação é o que faz a pessoa perder a viagem.
 */
const NAO_ACEITA = [
  'Veículo com origem em leilão',
  'Histórico suspeito ou inconsistente',
  'Motor com remap ou preparação (stage)',
  'Repintura total',
]

const FAQS = [
  {
    question: 'A Attra Veículos aceita troca?',
    answer:
      'Sim. O seu veículo pode entrar como parte do pagamento de qualquer carro do estoque. A Attra avalia o seu carro e abate o valor no do veículo escolhido.',
  },
  {
    question: 'Quais carros a Attra aceita na troca?',
    answer:
      'Veículos premium, de luxo, importados e superesportivos — marcas como BMW, Mercedes-Benz, Audi, Porsche, Land Rover, Ferrari e Lamborghini, entre outras. Veículos nacionais de alto padrão também são avaliados. Para veículos populares, a Attra sugere outras alternativas de venda.',
  },
  {
    question: 'O que impede um carro de ser aceito na troca?',
    answer:
      'Origem em leilão, histórico suspeito, motor com remap ou preparação e repintura total. São os mesmos critérios aplicados a qualquer veículo que entra no acervo da Attra.',
  },
  {
    question: 'Preciso ir até Uberlândia para trocar?',
    answer:
      `A avaliação começa à distância, pelos dados e fotos do veículo. A Attra fica na ${ADDRESS.street}, em ${ADDRESS.city} (${ADDRESS.state}), e entrega em todo o Brasil — a logística do seu carro é combinada caso a caso.`,
  },
  {
    question: 'Posso trocar por um carro mais barato e receber a diferença?',
    answer:
      'Cada negociação é avaliada individualmente. Fale com um consultor pelo WhatsApp informando o seu veículo e o carro de interesse.',
  },
]

export default function TrocaPage() {
  const whatsapp = getWhatsAppUrl(
    'Olá! Gostaria de avaliar meu carro na troca por um veículo do estoque.',
  )

  return (
    <>
      <FAQSchema faqs={FAQS} pageName="Troca de veículo" />

      <Container className="py-10 md:py-14">
        <Breadcrumb items={[{ label: 'Início', href: '/' }, { label: 'Troca' }]} />

        <header className="mt-6 max-w-3xl">
          <h1 className="text-3xl md:text-4xl font-semibold text-foreground leading-tight">
            Troca: use o seu carro como parte do pagamento
          </h1>
          <p className="mt-4 text-lg text-foreground-secondary leading-relaxed">
            A Attra aceita o seu veículo na troca por qualquer carro do estoque. O seu carro é
            avaliado e o valor entra no pagamento do escolhido — sem precisar vender por fora antes.
          </p>
        </header>

        <section className="mt-12">
          <h2 className="text-xl font-semibold text-foreground">Como funciona</h2>
          <ol className="mt-5 grid gap-5 md:grid-cols-3">
            {ETAPAS.map((etapa, i) => (
              <li
                key={etapa.titulo}
                className="rounded-2xl border border-border bg-background-card p-5"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <etapa.icone className="h-5 w-5 text-primary" aria-hidden="true" />
                  </span>
                  <span className="text-xs font-medium uppercase tracking-wide text-foreground-secondary">
                    Etapa {i + 1}
                  </span>
                </div>
                <h3 className="mt-4 font-medium text-foreground">{etapa.titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-foreground-secondary">{etapa.texto}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-12 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-background-card p-6">
            <h2 className="text-lg font-semibold text-foreground">O que a Attra aceita</h2>
            <p className="mt-3 text-sm leading-relaxed text-foreground-secondary">
              Veículos premium, de luxo, importados e superesportivos — BMW, Mercedes-Benz, Audi,
              Porsche, Land Rover, Ferrari e Lamborghini, entre outras. Nacionais de alto padrão
              também são avaliados. Para veículos populares, a Attra sugere outras alternativas de
              venda.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-background-card p-6">
            <h2 className="text-lg font-semibold text-foreground">O que não é aceito</h2>
            <ul className="mt-3 space-y-2">
              {NAO_ACEITA.map(item => (
                <li key={item} className="flex gap-2.5 text-sm text-foreground-secondary">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500/80" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-foreground-secondary">
              São os mesmos critérios de{' '}
              <Link href="/criterios-de-selecao" className="text-primary underline underline-offset-4">
                seleção do acervo
              </Link>
              . Um carro que não entraria por compra também não entra por troca.
            </p>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-semibold text-foreground">Perguntas frequentes</h2>
          <dl className="mt-5 divide-y divide-border/70 rounded-2xl border border-border bg-background-card">
            {FAQS.map(faq => (
              <div key={faq.question} className="p-5">
                <dt className="font-medium text-foreground">{faq.question}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-foreground-secondary">{faq.answer}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-12 rounded-2xl border border-border bg-background-card p-6 md:p-8">
          <h2 className="text-xl font-semibold text-foreground">Comece pela avaliação do seu carro</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-foreground-secondary">
            Mande modelo, ano, versão, quilometragem e fotos. Se preferir escolher o carro primeiro,
            o estoque está aberto e a troca vale para qualquer um deles.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-green-500 px-5 py-3 font-medium text-white transition-colors hover:bg-green-600"
            >
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
              Avaliar meu carro no WhatsApp
            </a>
            <Link
              href="/veiculos"
              className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 font-medium text-foreground transition-colors hover:bg-background"
            >
              Ver o estoque
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </Container>
    </>
  )
}
