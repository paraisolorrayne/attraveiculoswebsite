import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Container } from '@/components/ui/container'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Calendar, ExternalLink, Newspaper, Car, ArrowRight, Sparkles } from 'lucide-react'
import { db } from '@/lib/db'
import { getVehicles } from '@/lib/autoconf-api'
import { VehicleCard } from '@/components/vehicles/vehicle-card'
import { Vehicle } from '@/types'

interface NewsArticle {
  id: string
  slug: string | null
  title: string
  description: string | null
  image_url: string | null
  source_name: string
  original_url: string
  published_at: string
  category_id: number
}

// Lookup por slug; fallback por id (Kysely; ver MIGRACAO_POSTGRES_PURO.md)
async function getArticleBySlug(slug: string): Promise<NewsArticle | null> {
  let data = await db.selectFrom('news_articles').selectAll()
    .where('slug', '=', slug).executeTakeFirst()
  if (!data) {
    try {
      data = await db.selectFrom('news_articles').selectAll()
        .where('id', '=', slug).executeTakeFirst()
    } catch {
      data = undefined
    }
  }
  return (data as unknown as NewsArticle) ?? null
}

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const article = await getArticleBySlug(slug)

  if (!article) {
    return {
      title: 'Notícia não encontrada | Attra Veículos',
      description: 'A notícia solicitada não foi encontrada.',
    }
  }

  return {
    title: `${article.title} | Notícias Attra`,
    description: article.description || 'Leia a notícia completa no portal Attra Veículos.',
    openGraph: {
      title: article.title,
      description: article.description || undefined,
      images: article.image_url ? [{ url: article.image_url }] : [],
    },
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function getCategoryName(categoryId: number): string {
  const categories: Record<number, string> = {
    1: 'Destaques',
    2: 'Formula 1',
    3: 'Carros Premium',
  }
  return categories[categoryId] || 'Notícias'
}

/**
 * Pick 3 highlighted vehicles with good price distribution:
 *   1. Most expensive in the entire inventory (no price filter)
 *   2. Intermediate price between the most expensive and R$ 850.000
 *   3. Near the R$ 850.000 minimum (but not below it)
 *
 * IMPORTANT: Explicit client-side price validation is required because
 * the getVehicles fallback (mock data) does NOT respect the preco_de filter.
 */
const MIN_PREMIUM_PRICE = 850000

async function getFeaturedPremiumVehicles(): Promise<Vehicle[]> {
  try {
    // Fetch a larger batch sorted by price desc — we'll filter & pick client-side
    const result = await getVehicles({
      tipo: 'carros',
      registros_por_pagina: 50,
      ordenar: 'preco',
      ordem: 'desc',
    })

    // Sort client-side to guarantee correct order (fallback data may not be sorted)
    const allVehicles = [...result.vehicles].sort((a, b) => (b.price || 0) - (a.price || 0))

    if (allVehicles.length === 0) return []

    // Vehicle 1: Most expensive in the entire inventory (no price restriction)
    const mostExpensive = allVehicles[0]

    // Vehicles 2 & 3: MUST have price >= R$ 850.000 — explicit client-side validation
    const premiumVehicles = allVehicles.filter(
      v => v.id !== mostExpensive.id && v.price >= MIN_PREMIUM_PRICE
    )

    // Need at least 2 premium vehicles for positions 2 and 3
    if (premiumVehicles.length < 2) return []

    // Pick intermediate (middle of the sorted premium list) and near-minimum (last = closest to R$ 850k)
    const medianIndex = Math.floor(premiumVehicles.length / 2)
    const intermediate = premiumVehicles[medianIndex]
    const nearMinimum = premiumVehicles[premiumVehicles.length - 1]

    // Final safety check: ensure positions 2 and 3 are >= R$ 850k
    if (intermediate.price < MIN_PREMIUM_PRICE || nearMinimum.price < MIN_PREMIUM_PRICE) {
      return []
    }

    // If intermediate and nearMinimum are the same vehicle, pick a different one
    if (intermediate.id === nearMinimum.id && premiumVehicles.length >= 2) {
      return [mostExpensive, premiumVehicles[0], nearMinimum]
    }

    return [mostExpensive, intermediate, nearMinimum]
  } catch (error) {
    console.error('[NewsArticle] Failed to fetch featured vehicles:', error)
    return []
  }
}

export default async function NewsArticlePage({ params }: PageProps) {
  const { slug } = await params
  const article = await getArticleBySlug(slug)

  if (!article) {
    notFound()
  }

  const [breadcrumbItems, featuredVehicles] = await Promise.all([
    Promise.resolve([
      { label: 'Notícias', href: '/news' },
      { label: getCategoryName(article.category_id) },
    ]),
    getFeaturedPremiumVehicles(),
  ])

  return (
    <main className="min-h-screen bg-background">
      {/* Hero Image */}
      <div className="relative w-full h-[40vh] lg:h-[50vh] bg-background-soft">
        {article.image_url ? (
          <Image
            src={article.image_url}
            alt={article.title}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Newspaper className="w-24 h-24 text-foreground-secondary/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
      </div>

      <Container className="relative -mt-32 z-10 pb-16">
        <Breadcrumb items={breadcrumbItems} />

        <article className="mt-6 max-w-3xl mx-auto">
          {/* Category & Date */}
          <div className="flex items-center gap-4 mb-4">
            <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
              {getCategoryName(article.category_id)}
            </span>
            <span className="flex items-center gap-1.5 text-foreground-secondary text-sm">
              <Calendar className="w-4 h-4" />
              {formatDate(article.published_at)}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground leading-tight mb-6">
            {article.title}
          </h1>

          {/* Source Attribution */}
          <div className="flex items-center gap-2 p-4 bg-background-soft border border-border rounded-lg mb-8">
            <Newspaper className="w-5 h-5 text-primary" />
            <span className="text-foreground-secondary">Fonte:</span>
            <span className="font-medium text-foreground">{article.source_name}</span>
          </div>

          {/* Description */}
          {article.description && (
            <div className="prose prose-lg max-w-none mb-8">
              <p className="text-foreground-secondary text-lg leading-relaxed">
                {article.description}
              </p>
            </div>
          )}

          {/* CTA to Original */}
          <div className="bg-background-card border border-border rounded-xl p-6 text-center mb-8">
            <p className="text-foreground-secondary mb-4">
              Para ler a matéria completa, acesse a fonte original:
            </p>
            <Button asChild size="lg">
              <Link href={article.original_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-5 h-5 mr-2" />
                Ler no {article.source_name}
              </Link>
            </Button>
          </div>

          {/* Últimos Veículos em Destaque */}
          {featuredVehicles.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-xl lg:text-2xl font-bold text-foreground">
                  Últimos Veículos em Destaque
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {featuredVehicles.map((vehicle) => (
                  <VehicleCard key={vehicle.id} vehicle={vehicle} />
                ))}
              </div>
            </div>
          )}

          {/* CTA Veículos */}
          <div className="bg-gradient-to-br from-primary via-primary to-primary-hover rounded-2xl p-8 lg:p-10 text-center mb-8 relative overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

            <div className="relative z-10">
              <div className="inline-flex items-center justify-center p-3 bg-white/10 rounded-full mb-5">
                <Car className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl lg:text-3xl font-bold text-white mb-3">
                Apaixonado por carros premium?
              </h3>
              <p className="text-white/80 max-w-md mx-auto mb-6 leading-relaxed">
                Explore nosso acervo exclusivo de supercarros e veículos de luxo. A Attra traz o melhor do mundo automotivo para você.
              </p>
              <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90 font-semibold text-lg px-8 py-6">
                <Link href="/veiculos">
                  Explorar Veículos Premium
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </article>
      </Container>
    </main>
  )
}

