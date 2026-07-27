# Canal Editorial Attra — Fase -1 + Scaffolding da Fonte de Verdade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Destravar os ~87 posts do acervo (listagem server-rendered e paginada, links internos retroativos, capas da safra âncora) e criar a estrutura da fonte de verdade editorial, sem tocar no pipeline de geração.

**Architecture:** O site é Next.js 16 (App Router, React 19) com posts em Postgres na VPS (Kysely via `src/lib/db`) mesclados a 42 posts WordPress importados estaticamente (`src/lib/imported-blog-posts.ts`). A listagem `/blog/arquivo` já existe mas serializa o `content` integral dos 87 posts para o cliente (payload de 1,38 MB) e o HTML servidor-renderizado sai vazio. O plano cria uma camada "preview" sem `content`, renderiza o grid no servidor com paginação, e adiciona scripts de backfill (links internos, capas) que rodam na VPS. A fonte de verdade nasce como arquivos markdown em `content/editorial/`, ainda **não** ligados ao `gemini-blog.ts` (isso é Fase 2).

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Kysely + pg, Vitest 4, tsx para scripts.

## Global Constraints

- **Fase 2 está fora de escopo:** nenhuma mudança em `gemini-blog.ts`, `vehicle-picker.ts`, `news-guardrails.ts`, `weekly-news-ingestion.ts` ou `daily-blog-ai.ts`. "Calibrar antes de automatizar" — ordem não negociável (spec §Faseamento).
- **Nenhum conteúdo consultivo novo é publicado** antes de o ano de fundação ser fixado (spec §Dados institucionais). Este plano não publica texto novo — só destrava o existente.
- Guard-rails da spec valem para qualquer texto criado nos arquivos da fonte de verdade: nenhum número sem fonte e data; nenhuma crítica nominal a marca/modelo; nenhuma menção a concorrente; nenhum dado identificável de cliente; nenhum superlativo não sustentado ("o melhor", "incomparável", "sem igual").
- Fatos institucionais não confirmados entram nos arquivos marcados como `[PENDENTE-SÓCIOS: ...]`, nunca como afirmação.
- Scripts que escrevem no banco têm `--apply` explícito; sem a flag, rodam em dry-run e apenas reportam. O banco (`DATABASE_URL`) só existe na VPS — scripts devem falhar com mensagem clara quando a env está ausente.
- Convenções do repo: componentes em `src/components/blog/`, testes em `src/lib/__tests__/*.test.ts` (Vitest, environment node), scripts em `scripts/`, path alias `@/` → `src/`.
- Commits em português seguindo o padrão do repo (`feat(blog): ...`, `fix(blog): ...`, `chore(blog): ...`).
- Branch de trabalho: `feat/editorial-fase-menos-1`, criada a partir de `main` atualizada.

## Fatos levantados (não re-derivar)

- Produção (attraveiculos.com.br): `/blog/arquivo` existe e responde 200, mas o HTML sem scripts tem 3,8 KB — zero `<article>`; os 87 posts chegam só no flight payload RSC (1,38 MB) e renderizam no cliente. Posts individuais renderizam bem no servidor (40 KB de HTML, `<h1>` + 50 `<p>`).
- 87 posts publicados: 38 `educativo` + 49 `car_review`. 42 vêm de `imported-blog-posts.ts`, o restante do Postgres (`dual_blog_posts`).
- Safra âncora nov–dez/2025 (eixo "Comprar bem", spec §Triagem "Promover") — 11 posts; slugs em `ANCHOR_POST_SLUGS` na Task 6.
- 8 posts sem capa válida (7 com `/images/blog/default-cover.jpg` — todos da safra âncora — e 1 com campo vazio: `por-que-os-superesportivos-sao-investimentos-inteligentes-em-2026-4br7xj`).
- `getBlogPosts` (src/lib/blog-api.ts) mescla banco + importados, ordena por data, aplica `limit` no fim. `internal-linker.ts` tem `buildLinkIndex`/`linkifyHtml` privados e `addInternalLinks` público que protege tags `a, h1..h6, code, pre, script, style` e limita a 5 links novos.
- `searchParams` em páginas é `Promise<...>` (Next 16) — ver `src/app/(main)/veiculos/page.tsx:55`.

---

### Task 1: Camada de preview em `blog-api` (payload sem `content`)

**Files:**
- Modify: `src/lib/blog-api.ts`
- Test: `src/lib/__tests__/blog-preview.test.ts`

**Interfaces:**
- Consumes: `DualBlogPost` de `@/types`, `getBlogPosts` existente.
- Produces: `interface BlogPostPreview` e `toPreview(post: DualBlogPost): BlogPostPreview` e `getBlogPostsPreview(options?: GetBlogPostsOptions): Promise<BlogPostPreview[]>` — usados nas Tasks 2, 3, 4 e 6.

- [ ] **Step 1: Escrever o teste que falha**

