import { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/ui/container'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { glossaryTerms, glossaryCategories } from '@/lib/glossary-data'
import { BookOpen, Search, ArrowRight } from 'lucide-react'
import { canonicalUrl } from '@/lib/seo/page-metadata'

export const metadata: Metadata = {
  title: 'Glossário Automotivo | Termos Técnicos de Supercarros',
  description: 'Glossário completo com termos técnicos do universo automotivo premium. Entenda conceitos como biturbo, downforce, PDK, carbono cerâmico e muito mais.',
  keywords: 'glossário automotivo, termos técnicos carros, biturbo, downforce, PDK, carbono cerâmico, supercarros, veículos premium',
  alternates: { canonical: canonicalUrl('/glossario-automotivo') },
}

// Group terms by first letter
function groupTermsByLetter(terms: typeof glossaryTerms) {
  const grouped: Record<string, typeof glossaryTerms> = {}
  terms.forEach(term => {
    const letter = term.term[0].toUpperCase()
    if (!grouped[letter]) grouped[letter] = []
    grouped[letter].push(term)
  })
  return grouped
}

export default function GlossarioPage() {
  const groupedTerms = groupTermsByLetter(glossaryTerms)
  const letters = Object.keys(groupedTerms).sort()

  return (
    <>
      {/* Hero Section */}
      <section className="pt-28 pb-12 bg-gradient-to-b from-background-soft to-background">
        <Container>
          <Breadcrumb items={[{ label: 'Glossário Automotivo', href: '/glossario-automotivo' }]} />
          <div className="mt-8 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full mb-4">
              <BookOpen className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Glossário</span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Glossário <span className="text-metallic">Automotivo</span>
            </h1>
            <p className="text-lg text-foreground-secondary leading-relaxed">
              Entenda os termos técnicos do universo dos supercarros e veículos premium. 
              De aspirado a wet mode, explicamos cada conceito de forma clara e objetiva.
            </p>
          </div>
        </Container>
      </section>

      {/* Letter Navigation */}
      <section className="py-6 bg-background border-b border-border sticky top-16 z-40">
        <Container>
          <div className="flex flex-wrap gap-2 justify-center">
            {letters.map(letter => (
              <a
                key={letter}
                href={`#letter-${letter}`}
                className="w-10 h-10 flex items-center justify-center rounded-lg bg-background-soft hover:bg-primary hover:text-white text-foreground font-semibold transition-colors"
              >
                {letter}
              </a>
            ))}
          </div>
        </Container>
      </section>

      {/* Terms List */}
      <section className="py-12 lg:py-16 bg-background">
        <Container>
          <div className="max-w-4xl mx-auto space-y-12">
            {letters.map(letter => (
              <div key={letter} id={`letter-${letter}`} className="scroll-mt-32">
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-4xl font-bold text-primary">{letter}</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="space-y-4">
                  {groupedTerms[letter].map(term => {
                    const category = glossaryCategories[term.category]
                    return (
                      <div
                        key={term.slug}
                        id={term.slug}
                        className="bg-background-card border border-border rounded-xl p-6 hover:border-primary/30 transition-colors scroll-mt-32"
                      >
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <h2 className="text-xl font-bold text-foreground">{term.term}</h2>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 rounded-full text-xs font-medium text-primary shrink-0">
                            <span>{category.icon}</span>
                            {category.label}
                          </span>
                        </div>
                        <p className="text-foreground-secondary leading-relaxed">{term.definition}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-background-soft">
        <Container>
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Quer ver esses conceitos na prática?
            </h2>
            <p className="text-foreground-secondary mb-6">
              Explore nossos veículos premium e supercarros e veja a tecnologia de ponta em ação.
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

      {/* Schema Markup */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'DefinedTermSet',
            name: 'Glossário Automotivo Attra Veículos',
            description: 'Glossário de termos técnicos do universo automotivo premium',
            hasDefinedTerm: glossaryTerms.map(term => ({
              '@type': 'DefinedTerm',
              name: term.term,
              description: term.definition,
            })),
          }),
        }}
      />
    </>
  )
}

