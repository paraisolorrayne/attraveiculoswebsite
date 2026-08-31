/**
 * Helpers de canvas do Gerador de Criativos.
 *
 * Porte 1:1 do bloco `/* helpers *​/` de content/admin/gerador-criativos.html.
 * Os comentários vieram junto de propósito: são o registro de POR QUE cada
 * número é aquele — a maioria foi calibrada sobre a peça pronta, e sem eles o
 * próximo a mexer não sabe o que não pode mudar.
 *
 * A única transformação foi mecânica: o que era global (`ctx`, `W`, `H`,
 * `state`, as imagens) virou parâmetro.
 */
import { enquadrar } from './enquadramento'
import { LARGURA, type Assets, type ImagensDoOperador, type OpcoesFoto } from './tipos'

/** Vermelho oficial Attra — R154 G28 B28. */
export const RED = '#9a1c1c'

const NEUTRO: OpcoesFoto = { zoom: 1, x: 0.5, y: 0.5 }

let _grain: HTMLCanvasElement | null = null

/** Grão de 256×256, gerado uma vez e repetido como padrão. */
export function grainCanvas(): HTMLCanvasElement {
	if (_grain) return _grain
	const c = document.createElement('canvas')
	c.width = 256
	c.height = 256
	const x = c.getContext('2d')!
	const d = x.createImageData(256, 256)
	for (let i = 0; i < d.data.length; i += 4) {
		const v = (96 + Math.random() * 64) | 0
		d.data[i] = d.data[i + 1] = d.data[i + 2] = v
		d.data[i + 3] = 255
	}
	x.putImageData(d, 0, 0)
	_grain = c
	return c
}

/** Texto centrado com espaçamento entre letras; devolve a largura ocupada. */
export function spacedText(
	ctx: CanvasRenderingContext2D,
	text: string,
	cx: number,
	y: number,
	font: string,
	spacing: number,
	color: string,
): number {
	ctx.font = font
	ctx.fillStyle = color
	ctx.textBaseline = 'alphabetic'
	const chars = [...text]
	let total = 0
	for (const ch of chars) total += ctx.measureText(ch).width + spacing
	total -= spacing
	let x = cx - total / 2
	for (const ch of chars) {
		ctx.fillText(ch, x, y)
		x += ctx.measureText(ch).width + spacing
	}
	return total
}

/** Quanto o texto ocuparia com esse espaçamento, sem desenhar. */
export function spacedWidth(ctx: CanvasRenderingContext2D, text: string, font: string, spacing: number): number {
	ctx.font = font
	const chars = [...text]
	let total = 0
	for (const ch of chars) total += ctx.measureText(ch).width + spacing
	return total - spacing
}

export function wrapLines(ctx: CanvasRenderingContext2D, text: string, font: string, maxW: number): string[] {
	ctx.font = font
	const words = text.split(/\s+/)
	const lines: string[] = []
	let cur = ''
	for (const w of words) {
		const t = cur ? cur + ' ' + w : w
		if (ctx.measureText(t).width > maxW && cur) {
			lines.push(cur)
			cur = w
		} else cur = t
	}
	if (cur) lines.push(cur)
	return lines
}

/** Retângulo de cantos arredondados — só o caminho, sem pintar. */
export function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
	ctx.beginPath()
	ctx.moveTo(x + r, y)
	ctx.arcTo(x + w, y, x + w, y + h, r)
	ctx.arcTo(x + w, y + h, x, y + h, r)
	ctx.arcTo(x, y + h, x, y, r)
	ctx.arcTo(x, y, x + w, y, r)
	ctx.closePath()
}

/** O mesmo caminho, com o nome que a Ficha usa. */
export const cantoArredondado = rr

/** Linha tracejada — assinatura do layout da Ficha. */
export function linhaTracejada(ctx: CanvasRenderingContext2D, x1: number, y: number, x2: number, cor: string): void {
	ctx.save()
	ctx.strokeStyle = cor
	ctx.lineWidth = 2
	ctx.setLineDash([7, 6])
	ctx.beginPath()
	ctx.moveTo(x1, y)
	ctx.lineTo(x2, y)
	ctx.stroke()
	ctx.restore()
}

