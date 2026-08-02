import { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/ui/container'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import {
  manualAttraTerms,
  manualAttraCategories,
  type ManualAttraCategory,
} from '@/lib/manual-attra-data'
import { canonicalUrl } from '@/lib/seo/page-metadata'
import { BookOpen, ArrowRight, Wrench } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Manual Attra: Engenharia e Performance | Guia de Excelência Automotiva',
  description:
    'Curadoria técnica de termos e tecnologias do universo automotivo premium. PTS Porsche, Ad Personam Lamborghini, suspensão ativa, PDK/DSG e mais — explicados para quem entende de carros.',
  keywords:
    'manual attra, glossário premium, PTS Porsche, Ad Personam Lamborghini, suspensão ativa, PDK, DSG, dupla embreagem, vistoria cautelar, carros premium',
  openGraph: {
    title: 'Manual Attra: Engenharia e Performance',
    description:
      'Curadoria técnica de termos e tecnologias do universo automotivo premium.',
    type: 'website',
    url: canonicalUrl('/manual-attra'),
  },
  alternates: { canonical: canonicalUrl('/manual-attra') },
}

const categoryOrder: ManualAttraCategory[] = [
  'performance',
  'estetica-detailing',
  'seguranca-blindagem',
  'procedencia-documentacao',
  'personalizacao-fabrica',
]

export default function ManualAttraIndexPage() {
  return (
    <>
      {/* Hero */}
      <section className="pt-28 pb-12 bg-gradient-to-b from-background-soft to-background">
        <Container>
          <Breadcrumb
            items={[
              { label: 'Manual Attra: Engenharia e Performance', href: '/manual-attra' },
            ]}
          />
          <div className="mt-8 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full mb-4">
              <Wrench className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                Guia de Excelência
              </span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Manual Attra:{' '}
              <span className="text-primary">Engenharia e Performance</span>
            </h1>
            <p className="text-lg text-foreground-secondary leading-relaxed">
              Curadoria técnica dos termos, tecnologias e certificações que definem um veículo
              de alto valor. Cada verbete foi elaborado para quem toma decisões de compra
              informadas — e exige contexto, não simplificação.
            </p>
          </div>
        </Container>
      </section>

      {/* Category sections */}
      <section className="py-12 lg:py-16 bg-background">
        <Container>
          <div className="max-w-5xl mx-auto space-y-16">
            {categoryOrder.map((catKey) => {
              const cat = manualAttraCategories[catKey]
              const terms = manualAttraTerms
                .filter((t) => t.category === catKey)
                .sort((a, b) => a.displayOrder - b.displayOrder)

              if (terms.length === 0) return null

              return (
                <div key={catKey} id={catKey}>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl" aria-hidden="true">{cat.icon}</span>
                    <h2 className="text-2xl font-bold text-foreground">{cat.label}</h2>
                  </div>
                  <p className="text-foreground-secondary mb-6">{cat.description}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {terms.map((term) => (
                      <Link
                        key={term.slug}
                        href={`/manual-attra/${term.slug}`}
                        className="group bg-background-card border border-border rounded-xl p-5 hover:border-primary/40 transition-all duration-200"
                      >
                        <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors mb-1.5">
                          {term.title}
                        </h3>
                        <p className="text-sm text-foreground-secondary leading-relaxed line-clamp-2">
                          {term.shortDescription}
                        </p>
                        <span className="inline-flex items-center gap-1 text-xs text-primary font-medium mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          Ler no Manual Attra
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </Container>
      </section>

      {/* CTA */}
      <section className="py-16 bg-background-soft">
        <Container>
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Veja estas tecnologias nos veículos Attra
            </h2>
            <p className="text-foreground-secondary mb-6">
              Cada veículo do nosso acervo é selecionado com o rigor técnico que você leu
              aqui. Explore nossos veículos e encontre o seu próximo carro.
            </p>
            <Link
              href="/veiculos"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors"
            >
              Explorar Veículos Premium
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </Container>
      </section>

      {/* Schema Markup — DefinedTermSet */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'DefinedTermSet',
            name: 'Manual Attra: Engenharia e Performance',
            description:
              'Curadoria técnica de termos e tecnologias do universo automotivo premium.',
            url: 'https://attraveiculos.com.br/manual-attra',
            hasDefinedTerm: manualAttraTerms.map((term) => ({
              '@type': 'DefinedTerm',
              name: term.title,
              description: term.answerSnippet,
              url: `https://attraveiculos.com.br/manual-attra/${term.slug}`,
            })),
          }),
        }}
      />
    </>
  )
}

