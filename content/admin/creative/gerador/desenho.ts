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
import { acharChao, limparJuntas } from './juntas'
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
	// Canvas também serve: é o que `fotoSemJuntas` devolve quando limpou o chão.
	img: HTMLImageElement | HTMLCanvasElement,
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
			const fw = img.width * bs
			const fh = img.height * bs
			ctx.drawImage(desfocada(img, fw, 45) ?? img, rx + (rw - fw) / 2, ry + (rh - fh) / 2, fw, fh)
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
/** Canvas de trabalho da emenda, reaproveitado entre quadros. */
let emendaCache: CanvasRenderingContext2D | null = null
function canvasDaEmenda(w: number, h: number): CanvasRenderingContext2D {
	if (!emendaCache) emendaCache = document.createElement('canvas').getContext('2d')!
	const c = emendaCache.canvas
	if (c.width < w || c.height < h) {
		c.width = Math.max(c.width, w)
		c.height = Math.max(c.height, h)
	}
	return emendaCache
}

/**
 * Faz o que está ABAIXO da divisa ter o tom do chão que está ACIMA dela.
 *
 * O problema: a foto acaba numa linha reta e o que vem depois — a faixa pintada
 * no Clássico, a fachada no Clássico Loja — é outro piso, com outra luz. O corte
 * aparece, e a peça lê como dois chãos.
 *
 * AS DUAS TENTATIVAS QUE NÃO PRESTARAM, para ninguém repetir:
 *
 *   1. Esticar uma tira da base da foto sobre o trecho. Ampliação de até 14x:
 *      o chão saía borrado e estriado. "Parece que foi esticado", e estava.
 *   2. Espelhar a base em 1:1, em ping-pong. Resolvia o borrão e fechava o
 *      degrau em zero — mas era um espelho de verdade: a junta do concreto
 *      descia e voltava a subir. Lê como reflexo, não como piso.
 *
 * O que funciona é não inventar textura nenhuma. O piso de baixo JÁ EXISTE e já
 * tem grão real, no tamanho certo, sem repetição. Falta só o tom. Então em vez
 * de desenhar chão, corrigimos a exposição do chão que está lá:
 *
 *   - piso de baixo mais claro que o de cima  -> `multiply` escurece
 *   - piso de baixo mais escuro               -> `screen` clareia
 *
 * Multiplicar e clarear são operações PROPORCIONAIS: mexem no nível e deixam a
 * modulação intacta. Um véu de cor chapada, ao contrário, achataria a textura na
 * mesma medida em que corrigisse o tom.
 */
export function casarPisoAbaixoDaDivisa(
	ctx: CanvasRenderingContext2D,
	y: number,
	largura: number,
	alcance: number,
	deCima: [number, number, number],
	deBaixo: [number, number, number],
	/** Fração final do trajeto em que a correção se desfaz. 0 = vai inteira. */
	soltarNoFim = 0,
): void {
	if (alcance < 8) return

	// Fator por canal. Clampado: correções violentas denunciam a emenda mais do
	// que o degrau que elas vieram consertar.
	const LIMITE = 0.45
	const escurecer = deCima[0] + deCima[1] + deCima[2] < deBaixo[0] + deBaixo[1] + deBaixo[2]
	const canais = [0, 1, 2].map(i => {
		const alto = Math.max(1, deBaixo[i])
		const baixo = Math.max(1, deCima[i])
		if (escurecer) return Math.round(255 * Math.max(1 - LIMITE, Math.min(1, baixo / alto)))
		// screen: resultado = 1-(1-a)(1-b) → resolve-se para b
		const a = deBaixo[i] / 255
		const alvo = deCima[i] / 255
		const b = a >= 1 ? 0 : (alvo - a) / (1 - a)
		return Math.round(255 * Math.max(0, Math.min(LIMITE, b)))
	})
	const neutro = escurecer ? 255 : 0
	if (canais.every(c => Math.abs(c - neutro) < 3)) return // já casam

	const oc = canvasDaEmenda(largura, alcance)
	oc.clearRect(0, 0, largura, alcance)
	oc.globalCompositeOperation = 'source-over'
	const g = oc.createLinearGradient(0, 0, 0, alcance)
	const cor = `rgb(${canais[0]},${canais[1]},${canais[2]})`
	g.addColorStop(0, cor)
	if (soltarNoFim > 0) {
		g.addColorStop(Math.max(0, Math.min(0.95, 1 - soltarNoFim)), cor)
		g.addColorStop(1, `rgb(${neutro},${neutro},${neutro})`)
	} else {
		g.addColorStop(1, cor)
	}
	oc.fillStyle = g
	oc.fillRect(0, 0, largura, alcance)

	ctx.save()
	ctx.beginPath()
	ctx.rect(0, y, largura, alcance)
	ctx.clip()
	ctx.globalCompositeOperation = escurecer ? 'multiply' : 'screen'
	ctx.drawImage(oc.canvas, 0, 0, largura, alcance, 0, y, largura, alcance)
	ctx.restore()
}

