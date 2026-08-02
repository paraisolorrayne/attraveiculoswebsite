import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Container } from '@/components/ui/container'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import {
  getManualAttraTermBySlug,
  getAllManualAttraSlugs,
  manualAttraCategories,
  manualAttraTerms,
} from '@/lib/manual-attra-data'
import { canonicalUrl, pageTitle } from '@/lib/seo/page-metadata'
import { ArrowLeft, ArrowRight, Wrench } from 'lucide-react'

interface ManualAttraTermPageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return getAllManualAttraSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: ManualAttraTermPageProps): Promise<Metadata> {
  const { slug } = await params
  const term = getManualAttraTermBySlug(slug)
  if (!term) return { title: 'Termo não encontrado | Manual Attra' }

  const url = canonicalUrl(`/manual-attra/${term.slug}`)

  return {
    title: pageTitle(term.seo.title),
    description: term.seo.metaDescription,
    openGraph: {
      title: term.seo.title,
      description: term.seo.metaDescription,
      type: 'article',
      url,
    },
    // Canonical autorreferente por padrão. O cluster inteiro de 99 verbetes
    // ficava sem a tag porque `seo.canonical` é opcional e quase nunca vem
    // preenchido; o valor explícito do dado continua com precedência, para o
    // verbete que um dia precise consolidar em outra URL.
    alternates: { canonical: term.seo.canonical ?? url },
  }
}

/**
 * Converts simple markdown (## / ### / - / **bold**) to semantic HTML.
 * Lightweight — no external library needed.
 */
function markdownToHtml(md: string): string {
  return md
    .split('\n')
    .map((line) => {
      if (line.startsWith('### '))
        return `<h3 class="text-lg font-semibold text-foreground mt-8 mb-3">${line.slice(4)}</h3>`
      if (line.startsWith('## '))
        return `<h2 class="text-xl font-bold text-foreground mt-10 mb-4">${line.slice(3)}</h2>`
      if (line.startsWith('- **'))
        return `<li class="ml-4 mb-2 text-foreground-secondary leading-relaxed list-disc">${line
          .slice(2)
          .replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>')}</li>`
      if (line.startsWith('- '))
        return `<li class="ml-4 mb-2 text-foreground-secondary leading-relaxed list-disc">${line.slice(2)}</li>`
      if (line.trim() === '') return ''
      return `<p class="text-foreground-secondary leading-relaxed mb-4">${line.replace(
        /\*\*(.*?)\*\*/g,
        '<strong class="text-foreground">$1</strong>'
      )}</p>`
    })
    .join('\n')
}

export default async function ManualAttraTermPage({ params }: ManualAttraTermPageProps) {
  const { slug } = await params
  const term = getManualAttraTermBySlug(slug)
  if (!term) notFound()

  const category = manualAttraCategories[term.category]
  const bodyHtml = markdownToHtml(term.longDescription)

  // Related terms (same category, excluding current)
  const relatedTerms = manualAttraTerms
    .filter((t) => t.category === term.category && t.id !== term.id)
    .slice(0, 3)

  return (
    <>
      {/* Hero */}
      <section className="pt-28 pb-10 bg-gradient-to-b from-background-soft to-background">
        <Container>
          <Breadcrumb
            items={[
              { label: 'Manual Attra', href: '/manual-attra' },
              { label: term.title },
            ]}
          />
          <div className="mt-8 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full mb-4">
              <span aria-hidden="true">{category.icon}</span>
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                {category.label}
              </span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-5">
              {term.title}
            </h1>
            {/* Answer snippet — optimized for AI Overviews */}
            <p className="text-lg text-foreground-secondary leading-relaxed border-l-4 border-primary/30 pl-4">
              {term.answerSnippet}
            </p>
          </div>
        </Container>
      </section>

      {/* Article body */}
      <section className="py-10 lg:py-14 bg-background">
        <Container>
          <div className="max-w-3xl mx-auto">
            <article
              className="prose-attra"
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
          </div>
        </Container>
      </section>

      {/* FAQ Section */}
      {term.faq.length > 0 && (
        <section className="py-10 bg-background-soft">
          <Container>
            <div className="max-w-3xl mx-auto">
              <h2 className="text-xl font-bold text-foreground mb-6">
                Perguntas frequentes sobre {term.title}
              </h2>
              <div className="space-y-4">
                {term.faq.map((item, i) => (
                  <details
                    key={i}
                    className="group bg-background-card border border-border rounded-xl overflow-hidden"
                  >
                    <summary className="cursor-pointer px-5 py-4 text-foreground font-medium flex items-center justify-between hover:bg-background transition-colors">
                      {item.question}
                      <ArrowRight className="w-4 h-4 text-foreground-secondary group-open:rotate-90 transition-transform" />
                    </summary>
                    <div className="px-5 pb-4 text-foreground-secondary leading-relaxed">
                      {item.answer}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </Container>
        </section>
      )}

      {/* Related terms */}
      {relatedTerms.length > 0 && (
        <section className="py-10 bg-background">
          <Container>
            <div className="max-w-3xl mx-auto">
              <h2 className="text-xl font-bold text-foreground mb-6">
                Outros termos em {category.label}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {relatedTerms.map((rt) => (
                  <Link
                    key={rt.slug}
                    href={`/manual-attra/${rt.slug}`}
                    className="group bg-background-card border border-border rounded-xl p-4 hover:border-primary/40 transition-all"
                  >
                    <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors mb-1">
                      {rt.title}
                    </h3>
                    <p className="text-sm text-foreground-secondary line-clamp-2">
                      {rt.shortDescription}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </Container>
        </section>
      )}

      {/* CTA */}
      <section className="py-14 bg-background-soft">
        <Container>
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Encontre veículos com {term.title} na Attra
            </h2>
            <p className="text-foreground-secondary mb-6">
              Nosso acervo é curado com o rigor técnico que você leu aqui.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link
                href="/veiculos"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors"
              >
                Explorar Veículos Premium
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/manual-attra"
                className="inline-flex items-center gap-2 px-6 py-3 bg-background-card border border-border text-foreground rounded-lg font-semibold hover:border-primary/40 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar ao Manual Attra
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* Schema Markup — Article + FAQPage */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: term.title,
            description: term.answerSnippet,
            url: `https://attraveiculos.com.br/manual-attra/${term.slug}`,
            author: {
              '@type': 'Organization',
              name: 'Attra Veículos',
              url: 'https://attraveiculos.com.br',
            },
            publisher: {
              '@type': 'Organization',
              name: 'Attra Veículos',
              url: 'https://attraveiculos.com.br',
            },
            mainEntityOfPage: {
              '@type': 'WebPage',
              '@id': `https://attraveiculos.com.br/manual-attra/${term.slug}`,
            },
          }),
        }}
      />
      {term.faq.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: term.faq.map((f) => ({
                '@type': 'Question',
                name: f.question,
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: f.answer,
                },
              })),
            }),
          }}
        />
      )}
    </>
  )
}

