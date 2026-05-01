import type { Metadata } from 'next'
import { Container } from '@/components/ui/container'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { ExternalLink, Youtube } from 'lucide-react'
import { fetchAttraYouTubeFeed } from '@/lib/youtube'
import { YouTubeGallery } from '@/components/videos/youtube-gallery'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Vídeos Attra | Reviews e bastidores em vídeo',
  description:
    'Reviews em vídeo, test drives, bastidores e shorts do canal oficial da Attra Veículos no YouTube. Superesportivos, carros premium e curadoria editorial em movimento.',
  keywords: ['vídeos attra', 'attra youtube', 'reviews em vídeo', 'test drive superesportivos', 'shorts attra'],
  openGraph: {
    title: 'Vídeos Attra | Reviews e bastidores em vídeo',
    description: 'Reviews em vídeo, test drives, bastidores e shorts do canal oficial da Attra Veículos.',
    type: 'website',
  },
  alternates: {
    canonical: '/videos',
  },
}

export default async function VideosPage() {
  const feed = await fetchAttraYouTubeFeed()
  const breadcrumbItems = [{ label: 'Vídeos', href: '/videos' }]
  const totalCount = feed.videos.length + feed.shorts.length

  return (
    <main className="bg-background min-h-screen">
      <section className="pt-28 pb-12 bg-gradient-to-b from-background-soft to-background">
        <Container>
          <Breadcrumb items={breadcrumbItems} afterHero />
          <div className="mt-6 flex items-start gap-4 flex-wrap">
            <div className="p-3 rounded-2xl bg-primary/10">
              <Youtube className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl lg:text-5xl font-bold text-foreground">
                Vídeos Attra
              </h1>
              <p className="mt-3 text-lg text-foreground-secondary max-w-2xl">
                Reviews em vídeo, test drives e bastidores do nosso acervo. Acompanhe
                também os <strong className="text-foreground">Shorts</strong> com flagras
                rápidos do dia a dia da concessionária.
              </p>
            </div>
          </div>
        </Container>
      </section>

      <section className="py-10 lg:py-14">
        <Container>
          {feed.error ? (
            <YouTubeFallback channelUrl={feed.channelUrl} reason={feed.error} />
          ) : totalCount === 0 ? (
            <YouTubeFallback channelUrl={feed.channelUrl} reason="Nenhum vídeo retornado pela API." />
          ) : (
            <YouTubeGallery
              videos={feed.videos}
              shorts={feed.shorts}
              channelUrl={feed.channelUrl}
            />
          )}
        </Container>
      </section>
    </main>
  )
}

function YouTubeFallback({ channelUrl, reason }: { channelUrl: string; reason: string }) {
  const isMissingKey = reason.includes('YOUTUBE_API_KEY')
  return (
    <div className="text-center py-16 lg:py-20 bg-background-soft rounded-2xl border border-border">
      <Youtube className="w-14 h-14 text-primary/60 mx-auto mb-5" />
      <h2 className="text-xl lg:text-2xl font-semibold text-foreground mb-3">
        Acesse nosso canal no YouTube
      </h2>
      <p className="text-foreground-secondary max-w-xl mx-auto mb-6">
        {isMissingKey
          ? 'A galeria automática está em configuração. Enquanto isso, assista direto no canal oficial da Attra Veículos.'
          : 'Não foi possível carregar a galeria de vídeos no momento. Você pode assistir direto no canal oficial.'}
      </p>
      <Button asChild size="lg">
        <a href={channelUrl} target="_blank" rel="noopener noreferrer">
          Abrir canal Attra
          <ExternalLink className="w-4 h-4 ml-2" />
        </a>
      </Button>
    </div>
  )
}