/**
 * Esfuma a última linha da foto sobre o que vem abaixo.
 *
 * Só apaga a aresta de 1px que sobra depois do casamento de tom — 16px de
 * dissolvência, curtos demais para borrar qualquer coisa e curtos demais para
 * alcançar as rodas, que é o que estragou as tentativas antigas de fundir a
 * foto no piso.
 */
export function suavizarDivisa(ctx: CanvasRenderingContext2D, y: number, largura: number): void {
	const H = 16
	if (y < H) return
	const oc = canvasDaEmenda(largura, H)
	oc.clearRect(0, 0, largura, H)
	oc.globalCompositeOperation = 'source-over'
	oc.drawImage(ctx.canvas, 0, y - H, largura, H, 0, 0, largura, H)
	oc.globalCompositeOperation = 'destination-out'
	const g = oc.createLinearGradient(0, 0, 0, H)
	g.addColorStop(0, 'rgba(0,0,0,0.25)')
	g.addColorStop(1, 'rgba(0,0,0,1)')
	oc.fillStyle = g
	oc.fillRect(0, 0, largura, H)
	oc.globalCompositeOperation = 'source-over'
	ctx.drawImage(oc.canvas, 0, 0, largura, H, 0, y, largura, H)
}

/** Pixels da tela que cada pixel da imagem desfocada cobre. */
const PASSO_DESFOQUE = 8

const desfocadasCache = new WeakMap<HTMLImageElement | HTMLCanvasElement, Map<string, HTMLCanvasElement | null>>()

/**
 * A imagem desfocada, para desenhar no lugar da original.
 *
 * `ctx.filter` não serve: o Safari ignora a propriedade sem erro nenhum, e a
 * peça saía com o fundo nítido (16/10/2026). Aqui o desfoque é feito à mão: a
 * imagem encolhe até cada pixel valer PASSO_DESFOQUE da tela, leva três
 * passadas de média (que somadas dão uma gaussiana) e volta esticada — esticar
 * o que já está liso não mostra degrau.
 *
 * `larguraNaTela` é a largura com que ela vai ser desenhada, e `raio` o desvio
 * em pixels da tela, o mesmo número que iria no blur(). Uma vez por imagem e
 * tamanho. Se o canvas recusar a leitura, devolve null.
 */
export function desfocada(
	img: HTMLImageElement | HTMLCanvasElement,
	larguraNaTela: number,
	raio: number,
): HTMLCanvasElement | null {
	const w = Math.max(1, Math.round(larguraNaTela / PASSO_DESFOQUE))
	const h = Math.max(1, Math.round((w * img.height) / img.width))
	// Três caixas de raio r somam a variância de uma gaussiana de desvio `raio`.
	const desvio = raio / PASSO_DESFOQUE
	const r = Math.max(1, Math.round((Math.sqrt(4 * desvio * desvio + 1) - 1) / 2))
	const chave = `${w}x${h}:${r}`
	let porTamanho = desfocadasCache.get(img)
	if (!porTamanho) desfocadasCache.set(img, (porTamanho = new Map()))
	const pronta = porTamanho.get(chave)
	if (pronta !== undefined) return pronta

	let saida: HTMLCanvasElement | null = null
	try {
		// Encolher pela metade de cada vez: de 1920 direto para 135 o navegador
		// pula pixels em vez de fazer a média.
		let atual: HTMLImageElement | HTMLCanvasElement = img
		let aw = img.width
		let ah = img.height
		while (aw > 2 * w) {
			aw = Math.round(aw / 2)
			ah = Math.round(ah / 2)
			const meio = document.createElement('canvas')
			meio.width = aw
			meio.height = ah
			const m = meio.getContext('2d')!
			m.imageSmoothingQuality = 'high'
			m.drawImage(atual, 0, 0, aw, ah)
			atual = meio
		}
		const c = document.createElement('canvas')
		c.width = w
		c.height = h
		const x = c.getContext('2d', { willReadFrequently: true })!
		x.imageSmoothingQuality = 'high'
		x.drawImage(atual, 0, 0, w, h)
		const d = x.getImageData(0, 0, w, h)
		desfocarPixels(d.data, w, h, r)
		x.putImageData(d, 0, 0)
		saida = c
	} catch {
		saida = null
	}
	porTamanho.set(chave, saida)
	return saida
}

