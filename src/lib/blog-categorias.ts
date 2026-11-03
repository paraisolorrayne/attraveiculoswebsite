/**
 * Categorias do blog com endereço próprio e o "Leia também" dos posts
 * (handoff de SEO de 02/11/2026, Tarefa 2).
 *
 * As abas de /blog (Todos, Artigos, Reviews) são estado de cliente e o Google
 * não as segue; com ~19 posts na página e o resto só no sitemap, o Ahrefs via
 * os posts como órfãos. Cada categoria agora é uma página paginada no servidor
 * (/blog/artigos, /blog/reviews, /blog/comparativos), e cada post linka três
 * outros da mesma marca ou categoria.
 */

import type { BlogPostPreview } from '@/lib/blog-api'
import { SEO_BRANDS } from '@/lib/seo-brands'

export type CategoriaDoBlog = 'artigos' | 'reviews' | 'comparativos'

export interface DadosDaCategoria {
  rotulo: string
  titulo: string
  descricao: string
  introducao: string
}

export const CATEGORIAS_DO_BLOG: Record<CategoriaDoBlog, DadosDaCategoria> = {
  artigos: {
    rotulo: 'Artigos',
    titulo: 'Artigos sobre carros de luxo e superesportivos',
    descricao: 'Artigos do Blog Attra sobre compra, manutenção, procedência e mercado de carros de luxo e superesportivos, escritos por quem vende esses carros desde 2008.',
    introducao: 'Guias de compra, manutenção, procedência e mercado: o que a Attra aprendeu vendendo carros de luxo e superesportivos.',
  },
  reviews: {
    rotulo: 'Reviews',
    titulo: 'Reviews de carros de luxo e superesportivos',
    descricao: 'Reviews do Blog Attra: motor, desempenho, versões e o que observar na compra de cada carro de luxo e superesportivo que passou pela Attra Veículos.',
    introducao: 'Motor, desempenho, versões e o que observar antes de comprar, carro a carro.',
  },
  comparativos: {
    rotulo: 'Comparativos',
    titulo: 'Comparativos entre carros de luxo',
    descricao: 'Comparativos do Blog Attra entre carros de luxo e superesportivos: desempenho, conforto, custo de manutenção e para quem cada um faz mais sentido.',
    introducao: 'Dois carros lado a lado: desempenho, conforto, custo de manter e para quem cada um faz mais sentido.',
  },
}

export const ORDEM_DAS_CATEGORIAS: CategoriaDoBlog[] = ['artigos', 'reviews', 'comparativos']

const COMPARATIVO = /\bvs\.?\b/i

export function categoriaDoPost(post: Pick<BlogPostPreview, 'post_type' | 'title' | 'slug'>): CategoriaDoBlog {
  if (post.post_type !== 'car_review') return 'artigos'
  return COMPARATIVO.test(post.title) || post.slug.includes('-vs-') ? 'comparativos' : 'reviews'
}

export function postsDaCategoria(todos: BlogPostPreview[], categoria: CategoriaDoBlog): BlogPostPreview[] {
  return todos.filter(p => categoriaDoPost(p) === categoria)
}

/** Posts por página nas listagens de categoria e no arquivo. */
export const POSTS_POR_PAGINA = 24

/** Endereço de uma página de categoria; a 1ª não leva `pagina`. */
export function enderecoDaCategoria(categoria: CategoriaDoBlog, pagina = 1): string {
  return pagina > 1 ? `/blog/${categoria}?pagina=${pagina}` : `/blog/${categoria}`
}

/** Marcas fora de /comprar que aparecem nos títulos do blog. */
const OUTRAS_MARCAS = ['Hummer', 'GMC', 'RAM', 'Toyota', 'Tesla', 'Cadillac', 'Volvo', 'Jeep', 'Ford', 'Dodge', 'Maserati', 'Bugatti', 'Pagani', 'Koenigsegg', 'Lexus', 'Mini', 'Jaguar']

const MARCAS: { chave: string; padrao: RegExp }[] = [
  ...SEO_BRANDS.map(b => ({ chave: b.slug, nomes: [b.name, b.displayName, b.slug.replace(/-/g, ' ')] })),
  { chave: 'mercedes-benz', nomes: ['Mercedes', 'AMG'] },
  { chave: 'land-rover', nomes: ['Range Rover', 'Defender'] },
  ...OUTRAS_MARCAS.map(nome => ({ chave: nome.toLowerCase(), nomes: [nome] })),
].map(({ chave, nomes }) => ({
  chave,
  padrao: new RegExp(`\\b(?:${nomes.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'i'),
}))

/** Marcas citadas no post: a do review e as do título. */
export function marcasDoPost(post: Pick<BlogPostPreview, 'title' | 'car_review'>): Set<string> {
  const texto = `${post.car_review?.brand ?? ''} ${post.title}`
  return new Set(MARCAS.filter(m => m.padrao.test(texto)).map(m => m.chave))
}

/**
 * Três posts para o "Leia também": primeiro os que citam a mesma marca, depois
 * os da mesma categoria; o mais recente desempata.
 */
export function leiaTambem(atual: BlogPostPreview, todos: BlogPostPreview[], limite = 3): BlogPostPreview[] {
  const marcas = marcasDoPost(atual)
  const categoria = categoriaDoPost(atual)
  return todos
    .filter(p => p.slug !== atual.slug)
    .map((p, ordem) => {
      const emComum = [...marcasDoPost(p)].filter(m => marcas.has(m)).length
      return { p, pontos: emComum * 10 + (categoriaDoPost(p) === categoria ? 3 : 0), ordem }
    })
    .sort((a, b) => b.pontos - a.pontos || a.ordem - b.ordem)
    .slice(0, limite)
    .map(x => x.p)
}
