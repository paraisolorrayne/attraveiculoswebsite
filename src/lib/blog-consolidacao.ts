/**
 * Posts do blog consolidados: slug duplicado → slug que ficou.
 *
 * O gerador diário escreveu mais de um post sobre o mesmo carro (e o mesmo
 * comparativo) — ver `chavesDoExemplar` em blog-ai/vehicle-picker.ts. Em
 * 13/10/2026 eram 29 posts em 13 grupos, todos com canonical próprio: páginas
 * quase iguais disputando a mesma busca, que o Search Console marca como
 * "Cópia sem página canônica selecionada pelo usuário".
 *
 * Fica o mais antigo de cada grupo (o que tem mais tempo de indexação); os
 * outros respondem 308 para ele (next.config.ts) e saem do sitemap, do
 * llms.txt e das listagens (blog-api.ts). As linhas continuam no banco: o
 * gerador lê os reviews de lá para nunca repetir o carro.
 *
 * Sem imports de propósito: next.config.ts importa este arquivo.
 */
export const POSTS_CONSOLIDADOS: Readonly<Record<string, string>> = {
	// Chevrolet Corvette Z06 2023 preto (mesmo carro, 3 reviews)
	'chevrolet-corvette-z06-2023-preto-attra-xnyt': 'chevrolet-corvette-z06-2023-preto-attra-veiculos-bjs5',
	'chevrolet-corvette-z06-2023-preto-attra-veiculos-5q0h': 'chevrolet-corvette-z06-2023-preto-attra-veiculos-bjs5',

	// Ferrari 296 GTS vs McLaren GTS (4 comparativos, um com a ordem invertida)
	'mclaren-gts-vs-ferrari-296-gts-o-duelo-de-titas-ifwz': 'ferrari-296-gts-vs-mclaren-gts-o-duelo-da-nova-era-performance-mqsf',
	'ferrari-296-gts-vs-mclaren-gts-comparativo-ayiz': 'ferrari-296-gts-vs-mclaren-gts-o-duelo-da-nova-era-performance-mqsf',
	'ferrari-296-gts-vs-mclaren-gts-comparativo-attra-5lw9': 'ferrari-296-gts-vs-mclaren-gts-o-duelo-da-nova-era-performance-mqsf',

	// Ferrari SF90 Spider vs McLaren GTS
	'ferrari-sf90-spider-vs-mclaren-gts-comparativo-attra-r080': 'ferrari-sf90-spider-vs-mclaren-gts-comparativo-vcrv',

	// Reviews repetidos do mesmo carro
	'bmw-x4-m40i-2024-attra-veiculos-zv4k': 'bmw-x4-m40i-2024-preto-exclusivo-attra-fkt4',
	'gmc-sierra-3500-denali-ultimate-2024-oeva': 'gmc-sierra-3500-denali-ultimate-2024-attra-veiculos-e7s8',
	'ferrari-296-gtb-2024-attra-veiculos-6hqf': 'ferrari-296-gtb-2024-attra-veiculos-t4vu',
	'porsche-panamera-2025-exclusivo-attra-veiculos-v6r8': 'porsche-panamera-2025-attra-veiculos-5bx5',
	'bmw-m3-competition-2025-attra-veiculos-cekl': 'bmw-m3-competition-2025-preta-whdm',
	'bmw-x6-m-competition-2024-attra-veiculos-2vn4': 'bmw-x6-m-competition-2024-attra-veiculos-rlvh',
	'porsche-911-turbo-s-2023-rosa-attra-veiculos-ecny': 'porsche-911-turbo-s-2023-rosa-9ti7',
	'ram-1500-limited-2023-amarelo-attra-veiculos-ip8b': 'ram-1500-limited-2023-amarelo-attra-veiculos-1cnl',

	// Mesmo modelo, posts de 2025 e 2026
	'hummer-h1-1985-curadoria-attra-veiculos-9o1p': 'hummer-h1-1985-um-icone-militar-para-colecionadores',
	'audi-rs5-sportback-o-gran-turismo-que-redefine-performance-alema': 'audi-rs5-sportback-gran-turismo-de-alma-esportiva',
}

export function postConsolidado(slug: string): boolean {
	return Object.prototype.hasOwnProperty.call(POSTS_CONSOLIDADOS, slug)
}