```ts
// src/lib/__tests__/blog-preview.test.ts
import { describe, it, expect } from 'vitest'
import { toPreview } from '@/lib/blog-api'
import type { DualBlogPost } from '@/types'

const fullPost = {
  id: 'x1',
  post_type: 'car_review',
  title: 'Porsche 911 Turbo S 2021',
  slug: 'porsche-911-turbo-s-2021',
  excerpt: 'Resumo curto.',
  content: '<p>' + 'conteudo enorme '.repeat(500) + '</p>',
  featured_image: '/images/blog/capa.jpg',
  featured_image_alt: 'Porsche 911 azul',
  author: { name: 'Attra Veículos' },
  published_date: '2026-07-01T00:00:00.000Z',
  reading_time: '6 min',
  is_published: true,
  car_review: { brand: 'Porsche', model: '911', year: 2021, version: 'Turbo S' },
  seo: { meta_title: 't', meta_description: 'd' },
} as unknown as DualBlogPost

describe('toPreview', () => {
  it('remove content e seo, preserva campos do card', () => {
    const p = toPreview(fullPost)
    expect(p).not.toHaveProperty('content')
    expect(p).not.toHaveProperty('seo')
    expect(p.slug).toBe('porsche-911-turbo-s-2021')
    expect(p.title).toBe('Porsche 911 Turbo S 2021')
    expect(p.excerpt).toBe('Resumo curto.')
    expect(p.featured_image).toBe('/images/blog/capa.jpg')
    expect(p.reading_time).toBe('6 min')
    expect(p.car_review).toEqual({ brand: 'Porsche', model: '911', year: 2021, version: 'Turbo S' })
  })

  it('preserva categoria de post educativo', () => {
    const edu = { ...fullPost, post_type: 'educativo', car_review: undefined, educativo: { category: 'Curadoria', seo_keyword: 'procedência de supercarro' } } as unknown as DualBlogPost
    const p = toPreview(edu)
    expect(p.educativo).toEqual({ category: 'Curadoria', seo_keyword: 'procedência de supercarro' })
    expect(p.car_review).toBeUndefined()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/lib/__tests__/blog-preview.test.ts`
Expected: FAIL — `toPreview` não é exportado.

- [ ] **Step 3: Implementar em `src/lib/blog-api.ts`** (adicionar ao fim do arquivo)

```ts
// ===========================================
// PREVIEW (listagens) — sem `content`/`seo` pra não inflar o payload RSC
// ===========================================

export interface BlogPostPreview {
  id: string
  post_type: BlogPostType
  title: string
  slug: string
  excerpt: string
  featured_image: string
  featured_image_alt: string
  published_date: string
  reading_time: string
  educativo?: { category?: string; seo_keyword?: string }
  car_review?: { brand: string; model: string; year: number; version?: string }
}

export function toPreview(post: DualBlogPost): BlogPostPreview {
  return {
    id: post.id,
    post_type: post.post_type,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    featured_image: post.featured_image,
    featured_image_alt: post.featured_image_alt,
    published_date: post.published_date,
    reading_time: post.reading_time,
    educativo: post.educativo
      ? { category: post.educativo.category, seo_keyword: post.educativo.seo_keyword }
      : undefined,
    car_review: post.car_review
      ? {
          brand: post.car_review.brand,
          model: post.car_review.model,
          year: post.car_review.year,
          version: post.car_review.version,
        }
      : undefined,
  }
}

export async function getBlogPostsPreview(options: GetBlogPostsOptions = {}): Promise<BlogPostPreview[]> {
  const posts = await getBlogPosts(options)
  return posts.map(toPreview)
}
```

