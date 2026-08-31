/**
 * Legibilidade do texto sobre a foto, medida em vez de adivinhada.
 *
 * O PROBLEMA. No Clássico Loja o preço cai sobre o chão da PRÓPRIA foto, e esse
 * chão muda a cada veículo: asfalto escuro no G 63, concreto claro na McLaren.
 * A paleta era uma constante escrita à mão (`const dark = false`), calibrada
 * numa medição única da fachada, com um aviso no código de que trocar a imagem
 * sem trocar a constante deixaria texto branco sobre concreto claro. Medido em
 * produção: no G 63 o preço saiu a 1,00:1 contra o fundo. 1,00:1 é invisível.
 *
 * A SOLUÇÃO. Nós desenhamos o fundo antes do texto e temos o canvas na mão:
 * dá para ler os pixels exatamente onde o texto vai cair, calcular a luminância
 * e escolher a cor por medição. Não é heurística de imagem nem modelo treinado
 * — é a mesma conta que o WCAG usa para dizer se um texto é legível, e o
 * resultado é um número que o teste consegue afirmar.
 *
 * POR QUE NÃO HARMONIZAÇÃO DE CORES. A literatura de image harmonization
 * (Adobe PIH, DiffHarmony, color transfer de Reinhard) persegue o objetivo
 * oposto ao daqui: ela REDUZ a diferença perceptual entre as regiões, para o
 * objeto inserido parecer pertencer à cena. Legibilidade precisa AUMENTAR a
 * diferença entre texto e fundo. Harmonizar o chão ajuda a emenda entre a foto
 * e a fachada — problema real, tratado à parte — mas não torna um texto legível,
 * e nenhum daqueles trabalhos mede razão de contraste.
 */

/**
 * Luminância relativa de um sRGB 0-255, pela fórmula do WCAG 2.
 *
 * A linearização importa: a média ingênua dos canais trata 128 como "metade da
 * luz", e não é — o sRGB é codificado com gama. Sem linearizar, cinza médio
 * mede claro demais e o texto escuro passa num fundo em que ele some.
 */
export function luminanciaRelativa(r: number, g: number, b: number): number {
	const linear = (c: number) => {
		const s = c / 255
		return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
	}
	return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
}

/** Razão de contraste do WCAG entre duas luminâncias relativas: de 1 a 21. */
export function razaoDeContraste(a: number, b: number): number {
	const claro = Math.max(a, b)
	const escuro = Math.min(a, b)
	return (claro + 0.05) / (escuro + 0.05)
}

/** #rrggbb ou #rgb para [r, g, b]. */
export function hexParaRgb(hex: string): [number, number, number] {
	const h = hex.replace('#', '')
	const cheio = h.length === 3 ? h.split('').map(c => c + c).join('') : h
	return [
		parseInt(cheio.slice(0, 2), 16),
		parseInt(cheio.slice(2, 4), 16),
		parseInt(cheio.slice(4, 6), 16),
	]
}

export interface FundoMedido {
	/** Luminância relativa mediana — decide se o fundo é claro ou escuro. */
	mediana: number
	/** Percentil 10: o trecho mais ESCURO que ainda pesa na região. */
	escuro: number
	/** Percentil 90: o trecho mais CLARO que ainda pesa na região. */
	claro: number
}

/**
 * Resolução em que a região é amostrada. 160x48 = 7.680 amostras, o bastante
 * para percentis estáveis.
 *
 * Reduzir não é só economia: cada pixel do miniatura é a MÉDIA de uns 4x2 do
 * original, e essa é a escala perceptual certa aqui. Um pixel preto solto no
 * meio do concreto não torna nada ilegível; uma mancha do tamanho de uma letra,
 * sim — e essa sobrevive à redução.
 */
const AMOSTRA_L = 160
const AMOSTRA_A = 48

