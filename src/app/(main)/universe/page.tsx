import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Container } from '@/components/ui/container'
import { Badge } from '@/components/ui/badge'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Clock, ArrowRight, TrendingUp, Wrench, Sparkles, BookOpen } from 'lucide-react'
import { canonicalUrl } from '@/lib/seo/page-metadata'

export const metadata: Metadata = {
  title: 'Universe Attra | Conteúdo Exclusivo sobre Supercars',
  description: 'Mergulhe no universo dos supercarros. Análises, tendências de mercado, guias de manutenção e histórias exclusivas do mundo automotivo de luxo.',
  alternates: { canonical: canonicalUrl('/universe') },
}

const categories = [
  { slug: 'analises', name: 'Análises', icon: BookOpen, color: 'bg-blue-500' },
  { slug: 'mercado', name: 'Mercado', icon: TrendingUp, color: 'bg-green-500' },
  { slug: 'manutencao', name: 'Manutenção', icon: Wrench, color: 'bg-orange-500' },
  { slug: 'lifestyle', name: 'Lifestyle', icon: Sparkles, color: 'bg-purple-500' },
]

const featuredPost = {
  slug: 'ferrari-sf90-analise-completa',
  title: 'Ferrari SF90 Stradale: O Futuro Híbrido de Maranello',
  excerpt: 'Uma análise profunda do superesportivo híbrido de 1000cv que redefine os limites da tecnologia Ferrari.',
  image: '/blog/ferrari-sf90-featured.jpg',
  category: 'Análises',
  readTime: 12,
  date: '2024-12-15',
}

const posts = [
  {
    slug: 'porsche-gt3-rs-guia-compra',
    title: 'Guia Definitivo: Porsche 911 GT3 RS',
    excerpt: 'Tudo que você precisa saber antes de adquirir o ícone das pistas.',
    image: '/blog/porsche-gt3.jpg',
    category: 'Análises',
    readTime: 8,
    date: '2024-12-10',
  },
  {
    slug: 'mercado-supercars-2025',
    title: 'Tendências do Mercado de Supercars para 2025',
    excerpt: 'Quais modelos devem valorizar e onde estão as melhores oportunidades.',
    image: '/blog/market-trends.jpg',
    category: 'Mercado',
    readTime: 6,
    date: '2024-12-08',
  },
  {
    slug: 'manutencao-lamborghini-huracan',
    title: 'Manutenção Preventiva: Lamborghini Huracán',
    excerpt: 'Cronograma completo e custos estimados para manter seu V10 perfeito.',
    image: '/blog/huracan-maintenance.jpg',
    category: 'Manutenção',
    readTime: 10,
    date: '2024-12-05',
  },
  {
    slug: 'colecao-supercars-investimento',
    title: 'Supercars como Investimento: Mitos e Verdades',
    excerpt: 'Análise de valorização histórica e perspectivas para colecionadores.',
    image: '/blog/investment.jpg',
    category: 'Mercado',
    readTime: 7,
    date: '2024-12-01',
  },
  {
    slug: 'mclaren-750s-primeiro-contato',
    title: 'McLaren 750S: Primeiro Contato',
    excerpt: 'Impressões exclusivas do novo superesportivo britânico.',
    image: '/blog/mclaren-750s.jpg',
    category: 'Análises',
    readTime: 9,
    date: '2024-11-28',
  },
  {
    slug: 'eventos-supercars-brasil-2025',
    title: 'Calendário: Eventos de Supercars no Brasil 2025',
    excerpt: 'Os principais encontros e track days para entusiastas.',
    image: '/blog/events.jpg',
    category: 'Lifestyle',
    readTime: 5,
    date: '2024-11-25',
  },
]

export default function UniversePage() {
  const breadcrumbItems = [{ label: 'Universe Attra', href: '/universe' }]

  return (
    <>
      {/* Hero */}
      <section className="bg-background-soft border-b border-border pt-28 pb-16 lg:pt-32">
        <Container>
          <Breadcrumb items={breadcrumbItems} afterHero />
          <div className="mt-8 max-w-3xl">
            <h1 className="text-5xl lg:text-6xl font-bold text-foreground mb-4">Universe</h1>
            <p className="text-xl text-foreground-secondary">
              Conteúdo exclusivo para quem vive o universo dos supercarros. 
              Análises, tendências e histórias que inspiram.
            </p>
          </div>
          
          {/* Categories */}
          <div className="flex flex-wrap gap-3 mt-8">
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/universe/categoria/${cat.slug}`}
                className="flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-full hover:border-primary transition-colors"
              >
                <cat.icon className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">{cat.name}</span>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      {/* Featured Post */}
      <section className="py-16 bg-background">
        <Container>
          <Link href={`/universe/${featuredPost.slug}`} className="group block">
            <div className="relative aspect-[21/9] rounded-3xl overflow-hidden">
              <Image
                src={featuredPost.image}
                alt={featuredPost.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-8 lg:p-12">
                <Badge variant="primary" className="mb-4">{featuredPost.category}</Badge>
                <h2 className="text-3xl lg:text-5xl font-bold text-foreground mb-4 group-hover:text-primary transition-colors">
                  {featuredPost.title}
                </h2>
                <p className="text-lg text-foreground-secondary max-w-2xl mb-4">{featuredPost.excerpt}</p>
                <div className="flex items-center gap-4 text-sm text-foreground-secondary">
                  <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {featuredPost.readTime} min</span>
                  <span>{new Date(featuredPost.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
              </div>
            </div>
          </Link>
        </Container>
      </section>

      {/* Posts Grid */}
      <section className="py-16 bg-background-soft">
        <Container>
          <h2 className="text-3xl font-bold text-foreground mb-8">Últimas Publicações</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => (
              <Link key={post.slug} href={`/universe/${post.slug}`} className="group">
                <article className="bg-background border border-border rounded-2xl overflow-hidden card-premium h-full flex flex-col">
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <Image src={post.image} alt={post.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute top-4 left-4">
                      <Badge variant="secondary">{post.category}</Badge>
                    </div>
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">{post.title}</h3>
                    <p className="text-foreground-secondary text-sm mb-4 flex-1">{post.excerpt}</p>
                    <div className="flex items-center justify-between text-sm text-foreground-secondary">
                      <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {post.readTime} min</span>
                      <span className="flex items-center gap-1 text-primary group-hover:gap-2 transition-all">Ler mais <ArrowRight className="w-4 h-4" /></span>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </Container>
      </section>
    </>
  )
}

