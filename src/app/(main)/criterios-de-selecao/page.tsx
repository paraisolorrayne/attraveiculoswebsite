import { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/ui/container'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { pageTitle } from '@/lib/seo/page-metadata'
import { SITE_URL, getWhatsAppUrl } from '@/lib/constants'
import { ArrowRight, MessageCircle, ShieldCheck, XCircle, FileCheck, Wrench } from 'lucide-react'

/**
 * O que a Attra verifica — e o que REPROVA — antes de aceitar um veículo.
 *
 * Nasce de uma auditoria de visibilidade em LLM: o site afirmava "inspeção de
 * 150 pontos" em cinco lugares e não havia uma única página que sustentasse a
 * frase. Afirmação específica sem lastro é o pior caso possível — o modelo não
 * cita o que não consegue verificar, e o comprador desconfia pelo mesmo motivo.
 *
 * O conteúdo aqui é o critério REAL informado pela Attra, e a peça central são
 * as REPROVAÇÕES. Publicar o que se recusa é mais forte, e mais raro, que
 * publicar o que se checa: qualquer loja diz que inspeciona; quase nenhuma diz
 * o que devolve. É também o que dá substância citável a "procedência".
 *
 * Deliberadamente NÃO enumera 150 itens. O padrão oficial da Porsche são 111
 * pontos, executados por técnicos de fábrica; inventar uma lista maior para
 * preencher a página seria criar exatamente a alegação não comprovável que
 * motivou esta correção.
 */

const TITULO = 'O que a Attra verifica antes de aceitar um veículo'
const META_TITLE = 'Critérios de Seleção e Procedência | Attra Veículos'
const META_DESC =
  'O que reprova um carro na Attra: origem de leilão, histórico suspeito, remap/stage e repintura total. Critérios de documentação, mecânica e funilaria antes da compra.'

export const metadata: Metadata = {
  title: pageTitle(META_TITLE),
  description: META_DESC,
  keywords: [
    'procedência de carro importado',
    'como verificar procedência de carro de luxo',
    'carro de leilão como identificar',
    'critérios de seleção carro seminovo',
    'carro com remap vale a pena',
    'carro repintado desvaloriza',
  ],
  alternates: { canonical: `${SITE_URL}/criterios-de-selecao` },
  openGraph: {
    title: META_TITLE,
    description: META_DESC,
    url: `${SITE_URL}/criterios-de-selecao`,
    type: 'website',
  },
}

/** As reprovações — critério real da Attra, e o diferencial da página. */
const REPROVA = [
  {
    titulo: 'Veículo de leilão',
    porque:
      'Carro de leilão chega sem histórico confiável de uso e, com frequência, com dano estrutural reparado sem registro. A Attra não aceita, independentemente do estado aparente ou do preço.',
  },
  {
    titulo: 'Histórico com qualquer caráter suspeito',
    porque:
      'Documentação inconsistente, lacuna no histórico de proprietários, divergência entre o que o vendedor conta e o que os registros mostram. Na dúvida, o carro não entra — a dúvida não se resolve depois da venda.',
  },
  {
    titulo: 'Motor com remap ou preparação (stage)',
    porque:
      'Alteração eletrônica de potência muda a solicitação de motor, câmbio e embreagem sem que isso apareça na quilometragem. Anula garantia de fábrica e transfere ao comprador um desgaste que ele não tem como medir.',
  },
  {
    titulo: 'Repintura total',
    porque:
      'Pintura integral refeita esconde o histórico de reparo do veículo — não há como distinguir retoque estético de correção de dano estrutural. Repintura de peça isolada é avaliada caso a caso; a total, não.',
  },
]

/** O que é conferido nos carros que passam pelo primeiro corte. */
const VERIFICACAO = [
  {
    icone: FileCheck,
    titulo: 'Documentação — o primeiro filtro',
    itens: [
      'Conferência física e legal: chassi e motor contra os registros',
      'Gravame, débitos, multas e restrições',
      'Histórico de proprietários e coerência entre eles',
      'Registro de sinistro',
    ],
  },
  {
    icone: Wrench,
    titulo: 'Mecânica e funilaria íntegras',
    itens: [
      'Motor, câmbio e transmissão: fluidos, vazamentos e ruído anormal',
      'Freios, suspensão e direção',
      'Estrutura e pintura: originalidade dos painéis e sinais de reparo',
      'Eletrônica: módulos, sistemas de assistência e diagnóstico',
    ],
  },
]

const DUVIDAS = [
  {
    p: 'Como saber se um carro veio de leilão?',
    r: 'O registro de leilão nem sempre aparece no documento. Os sinais confiáveis estão no histórico: lacunas entre proprietários, transferências em sequência curta, registro de sinistro em consulta e divergência entre o estado do carro e a quilometragem. Consulta de histórico veicular e laudo cautelar são o caminho para confirmar.',
  },
  {
    p: 'Remap tira a garantia do carro?',
    r: 'Sim. A alteração do mapa eletrônico é detectável pela rede autorizada e é motivo de recusa de garantia de fábrica. Além disso, o desgaste adicional de motor, câmbio e embreagem não aparece no hodômetro — quem compra assume um custo que não consegue estimar.',
  },
  {
    p: 'Carro repintado perde valor?',
    r: 'Depende da extensão. Repintura de uma peça isolada, com registro, é comum e tem impacto pequeno. Repintura total é diferente: ela impede distinguir correção estética de reparo estrutural, e por isso desvaloriza e aumenta o risco na revenda.',
  },
  {
    p: 'Quantos pontos tem a inspeção?',
    r: 'A Attra trabalha com critérios de aprovação e reprovação, não com uma contagem fechada de itens. Como referência de mercado, o programa oficial da Porsche para seminovos certificados usa uma verificação de 111 pontos, executada por técnicos credenciados pela fábrica. O que importa na prática é o que reprova um veículo — e isso está listado nesta página.',
  },
]

export default function CriteriosDeSelecaoPage() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${SITE_URL}/criterios-de-selecao#faq`,
    mainEntity: DUVIDAS.map(d => ({
      '@type': 'Question',
      name: d.p,
      acceptedAnswer: { '@type': 'Answer', text: d.r },
    })),
  }

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      <section className="relative py-16 lg:py-24 bg-gradient-to-b from-background to-background-card">
        <Container>
          <Breadcrumb items={[{ label: 'Critérios de seleção' }]} className="mb-8" />
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <span className="text-sm text-primary font-medium uppercase tracking-wider">Procedência</span>
            </div>
            <h1 className="text-3xl lg:text-5xl font-bold text-foreground mb-4 tracking-tight">{TITULO}</h1>
            <p className="text-lg text-foreground-secondary leading-relaxed">
              Toda loja diz que inspeciona. Poucas dizem o que devolvem. Esta página lista os
              critérios que fazem a Attra recusar um veículo — é o que sustenta a palavra
              procedência quando ela aparece num anúncio nosso.
            </p>
          </div>
        </Container>
      </section>

      {/* As reprovações vêm PRIMEIRO: é o conteúdo diferenciado e o que responde
          à dúvida real de quem está prestes a comprar. */}
      <section className="py-12 lg:py-16">
        <Container>
          <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-3">
            O que reprova um veículo
          </h2>
          <p className="text-foreground-secondary mb-8 max-w-3xl">
            Estes critérios são eliminatórios. Não há compensação por preço, raridade ou
            estado aparente: o veículo não entra no estoque.
          </p>
          <div className="space-y-4 max-w-3xl">
            {REPROVA.map(r => (
              <div key={r.titulo} className="bg-background-card border border-border rounded-xl p-5">
                <h3 className="flex items-start gap-2 text-lg font-semibold text-foreground mb-2">
                  <XCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                  {r.titulo}
                </h3>
                <p className="text-foreground-secondary leading-relaxed">{r.porque}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-12 lg:py-16 bg-background-card">
        <Container>
          <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-3">
            O que é conferido nos veículos aprovados
          </h2>
          <p className="text-foreground-secondary mb-8 max-w-3xl">
            A documentação vem primeiro: um carro com pendência documental não chega a ser
            avaliado mecanicamente.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
            {VERIFICACAO.map(v => (
              <div key={v.titulo}>
                <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-3">
                  <v.icone className="w-5 h-5 text-primary" />
                  {v.titulo}
                </h3>
                <ul className="space-y-2">
                  {v.itens.map(i => (
                    <li key={i} className="text-foreground-secondary leading-relaxed pl-4 relative">
                      <span className="absolute left-0 top-2 w-1.5 h-1.5 rounded-full bg-primary/60" />
                      {i}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
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
          <div className="flex flex-wrap gap-3 mb-8">
            {[
              { nome: 'Estoque completo', href: '/veiculos' },
              { nome: 'Garantia e procedência', href: '/garantia-e-procedencia' },
              { nome: 'Onde comprar carros de luxo', href: '/onde-comprar-carros-de-luxo' },
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
            href={getWhatsAppUrl('Olá! Quero entender os critérios de procedência da Attra.')}
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