/** Três passadas de média de raio r, na horizontal e na vertical, no próprio RGBA. */
export function desfocarPixels(dados: Uint8ClampedArray, w: number, h: number, r: number): void {
	const a = Float32Array.from(dados)
	const b = new Float32Array(a.length)
	for (let passada = 0; passada < 3; passada++) {
		mediaEmLinha(a, b, w, h, r, 4, 4 * w)
		mediaEmLinha(b, a, h, w, r, 4 * w, 4)
	}
	dados.set(a)
}

/**
 * Média móvel de raio r ao longo de cada linha (ou coluna, trocando os passos).
 * Na borda repete o último pixel: com transparente, a foto escurecia nas beiradas.
 */
function mediaEmLinha(
	de: Float32Array,
	para: Float32Array,
	n: number,
	linhas: number,
	r: number,
	passo: number,
	passoLinha: number,
): void {
	const k = 1 / (2 * r + 1)
	for (let l = 0; l < linhas; l++) {
		const base = l * passoLinha
		for (let canal = 0; canal < 4; canal++) {
			const em = (i: number) => de[base + Math.min(n - 1, Math.max(0, i)) * passo + canal]
			let soma = 0
			for (let j = -r; j <= r; j++) soma += em(j)
			for (let i = 0; i < n; i++) {
				para[base + i * passo + canal] = soma * k
				soma += em(i + r + 1) - em(i - r)
			}
		}
	}
}

/** A foto tratada e, quando foi possível medir, onde começa o chão em cada coluna dela. */
interface FotoTratada {
	tela: HTMLCanvasElement | HTMLImageElement
	/** Primeira linha de chão por coluna, nas coordenadas de `tela`. `null` = não medido. */
	chao: Int32Array | null
}

const semJuntasCache = new WeakMap<HTMLImageElement, FotoTratada>()

/**
 * A foto com as juntas do calçamento apagadas (ver juntas.ts).
 *
 * Uma vez por imagem: a limpeza custa centenas de ms e `render` roda a cada
 * movimento de slider. Trabalha em no máximo 1280px de largura — acima da
 * peça, para o zoom não denunciar a redução, sem pagar pela foto de 4000px. Se
 * o canvas recusar a leitura (foto de outra origem), devolve a foto como veio.
 */
export function fotoSemJuntas(img: HTMLImageElement): FotoTratada {
	const pronto = semJuntasCache.get(img)
	if (pronto) return pronto
	let saida: FotoTratada = { tela: img, chao: null }
	try {
		const esc = Math.min(1, 1280 / img.width)
		const c = document.createElement('canvas')
		c.width = Math.round(img.width * esc)
		c.height = Math.round(img.height * esc)
		const x = c.getContext('2d', { willReadFrequently: true })!
		x.imageSmoothingQuality = 'high'
		x.drawImage(img, 0, 0, c.width, c.height)
		const d = x.getImageData(0, 0, c.width, c.height)
		const trocados = limparJuntas(d.data, c.width, c.height)
		if (trocados > 0) x.putImageData(d, 0, 0)
		saida = { tela: trocados > 0 ? c : img, chao: acharChao(d.data, c.width, c.height) }
	} catch {
		saida = { tela: img, chao: null }
	}
	semJuntasCache.set(img, saida)
	return saida
}

