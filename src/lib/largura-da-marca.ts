/**
 * Largura do nome da marca escrito na Geist Black, em "em".
 *
 * O destaque de /veiculos põe o nome da marca gigante atrás do carro, e ele
 * tem que aparecer inteiro: nenhuma letra cortada na lateral da tela. O
 * tamanho da letra sai do servidor (espaço disponível ÷ esta largura), sem
 * medir no navegador, então a palavra não pisca nem muda de tamanho ao carregar.
 *
 * Avanço de cada caractere medido no Chrome com a Geist peso 900 (18/10/2026).
 * A soma ignora o kerning e a sobra lateral da primeira e da última letra, e
 * por isso dá um pouco mais que a tinta real (2% a 14%): a palavra pode sair
 * um pouco menor, nunca cortada.
 */
const AVANCO: Record<string, number> = {
	A: 0.771, B: 0.718, C: 0.755, D: 0.73, E: 0.634, F: 0.614, G: 0.764, H: 0.727, I: 0.32,
	J: 0.647, K: 0.721, L: 0.595, M: 0.94, N: 0.755, O: 0.8, P: 0.686, Q: 0.793, R: 0.714,
	S: 0.709, T: 0.631, U: 0.713, V: 0.772, W: 1.061, X: 0.742, Y: 0.668, Z: 0.627,
	0: 0.713, 1: 0.492, 2: 0.676, 3: 0.674, 4: 0.684, 5: 0.701, 6: 0.649, 7: 0.558, 8: 0.704, 9: 0.656,
	' ': 0.214, '-': 0.416, '&': 0.763, '.': 0.26, "'": 0.22,
}

/** Caractere fora da tabela: largo de propósito, para errar para menos. */
const AVANCO_DESCONHECIDO = 0.8

/** Espaçamento entre as letras do nome (`tracking-[-0.05em]` no destaque). */
const ESPACAMENTO = -0.05

export function larguraDaMarca(marca: string): number {
	const letras = [
		...marca
			.trim()
			.normalize('NFD')
			.replace(/[̀-ͯ]/g, '')
			.toLocaleUpperCase('pt-BR'),
	]
	if (letras.length === 0) return 0
	const avancos = letras.reduce((soma, letra) => soma + (AVANCO[letra] ?? AVANCO_DESCONHECIDO), 0)
	// Arredonda para cima: a largura nunca pode ficar abaixo da tinta.
	return Math.ceil((avancos + ESPACAMENTO * (letras.length - 1)) * 1000 - 1e-6) / 1000
}
