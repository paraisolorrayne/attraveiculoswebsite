/**
 * Divide um texto com destaques **assim** em partes, para a página desenhar o
 * negrito em vez de mostrar os asteriscos.
 *
 * Só a marcação de negrito: os textos fixos das páginas institucionais (como a
 * política de privacidade) usam isso e mais nada. Um ** sem par fica como
 * está, para nenhum trecho sumir.
 */
export interface ParteDoTexto {
	texto: string
	negrito: boolean
}

export function partesComNegrito(texto: string): ParteDoTexto[] {
	const pedacos = texto.split('**')
	if (pedacos.length % 2 === 0) return [{ texto, negrito: false }]
	return pedacos
		.map((pedaco, i) => ({ texto: pedaco, negrito: i % 2 === 1 }))
		.filter(parte => parte.texto !== '')
}