/**
 * Canvas de trabalho reaproveitado entre chamadas.
 *
 * `willReadFrequently` AQUI é o ponto todo: ele força rasterização por CPU, e
 * ler 7.680 pixels da CPU custa uma fração de ler 82 mil da GPU. Medido nesta
 * peça: leitura direta do canvas grande custa +6,3ms por quadro; por aqui,
 * +1,2ms. (O mesmo willReadFrequently seria um erro no canvas da PEÇA — ele
 * muda a rasterização e com ela os pixels; ver scripts/regressao-gerador.)
 */
let mini: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null = null
function canvasDeAmostra() {
	if (!mini) {
		const canvas = document.createElement('canvas')
		canvas.width = AMOSTRA_L
		canvas.height = AMOSTRA_A
		mini = { canvas, ctx: canvas.getContext('2d', { willReadFrequently: true })! }
	}
	return mini
}

/** Só para teste: esquece o canvas de amostra. */
export function limparCanvasDeAmostra(): void {
	mini = null
}

/**
 * Lê a região do canvas e devolve a distribuição de luminância.
 *
 * Percentis, não média. Um fundo meio escuro e meio claro tem média no meio, e
 * a média mente exatamente no caso que mais importa: o texto fica ilegível na
 * metade errada. Quem manda na decisão é a mediana; quem manda na verificação é
 * o percentil que dói para a cor escolhida.
 *
 * Os percentis são 10 e 90, não 0 e 100: um punhado de pixels pretos numa fresta
 * de sombra não pode obrigar a peça inteira a mudar de paleta.
 */
export function medirFundo(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	w: number,
	h: number,
): FundoMedido | null {
	const X = Math.max(0, Math.floor(x))
	const Y = Math.max(0, Math.floor(y))
	const L = Math.floor(w)
	const A = Math.floor(h)
	if (L <= 0 || A <= 0) return null

	let dados: Uint8ClampedArray
	try {
		const m = canvasDeAmostra()
		m.ctx.clearRect(0, 0, AMOSTRA_L, AMOSTRA_A)
		m.ctx.drawImage(ctx.canvas, X, Y, L, A, 0, 0, AMOSTRA_L, AMOSTRA_A)
		dados = m.ctx.getImageData(0, 0, AMOSTRA_L, AMOSTRA_A).data
	} catch {
		// Canvas tingido por foto de outra origem. Não é motivo para não
		// desenhar: quem chama cai na paleta padrão.
		return null
	}

	// Histograma de 64 baldes em vez de ordenar milhares de valores: os
	// percentis não precisam de precisão maior que 1/64 de luminância, e isto
	// roda a cada quadro enquanto o operador arrasta um slider.
	const BALDES = 64
	const hist = new Uint32Array(BALDES)
	let total = 0
	for (let i = 0; i < dados.length; i += 4) {
		if (dados[i + 3] < 8) continue // transparente não é fundo
		const lum = luminanciaRelativa(dados[i], dados[i + 1], dados[i + 2])
		hist[Math.min(BALDES - 1, Math.floor(lum * BALDES))]++
		total++
	}
	if (!total) return null

	const percentil = (p: number) => {
		const alvo = total * p
		let acumulado = 0
		for (let b = 0; b < BALDES; b++) {
			acumulado += hist[b]
			if (acumulado >= alvo) return (b + 0.5) / BALDES
		}
		return 1
	}

	return { escuro: percentil(0.1), mediana: percentil(0.5), claro: percentil(0.9) }
}

export interface PaletaTexto {
	/** true quando o fundo é escuro e o texto tem de ser claro. */
	textoClaro: boolean
	/** Cor do texto, pronta para `fillStyle`. */
	cor: string
	/** Cor do halo (contorno), sempre oposta à do texto. */
	halo: string
	/** Opacidade do halo, 0 a 1 — sobe só até o contraste fechar. */
	haloAlfa: number
	/** A razão de contraste resultante. É isto que o teste afirma. */
	razao: number
	/** true se nem com o halo no teto a razão alcançou o alvo. */
	insuficiente: boolean
}

export interface OpcoesPaleta {
	/**
	 * Razão mínima aceitável. O WCAG pede 4,5:1 para texto normal e 3:1 para
	 * texto grande (a partir de 24px em negrito ou 18,7px em bold). O preço tem
	 * 48px; os destaques e o KM, não.
	 */
	alvo?: number
	/** Cor usada quando o fundo é claro. */
	corEscura?: string
	/** Cor usada quando o fundo é escuro. */
	corClara?: string
}

