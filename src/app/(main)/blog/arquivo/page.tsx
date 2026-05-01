import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { BlogTabs } from '@/components/blog'
import { getBlogPosts } from '@/lib/blog-api'

export const revalidate = 1800

export const metadata: Metadata = {
  title: 'Arquivo do Blog Attra | Todos os artigos',
  description:
    'Acervo completo de artigos, reviews e análises da Attra Veículos. Explore todo o conteúdo editorial sobre superesportivos e carros premium.',
  alternates: { canonical: '/blog/arquivo' },
}

export default async function BlogArchivePage() {
  const breadcrumbItems = [
    { label: 'Blog', href: '/blog' },
    { label: 'Arquivo' },
  ]

  const [educativoPosts, reviewPosts] = await Promise.all([
    getBlogPosts({ type: 'educativo' }),
    getBlogPosts({ type: 'car_review' }),
  ])

  return (
    <main className="bg-background min-h-screen">
      <section className="pt-28 pb-10 bg-gradient-to-b from-background-soft to-background">
        <Container>
          <Breadcrumb items={breadcrumbItems} afterHero />
          <div className="mt-6 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl lg:text-5xl font-bold text-foreground">
                Arquivo do Blog
              </h1>
              <p className="mt-3 text-lg text-foreground-secondary max-w-2xl">
                Todo o conteúdo editorial da Attra reunido em um só lugar.
              </p>
            </div>
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar ao Blog
            </Link>
          </div>
        </Container>
      </section>

      <section className="py-12">
        <Container>
          <BlogTabs educativoPosts={educativoPosts} reviewPosts={reviewPosts} />
        </Container>
      </section>
    </main>
  )
}
