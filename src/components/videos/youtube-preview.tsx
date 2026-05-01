import Link from 'next/link'
import Image from 'next/image'
import { Play, Youtube, ArrowRight, Smartphone, Film } from 'lucide-react'
import type { YouTubeVideo } from '@/lib/youtube'
import { formatDuration } from '@/lib/youtube'
import { cn, formatDate } from '@/lib/utils'

interface YouTubePreviewProps {
  videos: YouTubeVideo[]
  shorts: YouTubeVideo[]
  channelUrl: string
  /** Max long-form videos to display. Default 3. */
  maxVideos?: number
  /** Max shorts to display. Default 4. */
  maxShorts?: number
}

/**
 * Compact preview of the YouTube channel — for use on the /blog page or
 * other places where a full gallery is overkill. Cards link to /videos
 * instead of opening a player inline.
 */
export function YouTubePreview({
  videos,
  shorts,
  channelUrl,
  maxVideos = 3,
  maxShorts = 4,
}: YouTubePreviewProps) {
  const featuredVideos = videos.slice(0, maxVideos)
  const featuredShorts = shorts.slice(0, maxShorts)

  if (featuredVideos.length === 0 && featuredShorts.length === 0) {
    return (
      <div className="text-center py-12 bg-background-soft rounded-2xl border border-border">
        <Youtube className="w-10 h-10 text-primary/60 mx-auto mb-3" />
        <p className="text-foreground-secondary mb-4">
          Acompanhe os bastidores e reviews em vídeo no nosso canal.
        </p>
        <a
          href={channelUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          Abrir canal Attra <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Youtube className="w-5 h-5 text-primary" />
            <span className="text-xs uppercase tracking-widest font-bold text-primary">
              Canal Attra
            </span>
          </div>
          <h2 className="text-2xl lg:text-3xl font-bold text-foreground">
            Reviews, test drives e bastidores
          </h2>
          <p className="text-foreground-secondary mt-2">
            Conteúdo em vídeo direto da concessionária e dos test drives Attra.
          </p>
        </div>
        <Link
          href="/videos"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline shrink-0"
        >
          Ver galeria completa <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {featuredVideos.length > 0 && (
          <div className="lg:col-span-2">
            <h3 className="text-xs uppercase tracking-widest font-bold text-foreground-secondary/70 mb-3 flex items-center gap-2">
              <Film className="w-3.5 h-3.5" />
              Vídeos
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {featuredVideos.map((v, i) => (
                <PreviewCard key={v.id} video={v} aspect="aspect-video" priority={i === 0} />
              ))}
            </div>
          </div>
        )}

        {featuredShorts.length > 0 && (
          <div>
            <h3 className="text-xs uppercase tracking-widest font-bold text-foreground-secondary/70 mb-3 flex items-center gap-2">
              <Smartphone className="w-3.5 h-3.5" />
              Shorts
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {featuredShorts.map(v => (
                <PreviewCard key={v.id} video={v} aspect="aspect-[9/16]" compact />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface PreviewCardProps {
  video: YouTubeVideo
  aspect: string
  compact?: boolean
  priority?: boolean
}

function PreviewCard({ video, aspect, compact = false, priority = false }: PreviewCardProps) {
  return (
    <Link
      href="/videos"
      className="group block bg-background-card rounded-xl overflow-hidden border border-border hover:border-primary/40 transition-colors"
    >
      <div className={cn('relative bg-black overflow-hidden', aspect)}>
        {video.thumbnail ? (
          <Image
            src={video.thumbnail}
            alt={video.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes={compact ? '(max-width: 768px) 50vw, 20vw' : '(max-width: 768px) 100vw, 33vw'}
            unoptimized
            priority={priority}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1a1a2e] to-[#0f3460]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="p-3 rounded-full bg-primary/90 group-hover:bg-primary text-white shadow-lg group-hover:scale-110 transition-all">
            <Play className={compact ? 'w-4 h-4 fill-current' : 'w-5 h-5 fill-current'} />
          </span>
        </div>
        {video.durationSeconds > 0 && (
          <span className="absolute bottom-2 right-2 px-1.5 py-0.5 text-[10px] font-medium text-white bg-black/80 rounded">
            {formatDuration(video.durationSeconds)}
          </span>
        )}
      </div>

      <div className={compact ? 'p-2.5' : 'p-3'}>
        <h4 className={cn(
          'font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors',
          compact ? 'text-xs' : 'text-sm'
        )}>
          {video.title}
        </h4>
        {!compact && video.publishedAt && (
          <p className="text-xs text-foreground-secondary mt-1">
            {formatDate(video.publishedAt)}
          </p>
        )}
      </div>
    </Link>
  )
}
