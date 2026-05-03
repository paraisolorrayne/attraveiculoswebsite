'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Calendar, Clock, User, ArrowRight, Tag } from 'lucide-react'
import type { DualBlogPost } from '@/types'
import { Container } from '@/components/ui/container'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { ListenToContent } from './listen-to-content'
import { BlogContentRenderer } from './blog-content-renderer'
import { PillarTOC } from './pillar-toc'
import { SEOInternalLinks } from './seo-internal-links'

interface EducativoTemplateProps {
  post: DualBlogPost
}

export function EducativoTemplate({ post }: EducativoTemplateProps) {
  const [heroImageError, setHeroImageError] = useState(false)
  const breadcrumbItems = [
    { label: 'Blog', href: '/blog' },
    { label: post.educativo?.category || 'Artigo', href: `/blog?categoria=${post.educativo?.category?.toLowerCase()}` },
    { label: post.title }
  ]

  return (
    <article className="bg-background">
      {/* Header Section */}
      <section className="pt-28 pb-12 bg-gradient-to-b from-background-soft to-background">
        <Container>
          <Breadcrumb items={breadcrumbItems} afterHero />
          
          {/* Category Badge - Discreto */}
          {post.educativo?.category && (
            <div className="mb-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium">
                <Tag className="w-3.5 h-3.5" />
                {post.educativo.category}
              </span>
            </div>
          )}

          {/* Title - Melhor hierarquia */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground max-w-4xl leading-tight mb-6">
            {post.title}
          </h1>

          {/* Excerpt - Lead paragraph com separador */}
          <p className="text-lg lg:text-xl text-foreground-secondary max-w-3xl leading-relaxed mb-10 pb-10 border-b border-border/50">
            {post.excerpt}
          </p>

          {/* Meta Info - Melhor organização visual */}
          <div className="flex flex-col sm:flex-row gap-8 mb-10 text-sm">
            {post.author && (
              <div className="flex items-center gap-3">
                {post.author.avatar ? (
                  <Image
                    src={post.author.avatar}
                    alt={post.author.name}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                )}
                <div>
                  <p className="text-xs uppercase tracking-wide text-foreground-secondary/70">Autor</p>
                  <span className="font-semibold text-foreground">{post.author.name}</span>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-foreground-secondary/70">Publicado</p>
                <time dateTime={post.published_date} className="font-semibold text-foreground">{formatDate(post.published_date)}</time>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-foreground-secondary/70">Leitura</p>
                <span className="font-semibold text-foreground">{post.reading_time}</span>
              </div>
            </div>
          </div>

          {/* Listen to Content Button */}
          <div>
            <ListenToContent
              content={post.content}
              title={post.title}
            />
          </div>
        </Container>
      </section>

      {/* Featured Image */}
      {post.featured_image && !post.featured_image.includes('default-cover') && !heroImageError && (
        <section className="relative w-full aspect-[21/9] max-h-[500px] overflow-hidden">
          <Image
            src={post.featured_image}
            alt={post.featured_image_alt || post.title}
            fill
            className="object-cover"
            priority
            onError={() => setHeroImageError(true)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent" />
        </section>
      )}

      {/* Pillar TOC — only renders for is_pillar=true */}
      {post.educativo?.is_pillar && post.educativo.pillar_children && (
        <PillarTOC
          intro={post.educativo.pillar_intro}
          items={post.educativo.pillar_children}
        />
      )}

      {/* Content */}
      <section className="py-12 lg:py-16">
        <Container>
          <div className="max-w-3xl mx-auto">
            {/* Article Content */}
            <BlogContentRenderer
              content={post.content}
              className="blog-prose"
            />

            {/* Insights Box */}
            <div className="mt-12 p-6 bg-primary/5 border border-primary/20 rounded-2xl">
              <h3 className="text-xl font-semibold text-foreground mb-3">
                💡 Insight da Attra
              </h3>
              <p className="text-foreground-secondary">
                Nossa expertise em curadoria de veículos premium garante que cada cliente tenha acesso 
                às melhores oportunidades do mercado. Com mais de 14 anos de experiência, sabemos 
                identificar valor onde outros não veem.
              </p>
            </div>

            {/* CTA Section */}
            <div className="mt-12 p-8 bg-background-card rounded-2xl border border-border text-center">
              <h3 className="text-2xl font-bold text-foreground mb-3">
                Procurando seu próximo veículo?
              </h3>
              <p className="text-foreground-secondary mb-6 max-w-lg mx-auto">
                Explore nosso acervo curado de veículos premium ou fale com um consultor especializado.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild size="lg">
                  <Link href="/veiculos">
                    Ver Veículos
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/contato">Falar com Consultor</Link>
                </Button>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* SEO Internal Links — /comprar/ pages */}
      <SEOInternalLinks title={post.title} />
    </article>
  )
}

