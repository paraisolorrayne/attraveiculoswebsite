/** Peças que a capa e o resto do documento dividem. */

export function escapar(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
}

/** Negrito com **asteriscos**, que é como a carta marca os destaques. */
export function comDestaques(texto: string): string {
	return escapar(texto).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
}

/** Logo da Attra, servida de /public — a mesma dos criativos. */
export const LOGO = '/gerador/logo-branca.png'
