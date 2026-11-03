import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Container } from '@/components/ui/container'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { BlogCardStatic } from '@/components/blog/blog-card-static'
import { getBlogPostsPreview } from '@/lib/blog-api'
import {
  CATEGORIAS_DO_BLOG, ORDEM_DAS_CATEGORIAS, POSTS_POR_PAGINA,
  enderecoDaCategoria, postsDaCategoria, type CategoriaDoBlog,
} from '@/lib/blog-categorias'
import { canonicalUrl, IMAGEM_COMPARTILHAMENTO, pageTitle } from '@/lib/seo/page-metadata'
import { cn } from '@/lib/utils'

export type ParametrosDaLista = Promise<{ pagina?: string }>

function lerPagina(bruto?: string): number {
  return Math.max(1, parseInt(bruto || '1', 10) || 1)
}

async function carregar(categoria: CategoriaDoBlog, pagina: number) {
  const posts = postsDaCategoria(await getBlogPostsPreview({ type: 'all' }), categoria)
  const totalDePaginas = Math.max(1, Math.ceil(posts.length / POSTS_POR_PAGINA))
  return { posts, totalDePaginas, daPagina: posts.slice((pagina - 1) * POSTS_POR_PAGINA, pagina * POSTS_POR_PAGINA) }
}

/**
 * Metadados de /blog/{categoria}. As rotas ficam fora de blog/(lista)/, sem o
 * loading.tsx de lá: com ele, a página além da última respondia 200.
 */
export async function metadadosDaCategoria(categoria: CategoriaDoBlog, parametros: ParametrosDaLista): Promise<Metadata> {
  const pagina = lerPagina((await parametros).pagina)
  const { totalDePaginas } = await carregar(categoria, pagina)
  if (pagina > totalDePaginas) notFound()
  const dados = CATEGORIAS_DO_BLOG[categoria]
  const url = canonicalUrl(enderecoDaCategoria(categoria, pagina))
  const titulo = pagina > 1 ? `${dados.titulo}, página ${pagina}` : dados.titulo
  return {
    title: pageTitle(titulo),
    description: dados.descricao,
    alternates: { canonical: url },
    openGraph: { title: titulo, description: dados.descricao, url, type: 'website', images: [IMAGEM_COMPARTILHAMENTO] },
  }
}

/** Listagem de uma categoria do blog, paginada no servidor com links de verdade. */
export async function ListaDaCategoria({ categoria, parametros }: { categoria: CategoriaDoBlog; parametros: ParametrosDaLista }) {
  const pagina = lerPagina((await parametros).pagina)
  const { posts, totalDePaginas, daPagina } = await carregar(categoria, pagina)
  if (pagina > totalDePaginas) notFound()
  const dados = CATEGORIAS_DO_BLOG[categoria]

  return (
    <main className="bg-background min-h-screen">
      <section className="pt-28 pb-10 bg-gradient-to-b from-background-soft to-background">
        <Container>
          <Breadcrumb items={[{ label: 'Blog', href: '/blog' }, { label: dados.rotulo, href: enderecoDaCategoria(categoria) }]} afterHero />
          <h1 className="mt-6 text-3xl lg:text-5xl font-bold text-foreground">{dados.titulo}</h1>
          <p className="mt-3 text-lg text-foreground-secondary max-w-2xl">{dados.introducao}</p>
          <p className="mt-2 text-sm text-foreground-secondary">{posts.length} publicações</p>
        </Container>
      </section>

      <section className="py-12">
        <Container>
          <NavegacaoDoBlog atual={categoria} />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {daPagina.map(post => <BlogCardStatic key={post.id} post={post} />)}
          </div>

          {totalDePaginas > 1 && (
            <nav aria-label={`Páginas de ${dados.rotulo}`} className="mt-12 flex flex-wrap items-center justify-center gap-2">
              {pagina > 1 && (
                <Link href={enderecoDaCategoria(categoria, pagina - 1)} rel="prev" className="inline-flex items-center gap-1 px-4 py-2 rounded-full border border-border text-sm hover:bg-background-soft">
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </Link>
              )}
              {Array.from({ length: totalDePaginas }, (_, i) => i + 1).map(n => (
                <Link
                  key={n}
                  href={enderecoDaCategoria(categoria, n)}
                  aria-current={n === pagina ? 'page' : undefined}
                  className={cn(
                    'min-w-10 px-3 py-2 rounded-full text-center text-sm border',
                    n === pagina ? 'bg-primary text-white border-primary' : 'border-border hover:bg-background-soft',
                  )}
                >
                  {n}
                </Link>
              ))}
              {pagina < totalDePaginas && (
                <Link href={enderecoDaCategoria(categoria, pagina + 1)} rel="next" className="inline-flex items-center gap-1 px-4 py-2 rounded-full border border-border text-sm hover:bg-background-soft">
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

/**
 * As categorias como links de servidor, que o Google segue (as abas de /blog
 * são estado de cliente). `atual` ausente = o arquivo com todos os posts.
 */
export function NavegacaoDoBlog({ atual }: { atual?: CategoriaDoBlog | 'todos' }) {
  const itens = [
    { rotulo: 'Todos', href: '/blog/arquivo', chave: 'todos' },
    ...ORDEM_DAS_CATEGORIAS.map(c => ({ rotulo: CATEGORIAS_DO_BLOG[c].rotulo, href: enderecoDaCategoria(c), chave: c })),
  ]
  return (
    <nav aria-label="Categorias do blog" className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
      {itens.map(item => (
        <Link
          key={item.chave}
          href={item.href}
          aria-current={atual === item.chave ? 'page' : undefined}
          className={cn(
            'px-4 py-2.5 rounded-full text-sm font-medium transition-all whitespace-nowrap',
            atual === item.chave
              ? 'bg-primary text-white shadow-md'
              : 'bg-background-card text-foreground-secondary hover:bg-background-soft hover:text-foreground border border-border',
          )}
        >
          {item.rotulo}
        </Link>
      ))}
    </nav>
  )
}