/** Texto do Editorial alinhado à esquerda; devolve a largura ocupada. */
export function edTextoEsq(
	ctx: CanvasRenderingContext2D,
	text: string,
	x: number,
	y: number,
	font: string,
	spacing: number,
	color: string,
): number {
	ctx.font = font
	ctx.fillStyle = color
	ctx.textBaseline = 'alphabetic'
	let cx = x
	for (const ch of [...text]) {
		ctx.fillText(ch, cx, y)
		cx += ctx.measureText(ch).width + spacing
	}
	return cx - spacing - x
}

export function edTextoCentro(
	ctx: CanvasRenderingContext2D,
	text: string,
	cx: number,
	y: number,
	font: string,
	spacing: number,
	color: string,
): void {
	ctx.font = font
	ctx.fillStyle = color
	ctx.textBaseline = 'alphabetic'
	const chars = [...text]
	let total = 0
	for (const ch of chars) total += ctx.measureText(ch).width + spacing
	total -= spacing
	let x = cx - total / 2
	for (const ch of chars) {
		ctx.fillText(ch, x, y)
		x += ctx.measureText(ch).width + spacing
	}
}

export type ModoFoto = 'fit' | 'dark' | undefined

/**
 * Foto dentro de uma caixa. `fit` mostra a foto inteira; `dark` preenche a
 * sobra com um sólido escuro em vez do borrado.
 */
export function drawPhoto(
	ctx: CanvasRenderingContext2D,
	img: HTMLImageElement,
	rx: number,
	ry: number,
	rw: number,
	rh: number,
	opt?: OpcoesFoto,
	mode?: ModoFoto,
): void {
	const o = opt ?? NEUTRO
	ctx.save()
	ctx.beginPath()
	ctx.rect(rx, ry, rw, rh)
	ctx.clip()
	const { dx, dy, dw, dh, base } = enquadrar(
		img,
		{ x: rx, y: ry, largura: rw, altura: rh },
		o,
		mode === 'fit' ? 'fit' : 'cover',
	)
	if (dw < rw - 1 || dh < rh - 1) {
		if (mode === 'dark') {
			// preenchimento escuro sólido (em vez de blur)
			const gd = ctx.createLinearGradient(0, ry, 0, ry + rh)
			gd.addColorStop(0, '#0a0a0c')
			gd.addColorStop(1, '#1e1e22')
			ctx.fillStyle = gd
			ctx.fillRect(rx, ry, rw, rh)
		} else {
			const bs = base * 1.2
			ctx.filter = 'blur(45px)'
			ctx.drawImage(img, rx + (rw - img.width * bs) / 2, ry + (rh - img.height * bs) / 2, img.width * bs, img.height * bs)
			ctx.filter = 'none'
			ctx.fillStyle = 'rgba(0,0,0,.38)'
			ctx.fillRect(rx, ry, rw, rh)
		}
	}
	ctx.drawImage(img, dx, dy, dw, dh)
	if (mode === 'dark' && dy > ry + 2) {
		// funde o preenchimento escuro com o topo da foto (sem emenda visível)
		const gb = ctx.createLinearGradient(0, dy - 2, 0, dy + 170)
		gb.addColorStop(0, 'rgba(10,10,12,1)')
		gb.addColorStop(1, 'rgba(10,10,12,0)')
		ctx.fillStyle = gb
		ctx.fillRect(rx, Math.max(ry, dy - 2), rw, 172)
	}
	ctx.restore()
}

export function placeholder(
	ctx: CanvasRenderingContext2D,
	rx: number,
	ry: number,
	rw: number,
	rh: number,
	label: string,
	dark?: boolean,
): void {
	const g = ctx.createLinearGradient(rx, ry, rx, ry + rh)
	if (dark === false) {
		g.addColorStop(0, '#d4d4d8')
		g.addColorStop(1, '#bfbfc4')
	} else {
		g.addColorStop(0, '#15181c')
		g.addColorStop(1, '#2a2f36')
	}
	ctx.fillStyle = g
	ctx.fillRect(rx, ry, rw, rh)
	ctx.fillStyle = dark === false ? 'rgba(0,0,0,.35)' : 'rgba(255,255,255,.25)'
	ctx.font = '600 ' + Math.min(30, rh / 5) + 'px Montserrat, sans-serif'
	ctx.textAlign = 'center'
	ctx.fillText(label, rx + rw / 2, ry + rh * (rh > 500 ? 0.72 : 0.53))
	ctx.textAlign = 'left'
}

