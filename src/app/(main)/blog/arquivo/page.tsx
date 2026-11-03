import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, permanentRedirect } from 'next/navigation'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { BlogCardStatic } from '@/components/blog'
import { getBlogPostsPreview } from '@/lib/blog-api'
import { canonicalUrl, IMAGEM_COMPARTILHAMENTO, pageTitle } from '@/lib/seo/page-metadata'
import { enderecoDaCategoria } from '@/lib/blog-categorias'
import { NavegacaoDoBlog } from '@/components/blog/lista-da-categoria'

// Rota é dinâmica (searchParams); o cache fica na camada de dados
// (getBlogPostsPreview usa unstable_cache com revalidate de 30 min)
const PAGE_SIZE = 24

type ArchiveSearchParams = Promise<{ tipo?: string; pagina?: string }>

// Filtros antigos (?tipo=), hoje redirect para a página da categoria.
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

async function totalPagesFor(tipo: TipoFiltro | undefined): Promise<number> {
  const posts = await getBlogPostsPreview({ type: tipo ? TIPO_MAP[tipo] : 'all' })
  return Math.max(1, Math.ceil(posts.length / PAGE_SIZE))
}

export async function generateMetadata({ searchParams }: { searchParams: ArchiveSearchParams }): Promise<Metadata> {
  const { tipo, pagina } = parseParams(await searchParams)
  // O filtro por tipo virou página de categoria com endereço próprio
  // (/blog/artigos, /blog/reviews).
  if (tipo) permanentRedirect(enderecoDaCategoria(tipo, pagina))
  // Página além da última é 404. O arquivo saiu de blog/(lista)/ em 02/11/2026:
  // com o loading.tsx de lá, o 404 daqui saía como 200 (soft 404).
  if (pagina > await totalPagesFor(tipo)) notFound()
  const url = canonicalUrl(archiveHref(tipo, pagina))
  const description = 'Acervo completo de artigos, reviews e comparativos da Attra Veículos sobre superesportivos e carros premium, do mais recente ao mais antigo.'
  return {
    title: pageTitle(pagina > 1 ? `Arquivo do Blog Attra, página ${pagina}` : 'Arquivo do Blog Attra'),
    description,
    alternates: { canonical: url },
    openGraph: { title: 'Arquivo do Blog Attra', description, url, type: 'website', images: [IMAGEM_COMPARTILHAMENTO] },
  }
}

export default async function BlogArchivePage({ searchParams }: { searchParams: ArchiveSearchParams }) {
  const { tipo, pagina } = parseParams(await searchParams)
  // Também aqui: página e metadados rodam juntos, e o 404 da página de categoria
  // inexistente no arquivo chegaria antes do redirect.
  if (tipo) permanentRedirect(enderecoDaCategoria(tipo, pagina))

  const allPosts = await getBlogPostsPreview({ type: tipo ? TIPO_MAP[tipo] : 'all' })
  const totalPages = Math.max(1, Math.ceil(allPosts.length / PAGE_SIZE))
  // Página além do total é 404 — servir a última com canonical própria criaria
  // infinitas URLs duplicadas auto-canonicalizadas
  if (pagina > totalPages) notFound()
  const page = pagina
  const posts = allPosts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

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
          <NavegacaoDoBlog atual="todos" />

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
