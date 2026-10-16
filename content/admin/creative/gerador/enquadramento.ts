/**
 * A matemática de enquadrar uma foto numa caixa.
 *
 * Extraída de `drawPhoto` e `autoFrameFoto1` do HTML do gerador. Está separada
 * do desenho de propósito: é a única parte do motor que dá para testar sem
 * navegador, e é onde mora a calibração que o operador percebe na hora.
 *
 * Morava aqui também o enquadramento automático do Clássico original (zoom .88,
 * y .18 em foto horizontal). Saiu com o formato em 16/10/2026: todos os que
 * ficaram abrem a foto no NEUTRO.
 */
import type { OpcoesFoto } from './tipos'

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