/**
 * `modo === 'fit'` mostra a FOTO INTEIRA; sem ele, preenche a caixa cortando.
 *
 * A foto do estoque é horizontal (~1,29) e a caixa do Clássico é quase quadrada
 * (1080x1000 = 1,08). Preenchendo, a foto era ampliada até encher a ALTURA e
 * perdia 205px de largura — 102 por lado —, o que come a frente e a traseira do
 * carro e faz a peça abrir já com o veículo espremido nas bordas. Em fit o
 * zoom 100% passa a significar "a foto inteira", que é o que o operador espera,
 * e ele amplia a partir dali se quiser.
 *
 * NÃO está ligado no Clássico. Ligar sozinho piora: a foto passa a ocupar
 * 1080x840 numa caixa de 1000 de altura, sobra faixa vazia embaixo, e o logo e
 * o título — posicionados a partir de `topGap` — colidem com o letreiro que
 * aparece na própria foto. O enquadramento do Clássico depende da caixa e da
 * foto terem a mesma proporção; mudar isso é mexer no layout inteiro da peça,
 * não num parâmetro.
 */
export function drawPhotoFeather(
	ctx: CanvasRenderingContext2D,
	img: HTMLImageElement,
	rx: number,
	ry: number,
	rw: number,
	rh: number,
	opt?: OpcoesFoto,
	modo?: 'fit',
): number {
	const o = opt ?? NEUTRO
	const { dx, dy, dw, dh } = enquadrar(img, { x: rx, y: ry, largura: rw, altura: rh }, o, modo === 'fit' ? 'fit' : 'cover')
	const oc = document.createElement('canvas')
	oc.width = Math.ceil(dw)
	oc.height = Math.ceil(dh)
	const o2 = oc.getContext('2d')!
	o2.drawImage(img, 0, 0, dw, dh)
	o2.globalCompositeOperation = 'destination-out'
	let g: CanvasGradient
	if (dy > ry + 2) {
		// borda superior esfumada
		g = o2.createLinearGradient(0, 0, 0, 180)
		g.addColorStop(0, 'rgba(0,0,0,1)')
		g.addColorStop(1, 'rgba(0,0,0,0)')
		o2.fillStyle = g
		o2.fillRect(0, 0, oc.width, 180)
	}
	if (dw < rw - 4) {
		// bordas laterais esfumadas
		g = o2.createLinearGradient(0, 0, 110, 0)
		g.addColorStop(0, 'rgba(0,0,0,1)')
		g.addColorStop(1, 'rgba(0,0,0,0)')
		o2.fillStyle = g
		o2.fillRect(0, 0, 110, oc.height)
		g = o2.createLinearGradient(oc.width, 0, oc.width - 110, 0)
		g.addColorStop(0, 'rgba(0,0,0,1)')
		g.addColorStop(1, 'rgba(0,0,0,0)')
		o2.fillStyle = g
		o2.fillRect(oc.width - 110, 0, 110, oc.height)
	}
	ctx.save()
	ctx.beginPath()
	ctx.rect(rx, ry, rw, rh)
	ctx.clip()
	ctx.drawImage(oc, dx, dy)
	ctx.restore()
	return dy
}

/** Logo vetorial de reserva, se a imagem falhar. */
export function drawDefaultLogo(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
	const s = size / 1000
	ctx.save()
	ctx.translate(cx - 500 * s, cy - 475 * s)
	ctx.scale(s, s)
	ctx.fillStyle = '#ffffff'
	ctx.beginPath()
	ctx.moveTo(478, 10); ctx.lineTo(568, 10); ctx.lineTo(818, 542); ctx.lineTo(668, 542)
	ctx.lineTo(524, 180); ctx.lineTo(308, 672); ctx.lineTo(206, 631)
	ctx.closePath(); ctx.fill()
	ctx.beginPath()
	ctx.moveTo(188, 671); ctx.lineTo(290, 713); ctx.lineTo(191, 940); ctx.lineTo(71, 940)
	ctx.closePath(); ctx.fill()
	ctx.fillStyle = RED
	ctx.beginPath()
	ctx.moveTo(0, 570); ctx.lineTo(820, 570); ctx.lineTo(912, 938)
	ctx.closePath(); ctx.fill()
	ctx.restore()
}

