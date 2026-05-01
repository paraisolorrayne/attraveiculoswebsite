'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Play, Film, Smartphone, X, ExternalLink } from 'lucide-react'
import type { YouTubeVideo } from '@/lib/youtube'
import { formatDuration } from '@/lib/youtube'
import { cn, formatDate } from '@/lib/utils'

type TabType = 'videos' | 'shorts'

interface YouTubeGalleryProps {
  videos: YouTubeVideo[]
  shorts: YouTubeVideo[]
  channelUrl: string
}

export function YouTubeGallery({ videos, shorts, channelUrl }: YouTubeGalleryProps) {
  const [activeTab, setActiveTab] = useState<TabType>('videos')
  const [playingId, setPlayingId] = useState<string | null>(null)

  const tabs: { id: TabType; label: string; icon: React.ReactNode; count: number }[] = [
    { id: 'videos', label: 'Vídeos', icon: <Film className="w-4 h-4" />, count: videos.length },
    { id: 'shorts', label: 'Shorts', icon: <Smartphone className="w-4 h-4" />, count: shorts.length },
  ]

  const list = activeTab === 'videos' ? videos : shorts
  const isShorts = activeTab === 'shorts'

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setPlayingId(null) }}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all whitespace-nowrap',
                activeTab === tab.id
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-background-card text-foreground-secondary hover:bg-background-soft hover:text-foreground border border-border'
              )}
            >
              {tab.icon}
              {tab.label}
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded-full',
                activeTab === tab.id ? 'bg-white/20' : 'bg-border'
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <a
          href={channelUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          Ver canal no YouTube
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {list.length === 0 ? (
        <div className="text-center py-16 bg-background-soft rounded-2xl">
          <Film className="w-12 h-12 text-foreground-secondary/40 mx-auto mb-4" />
          <p className="text-foreground-secondary">Nenhum {isShorts ? 'short' : 'vídeo'} disponível no momento.</p>
        </div>
      ) : (
        <div className={cn(
          'grid gap-5',
          isShorts
            ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        )}>
          {list.map(video => (
            <VideoCard
              key={video.id}
              video={video}
              isShort={isShorts}
              isPlaying={playingId === video.id}
              onPlay={() => setPlayingId(video.id)}
              onClose={() => setPlayingId(null)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface VideoCardProps {
  video: YouTubeVideo
  isShort: boolean
  isPlaying: boolean
  onPlay: () => void
  onClose: () => void
}

function VideoCard({ video, isShort, isPlaying, onPlay, onClose }: VideoCardProps) {
  const aspectClass = isShort ? 'aspect-[9/16]' : 'aspect-video'
  const embedSrc = `https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0&modestbranding=1`

  return (
    <article className="group bg-background-card rounded-2xl overflow-hidden border border-border hover:border-primary/30 transition-all duration-300">
      <div className={cn('relative overflow-hidden bg-black', aspectClass)}>
        {isPlaying ? (
          <>
            <iframe
              src={embedSrc}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
            <button
              onClick={onClose}
              aria-label="Fechar player"
              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-black z-10"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        ) : (
          <button
            onClick={onPlay}
            className="absolute inset-0 w-full h-full"
            aria-label={`Reproduzir: ${video.title}`}
          >
            {video.thumbnail ? (
              <Image
                src={video.thumbnail}
                alt={video.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                sizes={isShort ? '(max-width: 640px) 50vw, 20vw' : '(max-width: 768px) 100vw, 33vw'}
                unoptimized
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#1a1a2e] to-[#0f3460]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="p-4 rounded-full bg-primary/90 group-hover:bg-primary text-white shadow-lg group-hover:scale-110 transition-all">
                <Play className="w-6 h-6 fill-current" />
              </span>
            </div>
            {video.durationSeconds > 0 && (
              <span className="absolute bottom-2 right-2 px-2 py-0.5 text-xs font-medium text-white bg-black/80 rounded">
                {formatDuration(video.durationSeconds)}
              </span>
            )}
          </button>
        )}
      </div>

      <div className="p-4">
        <h3 className="text-sm lg:text-base font-semibold text-foreground line-clamp-2 mb-1">
          {video.title}
        </h3>
        {video.publishedAt && (
          <p className="text-xs text-foreground-secondary">
            {formatDate(video.publishedAt)}
          </p>
        )}
      </div>
    </article>
  )
}
