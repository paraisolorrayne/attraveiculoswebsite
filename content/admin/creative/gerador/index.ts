/**
 * Motor do Gerador de Criativos.
 *
 * Porte do `<script>` de content/admin/gerador-criativos.html para módulo ES,
 * espelhando o Story Vendido: o desenho vive aqui, sem React, e a tela só
 * chama `render`.
 *
 * O canvas do Stories é 1080×1920 e o do Feed 1080×1350 — a mesma composição
 * com o rodapé fechando mais cedo. Cada formato tem um ramo `FEED` no fim;
 * o topo é idêntico nos dois, de propósito, para o enquadramento que o
 * operador calibrou valer nas duas peças.
 */
import { renderClassicoLoja } from './formatos/classico-loja'
import { renderClassicoOriginal } from './formatos/classico'
import { renderDestaque } from './formatos/destaque'
import { renderEstoque } from './formatos/estoque'
import { renderFicha } from './formatos/ficha'
import {
	ALTURA_FEED,
	ALTURA_STORIES,
	LARGURA,
	type Assets,
	type EstadoCriativo,
	type FormatoId,
	type ImagensDoOperador,
} from './tipos'

export { ALTURA_FEED, ALTURA_STORIES, LARGURA }
export * from './tipos'
export { carregarAssets, carregar } from './assets'
export { enquadramentoAutomatico } from './enquadramento'

/** Os formatos na ordem em que aparecem na tela. */
export const FORMATOS: { id: FormatoId; nome: string; descricao: string }[] = [
	{ id: 'classico-loja', nome: 'Clássico Loja', descricao: 'fundo da loja' },
	{ id: 'classico', nome: 'Clássico', descricao: 'escuro, foto grande' },
	{ id: 'destaque', nome: 'Destaque', descricao: 'claro, ficha técnica' },
	{ id: 'estoque', nome: 'Estoque', descricao: 'lista de até 4 carros' },
	{ id: 'ficha', nome: 'Ficha', descricao: 'claro, 2 detalhes + destaque' },
]

export function render(
	ctx: CanvasRenderingContext2D,
	estado: EstadoCriativo,
	imagens: ImagensDoOperador,
	assets: Assets,
	altura: number = ALTURA_STORIES,
): void {
	ctx.clearRect(0, 0, LARGURA, altura)
	ctx.imageSmoothingEnabled = true
	ctx.imageSmoothingQuality = 'high'
	ctx.textAlign = 'left'

	const contexto = { ctx, estado, imagens, assets, altura }
	switch (estado.tipo) {
		case 'destaque':
			return renderDestaque(contexto)
		case 'estoque':
			return renderEstoque(contexto)
		case 'ficha':
			return renderFicha(contexto)
		case 'classico-loja':
			return renderClassicoLoja(contexto)
		default:
			return renderClassicoOriginal(contexto)
	}
}

/**
 * Feed 4:5 num canvas fora da tela.
 *
 * Sem prévia na tela (decisão de 24/08/2026): o Feed nasce só na hora de
 * baixar, para o render ao vivo não ficar duas vezes mais lento a cada
 * movimento de slider.
 */
export function renderFeed(
	estado: EstadoCriativo,
	imagens: ImagensDoOperador,
	assets: Assets,
): HTMLCanvasElement {
	const canvas = document.createElement('canvas')
	canvas.width = LARGURA
	canvas.height = ALTURA_FEED
	render(canvas.getContext('2d')!, estado, imagens, assets, ALTURA_FEED)
	return canvas
}