/** Logo branca — a enviada pelo operador tem precedência sobre a oficial. */
export function drawLogoWhite(
	ctx: CanvasRenderingContext2D,
	assets: Assets,
	imagens: ImagensDoOperador,
	cx: number,
	cy: number,
	maxW: number,
): void {
	if (imagens.logo) {
		const lw = imagens.logo.width / imagens.logo.height > 2 ? maxW : maxW * 0.45
		const lh = (imagens.logo.height / imagens.logo.width) * lw
		ctx.drawImage(imagens.logo, cx - lw / 2, cy - lh / 2, lw, lh)
	} else if (assets.logoBranca.complete && assets.logoBranca.naturalWidth) {
		const lh = (assets.logoBranca.height / assets.logoBranca.width) * maxW
		ctx.drawImage(assets.logoBranca, cx - maxW / 2, cy - lh / 2, maxW, lh)
	} else drawDefaultLogo(ctx, cx, cy, 148)
}

export function drawLogoBlack(
	ctx: CanvasRenderingContext2D,
	assets: Assets,
	cx: number,
	cy: number,
	maxW: number,
): void {
	const logo = assets.logoPreta as HTMLCanvasElement
	if (!logo) return
	const lh = (logo.height / logo.width) * maxW
	ctx.drawImage(logo, cx - maxW / 2, cy - lh / 2, maxW, lh)
}



/**
 * Foto com SÓ O PISO apagado, na janela do Clássico — a versão que a Lorrayne
 * aprovou.
 *
 * A máscara do recorte vale apenas nos últimos `fatia` da foto: o chão dela
 * some e o pátio do fundo aparece no lugar. Acima disso a foto entra INTACTA —
 * vidros, reflexos, loja — que é o que protege as janelas de virarem buraco
 * (G 63, 14/08). E a base é ancorada no pé da janela, como no modo foto
 * inteira: as rodas nunca são cortadas, em nenhum ajuste.
 */



/**
 * Foto inteira na banda do carro, com fusão SÓ no topo.
 *
 * Posição vertical LIVRE, e mesmo assim sem cortar o carro: quem manda no
 * início do bloco de texto é a borda de baixo da foto, devolvida aqui. Mover a
 * foto move o texto junto, e como as rodas nunca encostam na borda inferior da
 * própria foto, elas nunca são atingidas — nem por corte, nem por
 * transparência.
 *
 * A base é CORTE SECO, de propósito. Havia 90px de fusão aqui e ela comia o
 * pneu (14/08) — os pneus vivem exatamente no pé da banda. É a mesma lição que
 * este arquivo já registrava sobre o véu do desenho antigo: "lavava a borracha
 * e a sombra de contato — a divisa seca é preferível a estragar o veículo, que
 * é o assunto da peça". O carro tem prioridade máxima; efeito de acabamento
 * nunca pode tocá-lo.
 */
/**
 * Altura máxima de cada trecho de reflexo, em pixels da própria foto.
 *
 * O reflexo é desenhado em escala 1:1 — cada linha da foto vira UMA linha, sem
 * ampliação. Antes uma tira de 24px era esticada sobre até 340, uma ampliação
 * de 14x: o chão saía borrado e estriado, como se tivesse sido puxado. O grão
 * do concreto só sobrevive em 1:1.
 *
 * Quando o trajeto é mais longo que este teto, o reflexo continua em ping-pong
 * (desce, sobe, desce). Cada virada casa linha a linha com a anterior, então
 * não há emenda entre os trechos — e o grão nunca muda de tamanho.
 */
const FONTE_MAX = 190

/** Canvas do espelho, reaproveitado entre quadros. */
let espelhoCache: CanvasRenderingContext2D | null = null
function canvasDoEspelho(w: number, h: number): CanvasRenderingContext2D {
	if (!espelhoCache) espelhoCache = document.createElement('canvas').getContext('2d')!
	const c = espelhoCache.canvas
	if (c.width < w || c.height < h) {
		c.width = Math.max(c.width, w)
		c.height = Math.max(c.height, h)
	}
	return espelhoCache
}

