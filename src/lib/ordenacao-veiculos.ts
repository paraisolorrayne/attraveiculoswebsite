/**
 * Ordenação das listagens de veículo nas páginas de marca, modelo e categoria.
 *
 * Regra da Attra (15/08/2026): **do mais caro para o mais barato**. O carro de
 * maior valor é o que define a percepção da loja, e é ele que precisa estar na
 * primeira linha da grade.
 *
 * ORDENAR ANTES DE CORTAR, sempre. As páginas mostram no máximo seis veículos.
 * Se o corte vier primeiro, o que aparece são seis carros quaisquer ordenados
 * entre si — e o mais caro do estoque pode simplesmente não estar lá. É por isso
 * que esta função existe separada, em vez de um `.sort()` solto ao lado de cada
 * `.slice()`: a ordem das duas operações é fácil de inverter sem perceber, e o
 * defeito não aparece enquanto o estoque for menor que o corte.
 */

interface ComPreco {
	price?: number | null
}

/**
 * Copia e ordena por preço decrescente.
 *
 * Não muta a lista recebida: ela costuma vir de um fetch compartilhado entre
 * seções da mesma página, e ordenar no lugar reordenaria as outras junto.
 *
 * Veículo sem preço vai para o FIM. Não dá para ranquear o que não tem número,
 * e colocá-lo à frente empurraria para baixo um carro de valor conhecido — numa
 * grade de seis, isso derrubaria o mais caro do estoque para fora da página.
 * Se a Attra preferir "sob consulta" no topo, é aqui que se inverte.
 */
export function porPrecoDecrescente<T extends ComPreco>(veiculos: T[]): T[] {
	return [...veiculos].sort((a, b) => {
		const pa = typeof a.price === 'number' && a.price > 0 ? a.price : null
		const pb = typeof b.price === 'number' && b.price > 0 ? b.price : null
		if (pa === null && pb === null) return 0
		if (pa === null) return 1
		if (pb === null) return -1
		return pb - pa
	})
}
