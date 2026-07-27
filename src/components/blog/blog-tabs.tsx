'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Calendar, Clock, ArrowRight, Tag, Gauge, BookOpen, Car } from 'lucide-react'
import type { BlogPostPreview } from '@/lib/blog-api'
import { cn, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'

type TabType = 'todos' | 'educativo' | 'car_review'

interface BlogTabsProps {
  educativoPosts: BlogPostPreview[]
  reviewPosts: BlogPostPreview[]
}

interface BlogPostCardProps {
  post: BlogPostPreview
}

function hasValidImage(image: string | null | undefined): boolean {
  return !!image && !image.includes('default-cover')
}

function BlogPostCard({ post }: BlogPostCardProps) {
  const isReview = post.post_type === 'car_review'
  const [imageError, setImageError] = useState(false)

  const showImage = hasValidImage(post.featured_image) && !imageError

  return (
    <article className="group bg-background-card rounded-2xl overflow-hidden border border-border hover:border-primary/30 transition-all duration-300 hover:shadow-lg">
      {/* Image */}
      <Link href={`/blog/${post.slug}`} className="block relative aspect-[16/10] overflow-hidden">
        {showImage ? (
          <Image
            src={post.featured_image!}
            alt={post.featured_image_alt || post.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] flex items-center justify-center">
            <Image
              src="/images/logo-white.png"
              alt="Attra Veículos"
              width={160}
              height={48}
              className="opacity-60 group-hover:opacity-80 transition-opacity duration-300"
              unoptimized
            />
          </div>
        )}
        
        {/* Type Badge */}
        <div className="absolute top-4 left-4">
          <span className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm",
            isReview 
              ? "bg-primary/90 text-white" 
              : "bg-white/90 text-foreground dark:bg-background/90"
          )}>
            {isReview ? (
              <>
                <Gauge className="w-3 h-3" />
                Review
              </>
            ) : (
              <>
                <Tag className="w-3 h-3" />
                {post.educativo?.category || 'Artigo'}
              </>
            )}
          </span>
        </div>
      </Link>
      
      {/* Content */}
      <div className="p-5">
        {/* Brand/Model for reviews */}
        {isReview && post.car_review && (
          <p className="text-sm text-primary font-semibold mb-2">
            {post.car_review.brand} {post.car_review.model} • {post.car_review.year}
          </p>
        )}
        
        {/* Title */}
        <Link href={`/blog/${post.slug}`}>
          <h3 className="text-lg font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
            {post.title}
          </h3>
        </Link>
        
        {/* Excerpt */}
        <p className="text-sm text-foreground-secondary line-clamp-2 mb-4">
          {post.excerpt}
        </p>
        
        {/* Meta */}
        <div className="flex items-center justify-between text-xs text-foreground-secondary">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(post.published_date)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {post.reading_time}
            </span>
          </div>
          <Link 
            href={`/blog/${post.slug}`}
            className="text-primary font-medium hover:underline flex items-center gap-1"
          >
            Ler
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </article>
  )
}

export function BlogTabs({ educativoPosts, reviewPosts }: BlogTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('todos')
  
  const allPosts = [...educativoPosts, ...reviewPosts].sort(
    (a, b) => new Date(b.published_date).getTime() - new Date(a.published_date).getTime()
  )
  
  const displayPosts = activeTab === 'todos' 
    ? allPosts 
    : activeTab === 'educativo' 
      ? educativoPosts 
      : reviewPosts

  const tabs: { id: TabType; label: string; icon: React.ReactNode; count: number }[] = [
    { id: 'todos', label: 'Todos', icon: <BookOpen className="w-4 h-4" />, count: allPosts.length },
    { id: 'educativo', label: 'Artigos', icon: <Tag className="w-4 h-4" />, count: educativoPosts.length },
    { id: 'car_review', label: 'Reviews', icon: <Gauge className="w-4 h-4" />, count: reviewPosts.length },
  ]

  return (
    <div>
      {/* Tab Navigation */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all whitespace-nowrap",
              activeTab === tab.id
                ? "bg-primary text-white shadow-md"
                : "bg-background-card text-foreground-secondary hover:bg-background-soft hover:text-foreground border border-border"
            )}
          >
            {tab.icon}
            {tab.label}
            <span className={cn(
              "text-xs px-1.5 py-0.5 rounded-full",
              activeTab === tab.id ? "bg-white/20" : "bg-border"
            )}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>
      
      {/* Posts Grid */}
      {displayPosts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayPosts.map((post) => (
            <BlogPostCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-background-soft rounded-2xl">
          <BookOpen className="w-12 h-12 text-foreground-secondary/40 mx-auto mb-4" />
          <p className="text-foreground-secondary">Nenhum post encontrado nesta categoria.</p>
        </div>
      )}
    </div>
  )
}

