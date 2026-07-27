import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { BlogCardStatic } from '@/components/blog'
import { getBlogPostsPreview } from '@/lib/blog-api'
import { cn } from '@/lib/utils'

export const revalidate = 1800

const PAGE_SIZE = 24

type ArchiveSearchParams = Promise<{ tipo?: string; pagina?: string }>

const TIPO_MAP = { artigos: 'educativo', reviews: 'car_review' } as const
type TipoFiltro = keyof typeof TIPO_MAP

function parseParams(params: { tipo?: string; pagina?: string }) {
  const tipo = (params.tipo === 'artigos' || params.tipo === 'reviews') ? params.tipo as TipoFiltro : undefined
  const pagina = Math.max(1, parseInt(params.pagina || '1', 10) || 1)
  return { tipo, pagina }
}

function archiveHref(tipo: TipoFiltro | undefined, pagina: number): string {
  const qs = new URLSearchParams()
  if (tipo) qs.set('tipo', tipo)
  if (pagina > 1) qs.set('pagina', String(pagina))
  const s = qs.toString()
  return s ? `/blog/arquivo?${s}` : '/blog/arquivo'
}

export async function generateMetadata({ searchParams }: { searchParams: ArchiveSearchParams }): Promise<Metadata> {
  const { tipo, pagina } = parseParams(await searchParams)
  return {
    title: 'Arquivo do Blog Attra | Todos os artigos',
    description:
      'Acervo completo de artigos, reviews e análises da Attra Veículos. Explore todo o conteúdo editorial sobre superesportivos e carros premium.',
    alternates: { canonical: archiveHref(tipo, pagina) },
  }
}

export default async function BlogArchivePage({ searchParams }: { searchParams: ArchiveSearchParams }) {
  const { tipo, pagina } = parseParams(await searchParams)

  const allPosts = await getBlogPostsPreview({ type: tipo ? TIPO_MAP[tipo] : 'all' })
  const totalPages = Math.max(1, Math.ceil(allPosts.length / PAGE_SIZE))
  const page = Math.min(pagina, totalPages)
  const posts = allPosts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const filtros: Array<{ label: string; value: TipoFiltro | undefined }> = [
    { label: 'Todos', value: undefined },
    { label: 'Artigos', value: 'artigos' },
    { label: 'Reviews', value: 'reviews' },
  ]

  return (
    <main className="bg-background min-h-screen">
      <section className="pt-28 pb-10 bg-gradient-to-b from-background-soft to-background">
        <Container>
          <Breadcrumb items={[{ label: 'Blog', href: '/blog' }, { label: 'Arquivo' }]} afterHero />
          <div className="mt-6 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl lg:text-5xl font-bold text-foreground">Arquivo do Blog</h1>
              <p className="mt-3 text-lg text-foreground-secondary max-w-2xl">
                Todo o conteúdo editorial da Attra reunido em um só lugar.
              </p>
            </div>
            <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
              <ArrowLeft className="w-4 h-4" />
              Voltar ao Blog
            </Link>
          </div>
        </Container>
      </section>

      <section className="py-12">
        <Container>
          {/* Filtros por tipo — links server-side, sem JS */}
          <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
            {filtros.map((f) => (
              <Link
                key={f.label}
                href={archiveHref(f.value, 1)}
                className={cn(
                  'px-4 py-2.5 rounded-full text-sm font-medium transition-all whitespace-nowrap',
                  tipo === f.value
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-background-card text-foreground-secondary hover:bg-background-soft hover:text-foreground border border-border'
                )}
              >
                {f.label}
              </Link>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <BlogCardStatic key={post.id} post={post} />
            ))}
          </div>

          {totalPages > 1 && (
            <nav aria-label="Paginação do arquivo" className="mt-12 flex items-center justify-center gap-2">
              {page > 1 && (
                <Link
                  href={archiveHref(tipo, page - 1)}
                  rel="prev"
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-full border border-border text-sm hover:bg-background-soft"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </Link>
              )}
              <span className="text-sm text-foreground-secondary px-3">
                Página {page} de {totalPages}
              </span>
              {page < totalPages && (
                <Link
                  href={archiveHref(tipo, page + 1)}
                  rel="next"
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-full border border-border text-sm hover:bg-background-soft"
                >
                  Próxima
                  <ChevronRight className="w-4 h-4" />
                </Link>
              )}
            </nav>
          )}
        </Container>
      </section>
    </main>
  )
}