Nota: se os campos de `EducativoFields`/`CarReviewFields` em `@/types` divergirem dos nomes acima (conferir antes), ajustar o mapeamento — nunca o teste para "passar de qualquer jeito".

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/lib/__tests__/blog-preview.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/blog-api.ts src/lib/__tests__/blog-preview.test.ts
git commit -m "feat(blog): camada de preview sem content para listagens"
```

---

### Task 2: Card estático server-safe (`blog-card-static.tsx`)

**Files:**
- Create: `src/components/blog/blog-card-static.tsx`
- Modify: `src/components/blog/index.ts` (exportar o novo componente)

**Interfaces:**
- Consumes: `BlogPostPreview` da Task 1.
- Produces: `export function BlogCardStatic({ post }: { post: BlogPostPreview })` — server component (sem `'use client'`, sem estado), usado nas Tasks 3 e 6.

- [ ] **Step 1: Criar o componente**

Reproduzir o visual de `BlogPostCard` (src/components/blog/blog-tabs.tsx:26-124) sem o estado `imageError` — o fallback é decidido só por `hasValidImage`:

```tsx
// src/components/blog/blog-card-static.tsx
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
            {isReview ? (<><Gauge className="w-3 h-3" />Review</>) : (<><Tag className="w-3 h-3" />{post.educativo?.category || 'Artigo'}</>)}
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
            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatDate(post.published_date)}</span>
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{post.reading_time}</span>
          </div>
          <span className="text-primary font-medium flex items-center gap-1">Ler<ArrowRight className="w-3 h-3" /></span>
        </div>
      </div>
    </article>
  )
}
```

- [ ] **Step 2: Exportar em `src/components/blog/index.ts`** (seguir o padrão das linhas existentes)

```ts
export { BlogCardStatic } from './blog-card-static'
```

- [ ] **Step 3: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sem erros novos (erros pré-existentes, se houver, anotar e ignorar).

- [ ] **Step 4: Commit**

```bash
git add src/components/blog/blog-card-static.tsx src/components/blog/index.ts
git commit -m "feat(blog): card estático server-safe para listagens"
```

---

### Task 3: Arquivo paginado e renderizado no servidor

**Files:**
- Modify: `src/app/(main)/blog/arquivo/page.tsx` (reescrever)

**Interfaces:**
- Consumes: `getBlogPostsPreview` (Task 1), `BlogCardStatic` (Task 2).
- Produces: rota `/blog/arquivo?tipo=artigos|reviews&pagina=N` com 24 posts/página, HTML dos cards no server render, `<link rel="canonical">` por página.

- [ ] **Step 1: Reescrever a página**

```tsx
// src/app/(main)/blog/arquivo/page.tsx
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
    description: 'Acervo completo de artigos, reviews e análises da Attra Veículos. Explore todo o conteúdo editorial sobre superesportivos e carros premium.',
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
    { label: `Todos`, value: undefined },
    { label: `Artigos`, value: 'artigos' },
    { label: `Reviews`, value: 'reviews' },
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
                <Link href={archiveHref(tipo, page - 1)} rel="prev" className="inline-flex items-center gap-1 px-4 py-2 rounded-full border border-border text-sm hover:bg-background-soft">
                  <ChevronLeft className="w-4 h-4" />Anterior
                </Link>
              )}
              <span className="text-sm text-foreground-secondary px-3">Página {page} de {totalPages}</span>
              {page < totalPages && (
                <Link href={archiveHref(tipo, page + 1)} rel="next" className="inline-flex items-center gap-1 px-4 py-2 rounded-full border border-border text-sm hover:bg-background-soft">
                  Próxima<ChevronRight className="w-4 h-4" />
                </Link>
              )}
            </nav>
          )}
        </Container>
      </section>
    </main>
  )
}
```

- [ ] **Step 2: Build e verificação local do HTML server-rendered**

```bash
npm run build && (npm start &) && sleep 5
curl -s "http://localhost:3000/blog/arquivo" > /tmp/arquivo-local.html
python3 -c "
import re
html = open('/tmp/arquivo-local.html').read()
body = re.sub(r'<script.*?</script>', '', html, flags=re.S)
print('articles no HTML:', body.count('<article'))
print('bytes payload total:', len(html))
"
kill %1
```

Expected: `articles no HTML: > 0` (localmente sem `DATABASE_URL` só os 42 importados aparecem — o que importa é o grid renderizar no servidor) e payload total muito abaixo de 1,38 MB. Se `articles` continuar 0, investigar antes de seguir (é exatamente o bug de produção — provável fallback de client-render por erro de SSR; diagnosticar com `npm run dev` e olhar o console).

- [ ] **Step 3: Verificar filtro e paginação**

```bash
curl -s "http://localhost:3000/blog/arquivo?tipo=reviews" | grep -c "Review"
curl -s "http://localhost:3000/blog/arquivo?pagina=2" | grep -o "Página 2 de [0-9]*"
```

Expected: contagens coerentes; página 2 existe (42 importados / 24 por página = 2 páginas).

- [ ] **Step 4: Commit**

```bash
git add "src/app/(main)/blog/arquivo/page.tsx"
git commit -m "feat(blog): arquivo paginado renderizado no servidor (payload leve)"
```

---

### Task 4: Dieta de payload na página `/blog`

**Files:**
- Modify: `src/app/(main)/blog/page.tsx:31-35`
- Modify: `src/components/blog/blog-tabs.tsx` (tipos das props)

**Interfaces:**
- Consumes: `getBlogPostsPreview`, `BlogPostPreview` (Task 1).
- Produces: `BlogTabs` passa a aceitar `BlogPostPreview[]` (era `DualBlogPost[]`). Nenhum consumidor além de `/blog` e `/blog/arquivo` (arquivo já não usa após Task 3 — confirmar com `grep -rn "BlogTabs" src/`).

- [ ] **Step 1: Trocar o fetch em `src/app/(main)/blog/page.tsx`**

```tsx
import { getBlogPostsPreview } from '@/lib/blog-api'
// ...
const [educativoPosts, reviewPosts, ytFeed] = await Promise.all([
  getBlogPostsPreview({ type: 'educativo', limit: POSTS_PREVIEW_LIMIT }),
  getBlogPostsPreview({ type: 'car_review', limit: POSTS_PREVIEW_LIMIT }),
  fetchAttraYouTubeFeed(),
])
```

- [ ] **Step 2: Ajustar tipos em `blog-tabs.tsx`**

Trocar `import type { DualBlogPost } from '@/types'` por `import type { BlogPostPreview } from '@/lib/blog-api'` e substituir `DualBlogPost` por `BlogPostPreview` em `BlogTabsProps` e `BlogPostCardProps`. O card não usa `content` nem `seo`, então nada mais muda.

- [ ] **Step 3: Verificar**

Run: `npx tsc --noEmit && npx vitest run`
Expected: sem erros de tipo; testes passam.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(main)/blog/page.tsx" src/components/blog/blog-tabs.tsx
git commit -m "fix(blog): listagem /blog não serializa mais o content integral dos posts"
```