/**
 * Funde o fim da foto no chão de baixo numa rampa LONGA — mas só onde é chão.
 *
 * A dissolvência de 16px de `suavizarDivisa` é curta de propósito: as
 * tentativas de fundir mais alcançavam as rodas. Só que 16px não escondem a
 * divisa — o tom casa, e ainda assim a TEXTURA muda de uma linha para a outra
 * (chão de foto é macio, o da fachada tem grão fino), e o olho acha a reta.
 *
 * O que mudou é que agora se sabe, coluna a coluna, onde o chão da foto começa
 * (`chao`, de juntas.ts). Então a rampa pode ter 170px: em cada coluna ela
 * nasce abaixo do pneu/sombra e nunca sobe além disso. Onde o carro chega perto
 * da base (picape), a rampa daquela coluna encurta sozinha.
 *
 * O que entra por cima é o fundo QUE ESTARIA ALI — as mesmas linhas da
 * fachada, redesenhadas por `pintarFundo` e com a mesma correção de tom que
 * `casarPisoAbaixoDaDivisa` aplicou abaixo da divisa. Copiar a tira de baixo
 * para cima não serve: o chão da fachada clareia conforme desce, e a cópia
 * deslocada deixava um degrau de tom exatamente na divisa.
 */
export function fundirChaoNaDivisa(
	ctx: CanvasRenderingContext2D,
	base: number,
	largura: number,
	geo: GeometriaDaFoto,
	deCima: [number, number, number],
	deBaixo: [number, number, number],
	/** Desenha o fundo nas coordenadas da peça; o contexto já vem transladado. */
	pintarFundo: (c: CanvasRenderingContext2D) => void,
): boolean {
	const chao = geo.chao
	if (!chao) return false
	const F = Math.min(170, base)
	if (F < 40) return false
	const FOLGA = 14 // entre o fim da sombra e o começo da rampa

	if (!fusaoCache) fusaoCache = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!
	const oc = fusaoCache
	if (oc.canvas.width !== largura || oc.canvas.height !== F) {
		oc.canvas.width = largura
		oc.canvas.height = F
	}
	oc.globalCompositeOperation = 'source-over'
	oc.clearRect(0, 0, largura, F)
	oc.save()
	oc.translate(0, -(base - F))
	pintarFundo(oc)
	oc.restore()
	casarPisoAbaixoDaDivisa(oc, 0, largura, F, deCima, deBaixo)

	const tira = oc.getImageData(0, 0, largura, F)
	const px = tira.data
	for (let x = 0; x < largura; x++) {
		const u = Math.floor(((x - geo.dx) / geo.dw) * geo.larguraTela)
		let inicio = F // coluna fora da foto: nada a fundir
		if (u >= 0 && u < chao.length) {
			const chaoNoCanvas = geo.dy + (chao[u] / geo.alturaTela) * geo.dh + FOLGA
			inicio = Math.max(0, chaoNoCanvas - (base - F))
		}
		const vao = F - inicio
		for (let y = 0; y < F; y++) {
			let a = 0
			if (vao >= 24 && y >= inicio) {
				const t = (y - inicio) / vao
				a = t * t * (3 - 2 * t)
			}
			px[(y * largura + x) * 4 + 3] = Math.round(a * 255)
		}
	}
	oc.putImageData(tira, 0, 0)
	ctx.drawImage(oc.canvas, 0, 0, largura, F, 0, base - F, largura, F)
	return true
}

let fusaoCache: CanvasRenderingContext2D | null = null

/** Onde a foto caiu no canvas — o bastante para levar uma coluna do canvas à coluna da foto. */
export interface GeometriaDaFoto {
	dx: number
	dy: number
	dw: number
	dh: number
	larguraTela: number
	alturaTela: number
	chao: Int32Array | null
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
): { topo: number; base: number; geo: GeometriaDaFoto } {
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
	const tratada = fotoSemJuntas(img)
	o2.drawImage(tratada.tela, dx - rx, dy - ry, dw, dh)
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
	const geo: GeometriaDaFoto = {
		dx,
		dy,
		dw,
		dh,
		larguraTela: tratada.tela.width,
		alturaTela: tratada.tela.height,
		chao: tratada.chao,
	}
	return { topo: Math.max(ry, dy), base: dy + dh, geo }
}

/** Largura fixa do canvas, reexportada para os formatos. */
export { LARGURA }
