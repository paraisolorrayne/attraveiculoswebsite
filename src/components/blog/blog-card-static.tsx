import Link from 'next/link'
import Image from 'next/image'
import { Calendar, Clock, ArrowRight, Tag, Gauge } from 'lucide-react'
import type { BlogPostPreview } from '@/lib/blog-api'
import { cn, formatDate } from '@/lib/utils'

function hasValidImage(image: string | null | undefined): boolean {
  return !!image && !image.includes('default-cover')
}

export function BlogCardStatic({ post }: { post: BlogPostPreview }) {
  const isReview = post.post_type === 'car_review'
  const showImage = hasValidImage(post.featured_image)

  return (
    <article className="group bg-background-card rounded-2xl overflow-hidden border border-border hover:border-primary/30 transition-all duration-300 hover:shadow-lg">
      <Link href={`/blog/${post.slug}`} className="block relative aspect-[16/10] overflow-hidden">
        {showImage ? (
          <Image
            src={post.featured_image}
            alt={post.featured_image_alt || post.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
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
        <div className="absolute top-4 left-4">
          <span className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm',
            isReview ? 'bg-primary/90 text-white' : 'bg-white/90 text-foreground dark:bg-background/90'
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
      <div className="p-5">
        {isReview && post.car_review && (
          <p className="text-sm text-primary font-semibold mb-2">
            {post.car_review.brand} {post.car_review.model} • {post.car_review.year}
          </p>
        )}
        <Link href={`/blog/${post.slug}`}>
          <h3 className="text-lg font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
            {post.title}
          </h3>
        </Link>
        <p className="text-sm text-foreground-secondary line-clamp-2 mb-4">{post.excerpt}</p>
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
          <span className="text-primary font-medium flex items-center gap-1">
            Ler
            <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </article>
  )
}