/**
 * Estica a base da foto para dentro do que vem abaixo, dissolvendo.
 *
 * Serve às duas emendas do gerador: no Clássico, foto contra a faixa de piso
 * pintada; no Clássico Loja, foto contra a fachada. Nos dois casos a foto acaba
 * numa linha reta e o que está do outro lado tem outra cor — o corte aparece.
 *
 * COLUNA A COLUNA, e é o ponto todo. A base de uma foto não tem UMA cor: tem
 * piso claro nas laterais e sombra de contato sob o carro. Um tom chapado casa
 * com uma cor que não existe em ponto nenhum da divisa (medido: o carro puxava
 * o alvo 15 níveis e o degrau lateral ficava igual ao que era). Esticando a
 * própria base, cada coluna encontra a sua continuação e a sombra segue sombra.
 *
 * Não toca no veículo: só escreve ABAIXO de `y`, onde a foto já acabou. Isso
 * importa porque as duas tentativas anteriores de suavizar essa passagem
 * falharam justamente por mexer no carro — uma dissolvência de 56px que invadia
 * as rodas e um véu branco que lavava a borracha do pneu.
 */
export function espelharBaseDaFoto(
	ctx: CanvasRenderingContext2D,
	y: number,
	largura: number,
	alcance: number,
	forca: number,
	/**
	 * Fração final do alcance em que o reflexo se dissolve.
	 *
	 * 1 = dissolve ao longo de todo o trajeto (é o que o Clássico quer: a faixa
	 * pintada tem tom próprio e deve reaparecer). Valores menores seguram o
	 * reflexo em pé e só o desmancham perto do fim — é o que o Clássico Loja
	 * quer, onde o piso da foto precisa CHEGAR ao corte em vez de virar fachada
	 * no meio do caminho.
	 */
	dissolveNoFim = 1,
): void {
	if (forca <= 0.02 || alcance < 8) return
	const fonte = Math.min(FONTE_MAX, y)
	if (fonte < 8) return
	const oc = canvasDoEspelho(largura, alcance)
	oc.clearRect(0, 0, largura, alcance)
	oc.globalCompositeOperation = 'source-over'

	// Trecho 0 sobe (a linha vizinha da divisa vira a primeira do reflexo);
	// o trecho seguinte desce a partir da linha mais alta que o anterior
	// alcançou, e assim por diante. Sempre 1:1.
	let escrito = 0
	let subindo = true
	while (escrito < alcance) {
		const h = Math.min(fonte, alcance - escrito)
		oc.save()
		if (subindo) {
			oc.translate(0, escrito + h)
			oc.scale(1, -1)
			oc.drawImage(ctx.canvas, 0, y - h, largura, h, 0, 0, largura, h)
		} else {
			oc.drawImage(ctx.canvas, 0, y - fonte, largura, h, 0, escrito, largura, h)
		}
		oc.restore()
		escrito += h
		subindo = !subindo
	}

	oc.globalCompositeOperation = 'destination-out'
	const dissolve = oc.createLinearGradient(0, 0, 0, alcance)
	const inicioDaQueda = Math.max(0, Math.min(0.95, 1 - dissolveNoFim))
	dissolve.addColorStop(0, `rgba(0,0,0,${1 - forca})`)
	if (inicioDaQueda > 0) dissolve.addColorStop(inicioDaQueda, `rgba(0,0,0,${1 - forca})`)
	dissolve.addColorStop(1, 'rgba(0,0,0,1)')
	oc.fillStyle = dissolve
	oc.fillRect(0, 0, largura, alcance)
	oc.globalCompositeOperation = 'source-over'
	ctx.drawImage(oc.canvas, 0, 0, largura, alcance, 0, y, largura, alcance)
}