---

### Task 5: Backfill de links internos no acervo (script para VPS)

**Files:**
- Modify: `src/lib/blog-ai/internal-linker.ts` (exportar `buildLinkIndex` e `linkifyHtml`; adicionar parâmetro de cap)
- Create: `scripts/backfill-internal-links.ts`
- Test: `src/lib/__tests__/internal-linker-backfill.test.ts`

**Interfaces:**
- Consumes: `getBlogPosts`, `db` (Kysely, tabela `dual_blog_posts`).
- Produces: `export function buildLinkIndex(posts: DualBlogPost[], excludeSlug: string): LinkTarget[]`; `export function linkifyHtml(html: string, targets: LinkTarget[], maxLinks?: number): { html: string; linksAdded: number }`; script `npx tsx scripts/backfill-internal-links.ts [--apply]`.

- [ ] **Step 1: Escrever o teste que falha**

```ts
// src/lib/__tests__/internal-linker-backfill.test.ts
import { describe, it, expect } from 'vitest'
import { buildLinkIndex, linkifyHtml } from '@/lib/blog-ai/internal-linker'
import type { DualBlogPost } from '@/types'

function post(partial: Record<string, unknown>): DualBlogPost {
  return { is_published: true, published_date: '2026-01-01', ...partial } as unknown as DualBlogPost
}

const acervo = [
  post({ slug: 'porsche-911-review', post_type: 'car_review', car_review: { brand: 'Porsche', model: '911', year: 2021 } }),
  post({ slug: 'guia-procedencia', post_type: 'educativo', educativo: { seo_keyword: 'procedência de supercarro' } }),
]

describe('linkifyHtml (backfill)', () => {
  it('linka termo do acervo no corpo do post', () => {
    const targets = buildLinkIndex(acervo, 'outro-post')
    const { html, linksAdded } = linkifyHtml('<p>O Porsche 911 é referência.</p>', targets)
    expect(linksAdded).toBe(1)
    expect(html).toContain('href="/blog/porsche-911-review"')
  })

  it('não linka dentro de link existente (idempotência)', () => {
    const targets = buildLinkIndex(acervo, 'outro-post')
    const once = linkifyHtml('<p>O Porsche 911 é referência.</p>', targets)
    const twice = linkifyHtml(once.html, targets)
    expect(twice.linksAdded).toBe(0)
    expect(twice.html).toBe(once.html)
  })

  it('respeita cap de links passado (total no post, não por rodada)', () => {
    const targets = buildLinkIndex(acervo, 'outro-post')
    const { linksAdded } = linkifyHtml('<p>Porsche 911 e procedência de supercarro.</p>', targets, 1)
    expect(linksAdded).toBe(1)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/lib/__tests__/internal-linker-backfill.test.ts`
Expected: FAIL — `buildLinkIndex`/`linkifyHtml` não são exportados.

- [ ] **Step 3: Exportar e parametrizar em `internal-linker.ts`**

Adicionar `export` a `buildLinkIndex` e `linkifyHtml` (linhas 21 e 63) e trocar a assinatura/uso do cap:

```ts
export function linkifyHtml(html: string, targets: LinkTarget[], maxLinks: number = MAX_INTERNAL_LINKS): { html: string; linksAdded: number } {
  // ... trocar `linksAdded >= MAX_INTERNAL_LINKS` por `linksAdded >= maxLinks`
```

Exportar também o tipo `LinkTarget`. `addInternalLinks` continua funcionando sem mudança de comportamento (default preservado).

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/lib/__tests__/internal-linker-backfill.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Escrever o script de backfill**

```ts
// scripts/backfill-internal-links.ts
/**
 * Backfill de links internos no acervo do blog (Fase -1 do canal editorial).
 *
 * Roda na VPS (precisa de DATABASE_URL no ambiente):
 *   npx tsx scripts/backfill-internal-links.ts          # dry-run: só reporta
 *   npx tsx scripts/backfill-internal-links.ts --apply  # grava no banco
 *
 * Regras:
 * - Só toca posts do banco (dual_blog_posts). Os 42 posts importados do
 *   WordPress vivem em src/lib/imported-blog-posts.ts e ficam de fora.
 * - Cap TOTAL de 5 links internos por post: desconta os que o post já tem
 *   (class="blog-internal-link"), então re-rodar é seguro.
 */
import { db } from '../src/lib/db'
import { getBlogPosts } from '../src/lib/blog-api'
import { buildLinkIndex, linkifyHtml } from '../src/lib/blog-ai/internal-linker'

const MAX_TOTAL_LINKS = 5

async function main() {
  const apply = process.argv.includes('--apply')
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL ausente — rode este script na VPS (ver src/lib/db/index.ts).')
    process.exit(1)
  }

  const allPosts = await getBlogPosts({ type: 'all' })
  const dbPosts = await db.selectFrom('dual_blog_posts').selectAll().where('is_published', '=', true).execute()
  console.log(`Acervo: ${allPosts.length} posts no índice de termos; ${dbPosts.length} posts do banco elegíveis.`)

  let touched = 0
  let totalAdded = 0
  for (const row of dbPosts) {
    const slug = row.slug as string
    const content = row.content as string
    const existing = (content.match(/class="blog-internal-link"/g) || []).length
    const budget = MAX_TOTAL_LINKS - existing
    if (budget <= 0) continue

    const targets = buildLinkIndex(allPosts, slug)
    const { html, linksAdded } = linkifyHtml(content, targets, budget)
    if (linksAdded === 0) continue

    touched++
    totalAdded += linksAdded
    console.log(`${apply ? 'APLICANDO' : 'dry-run'}: ${slug} +${linksAdded} links (já tinha ${existing})`)
    if (apply) {
      await db.updateTable('dual_blog_posts')
        .set({ content: html, updated_date: new Date() })
        .where('id', '=', row.id)
        .execute()
    }
  }

  console.log(`\n${apply ? 'Gravado' : 'Dry-run'}: ${touched} posts, ${totalAdded} links novos.`)
  await db.destroy()
}

main().catch((err) => { console.error(err); process.exit(1) })
```

