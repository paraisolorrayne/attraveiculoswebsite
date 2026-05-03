'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import {
  Calendar, Clock, User, ArrowRight, Gauge, Zap, RotateCcw, Fuel,
  CheckCircle, ChevronLeft, ChevronRight, MessageCircle, Car,
  Shield, TrendingUp, Star, Settings, Disc
} from 'lucide-react'
import type {
  DualBlogPost, CarReviewSpecs, CarReviewFAQ, CarReviewHighlight,
  CarReviewEvaluation, CarReviewGalleryImage
} from '@/types'
import { Container } from '@/components/ui/container'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { formatDate, cn } from '@/lib/utils'
import { ListenToContent } from './listen-to-content'
import { BlogContentRenderer } from './blog-content-renderer'
import { SEOInternalLinks } from './seo-internal-links'

interface CarReviewTemplateProps {
  post: DualBlogPost
}

// ============================================================================
// VEHICLE SPECS TABLE - Ficha técnica consolidada em 2 colunas
// ============================================================================
function VehicleSpecsTable({ specs }: {
  specs?: CarReviewSpecs
}) {
  if (!specs) return null

  // Organizar specs em 2 colunas: Performance e Configuração
  const performanceSpecs = [
    { label: 'Motor', value: specs.engine, icon: Fuel },
    { label: 'Potência', value: specs.power, icon: Zap },
    { label: 'Torque', value: specs.torque, icon: RotateCcw },
    { label: '0-100 km/h', value: specs.acceleration, icon: Gauge },
    { label: 'Velocidade Máxima', value: specs.top_speed, icon: Gauge },
  ].filter(item => item.value && item.value !== 'Consultar')

  const configSpecs = [
    { label: 'Transmissão', value: specs.transmission, icon: Settings },
    { label: 'Tração', value: specs.drivetrain, icon: Car },
    { label: 'Peso', value: specs.weight, icon: Disc },
    { label: 'Pneus', value: specs.tires, icon: Disc },
    { label: 'Freios', value: specs.brakes, icon: Disc },
  ].filter(item => item.value && item.value !== 'Consultar')

  if (performanceSpecs.length === 0 && configSpecs.length === 0) return null

  const renderSpecItem = (item: any) => (
    <div key={item.label} className="flex items-start gap-4 pb-4 border-b border-border/30 last:border-b-0">
      <div className="p-2.5 rounded-lg bg-primary/10 flex-shrink-0">
        <item.icon className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs uppercase tracking-wide text-foreground-secondary/70 mb-1">
          {item.label}
        </p>
        <p className="text-lg font-bold text-foreground" itemProp={
          item.label === 'Motor' ? 'vehicleEngine' :
          item.label === 'Transmissão' ? 'vehicleTransmission' : undefined
        }>
          {item.value}
        </p>
      </div>
    </div>
  )

  return (
    <section
      className="py-14 lg:py-18 bg-background-soft border-b border-border"
      itemScope
      itemType="https://schema.org/Vehicle"
    >
      <Container>
        <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-12">
          Ficha Técnica
        </h2>

        {/* Grid 2 colunas com melhor organização */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {/* Coluna 1: Performance */}
          {performanceSpecs.length > 0 && (
            <div>
              <h3 className="text-sm uppercase tracking-widest font-bold text-primary mb-6">
                Performance
              </h3>
              <div className="space-y-0">
                {performanceSpecs.map(renderSpecItem)}
              </div>
            </div>
          )}

          {/* Coluna 2: Configuração */}
          {configSpecs.length > 0 && (
            <div>
              <h3 className="text-sm uppercase tracking-widest font-bold text-primary mb-6">
                Configuração
              </h3>
              <div className="space-y-0">
                {configSpecs.map(renderSpecItem)}
              </div>
            </div>
          )}
        </div>

        {/* Nota sobre dados */}
        <p className="mt-10 text-sm text-foreground-secondary/70 text-center">
          Especificações fornecidas pelo fabricante. Valores podem variar conforme versão e configuração.
        </p>
      </Container>
    </section>
  )
}

// ============================================================================
// GALLERY CAROUSEL - Galeria com navegação e legendas
// ============================================================================
function GallerySection({
  images,
  brand,
  model
}: {
  images?: string[] | CarReviewGalleryImage[]
  brand?: string
  model?: string
}) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set())

  // Normalizar imagens para formato com legenda
  const allImages: CarReviewGalleryImage[] = (images || []).map((img, i) =>
    typeof img === 'string'
      ? { url: img, alt: `${brand} ${model} - Imagem ${i + 1}` }
      : img
  )

  // Filtrar imagens que falharam ao carregar
  const normalizedImages = allImages.filter((_, i) => !failedImages.has(i))
  const totalImages = normalizedImages.length

  // Clamp activeIndex to valid range when images are filtered
  const safeIndex = Math.min(activeIndex, Math.max(totalImages - 1, 0))

  const goToPrev = () => setActiveIndex(i => i === 0 ? totalImages - 1 : i - 1)
  const goToNext = () => setActiveIndex(i => i === totalImages - 1 ? 0 : i + 1)

  const handleImageError = (originalIndex: number) => {
    setFailedImages(prev => new Set([...prev, originalIndex]))
    if (safeIndex >= totalImages - 1) setActiveIndex(0)
  }

  // Keyboard navigation — hooks MUST be called before any early return
  useEffect(() => {
    if (totalImages === 0) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setActiveIndex(i => i === 0 ? totalImages - 1 : i - 1)
      if (e.key === 'ArrowRight') setActiveIndex(i => i === totalImages - 1 ? 0 : i + 1)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [totalImages])

  // Early return AFTER all hooks
  if (!images || images.length === 0 || normalizedImages.length === 0) return null

  return (
    <section className="py-14 lg:py-18 bg-background-soft border-b border-border">
      <Container>
        <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-10">
          Galeria de Fotos
        </h2>

        {/* Imagem principal com navegação - Carrossel limpo */}
        <div className="relative aspect-[16/9] rounded-2xl overflow-hidden mb-6 group bg-background">
          <Image
            src={normalizedImages[safeIndex].url}
            alt={normalizedImages[safeIndex].alt}
            fill
            className="object-cover"
            priority={safeIndex === 0}
            onError={() => {
              // Find the original index of this image in allImages
              const origIdx = allImages.findIndex(img => img.url === normalizedImages[safeIndex].url)
              if (origIdx >= 0) handleImageError(origIdx)
            }}
          />

          {/* Navegação - Botões melhorados */}
          {normalizedImages.length > 1 && (
            <>
              <button
                onClick={goToPrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60
                           text-white hover:bg-black/80 transition-all duration-200 z-10"
                aria-label="Imagem anterior"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={goToNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60
                           text-white hover:bg-black/80 transition-all duration-200 z-10"
                aria-label="Próxima imagem"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Indicadores de posição (dots) */}
          {normalizedImages.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
              {normalizedImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveIndex(index)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all duration-300",
                    activeIndex === index
                      ? "bg-white w-8"
                      : "bg-white/50 hover:bg-white/70"
                  )}
                  aria-label={`Ir para imagem ${index + 1}`}
                />
              ))}
            </div>
          )}

          {/* Legenda - Melhor posicionamento */}
          {normalizedImages[safeIndex].caption && (
            <div className="absolute top-4 left-4 right-4 p-3 bg-black/60 backdrop-blur-sm rounded-lg">
              <p className="text-white text-sm lg:text-base font-medium">
                {normalizedImages[safeIndex].caption}
              </p>
            </div>
          )}

          {/* Contador de imagens */}
          {normalizedImages.length > 1 && (
            <div className="absolute top-4 right-4 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-full text-white text-xs font-medium">
              {activeIndex + 1} / {totalImages}
            </div>
          )}
        </div>

        {/* Miniaturas - Melhor layout responsivo */}
        {normalizedImages.length > 1 && (
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {normalizedImages.map((img, index) => (
              <button
                key={index}
                onClick={() => setActiveIndex(index)}
                className={cn(
                  "relative flex-shrink-0 w-24 h-16 lg:w-32 lg:h-24 rounded-lg overflow-hidden transition-all border-2",
                  activeIndex === index
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-border opacity-70 hover:opacity-100"
                )}
              >
                <Image
                  src={img.url}
                  alt={img.alt}
                  fill
                  className="object-cover"
                  onError={() => {
                    const origIdx = allImages.findIndex(i => i.url === img.url)
                    if (origIdx >= 0) handleImageError(origIdx)
                  }}
                />
              </button>
            ))}
          </div>
        )}

      </Container>
    </section>
  )
}

