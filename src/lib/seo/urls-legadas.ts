/**
 * Endereços do site antigo (WordPress) que ainda têm equivalente no atual.
 *
 * Levantados em 14/10/2026 cruzando as capturas do Wayback Machine com o site
 * no ar: de 1.559 caminhos históricos, 1.087 respondiam 404. A maioria fica em
 * 404 de propósito (fichas de carro vendido, filtros do tema antigo como
 * /versao/... e /opcional/..., notícias de 2016). O que está aqui tem conteúdo
 * correspondente e histórico no Google: os posts do blog antigo moravam na
 * raiz, e entre eles estão os artigos-âncora de procedência.
 *
 * Sem imports de propósito: next.config.ts importa este arquivo.
 */

/** Posts que o WordPress servia em /{slug} e hoje estão em /blog/{slug}. */
export const POSTS_WP_NA_RAIZ: readonly string[] = [
	'a-compra-inteligente-de-um-supercarro-como-a-curadoria-criteriosa-protege-seu-investimento',
	'a-ilusao-do-supercarro-perfeito-como-a-curadoria-da-attra-protege-seu-patrimonio',
	'aston-martin-vantage-o-apice-da-esportividade-britanica',
	'audi-r8-a-suprema-expressao-da-engenharia-alema',
	'audi-rs5-sportback-gran-turismo-de-alma-esportiva',
	'audi-rs5-sportback-o-gran-turismo-que-redefine-performance-alema',
	'bmw-m2-competition-2020-a-ultima-geracao-da-essencia-m-pura',
	'bmw-z4-m40i-a-essencia-da-conducao-esportiva',
	'decisao-patrimonial-ou-impulso-emocional-a-seguranca-na-compra-de-supercarros-acima-de-r-500-mil',
	'ferrari-812-gts-a-obra-prima-italiana-que-a-attra-veiculos-trouxe-para-o-brasil',
	'ferrari-sf90-spider-quando-1-000cv-redefinem-o-conceito-de-performance',
	'gmc-hummer-ev-o-icone-renascido-em-forma-eletrica',
	'hyundai-palisade-2025-o-suv-premium-que-sua-familia-merece',
	'mercedes-amg-g63-2025-quando-o-status-precisa-de-substancia',
	'mercedes-benz-c-300-amg-line-elegancia-e-esportividade-em-perfeita-harmonia',
	'o-guia-definitivo-da-attra-como-garantir-a-procedencia-e-a-seguranca-na-compra-do-seu-supercarro',
	'o-mito-da-baixa-quilometragem-por-que-a-inatividade-e-mais-destrutiva-para-seu-supercarro-do-que-o-uso-consciente',
	'o-padrao-attra-por-que-a-procedencia-e-o-ativo-mais-valioso-do-seu-supercarro',
	'o-risco-oculto-dos-supercarros-por-que-a-procedencia-e-mais-valiosa-que-a-garantia',
	'o-risco-oculto-em-supercarros-como-garantir-a-procedencia-e-proteger-seu-investimento',
	'o-risco-oculto-no-supercarro-dos-seus-sonhos-por-que-a-procedencia-e-mais-importante-que-a-marca',
	'porsche-718-boxster-gts-2024-exclusividade-zero-km-na-attra-veiculos-luxo-e-performance',
	'porsche-cayenne-s-coupe-e-hybrid-esportividade-e-elegancia-em-perfeita-harmonia',
	'porsche-macan-gts-o-suv-esportivo-que-redefine-performance-premium',
	'porsche-taycan-4s-cross-turismo-o-futuro-da-mobilidade-esportiva',
	'range-rover-p530-2023-a-mais-alta-expressao-do-luxo-automotivo',
	'superesportivo-ou-suv-de-luxo-a-decisao-inteligente-que-protege-seu-patrimonio',
	'superesportivos-o-que-nao-te-contam-sobre-a-compra-e-como-a-attra-garante-seu-patrimonio',
]

/** Páginas institucionais do site antigo → equivalente atual. */
export const PAGINAS_LEGADAS: Readonly<Record<string, string>> = {
	'/quem-somos': '/sobre',
	'/attra': '/sobre',
	'/vender': '/compramos-seu-carro',
	'/carros-semi-novos': '/veiculos',
	'/carros-0-km': '/veiculos',
	'/estoque/page/:pagina': '/veiculos',
	'/noticias': '/blog',
	// Post de fev/2026 sobre o mesmo carro, removido depois.
	'/blog/audi-rs5-sportback-2021': '/blog/audi-rs5-sportback-gran-turismo-de-alma-esportiva',
}