export function drawPhotoBanda(
	ctx: CanvasRenderingContext2D,
	altura: number,
	img: HTMLImageElement,
	rx: number,
	ry: number,
	rw: number,
	rh: number,
	opt?: OpcoesFoto,
): { topo: number; base: number } {
	const o = opt ?? NEUTRO
	const scale = Math.max(rw / img.width, rh / img.height) * o.zoom
	const dw = img.width * scale
	const dh = img.height * scale
	const dx = rx + (rw - dw) / 2 - (o.x - 0.5) * Math.max(dw - rw, rw * 0.6)
	const dy = ry + (rh - dh) / 2 - (o.y - 0.5) * Math.max(dh - rh, rh * 0.6)

	const alturaOff = Math.max(rh, Math.ceil(dy + dh - ry))
	const oc = document.createElement('canvas')
	oc.width = rw
	oc.height = alturaOff
	const o2 = oc.getContext('2d')!
	o2.imageSmoothingQuality = 'high'
	o2.drawImage(img, dx - rx, dy - ry, dw, dh)
	o2.globalCompositeOperation = 'destination-out'
	// Fusão SÓ no topo, onde vive céu/fachada da foto — nunca o carro.
	const topoFoto = Math.max(0, dy - ry)
	const g = o2.createLinearGradient(0, topoFoto, 0, topoFoto + 70)
	g.addColorStop(0, 'rgba(0,0,0,1)')
	g.addColorStop(1, 'rgba(0,0,0,0)')
	o2.fillStyle = g
	o2.fillRect(0, topoFoto, rw, 70)

	ctx.save()
	ctx.beginPath()
	ctx.rect(rx, ry, rw, altura - ry)
	ctx.clip()
	ctx.drawImage(oc, rx, ry)
	ctx.restore()
	// topo: clampado na janela (o chamador usa para decidir o logo de reserva —
	// com dy negativo ele desenhava um ATTRA duplicado sobre o letreiro).
	// base: onde a foto termina — é o que ancora o bloco de texto.
	return { topo: Math.max(ry, dy), base: dy + dh }
}

/**
 * Foto emoldurada — cantos arredondados e sombra suave, com o fundo original
 * fazendo parte da composição (a Ficha não usa recorte).
 *
 * O aspect fit mostra a foto INTEIRA — e por isso não há o que deslocar. Se
 * ele valesse sempre, os controles de posição não fariam nada, que era
 * exatamente o que acontecia. Então mexer na posição (ou no zoom) liga o modo
 * recorte, onde o deslocamento passa a ser visível. `preencher` força o
 * recorte para a foto ocupar a caixa toda — usado na foto principal, que
 * precisa ficar alinhada com as de cima.
 */
export function fotoEmMoldura(
	ctx: CanvasRenderingContext2D,
	img: HTMLImageElement | null,
	x: number,
	y: number,
	w: number,
	h: number,
	opt?: OpcoesFoto,
	raio?: number,
	preencher?: boolean,
): void {
	const r = raio === undefined ? 18 : raio
	const zoom = opt?.zoom ?? 1
	const px = opt?.x ?? 0.5
	const py = opt?.y ?? 0.5

	const moveu = Math.abs(px - 0.5) > 0.001 || Math.abs(py - 0.5) > 0.001
	let fx = x
	let fy = y
	let fw = w
	let fh = h
	let recortar = true
	if (img && zoom <= 1.001 && !moveu && !preencher) {
		// Aspect fit: encolhe até caber e centraliza no espaço disponível.
		const escala = Math.min(w / img.width, h / img.height)
		fw = img.width * escala
		fh = img.height * escala
		fx = x + (w - fw) / 2
		fy = y + (h - fh) / 2
		recortar = false
	}

	ctx.save()
	ctx.shadowColor = 'rgba(0,0,0,.18)'
	ctx.shadowBlur = 26
	ctx.shadowOffsetY = 8
	ctx.fillStyle = '#e9e9ec'
	cantoArredondado(ctx, fx, fy, fw, fh, r)
	ctx.fill()
	ctx.restore()

	ctx.save()
	cantoArredondado(ctx, fx, fy, fw, fh, r)
	ctx.clip()
	if (img) {
		if (recortar) drawPhoto(ctx, img, fx, fy, fw, fh, opt)
		else ctx.drawImage(img, fx, fy, fw, fh)
	} else {
		ctx.fillStyle = '#dcdce1'
		ctx.fillRect(fx, fy, fw, fh)
		ctx.fillStyle = 'rgba(0,0,0,.32)'
		ctx.font = '600 22px Montserrat, sans-serif'
		ctx.textAlign = 'center'
		ctx.fillText('FOTO', fx + fw / 2, fy + fh / 2 + 8)
		ctx.textAlign = 'left'
	}
	ctx.restore()
}

/** Largura fixa do canvas, reexportada para os formatos. */
export { LARGURA }
