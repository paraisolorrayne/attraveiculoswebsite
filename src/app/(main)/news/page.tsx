import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Container } from '@/components/ui/container'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Calendar, Newspaper, Trophy, Car, BookOpen, Search } from 'lucide-react'
import { EDITORIAL_SECTION } from '@/lib/constants'
import { db } from '@/lib/db'

// Primary refresh comes from revalidatePath('/news') inside the weekly ingestion job;
// this 1h ISR window is just a safety net in case the cron-triggered revalidate fails.
export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Notícias | Mercado Automotivo Premium e Formula 1',
  description: 'Acompanhe as últimas notícias do mercado automotivo de luxo, supercarros e Formula 1. Curadoria semanal da Attra Veículos.',
  openGraph: {
    title: 'Notícias | Attra Veículos',
    description: 'Curadoria semanal de notícias do mercado automotivo premium e Formula 1.',
  },
}

interface NewsArticle {
  id: string
  slug: string | null
  title: string
  description: string | null
  image_url: string | null
  source_name: string
  original_url: string
  published_at: string
  featured_order: number | null
}

interface NewsData {
  cycle: {
    id: string
    week_start: string
    week_end: string
  } | null
  featured: NewsArticle[]
  formula1: NewsArticle[]
  premiumMarket: NewsArticle[]
}

async function getNews(): Promise<NewsData> {
  try {
    // Get the most recently created active cycle
    const cycleRaw = await db.selectFrom('news_cycles').selectAll()
      .where('is_active', '=', true)
      .orderBy('created_at', 'desc')
      .limit(1)
      .executeTakeFirst()

    if (!cycleRaw) {
      return { cycle: null, featured: [], formula1: [], premiumMarket: [] }
    }

    const cycle = cycleRaw as unknown as { id: string; week_start: string; week_end: string }

    // Get featured articles
    const featuredRaw = await db.selectFrom('news_articles').selectAll()
      .where('news_cycle_id', '=', cycle.id)
      .where('is_featured', '=', true)
      .orderBy('featured_order', 'asc')
      .limit(3).execute()

    // Get Formula 1 articles (category_id = 2)
    const formula1Raw = await db.selectFrom('news_articles').selectAll()
      .where('news_cycle_id', '=', cycle.id)
      .where('category_id', '=', 2)
      .orderBy('published_at', 'desc')
      .limit(9).execute()

    // Get Premium Market articles (category_id = 3)
    const premiumMarketRaw = await db.selectFrom('news_articles').selectAll()
      .where('news_cycle_id', '=', cycle.id)
      .where('category_id', '=', 3)
      .orderBy('published_at', 'desc')
      .limit(9).execute()

    return {
      cycle: {
        id: cycle.id,
        week_start: cycle.week_start,
        week_end: cycle.week_end,
      },
      featured: (featuredRaw as unknown as NewsArticle[]) || [],
      formula1: (formula1Raw as unknown as NewsArticle[]) || [],
      premiumMarket: (premiumMarketRaw as unknown as NewsArticle[]) || [],
    }
  } catch (err) {
    console.error('[news] getNews falhou:', err)
    return { cycle: null, featured: [], formula1: [], premiumMarket: [] }
  }
}

function formatDate(dateString: string | Date): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  })
}

