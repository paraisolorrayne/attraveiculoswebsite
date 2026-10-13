/**
 * Disponibilidade, ao vivo, do carro de um review do blog.
 *
 * O review grava `availability.in_stock` e o link da ficha no dia em que é
 * escrito, e nunca mais muda. O carro é peça única e vende: em 13/10/2026, 30
 * reviews ainda diziam "Disponível na Attra Veículos" com botão para uma ficha
 * que respondia 404 — e o próprio texto linkava a mesma ficha. Para o leitor é
 * beco sem saída; para o Google, link interno quebrado em massa; para um
 * assistente que lê a página, "à venda" errado repetido com confiança.
 *
 * A verdade sai do estoque na hora de renderizar, pelo id da AutoConf (o final
 * do slug), não pelo slug inteiro: a ficha resolve pelo id, então um slug
 * reescrito continua sendo o mesmo carro.
 */

import { lerSlug, type PedidoDoSlug } from './veiculos-semelhantes'
import { POSTS_CONSOLIDADOS } from './blog-consolidacao'
import type { DualBlogPost, Vehicle } from '@/types'

export type SituacaoDoReview =
	| { tipo: 'a_venda'; veiculo: Vehicle }
	| { tipo: 'vendido'; slug: string }
	/** Review sem carro ligado (posts antigos, importados do WordPress). */
	| { tipo: 'sem_vinculo' }
	/** O estoque não carregou: não dá para afirmar nada. */
	| { tipo: 'desconhecida' }

const SLUG_DA_FICHA = /^(?:https?:\/\/(?:www\.)?attraveiculos\.com\.br)?\/veiculo\/([a-z0-9-]+)\/?$/i

/** `/veiculo/<slug>` (relativo ou absoluto) → slug; qualquer outra coisa → null. */
export function slugDaFicha(url: string | null | undefined): string | null {
	return url?.trim().match(SLUG_DA_FICHA)?.[1] ?? null
}

/**
 * Procura no estoque o carro de uma ficha. Pelo id quando o slug tem um;
 * senão, pelo slug inteiro.
 */
export function veiculoDaFicha(slug: string, estoque: Vehicle[]): Vehicle | null {
	const { id } = lerSlug(slug)
	return estoque.find(v => (id ? v.id === id : v.slug === slug)) ?? null
}

/**
 * Estoque vazio conta como "não carregou": a cascata de fallback da AutoConf
 * nunca devolve zero carro de verdade, e tratar vazio como "tudo vendido"
 * marcaria todos os reviews de uma vez.
 */
function estoqueConhecido(estoque: Vehicle[] | null): estoque is Vehicle[] {
	return !!estoque && estoque.length > 0
}

export function situacaoDoReview(post: DualBlogPost, estoque: Vehicle[] | null): SituacaoDoReview {
	const slug = slugDaFicha(post.car_review?.availability?.stock_url)
	if (!slug) return { tipo: 'sem_vinculo' }
	if (!estoqueConhecido(estoque)) return { tipo: 'desconhecida' }
	const veiculo = veiculoDaFicha(slug, estoque)
	return veiculo ? { tipo: 'a_venda', veiculo } : { tipo: 'vendido', slug }
}

/** Atributo href (aspas simples ou duplas) apontando para /veiculo/ ou /blog/ do próprio site. */
const HREF_INTERNO = /href=(["'])((?:https?:\/\/(?:www\.)?attraveiculos\.com\.br)?\/(veiculo|blog)\/([a-z0-9-]+)\/?)\1/gi

/**
 * Corrige os links internos do corpo do post:
 *   - ficha de carro que saiu do estoque → `destinoDoVendido(slug)`;
 *   - ficha de carro à venda com slug antigo → slug atual;
 *   - post consolidado → post que ficou (evita o salto de redirect).
 *
 * Com o estoque desconhecido, os links de ficha ficam como estão.
 */
export function corrigirLinksInternos(
	html: string,
	estoque: Vehicle[] | null,
	destinoDoVendido: (slug: string) => string,
): string {
	const conhecido = estoqueConhecido(estoque)
	return html.replace(HREF_INTERNO, (original, aspas: string, _url: string, tipo: string, slug: string) => {
		if (tipo.toLowerCase() === 'blog') {
			const mantido = POSTS_CONSOLIDADOS[slug]
			return mantido ? `href=${aspas}/blog/${mantido}${aspas}` : original
		}
		if (!conhecido) return original
		const veiculo = veiculoDaFicha(slug, estoque)
		if (!veiculo) return `href=${aspas}${destinoDoVendido(slug)}${aspas}`
		return veiculo.slug === slug ? original : `href=${aspas}/veiculo/${veiculo.slug}${aspas}`
	})
}

/**
 * Pedido para `ordenarPorSemelhanca` quando o review não tem ficha. Montado
 * direto, sem passar por slug: `lerSlug('mercedes-g-63-2021')` leria o ano como
 * id da AutoConf.
 */
export function pedidoDoReview(brand: string, model: string, year?: number | null): PedidoDoSlug {
	const s = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
	return { prefixo: [s(brand), s(model)].filter(Boolean).join('-'), ano: year ?? null, id: null }
}