Nota: conferir se `db` expõe `destroy()` (Kysely padrão expõe). Se `updated_date` não existir na tabela (conferir `src/lib/db/types.ts`), remover do `set`.

- [ ] **Step 6: Verificar que o script compila e falha limpo sem env**

Run: `npx tsx scripts/backfill-internal-links.ts`
Expected: mensagem "DATABASE_URL ausente" e exit 1. (A execução real é na VPS — item da lista de pendências.)

- [ ] **Step 7: Commit**

```bash
git add src/lib/blog-ai/internal-linker.ts scripts/backfill-internal-links.ts src/lib/__tests__/internal-linker-backfill.test.ts
git commit -m "feat(blog): backfill de links internos no acervo (dry-run/apply, roda na VPS)"
```

---

### Task 6: Promover a safra âncora ("Guias Attra" na `/blog` + prioridade no linker)

**Files:**
- Modify: `src/lib/constants.ts` (adicionar `ANCHOR_POST_SLUGS`)
- Modify: `src/lib/blog-ai/internal-linker.ts` (boost de prioridade para âncoras)
- Modify: `src/app/(main)/blog/page.tsx` (seção "Guias Attra" acima das tabs)
- Test: `src/lib/__tests__/internal-linker-backfill.test.ts` (caso extra)

**Interfaces:**
- Consumes: `getBlogPostsPreview` (Task 1), `BlogCardStatic` (Task 2).
- Produces: `export const ANCHOR_POST_SLUGS: string[]` em `@/lib/constants`, consumido pelo linker e pela página.

- [ ] **Step 1: Adicionar em `src/lib/constants.ts`**

```ts
/**
 * Safra âncora nov–dez/2025 — eixo "Comprar bem" (procedência, curadoria,
 * decisão patrimonial). Promovida a conteúdo âncora pela spec do canal
 * editorial (docs/superpowers/specs/2026-07-24-attra-editorial-design.md,
 * §Triagem "Promover"). Recebe destaque na /blog e prioridade no linker.
 */
export const ANCHOR_POST_SLUGS: string[] = [
  'o-mito-da-baixa-quilometragem-por-que-a-inatividade-e-mais-destrutiva',
  'o-risco-oculto-dos-supercarros-por-que-a-procedencia-e-mais-valiosa-que-a-marca',
  'o-padrao-attra-por-que-a-procedencia-e-o-ativo-mais-valioso-do-seu-supercarro',
  'superesportivo-ou-suv-de-luxo-a-decisao-inteligente-que-protege-seu-patrimonio',
  'o-risco-oculto-em-supercarros-como-garantir-a-procedencia-e-proteger-seu-patrimonio',
  'superesportivos-o-que-nao-te-contam-sobre-a-compra-e-como-a-attra-garante',
  'o-risco-oculto-no-supercarro-dos-seus-sonhos-por-que-a-procedencia-e-mais-importante',
  'a-ilusao-do-supercarro-perfeito-como-a-curadoria-da-attra-protege-seu-investimento',
  'o-guia-definitivo-da-attra-como-garantir-a-procedencia-e-a-seguranca',
  'decisao-patrimonial-ou-impulso-emocional-a-seguranca-na-compra-de-supercarros',
  'a-compra-inteligente-de-um-supercarro-como-a-curadoria-criteriosa-protege',
]
```

**ATENÇÃO:** os slugs acima foram truncados na extração do payload de produção. Antes de commitar, confirmar cada um contra a fonte real: `curl -s https://attraveiculos.com.br/sitemap-blog.xml | grep -o '<loc>[^<]*'` e copiar os slugs completos dos 11 posts de nov–dez/2025. Slug que não bater 1:1 com o sitemap é bug.

- [ ] **Step 2: Teste do boost no linker** (adicionar ao arquivo de teste da Task 5)

