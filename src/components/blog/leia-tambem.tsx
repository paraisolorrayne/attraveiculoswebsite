import { Container } from '@/components/ui/container'
import { BlogCardStatic } from '@/components/blog/blog-card-static'
import type { BlogPostPreview } from '@/lib/blog-api'

/**
 * Três posts da mesma marca ou categoria no fim de cada post (handoff de SEO
 * de 02/11/2026). Antes, o post do Hummer não linkava nenhum outro, e 111
 * páginas só existiam no sitemap. A escolha está em `leiaTambem`.
 */
export function LeiaTambem({ posts }: { posts: BlogPostPreview[] }) {
  if (posts.length === 0) return null
  return (
    <section aria-labelledby="leia-tambem" className="py-12 lg:py-16 border-t border-border">
      <Container className="max-w-[max(80%,1280px)]">
        <h2 id="leia-tambem" className="text-2xl lg:text-3xl font-bold text-foreground">Leia também</h2>
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map(post => <BlogCardStatic key={post.id} post={post} />)}
        </div>
      </Container>
    </section>
  )
}
