/**
 * As fontes do canvas do Gerador de Criativos.
 *
 * O desenho escreve `ctx.font = '800 76px Montserrat, sans-serif'` em cinquenta
 * lugares. Para isso resolver, a família precisa se chamar `Montserrat` de
 * verdade na página — e o `next/font/google` do layout NÃO serve: ele publica a
 * fonte sob um nome hasheado (`__Montserrat_a1b2c3`) e só nos pesos 300 a 700.
 * O gerador usa 200, 800, 900 e quatro itálicos.
 *
 * Por isso a URL abaixo é, caractere por caractere, a mesma do `<link>` que
 * estava em content/admin/gerador-criativos.html. Não é uma escolha nova de
 * tipografia: é a condição para a peça sair idêntica à que saía antes.
 *
 * Repare que `PESOS` pede `italic 500`, que a folha NÃO traz (ela começa o
 * itálico em 600). Isso é intencional: o HTML também não trazia, e o navegador
 * inclinava o roman por conta própria. Carregar o itálico 500 "que faltava"
 * mudaria o desenho — a linha de ano/km do Destaque sairia com outro desenho de
 * letra e outra largura.
 */

export const FOLHA_GOOGLE =
	'https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,600;1,700;1,800;1,900&family=Inter:wght@400;500;600&display=swap'

/**
 * Os pares peso/família que o desenho realmente pede.
 *
 * `document.fonts.ready` sozinho não basta: o navegador só busca uma face
 * quando algum elemento a usa, e o canvas não conta como uso. Sem forçar a
 * carga aqui, o primeiro `measureText` mede com a fonte de sistema e a peça
 * abre com o espaçamento errado — some quando qualquer coisa força um segundo
 * desenho, que é o pior tipo de defeito: o que não se reproduz.
 */
const PESOS = [
	'200 40px Montserrat',
	'300 40px Montserrat',
	'400 40px Montserrat',
	'500 40px Montserrat',
	'600 40px Montserrat',
	'700 40px Montserrat',
	'800 40px Montserrat',
	'900 40px Montserrat',
	'italic 500 40px Montserrat',
	'italic 600 40px Montserrat',
	'italic 700 40px Montserrat',
	'italic 900 40px Montserrat',
	'400 40px Inter',
	'500 40px Inter',
	'600 40px Inter',
]

let promessa: Promise<void> | null = null

/** Resolve quando dá para medir texto com as fontes certas. Roda uma vez. */
export function fontesDoGerador(): Promise<void> {
	promessa ??= (async () => {
		// Uma face que não chega não pode travar a tela: o desenho cai no
		// fallback, que é exatamente o que o HTML antigo fazia.
		await Promise.all(PESOS.map(f => document.fonts.load(f).catch(() => [])))
		await document.fonts.ready
	})()
	return promessa
}