/** Teto do halo: acima disto ele deixa de ser contorno e vira mancha. */
const HALO_MAX = 0.9

/**
 * Escolhe cor e halo a partir do fundo medido, e devolve o contraste obtido.
 *
 * O halo entra como SEGUNDA linha de defesa, não como primeira: primeiro a cor
 * do texto é escolhida pelo lado certo da mediana, e só se a razão ainda não
 * fechar é que a opacidade do halo sobe, de 0,05 em 0,05, até fechar.
 *
 * O efeito do halo sobre o contraste é MODELADO, não medido: trata-se o
 * contorno como se ele misturasse sua cor ao fundo na proporção da opacidade.
 * É aproximação — o halo é um blur em volta do glifo, não um retângulo — mas
 * erra para o lado seguro, porque junto ao traço a cobertura real do halo é
 * MAIOR que a média modelada.
 */
export function paletaLegivel(fundo: FundoMedido | null, opcoes: OpcoesPaleta = {}): PaletaTexto {
	const alvo = opcoes.alvo ?? 4.5
	const corEscura = opcoes.corEscura ?? '#2b2b31'
	const corClara = opcoes.corClara ?? '#f4f4f7'

	// Sem medição (canvas tingido, região vazia): mantém o que o desenho fazia
	// antes desta função existir — texto escuro com halo claro discreto.
	if (!fundo) {
		return { textoClaro: false, cor: corEscura, halo: '#ffffff', haloAlfa: 0.45, razao: NaN, insuficiente: false }
	}

	const lumEscura = luminanciaRelativa(...hexParaRgb(corEscura))
	const lumClara = luminanciaRelativa(...hexParaRgb(corClara))

	// Cada cor é julgada contra o pedaço de fundo que MAIS a prejudica: o texto
	// escuro sofre onde o fundo é escuro; o claro, onde o fundo é claro.
	const razaoEscura = razaoDeContraste(lumEscura, fundo.escuro)
	const razaoClara = razaoDeContraste(lumClara, fundo.claro)

	const textoClaro = razaoClara > razaoEscura
	const cor = textoClaro ? corClara : corEscura
	const lumTexto = textoClaro ? lumClara : lumEscura
	const lumFundo = textoClaro ? fundo.claro : fundo.escuro
	// O halo é sempre o oposto do texto: é ele que recria a borda que o fundo
	// não dá.
	const halo = textoClaro ? '#000000' : '#ffffff'
	const [hr, hg, hb] = hexParaRgb(halo)

	// A luminância do fundo, em sRGB, para poder misturar com a cor do halo.
	// Reconstrói um cinza de mesma luminância: a mistura só precisa acertar o
	// brilho, que é o que a razão de contraste enxerga.
	const cinzaDoFundo = (() => {
		const inverso = (l: number) => (l <= 0.0031308 ? l * 12.92 : 1.055 * l ** (1 / 2.4) - 0.055)
		return inverso(lumFundo) * 255
	})()

	let haloAlfa = 0
	let razao = razaoDeContraste(lumTexto, lumFundo)
	while (razao < alvo && haloAlfa < HALO_MAX) {
		haloAlfa = Math.min(HALO_MAX, Math.round((haloAlfa + 0.05) * 100) / 100)
		const mistura = (canalHalo: number) => canalHalo * haloAlfa + cinzaDoFundo * (1 - haloAlfa)
		razao = razaoDeContraste(lumTexto, luminanciaRelativa(mistura(hr), mistura(hg), mistura(hb)))
	}

	return { textoClaro, cor, halo, haloAlfa, razao, insuficiente: razao < alvo }
}

/** `rgba()` pronto para `shadowColor`. */
export function haloCss(paleta: PaletaTexto): string {
	const [r, g, b] = hexParaRgb(paleta.halo)
	return `rgba(${r},${g},${b},${paleta.haloAlfa})`
}