// week_start / week_end are date-only strings ('YYYY-MM-DD'). new Date(str)
// parses them as UTC midnight, so rendering in a negative-offset timezone
// rolled the label back a day ("31 mai" showed as "30 mai"). Parse and render
// in UTC so the stored calendar day is preserved verbatim.
function formatWeekDate(ymd: string): string | null {
  if (!ymd) return null
  const d = new Date(`${ymd}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

// Retorna undefined se as datas forem nulas/inválidas — aí o subtítulo some
// (em vez de mostrar "Invalid Date - Invalid Date").
function formatWeekRange(start: string, end: string): string | undefined {
  const s = formatWeekDate(start)
  const e = formatWeekDate(end)
  if (s && e) return `${s} - ${e}`
  return s || e || undefined
}

function NewsCard({ article, featured = false }: { article: NewsArticle; featured?: boolean }) {
  return (
    <Link
      href={`/news/${article.slug || article.id}`}
      className={`group block bg-background-card border border-border rounded-xl overflow-hidden hover:border-primary/50 transition-all duration-300 ${featured ? 'hover:shadow-xl hover:-translate-y-1' : 'hover:shadow-lg'
        }`}
    >
      <div className={`relative ${featured ? 'aspect-[16/9]' : 'aspect-[16/10]'} bg-background-soft`}>
        {article.image_url ? (
          <Image
            src={article.image_url}
            alt={article.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes={featured ? '(max-width: 768px) 100vw, 33vw' : '(max-width: 768px) 100vw, 25vw'}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Newspaper className="w-12 h-12 text-foreground-secondary/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-3 left-3 right-3">
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-black/50 backdrop-blur-sm rounded text-xs text-white/80">
            <Calendar className="w-3 h-3" />
            {formatDate(article.published_at)}
          </span>
        </div>
      </div>
      <div className="p-4">
        <h3 className={`font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 ${featured ? 'text-lg' : 'text-base'
          }`}>
          {article.title}
        </h3>
        {article.description && (
          <p className="mt-2 text-sm text-foreground-secondary line-clamp-2">{article.description}</p>
        )}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-foreground-secondary">Fonte: {article.source_name}</span>
          <span className="text-xs text-primary font-medium">Ler mais →</span>
        </div>
      </div>
    </Link>
  )
}

function SectionHeader({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="p-2 bg-primary/10 rounded-lg">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div>
        <h2 className="text-xl lg:text-2xl font-bold text-foreground">{title}</h2>
        {subtitle && <p className="text-sm text-foreground-secondary">{subtitle}</p>}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="py-16">
      <div className="max-w-2xl mx-auto text-center">
        {/* Icon */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center p-6 bg-primary/10 rounded-full">
            <Newspaper className="w-16 h-16 text-primary" />
          </div>
        </div>

        {/* Message */}
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
          Notícias em breve
        </h2>
        <p className="text-lg text-foreground-secondary mb-8 max-w-md mx-auto">
          Estamos preparando a curadoria semanal de notícias do mundo automotivo.
          Enquanto isso, explore nosso conteúdo exclusivo.
        </p>

        {/* Suggested Pages */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto">
          <Link
            href={EDITORIAL_SECTION.route}
            className="flex items-center gap-3 p-4 bg-background-card border border-border rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-all group"
          >
            <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-foreground">{EDITORIAL_SECTION.menuLabel}</p>
              <p className="text-xs text-foreground-secondary">Artigos e reviews</p>
            </div>
          </Link>

          <Link
            href="/veiculos"
            className="flex items-center gap-3 p-4 bg-background-card border border-border rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-all group"
          >
            <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
              <Search className="w-5 h-5 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-foreground">Veículos</p>
              <p className="text-xs text-foreground-secondary">Ver veículos</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default async function NewsPage() {
  const news = await getNews()
  const breadcrumbItems = [{ label: 'Notícias', href: '/news' }]
  const hasContent = news.featured.length > 0 || news.formula1.length > 0 || news.premiumMarket.length > 0

  return (
    <main className="bg-background min-h-screen">
      {/* Hero */}
      <section className="pt-28 pb-12 bg-gradient-to-b from-background-soft to-background">
        <Container>
          <Breadcrumb items={breadcrumbItems} afterHero />
          <div className="mt-6 max-w-3xl">
            <h1 className="text-3xl lg:text-5xl font-bold text-foreground">
              Notícias do <span className="text-metallic text-metallic-animate">Mundo Automotivo</span>
            </h1>
            <p className="mt-4 text-lg text-foreground-secondary">
              Curadoria semanal das principais notícias sobre supercarros, Formula 1 e o mercado automotivo premium.
            </p>
          </div>
        </Container>
      </section>

      {!hasContent ? (
        <Container><EmptyState /></Container>
      ) : (
        <>
          {/* Destaques da Semana */}
          {news.featured.length > 0 && (
            <section className="py-12 bg-background-soft">
              <Container>
                <SectionHeader
                  icon={Newspaper}
                  title="Destaques da Semana"
                  subtitle={news.cycle ? formatWeekRange(news.cycle.week_start, news.cycle.week_end) : undefined}
                />
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {news.featured.map((article) => (
                    <NewsCard key={article.id} article={article} featured />
                  ))}
                </div>
              </Container>
            </section>
          )}

          {/* Formula 1 */}
          {news.formula1.length > 0 && (
            <section className="py-12">
              <Container>
                <SectionHeader
                  icon={Trophy}
                  title="Formula 1"
                  subtitle="Últimas notícias do automobilismo"
                />
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {news.formula1.map((article) => (
                    <NewsCard key={article.id} article={article} />
                  ))}
                </div>
              </Container>
            </section>
          )}

          {/* Carros Premium & Mercado */}
          {news.premiumMarket.length > 0 && (
            <section className="py-12 bg-background-soft">
              <Container>
                <SectionHeader
                  icon={Car}
                  title="Carros Premium & Mercado"
                  subtitle="Supercarros, luxo e tendências"
                />
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {news.premiumMarket.map((article) => (
                    <NewsCard key={article.id} article={article} />
                  ))}
                </div>
              </Container>
            </section>
          )}
        </>
      )}
    </main>
  )
}

