/**
 * A matemática de enquadrar uma foto numa caixa.
 *
 * Extraída de `drawPhoto` e `autoFrameFoto1` do HTML do gerador. Está separada
 * do desenho de propósito: é a única parte do motor que dá para testar sem
 * navegador, e é onde mora a calibração que o operador percebe na hora.
 */
import { LARGURA, type FormatoId, type OpcoesFoto } from './tipos'

/** Caixa onde a foto será desenhada, em pixels do canvas. */
export interface Caixa {
	x: number
	y: number
	largura: number
	altura: number
}

export interface Enquadramento {
	dx: number
	dy: number
	dw: number
	dh: number
	/**
	 * Escala antes do zoom do operador. O desenho a usa para o preenchimento
	 * borrado do fundo quando a foto não cobre a caixa inteira.
	 */
	base: number
}

/** Dimensões da imagem — aceita HTMLImageElement ou qualquer objeto com largura e altura. */
export interface Dimensoes {
	width: number
	height: number
}

/**
 * `cover` (padrão) preenche a caixa e corta a sobra; `fit` mostra a foto
 * inteira e deixa sobrar espaço — é o que impede o carro de ser cortado nas
 * molduras da Ficha.
 */
export function enquadrar(
	img: Dimensoes,
	caixa: Caixa,
	opt: OpcoesFoto,
	modo: 'cover' | 'fit' = 'cover',
): Enquadramento {
	const { x: rx, y: ry, largura: rw, altura: rh } = caixa
	const base = modo === 'fit'
		? Math.min(rw / img.width, rh / img.height)
		: Math.max(rw / img.width, rh / img.height)
	const escala = base * opt.zoom
	const dw = img.width * escala
	const dh = img.height * escala
	// O piso de 60% da caixa existe para o slider NUNCA ficar inerte: numa foto
	// do tamanho exato da caixa, `dw - rw` é zero e o controle não moveria nada
	// — o operador leria isso como controle quebrado.
	const alcanceX = Math.max(dw - rw, rw * 0.6)
	const alcanceY = Math.max(dh - rh, rh * 0.6)
	return {
		dx: rx + (rw - dw) / 2 - (opt.x - 0.5) * alcanceX,
		dy: ry + (rh - dh) / 2 - (opt.y - 0.5) * alcanceY,
		dw,
		dh,
		base,
	}
}

/** Sem ajuste: a foto centralizada, preenchendo a caixa. */
export const NEUTRO: OpcoesFoto = { zoom: 1, x: 0.5, y: 0.5 }

/**
 * Enquadramento padrão do Clássico para foto horizontal, calibrado pela
 * Lorrayne no próprio gerador (04/08/2026).
 *
 * O cálculo anterior era "largura inteira, sem sobra nas laterais": dava zoom
 * .84 e y .37 na foto de referência. Ela ajustou para .88 e .18 — um pouco
 * mais fechado e com a foto mais baixa, deixando o carro abaixo do título em
 * vez de encostar nele.
 *
 * É valor fixo, não fórmula: a calibração foi feita a olho sobre a peça
 * pronta, e não há regra derivável dela.
 */
export const PADRAO_CLASSICO: OpcoesFoto = { zoom: 0.88, x: 0.5, y: 0.18 }

/** Altura da caixa da foto principal do Clássico. */
const ALTURA_FOTO1 = 1000
/** Folga sobre a proporção da caixa antes de considerar a foto "horizontal". */
const FOLGA = 0.05

/**
 * O enquadramento com que a foto principal entra ao ser carregada.
 *
 * Só o Clássico original recebe a calibração: a banda 540..1060 do Clássico
 * Loja afunda e encolhe o carro com esse zoom, e nos demais formatos a foto
 * vive em caixa de outra proporção. Foto quadrada ou vertical também fica
 * neutra — o .88/.18 foi calibrado sobre foto horizontal do estoque.
 */
export function enquadramentoAutomatico(img: Dimensoes, tipo: FormatoId): OpcoesFoto {
	const proporcaoDaCaixa = LARGURA / ALTURA_FOTO1
	const horizontal = img.width / img.height > proporcaoDaCaixa + FOLGA
	return tipo === 'classico' && horizontal ? PADRAO_CLASSICO : NEUTRO
}
