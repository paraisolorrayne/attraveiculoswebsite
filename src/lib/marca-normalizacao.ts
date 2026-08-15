/**
 * Normalização de marca — ponte entre o nome que vem do estoque e o slug das
 * páginas de marca.
 *
 * Por que existe: o AutoConf e o catálogo editorial escrevem a mesma marca de
 * formas diferentes, e a comparação ingênua fazia veículos sumirem. Medido em
 * 14/08/2026 sobre 77 veículos reais: o estoque grava "Mercedes", o catálogo
 * tem "Mercedes-Benz", e `/comprar/mercedes-benz` mostrava ZERO carros com 10
 * Mercedes disponíveis.
 *
 * Havia duas comparações diferentes no site, ambas quebradas do mesmo jeito:
 *
 *   listagem      v.brand.toLowerCase().includes(slug.replace('-', ' '))
 *   página marca  v.brand.toLowerCase() === brand.name.toLowerCase()
 *
 * A primeira ainda tinha dois defeitos próprios: `includes` casa por
 * SUBSTRING (hoje inofensivo porque nenhuma marca do estoque é substring de
 * outra, mas a primeira "Mini" entrando no estoque quebraria "Mini Cooper"), e
 * `.replace('-', ' ')` troca só a PRIMEIRA ocorrência, então slug com dois
 * hífens ficava pela metade.
 *
 * Aqui a comparação é sempre entre slugs canônicos — igualdade exata, nunca
 * substring. É a garantia que os dois specs pedem: `/ferrari` mostra somente
 * Ferrari.
 */

/**
 * Grafias alternativas → slug canônico.
 *
 * Só entra aqui o que DIVERGE da normalização automática. "Mclaren" e
 * "McLaren" já caem em `mclaren` sozinhos; não precisam de alias.
 */
const ALIASES: Record<string, string> = {
	// O estoque abrevia; o catálogo usa o nome completo.
	'mercedes': 'mercedes-benz',
	'mercedes-amg': 'mercedes-benz',
	'amg': 'mercedes-benz',
	// Submarcas de performance que compartilham a página da marca-mãe.
	'bmw-m': 'bmw',
	'audi-sport': 'audi',
	'vw': 'volkswagen',
	'chevy': 'chevrolet',
	'land-rover-range-rover': 'land-rover',
	'range-rover': 'land-rover',
}

/** Minúsculas, sem acento, separadores virando hífen. */
function base(valor: string): string {
	return valor
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.trim()
		.replace(/[\s_/]+/g, '-')     // espaço, underscore e barra viram hífen
		.replace(/-+/g, '-')          // colapsa hífens repetidos
		.replace(/^-|-$/g, '')
}

/**
 * Slug canônico da marca, ou null se não houver marca.
 *
 * Marca desconhecida NÃO vira null: o estoque tem RAM, Pontiac, GMC e Cadillac
 * sem página de marca, e elas precisam continuar filtráveis e agrupáveis.
 */
export function normalizarMarca(valor: string | null | undefined): string | null {
	if (typeof valor !== 'string') return null
	const slug = base(valor)
	if (slug === '') return null
	return ALIASES[slug] ?? slug
}

/**
 * O veículo pertence à marca desta página?
 *
 * Igualdade entre canônicos — nunca substring. `marcaCasaCom('Mini Cooper',
 * 'mini')` é false de propósito: são marcas diferentes, e casar por prefixo é
 * exatamente o defeito que esta camada existe para eliminar.
 */
export function marcaCasaCom(
	marcaDoVeiculo: string | null | undefined,
	slugDaPagina: string,
): boolean {
	const a = normalizarMarca(marcaDoVeiculo)
	const b = normalizarMarca(slugDaPagina)
	return a !== null && b !== null && a === b
}

/** Slug de URL a partir do nome de exibição. */
export function slugDeMarca(nome: string): string {
	return normalizarMarca(nome) ?? ''
}

/** Filtra uma lista de veículos pela marca da página. */
export function filtrarPorMarca<T extends { brand?: string | null }>(
	veiculos: T[],
	slugDaPagina: string,
): T[] {
	return veiculos.filter(v => marcaCasaCom(v.brand, slugDaPagina))
}
