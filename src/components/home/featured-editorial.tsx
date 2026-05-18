'use client'

import { useRef, useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, BookOpen, Newspaper } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { Button } from '@/components/ui/button'

const WINE = '#A8302E'

/**
 * Imagem editorial com fallback resiliente. Quando o src original 404'a
 * (caso típico em ambientes onde os assets ainda não foram subidos), o
 * Next/Image dispara onError e renderizamos um placeholder branded em
 * vez do ícone padrão de imagem quebrada do navegador.
 */
function ArticleImage({ src, alt, category }: { src: string; alt: string; category: string }) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div
        className="absolute inset-0 flex flex-col items-center justify-center
                   bg-gradient-to-br from-[#1a1a1a] via-[#0f0f0f] to-[#000]"
        aria-hidden
      >
        <Newspaper className="w-10 h-10 mb-3" style={{ color: WINE }} />
        <span
          className="text-[10px] uppercase tracking-[0.32em] font-medium"
          style={{ color: WINE }}
        >
          {category}
        </span>
        <span className="text-white/30 text-xs mt-2 font-light tracking-[0.2em] uppercase">
          Attra Editorial
        </span>
      </div>
    )
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      className="object-cover group-hover:scale-105 transition-transform duration-300"
      onError={() => setFailed(true)}
    />
  )
}

const featuredArticles = [
  {
    id: 1,
    title: 'Porsche 911 Carrera GTS: A Fusão Perfeita entre Tradição e Performance',
    excerpt: 'Conheça os detalhes técnicos e a aerodinâmica que fazem do 911 GTS um ícone entre supercarros de performance.',
    category: 'Performance',
    readTime: '5 min',
    image: '/images/blog-featured-1.jpg',
    slug: 'porsche-911-carrera-gts',
  },
  {
    id: 2,
    title: 'RS6 Avant: Potência Familiar em Forma de Obra de Arte',
    excerpt: 'Por que a Audi RS6 Avant conquistou colecionadores exigentes e como a curadoria Attra seleciona os melhores exemplares.',
    category: 'Curadoria',
    readTime: '7 min',
    image: '/images/blog-featured-2.jpg',
    slug: 'rs6-avant-curadoria',
  },
  {
    id: 3,
    title: 'Importar vs Nacionais: Qual Supercar Escolher para Sua Coleção?',
    excerpt: 'Análise completa sobre as vantagens de cada segmento e como o câmbio, conservação e revenda diferem entre modelos.',
    category: 'Insights',
    readTime: '6 min',
    image: '/images/blog-featured-3.jpg',
    slug: 'importar-vs-nacionais',
  },
]

export function FeaturedEditorial() {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true)
      },
      { threshold: 0.1 }
    )
    if (sectionRef.current) observer.observe(sectionRef.current)

    // Fallback: garante que o conteúdo aparece mesmo sem scroll (mobile)
    const timeout = setTimeout(() => setIsVisible(true), 1500)

    return () => {
      observer.disconnect()
      clearTimeout(timeout)
    }
  }, [])

  return (
    <section
      ref={sectionRef}
      className="py-24 lg:py-32 bg-background"
      id="destaque-editorial"
    >
      <Container size="2xl">
        {/* Section Header */}
        <div className={`mb-16 opacity-0 ${isVisible ? 'animate-fade-in-up' : ''}`}>
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="w-6 h-6 text-primary" />
            <span className="text-primary font-medium tracking-wide uppercase text-sm">Destaque Editorial</span>
          </div>
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-4xl lg:text-5xl font-bold text-foreground mb-4">
                Conhecimento e Inspiração por Trás de Cada Veículo
              </h2>
              <p className="text-foreground-secondary text-lg leading-relaxed">
                Artigos aprofundados sobre performance, curadoria, história e tendências no mercado de supercarros.
              </p>
            </div>
            <Button asChild size="lg" variant="outline">
              <Link href="/blog" className="flex items-center gap-2 justify-center md:justify-start">
                Acessar Blog Completo <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Featured Articles Grid */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {featuredArticles.map((article, index) => (
            <Link
              key={article.id}
              href={`/blog/${article.slug}`}
              className={`group bg-background-card border border-border rounded-2xl overflow-hidden hover:border-primary/40 transition-all
                opacity-0 ${isVisible ? `animate-fade-in-up stagger-${index + 1}` : ''}`}
            >
              {/* Image Container */}
              <div className="relative w-full h-48 lg:h-56 overflow-hidden bg-background-soft">
                <ArticleImage
                  src={article.image}
                  alt={article.title}
                  category={article.category}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              {/* Content */}
              <div className="p-6 lg:p-8">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold text-primary uppercase tracking-wider bg-primary/10 px-3 py-1 rounded-full">
                    {article.category}
                  </span>
                  <span className="text-xs text-foreground-secondary">{article.readTime}</span>
                </div>

                <h3 className="text-lg lg:text-xl font-bold text-foreground leading-tight mb-3 group-hover:text-primary transition-colors line-clamp-2">
                  {article.title}
                </h3>

                <p className="text-foreground-secondary text-sm lg:text-base leading-relaxed line-clamp-2 mb-4">
                  {article.excerpt}
                </p>

                <span className="inline-flex items-center gap-2 text-primary font-medium text-sm group-hover:gap-3 transition-all">
                  Leia mais <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  )
}