```ts
import { ANCHOR_POST_SLUGS } from '@/lib/constants'

describe('boost de âncora', () => {
  it('âncora vence empate contra termo de mesmo comprimento', () => {
    const anchorSlug = ANCHOR_POST_SLUGS[0]
    const posts = [
      post({ slug: anchorSlug, post_type: 'educativo', educativo: { seo_keyword: 'baixa quilometragem' } }),
      post({ slug: 'comum', post_type: 'educativo', educativo: { seo_keyword: 'alta quilometragem' } }),
    ]
    const targets = buildLinkIndex(posts, 'x')
    const anchorTarget = targets.find(t => t.url === `/blog/${anchorSlug}`)!
    const commonTarget = targets.find(t => t.url === '/blog/comum')!
    expect(anchorTarget.priority).toBeGreaterThan(commonTarget.priority)
  })
})
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run src/lib/__tests__/internal-linker-backfill.test.ts`
Expected: FAIL no caso novo (prioridades iguais).

- [ ] **Step 4: Implementar o boost em `buildLinkIndex`**

```ts
import { ANCHOR_POST_SLUGS } from '@/lib/constants'
// dentro do loop de posts, ao montar cada target:
const anchorBoost = ANCHOR_POST_SLUGS.includes(post.slug) ? 20 : 0
// somar anchorBoost à priority de cada target criado para esse post
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run src/lib/__tests__/internal-linker-backfill.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 6: Seção "Guias Attra" na `/blog`** — inserir entre o hero e a seção de posts em `src/app/(main)/blog/page.tsx`:

```tsx
import { ANCHOR_POST_SLUGS, EDITORIAL_SECTION } from '@/lib/constants'
import { getBlogPostsPreview } from '@/lib/blog-api'
import { BlogCardStatic } from '@/components/blog'
// no corpo do componente:
const allPreviews = await getBlogPostsPreview({ type: 'all' })
const anchorPosts = ANCHOR_POST_SLUGS
  .map(slug => allPreviews.find(p => p.slug === slug))
  .filter((p): p is NonNullable<typeof p> => !!p)
  .slice(0, 6)
// JSX, nova <section> após o hero:
{anchorPosts.length > 0 && (
  <section className="py-12 border-b border-border">
    <Container>
      <h2 className="text-2xl lg:text-3xl font-bold text-foreground">Guias Attra: como comprar bem</h2>
      <p className="mt-2 text-foreground-secondary max-w-2xl">
        Procedência, curadoria e decisão patrimonial — o critério da Attra antes de qualquer compra.
      </p>
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {anchorPosts.map(post => <BlogCardStatic key={post.id} post={post} />)}
      </div>
    </Container>
  </section>
)}
```

Nota: os posts âncora estão no banco (não nos importados), então localmente sem `DATABASE_URL` a seção fica vazia — comportamento correto (`anchorPosts.length > 0` esconde a seção).

- [ ] **Step 7: Verificar build**

Run: `npx tsc --noEmit && npm run build`
Expected: sem erros.

- [ ] **Step 8: Commit**

```bash
git add src/lib/constants.ts src/lib/blog-ai/internal-linker.ts "src/app/(main)/blog/page.tsx" src/lib/__tests__/internal-linker-backfill.test.ts
git commit -m "feat(blog): safra de procedência promovida a conteúdo âncora (Guias Attra)"
```

---

### Task 7: Capas para os 8 posts sem imagem (script para VPS)

**Files:**
- Create: `scripts/set-blog-covers.ts`

**Interfaces:**
- Consumes: `db` (tabela `dual_blog_posts`), imagens existentes em `public/about/` e `public/experience/`.
- Produces: script `npx tsx scripts/set-blog-covers.ts [--apply]` que grava `featured_image`/`featured_image_alt` para os slugs mapeados.

- [ ] **Step 1: Escrever o script**

O mapeamento usa fotos reais da Attra já presentes no repo — coerente com a pauta (procedência/curadoria → showroom e acervo próprios). Conferir com `ls public/about public/experience` que cada arquivo existe antes de mapear.

```ts
// scripts/set-blog-covers.ts
/**
 * Define capas para os posts do acervo que estão com default-cover ou sem
 * imagem (Fase -1 do canal editorial). Usa fotos institucionais reais já
 * presentes em public/ — nada de imagem genérica.
 *
 * Roda na VPS: npx tsx scripts/set-blog-covers.ts [--apply]
 */
import fs from 'node:fs'
import path from 'node:path'
import { db } from '../src/lib/db'

// slug (confirmar contra sitemap-blog.xml, como na Task 6) → capa
const COVERS: Record<string, { image: string; alt: string }> = {
  'a-compra-inteligente-de-um-supercarro-como-a-curadoria-criteriosa-protege': {
    image: '/about/attra-colecao-supercarros-showroom.jpg',
    alt: 'Coleção de supercarros no showroom da Attra Veículos',
  },
  'decisao-patrimonial-ou-impulso-emocional-a-seguranca-na-compra-de-supercarros': {
    image: '/about/attra-showroom-moderno-2026.png',
    alt: 'Showroom moderno da Attra Veículos',
  },
  'o-guia-definitivo-da-attra-como-garantir-a-procedencia-e-a-seguranca': {
    image: '/about/attra-showroom-iluminacao-noturna.jpg',
    alt: 'Showroom da Attra Veículos com iluminação noturna',
  },
  'superesportivo-ou-suv-de-luxo-a-decisao-inteligente-que-protege-seu-patrimonio': {
    image: '/experience/attra-estoque.jpg',
    alt: 'Estoque de veículos premium da Attra',
  },
  'o-padrao-attra-por-que-a-procedencia-e-o-ativo-mais-valioso-do-seu-supercarro': {
    image: '/about/attra-primeiro-superesportivo.jpg',
    alt: 'Primeiro superesportivo da história da Attra Veículos',
  },
  'o-mito-da-baixa-quilometragem-por-que-a-inatividade-e-mais-destrutiva': {
    image: '/experience/attra-rondon.jpg',
    alt: 'Veículo da Attra em uso na estrada',
  },
  'o-risco-oculto-dos-supercarros-por-que-a-procedencia-e-mais-valiosa-que-a-marca': {
    image: '/experience/attra-lambo.jpg',
    alt: 'Lamborghini no acervo da Attra Veículos',
  },
  'por-que-os-superesportivos-sao-investimentos-inteligentes-em-2026-4br7xj': {
    image: '/about/attra-equipe-fundadores.jpg',
    alt: 'Equipe fundadora da Attra Veículos',
  },
}