// ============================================================================
// FAQ SECTION - Perguntas frequentes para SEO/LLMO
// ============================================================================
function FAQSection({ faqs, brand, model }: {
  faqs?: CarReviewFAQ[]
  brand?: string
  model?: string
}) {
  if (!faqs || faqs.length === 0) return null

  return (
    <section
      className="py-10 lg:py-14 bg-background-soft/50"
      itemScope
      itemType="https://schema.org/FAQPage"
    >
      <Container size="lg">
        <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-8">
          Perguntas Frequentes sobre o {brand} {model}
        </h2>

        <div className="space-y-6">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="p-6 bg-background rounded-2xl border border-border"
              itemScope
              itemProp="mainEntity"
              itemType="https://schema.org/Question"
            >
              <h3
                className="text-lg lg:text-xl font-semibold text-foreground mb-3"
                itemProp="name"
              >
                {faq.question}
              </h3>
              <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                <p
                  className="text-foreground-secondary leading-relaxed"
                  itemProp="text"
                >
                  {faq.answer}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}

// ============================================================================
// OPTIONALS & HIGHLIGHTS - Opcionais e destaques
// ============================================================================
function OptionalsSection({
  optionals,
  highlights
}: {
  optionals?: string[]
  highlights?: CarReviewHighlight[]
}) {
  if ((!optionals || optionals.length === 0) && (!highlights || highlights.length === 0)) {
    return null
  }

  return (
    <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Opcionais */}
      {optionals && optionals.length > 0 && (
        <div className="p-6 bg-background-card rounded-2xl border border-border">
          <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-primary" />
            Opcionais e Equipamentos
          </h3>
          <ul className="space-y-2">
            {optionals.map((item, index) => (
              <li key={index} className="flex items-start gap-2 text-foreground-secondary">
                <span className="text-primary mt-1">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Destaques */}
      {highlights && highlights.length > 0 && (
        <div className="p-6 bg-background-card rounded-2xl border border-border">
          <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-primary" />
            Destaques do Modelo
          </h3>
          <ul className="space-y-2">
            {highlights.map((item, index) => (
              <li key={index} className="flex items-start gap-2 text-foreground-secondary">
                <span className="text-primary mt-1">★</span>
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// ATTRA EVALUATION - Avaliação premium Attra
// ============================================================================
function AttraEvaluationSection({
  evaluation,
  brand,
  model
}: {
  evaluation?: CarReviewEvaluation
  brand?: string
  model?: string
}) {
  // Avaliação padrão se não houver dados
  const defaultEvaluation: CarReviewEvaluation = {
    summary: `Como referência em veículos premium em Uberlândia, Minas Gerais, a Attra Veículos avalia o ${brand} ${model} considerando performance, exclusividade, custo de manutenção e potencial de valorização. Este é um exemplar excepcional para colecionadores e entusiastas exigentes.`,
    highlights: [
      'Performance de referência em sua categoria',
      'Exclusividade garantida no mercado brasileiro',
      'Curadoria Attra com procedência verificada',
      'Potencial de valorização como colecionável',
      'Suporte especializado pós-venda'
    ]
  }

  const eval_ = evaluation || defaultEvaluation

  const potentialLabels = {
    alto: { text: 'Alto potencial de valorização', color: 'text-green-600 dark:text-green-400' },
    medio: { text: 'Potencial moderado de valorização', color: 'text-yellow-600 dark:text-yellow-400' },
    estavel: { text: 'Valor estável no mercado', color: 'text-blue-600 dark:text-blue-400' }
  }

  return (
    <div className="mt-12 p-8 bg-gradient-to-br from-primary/5 via-background-card to-primary/10
                    rounded-2xl border-2 border-primary/20 relative overflow-hidden">
      {/* Badge decorativo */}
      <div className="absolute top-4 right-4">
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary text-white
                         text-xs font-semibold rounded-full uppercase tracking-wide">
          <Shield className="w-3 h-3" />
          Curadoria Attra
        </span>
      </div>

      <h3 className="text-2xl font-bold text-foreground mb-4">
        🏁 Avaliação Attra Veículos
      </h3>

      <p className="text-foreground-secondary leading-relaxed mb-6">
        {eval_.summary}
      </p>

      {/* Highlights */}
      <ul className="space-y-3 mb-6">
        {eval_.highlights.map((item, index) => (
          <li key={index} className="flex items-center gap-3 text-foreground">
            <div className="p-1 rounded-full bg-primary/20">
              <CheckCircle className="w-4 h-4 text-primary" />
            </div>
            <span>{item}</span>
          </li>
        ))}
      </ul>

      {/* Potencial de investimento */}
      {eval_.investment_potential && (
        <div className="flex items-center gap-2 pt-4 border-t border-border">
          <TrendingUp className="w-5 h-5 text-primary" />
          <span className={cn("font-semibold", potentialLabels[eval_.investment_potential].color)}>
            {potentialLabels[eval_.investment_potential].text}
          </span>
        </div>
      )}

      {/* Perfil do cliente */}
      {eval_.target_profile && (
        <p className="mt-4 text-sm text-foreground-secondary italic">
          Perfil ideal: {eval_.target_profile}
        </p>
      )}
    </div>
  )
}

// ============================================================================
// CTA SECTION - Chamadas para ação
// ============================================================================
function CTASection({ brand, model, isPrimary = false }: {
  brand?: string
  model?: string
  isPrimary?: boolean
}) {
  const whatsappNumber = '5534991530174'
  const whatsappMessage = encodeURIComponent(
    `Olá! Vi o ${brand} ${model} no blog da Attra e gostaria de mais informações.`
  )
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`

  return (
    <div className={cn(
      "text-center",
      isPrimary ? "py-16 lg:py-20 bg-gradient-to-b from-background-soft to-background border-t border-border" : "mt-14 pt-10 border-t border-border"
    )}>
      <Container size={isPrimary ? "lg" : undefined}>
        {/* Heading */}
        <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-3">
          Interessado neste veículo?
        </h2>
        <p className="text-lg text-foreground-secondary mb-10 max-w-2xl mx-auto">
          Entre em contato com nossos especialistas para mais informações sobre o {brand} {model} ou explore modelos similares em nosso acervo.
        </p>

        {/* CTA Buttons - Padronizados */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {/* Primary CTA - WhatsApp */}
          <Button asChild size="lg" className="min-h-[52px] text-base font-semibold">
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="w-5 h-5 mr-2" />
              Falar com Especialista
            </a>
          </Button>

          {/* Secondary CTA - Ver Veículos */}
          <Button asChild variant="outline" size="lg" className="min-h-[52px] text-base font-semibold">
            <Link href={`/veiculos?marca=${brand?.toLowerCase()}`}>
              <Car className="w-5 h-5 mr-2" />
              Ver Veículos {brand}
            </Link>
          </Button>

          {/* Tertiary CTA - Solicitar */}
          <Button asChild variant="ghost" size="lg" className="min-h-[52px] text-base font-semibold">
            <Link href="/solicitar-veiculo">
              Solicitar Veículo
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </Container>
    </div>
  )
}

// ============================================================================
// ARTICLE FOOTER - Rodapé com links relacionados
// ============================================================================
function ArticleFooter({ brand }: { brand?: string }) {
  return (
    <footer className="py-10 lg:py-14 border-t border-border">
      <Container>
        <div className="flex flex-col lg:flex-row justify-between gap-8">
          {/* Links para veículos */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Explore Nossos Veículos
            </h3>
            <div className="flex flex-wrap gap-3">
              {brand && (
                <Link
                  href={`/veiculos?marca=${brand.toLowerCase()}`}
                  className="px-4 py-2 bg-background-card rounded-lg border border-border
                             hover:border-primary/40 transition-colors text-sm"
                >
                  Mais {brand}
                </Link>
              )}
              <Link
                href="/veiculos"
                className="px-4 py-2 bg-background-card rounded-lg border border-border
                           hover:border-primary/40 transition-colors text-sm"
              >
                Todos os Veículos
              </Link>
              <Link
                href="/veiculos?categoria=superesportivos"
                className="px-4 py-2 bg-background-card rounded-lg border border-border
                           hover:border-primary/40 transition-colors text-sm"
              >
                Superesportivos
              </Link>
            </div>
          </div>

          {/* Links para outros reviews */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Mais Reviews Attra
            </h3>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/blog?tipo=car_review"
                className="px-4 py-2 bg-primary/10 rounded-lg border border-primary/20
                           hover:bg-primary/20 transition-colors text-sm text-primary"
              >
                Ver Todos os Reviews
              </Link>
              <Link
                href="/blog"
                className="px-4 py-2 bg-background-card rounded-lg border border-border
                           hover:border-primary/40 transition-colors text-sm"
              >
                Blog Attra
              </Link>
            </div>
          </div>
        </div>

        {/* Menção Attra para LLMO */}
        <p className="mt-8 text-sm text-foreground-secondary/70 text-center max-w-3xl mx-auto">
          A <strong className="text-foreground">Attra Veículos</strong> é referência em veículos premium
          e superesportivos em Uberlândia, Minas Gerais. Oferecemos curadoria especializada,
          procedência verificada e suporte completo para colecionadores e entusiastas exigentes.
        </p>
      </Container>
    </footer>
  )
}

// ============================================================================
// MAIN TEMPLATE
// ============================================================================
export function CarReviewTemplate({ post }: CarReviewTemplateProps) {
  const [heroImageError, setHeroImageError] = useState(false)
  const { car_review } = post

  const breadcrumbItems = [
    { label: 'Início', href: '/' },
    { label: 'Blog', href: '/blog' },
    { label: 'Reviews', href: '/blog?tipo=car_review' },
    { label: `${car_review?.brand} ${car_review?.model}` }
  ]

  // Construir subtítulo com informações do veículo
  const vehicleSubtitle = [
    car_review?.year,
    car_review?.version,
    car_review?.status
  ].filter(Boolean).join(' • ')

  return (
    <article
      className="bg-background"
      itemScope
      itemType="https://schema.org/Review"
    >
      {/* ================================================================== */}
      {/* HERO HEADER - Cabeçalho do artigo com hierarquia visual clara */}
      {/* ================================================================== */}
      <section className="pt-28 pb-12 lg:pb-16 bg-gradient-to-b from-background-soft to-background">
        <Container>
          {/* Breadcrumb */}
          <Breadcrumb items={breadcrumbItems} afterHero />

          {/* Brand Badge + Subtítulo - Melhor espaçamento */}
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center px-4 py-1.5 bg-primary text-white rounded-full text-sm font-bold uppercase tracking-wide">
              {car_review?.brand}
            </span>
            {vehicleSubtitle && (
              <span className="text-foreground-secondary font-medium text-sm">
                {vehicleSubtitle}
              </span>
            )}
          </div>

          {/* Título H1 - Principal com melhor hierarquia */}
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground max-w-5xl leading-tight tracking-tight mb-6"
            itemProp="name"
          >
            {post.title}
          </h1>

          {/* Excerpt/Lead - Parágrafo introdutório */}
          <p className="text-lg lg:text-xl text-foreground-secondary max-w-3xl leading-relaxed mb-10 pb-10 border-b border-border/50">
            {post.excerpt}
          </p>

          {/* Meta informações - Melhor organização visual */}
          <div className="flex flex-col sm:flex-row gap-8 mb-10 text-sm">
            {post.author && (
              <div className="flex items-center gap-3" itemProp="author" itemScope itemType="https://schema.org/Person">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-foreground-secondary/70">Autor</p>
                  <span className="font-semibold text-foreground block" itemProp="name">
                    {post.author.name}
                  </span>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-foreground-secondary/70">Publicado</p>
                <time dateTime={post.published_date} itemProp="datePublished" className="font-semibold text-foreground">
                  {formatDate(post.published_date)}
                </time>
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

      {/* ================================================================== */}
      {/* HERO IMAGE - Imagem principal com legenda rica */}
      {/* ================================================================== */}
      {post.featured_image && !post.featured_image.includes('default-cover') && !heroImageError && (
        <section className="relative w-full aspect-[21/9] max-h-[600px] overflow-hidden">
          <Image
            src={post.featured_image}
            alt={post.featured_image_alt || `${car_review?.brand} ${car_review?.model} ${car_review?.year}`}
            fill
            className="object-cover"
            priority
            itemProp="image"
            onError={() => setHeroImageError(true)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />

          {/* Legenda da imagem hero */}
          <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-10">
            <Container>
              <p className="text-white/90 text-sm lg:text-base font-medium">
                {car_review?.brand} {car_review?.model} {car_review?.year}
                {car_review?.color && ` • ${car_review.color}`}
                {car_review?.status && ` • ${car_review.status}`}
              </p>
            </Container>
          </div>
        </section>
      )}

      {/* ================================================================== */}
      {/* ESPECIFICAÇÕES TÉCNICAS - Componente rico semântico */}
      {/* ================================================================== */}
      <VehicleSpecsTable
        specs={car_review?.specs}
      />

      {/* ================================================================== */}
      {/* CTA PRIMÁRIO - Após primeira dobra */}
      {/* ================================================================== */}
      <CTASection brand={car_review?.brand} model={car_review?.model} isPrimary />

      {/* ================================================================== */}
      {/* GALERIA DE FOTOS - Com navegação e legendas */}
      {/* ================================================================== */}
      <GallerySection
        images={car_review?.gallery_images}
        brand={car_review?.brand}
        model={car_review?.model}
      />

      {/* ================================================================== */}
      {/* CONTEÚDO PRINCIPAL - Corpo do artigo longo */}
      {/* ================================================================== */}
      <section className="py-14 lg:py-20">
        <Container size="lg">
          <div className="max-w-3xl mx-auto">
            {/* Conteúdo HTML com tipografia otimizada para leitura longa */}
            <BlogContentRenderer
              content={post.content}
              className="blog-prose"
              itemProp="reviewBody"
            />

            {/* ================================================================== */}
            {/* OPCIONAIS E DESTAQUES */}
            {/* ================================================================== */}
            <OptionalsSection
              optionals={car_review?.optionals}
              highlights={car_review?.highlights}
            />

            {/* ================================================================== */}
            {/* DISPONIBILIDADE NA ATTRA */}
            {/* ================================================================== */}
            {car_review?.availability && (
              <div className="mt-12 p-6 lg:p-8 rounded-2xl border-2 border-primary/30 bg-primary/5">
                <div className="flex items-start justify-between flex-wrap gap-6">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      {car_review.availability.in_stock ? (
                        <>
                          <CheckCircle className="w-6 h-6 text-green-500" />
                          <span className="text-lg font-bold text-green-600 dark:text-green-400">
                            Disponível na Attra Veículos
                          </span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-6 h-6 text-foreground-secondary" />
                          <span className="text-lg font-semibold text-foreground-secondary">
                            Sob Consulta
                          </span>
                        </>
                      )}
                    </div>
                    {car_review.availability.price && (
                      <p className="text-3xl font-bold text-foreground">
                        {car_review.availability.price}
                      </p>
                    )}
                    <p className="mt-2 text-sm text-foreground-secondary">
                      Veículo disponível na Attra Veículos em Uberlândia-MG
                    </p>
                  </div>
                  {car_review.availability.in_stock && car_review.availability.stock_url && (
                    <Button asChild size="lg" className="min-h-[52px]">
                      <Link href={car_review.availability.stock_url}>
                        Ver Detalhes do Veículo
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* ================================================================== */}
            {/* AVALIAÇÃO ATTRA - Card premium reformulado */}
            {/* ================================================================== */}
            <AttraEvaluationSection
              evaluation={car_review?.evaluation}
              brand={car_review?.brand}
              model={car_review?.model}
            />
          </div>
        </Container>
      </section>

      {/* ================================================================== */}
      {/* FAQ - Perguntas Frequentes para SEO/LLMO */}
      {/* ================================================================== */}
      <FAQSection
        faqs={car_review?.faq}
        brand={car_review?.brand}
        model={car_review?.model}
      />

      {/* ================================================================== */}
      {/* CTA FINAL */}
      {/* ================================================================== */}
      <CTASection brand={car_review?.brand} model={car_review?.model} />

      {/* ================================================================== */}
      {/* SEO INTERNAL LINKS — /comprar/ pages */}
      {/* ================================================================== */}
      <SEOInternalLinks
        brand={car_review?.brand}
        model={car_review?.model}
        title={post.title}
      />

      {/* ================================================================== */}
      {/* RODAPÉ DO ARTIGO - Links relacionados */}
      {/* ================================================================== */}
      <ArticleFooter brand={car_review?.brand} />
    </article>
  )
}