async function main() {
  const apply = process.argv.includes('--apply')
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL ausente — rode este script na VPS.')
    process.exit(1)
  }

  for (const [slug, cover] of Object.entries(COVERS)) {
    const localPath = path.join(process.cwd(), 'public', cover.image)
    if (!fs.existsSync(localPath)) {
      console.error(`ARQUIVO NÃO EXISTE: public${cover.image} (slug ${slug}) — corrigir mapeamento.`)
      process.exitCode = 1
      continue
    }
    const row = await db.selectFrom('dual_blog_posts').select(['id', 'featured_image']).where('slug', '=', slug).executeTakeFirst()
    if (!row) { console.warn(`slug não encontrado no banco: ${slug}`); continue }
    console.log(`${apply ? 'APLICANDO' : 'dry-run'}: ${slug} -> ${cover.image} (antes: ${row.featured_image || '(vazio)'})`)
    if (apply) {
      await db.updateTable('dual_blog_posts')
        .set({ featured_image: cover.image, featured_image_alt: cover.alt })
        .where('id', '=', row.id)
        .execute()
    }
  }
  await db.destroy()
}

main().catch((err) => { console.error(err); process.exit(1) })
```

- [ ] **Step 2: Validar mapeamento localmente**

Run: `ls public/about public/experience` e conferir que todos os 8 arquivos mapeados existem. Depois `npx tsx scripts/set-blog-covers.ts` — Expected: falha limpa por falta de `DATABASE_URL`.

- [ ] **Step 3: Commit**

```bash
git add scripts/set-blog-covers.ts
git commit -m "chore(blog): script de capas para os 8 posts sem imagem (roda na VPS)"
```

---

### Task 8: Scaffolding da fonte de verdade (`content/editorial/`)

**Files:**
- Create: `content/editorial/README.md`
- Create: `content/editorial/voz.md`
- Create: `content/editorial/regras.md`
- Create: `content/editorial/fatos.md`
- Create: `content/editorial/custos.md`
- Create: `content/editorial/glossario.md`
- Create: `content/editorial/formatos/chegada-com-criterio.md`
- Create: `content/editorial/formatos/checklist-de-compra.md`
- Create: `content/editorial/formatos/guia-custo-de-posse.md`
- Create: `content/editorial/publicados.json`

**Interfaces:**
- Consumes: `docs/ATTRA_BRAND_POSITIONING_CONTENT_TASK.md` (ler antes de redigir `voz.md`/`fatos.md`) e a spec.
- Produces: arquivos markdown estáticos. **Nada é importado por código nesta fase** — a ligação com `gemini-blog.ts` é Fase 2.

- [ ] **Step 1: Ler `docs/ATTRA_BRAND_POSITIONING_CONTENT_TASK.md` inteiro** (base obrigatória de `voz.md` e `fatos.md`, spec §Dados institucionais).

- [ ] **Step 2: Criar `README.md`** — explica o que é a fonte de verdade, que ela responde à spec (`docs/superpowers/specs/2026-07-24-attra-editorial-design.md`), que a convenção `[PENDENTE-SÓCIOS: pergunta]` marca fato não confirmado que **bloqueia publicação** de peça que dependa dele, e que na Fase 2 esses arquivos passam a ser carregados em toda geração.

- [ ] **Step 3: Criar `voz.md`** com: posicionamento ("O conselho de quem tem o carro, não de quem quer vender o carro"), os três pilares (critério antes de desejo; conhecimento com sobrenome; honestidade que custa), o filtro do irmão ("Eu recomendaria isso, nesses termos, para o meu irmão?"), decisões de voz (autoria institucional; crítica sem citar modelo), e **pares de exemplo** (mínimo 5 pares "esta frase sim / esta não, e por quê") derivados dos princípios do doc de posicionamento — ex.: ✅ "A revisão dos 20 mil km deste segmento fica entre R$ X e R$ Y (fonte, data)" / ❌ "A manutenção é surpreendentemente acessível" (vago, sem número, tom de vendedor).

- [ ] **Step 4: Criar `regras.md`** com os guard-rails da spec em forma de proibição, verbatim: nenhum número sem fonte e data; nenhuma crítica a marca ou modelo (crítica é sempre de encaixe com perfil de uso); nenhuma menção a concorrente; especificação de veículo vem exclusivamente do feed (campo sem dado é omitido, nunca inferido); nenhum dado identificável de cliente; regras do kart/menor de idade `[PENDENTE-SÓCIOS: acertar com Thiago o que pode aparecer — nome, rosto, resultado]`; nenhum superlativo não sustentado ("o melhor", "incomparável", "sem igual"). Incluir as cinco checagens da revisão humana como checklist final.

- [ ] **Step 5: Criar `fatos.md`** só com fato confirmado ou marcado: localização Uberlândia-MG (confirmado); estrutura familiar, três irmãos sócios (confirmado pela spec); ano de fundação `[PENDENTE-SÓCIOS: 2008, 2009 ou 2010? Site alterna; 2009 daria 17 anos em 2026 — fixar antes de qualquer peça consultiva]`; nomes dos sócios `[PENDENTE-SÓCIOS: confirmar os três nomes; Thiago confirmado]`; critério de curadoria ("cada veículo em estoque poderia ser o carro pessoal de qualquer um dos três" — confirmado pela spec); processo de inspeção `[PENDENTE-SÓCIOS: o que a inspeção cobre, item a item]`; cobertura da garantia `[PENDENTE-SÓCIOS]`.

- [ ] **Step 6: Criar `custos.md`** como esqueleto com o recorte de MG: tabela com colunas `item | categoria de veículo | valor (R$) | fonte | data do dado`, seções (revisão por faixa, seguro por perfil, IPVA por estado — MG primeiro, pneu, desvalorização 24 meses) e a regra no topo: "linha sem fonte e data não existe para efeito de geração". Todas as linhas iniciais como `[PENDENTE-LEVANTAMENTO]`.

- [ ] **Step 7: Criar `glossario.md`** com os primeiros verbetes: "seminovo premium" (não é "usado"), "procedência", "curadoria", "chegada" (unidade que entrou em estoque e passou no filtro), e a instrução de que o glossário define como a Attra usa o termo, não o dicionário.

- [ ] **Step 8: Criar os três templates em `formatos/`** com estrutura fixa da spec §Formatos de pauta:
  - `chegada-com-criterio.md`: a unidade → o que a torna incomum no mercado brasileiro → o que a inspeção verificou `[PENDENTE-SÓCIOS: depende do fatos.md]` → para quem faz sentido → link para o guia de custo do segmento. Regra no template: toda especificação vem do feed; campo sem dado é omitido, nunca inferido.
  - `checklist-de-compra.md`: por item — a pergunta a fazer → por que importa → como verificar na prática → o que uma resposta ruim indica → qual o padrão da Attra naquele item `[PENDENTE-SÓCIOS: validar item a item contra a operação real antes de publicar]`.
  - `guia-custo-de-posse.md`: categoria → custo anual destrinchado em reais (revisão, seguro, IPVA, pneu, imprevisto) → desvalorização observada → para quem esse custo faz sentido → estoque compatível. Regra no template: todo número tem fonte e data no `custos.md`; sem número verificável, o trecho não entra.

- [ ] **Step 9: Criar `publicados.json`** como `[]` com um comentário no README explicando: índice do que já saiu (slug, título, pauta, palavra-chave, data), populado na Fase 2 a partir do acervo triado; evita repetir pauta e canibalizar palavra-chave.

- [ ] **Step 10: Verificar e commitar**

Conferir que nenhum arquivo afirma fato não confirmado sem marcador `[PENDENTE-...]` e que nenhum texto viola os guard-rails que ele próprio define.

```bash
git add content/editorial
git commit -m "feat(editorial): fonte de verdade inicial (voz, regras, fatos, custos, glossario, formatos)"
```

---

### Task 9: Verificação final e limpeza

- [ ] **Step 1: Suíte completa e build**

Run: `npx vitest run && npx tsc --noEmit && npm run build`
Expected: tudo verde.

- [ ] **Step 2: Smoke local das rotas**

`npm start` e conferir `/blog` (seção Guias vazia localmente é esperado — depende do banco), `/blog/arquivo`, `/blog/arquivo?tipo=reviews&pagina=2` e um post individual.

- [ ] **Step 3: Revisão do diff completo**

Run: `git log --oneline main..HEAD && git diff main --stat`
Conferir que nenhum arquivo de Fase 2 (`gemini-blog.ts`, `vehicle-picker.ts`, `news-guardrails.ts`, `weekly-news-ingestion.ts`, `daily-blog-ai.ts`) foi tocado.

---

## Fora do escopo deste plano (fases seguintes da spec)

- Fase 0 além do scaffolding: fixar ano de fundação, validar `fatos.md`, levantar `custos.md` real, critério de noticiabilidade — **bloqueado em decisões dos sócios**.
- Fase 1 (seis a oito peças à mão) e Fase 2 (religar pipeline, aposentar/reescrever `news-guardrails.ts`, migrar `/news`, fila de revisão com cinco checagens).
- Triagem dos ~87 posts (promover/reescrever/despublicar) além da promoção da safra âncora — exige decisão editorial post a post.
- Marcação de origem de lead no formulário/atendimento.
