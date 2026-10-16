/**
 * TIPO 7 — PREMIUM (escuro: desempenho, ficha em grade e duas fotos)
 *
 * Desenhado a partir das duas peças que a Attra publicou para o Lamborghini
 * Temerario (Arancio Xanto e Viola Pasifae, 16/10/2026). As medidas abaixo
 * são as dessas peças levadas a 1080×1920.
 *
 * De cima para baixo:
 *   - a foto principal, com o topo escurecido para o logo, a marca, o modelo
 *     e a linha de desempenho;
 *   - a faixa na cor do carro ("VIOLA PASIFAE - 2026") e o "0KM · PRONTA
 *     ENTREGA", já sobre o piso escurecido;
 *   - a grade de cinco blocos com rótulo;
 *   - o valor;
 *   - a foto de baixo, numa janela em "A" (só no Stories).
 *
 * A cor de destaque vem do operador, porque é a do carro: a faixa usa a cor
 * como está, e os rótulos usam a mesma cor clareada até ler sobre o piso.
 */
import { hexParaRgb, luminanciaRelativa, razaoDeContraste } from '../contraste'
import {
	desfocada,
	drawLogoWhite,
	drawPhoto,
	drawPhotoBanda,
	fotoSemJuntas,
	placeholder,
	RED,
	spacedText,
	spacedWidth,
} from '../desenho'
import { enquadrar, NEUTRO } from '../enquadramento'
import { ALTURA_FEED, LARGURA as W, type ContextoDesenho } from '../tipos'

type Rgb = [number, number, number]

/** Onde a foto principal termina e começa o piso escuro. */
const FIM_FOTO = 940
/**
 * Topo da caixa da foto principal. A caixa tem 810 de altura, a de uma foto
 * 4:3 do estoque na largura da peça — no enquadramento neutro ela entra
 * inteira e o carro cai em 565..880, onde está na referência.
 */
const TOPO_FOTO = 300
const ALTURA_CAIXA_FOTO = 810
/** Cor média do piso na referência: (41, 43, 42). */
export const PISO = '#2a2b2b'

/** Grade: onde começa o texto de cada coluna e onde ficam as divisórias. */
const COLUNAS = [70, 403, 717]
const DIVISORIAS = [383, 697]
const LARGURA_COLUNA = 290
/** Posição de cada bloco: [coluna, linha]. A coluna 0 da linha 1 fica livre. */
const POSICOES: [number, number][] = [[0, 0], [1, 0], [2, 0], [1, 1], [2, 1]]

const F_ROTULO = '600 14px Montserrat, sans-serif'
const ESP_ROTULO = 4
const ENTRE_LINHAS = 28

/**
 * Onde a grade termina na referência (linha de cima com 2 linhas de texto,
 * a de baixo com 3). A janela da foto de baixo e o valor foram medidos com
 * ela assim; com outra quantidade de linhas, os dois andam junto.
 */
const FIM_GRADE_REFERENCIA = 1246

const css = ([r, g, b]: Rgb) => `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`
const clarear = ([r, g, b]: Rgb, t: number): Rgb => [r + (255 - r) * t, g + (255 - g) * t, b + (255 - b) * t]
const lum = (c: Rgb) => luminanciaRelativa(c[0], c[1], c[2])

export function corDeDestaque(hex: string): Rgb {
	return /^#?[0-9a-f]{6}$/i.test(hex.trim()) ? hexParaRgb(hex.trim()) : hexParaRgb(RED)
}

/**
 * Cor de destaque sugerida a partir da cor do estoque ("Roxo", "Laranja").
 *
 * Só um ponto de partida: a cor do estoque é genérica e a do carro é um tom
 * de catálogo — o roxo e o laranja abaixo são os medidos nas duas peças de
 * referência. Preto, branco, cinza e prata não viram faixa (preto some no piso
 * escuro, branco apaga o texto), então devolvem vazio e a peça fica com o
 * vermelho da Attra.
 */
const CORES_DO_ESTOQUE: [RegExp, string][] = [
	[/roxo|violeta|lil[aá]s|purple/i, '#4a1f87'],
	[/laranja|orange/i, '#f94b37'],
	[/vinho|bord[oô]/i, '#7a1630'],
	[/vermelh|red/i, '#c8102e'],
	[/azul|blue/i, '#1f4fa8'],
	[/verde|green/i, '#2e7d4f'],
	[/amarel|yellow/i, '#e8b400'],
	[/dourad|gold/i, '#b8913a'],
	[/marrom|bronze|brown/i, '#7a4a2a'],
	[/bege|areia/i, '#b8956a'],
]

export function corSugeridaPeloNome(nome: string): string {
	return CORES_DO_ESTOQUE.find(([re]) => re.test(nome))?.[1] ?? ''
}

/** A cor do carro, clareada até 4,5:1 sobre o piso — a dos rótulos. */
export function corDoRotulo(destaque: Rgb): string {
	const fundo = lum(hexParaRgb(PISO))
	for (let t = 0; t < 1; t += 0.05) {
		const c = clarear(destaque, t)
		if (razaoDeContraste(lum(c), fundo) >= 4.5) return css(c)
	}
	return '#ffffff'
}

/** Texto alinhado à esquerda com espaçamento entre letras; devolve a largura. */
function espacadoEsq(
	ctx: CanvasRenderingContext2D,
	texto: string,
	x: number,
	y: number,
	fonte: string,
	espaco: number,
	cor: string | CanvasGradient,
): number {
	ctx.font = fonte
	ctx.fillStyle = cor
	ctx.textAlign = 'left'
	let cx = x
	for (const ch of texto) {
		ctx.fillText(ch, cx, y)
		cx += ctx.measureText(ch).width + espaco
	}
	return cx - espaco - x
}

/** Corta com "…" até caber. */
function caber(ctx: CanvasRenderingContext2D, texto: string, largura: number): string {
	if (ctx.measureText(texto).width <= largura) return texto
	let t = texto
	while (t.length > 3 && ctx.measureText(t + '…').width > largura) t = t.slice(0, -1).trimEnd()
	return t + '…'
}

/**
 * O nome do modelo sem logotipo: Montserrat itálica, esticada na horizontal
 * e com degradê de cromado. É a reserva — o logotipo do fabricante (PNG
 * enviado pelo operador) é o que deixa a peça igual à referência.
 */
function modeloCromado(ctx: CanvasRenderingContext2D, modelo: string, cx: number, y: number): void {
	const ESTICA = 1.3
	const ESPACO = 4
	let tam = 88
	const fonte = () => `italic 800 ${tam}px Montserrat, sans-serif`
	while (tam > 40 && spacedWidth(ctx, modelo, fonte(), ESPACO) * ESTICA > 880) tam -= 2
	const largura = spacedWidth(ctx, modelo, fonte(), ESPACO)

	ctx.save()
	ctx.translate(cx, y)
	ctx.scale(ESTICA, 1)
	const g = ctx.createLinearGradient(0, -tam * 0.72, 0, 0)
	g.addColorStop(0, '#ffffff')
	g.addColorStop(0.46, '#dcdce0')
	g.addColorStop(0.54, '#8e8e95')
	g.addColorStop(1, '#e4e4e8')
	ctx.shadowColor = 'rgba(0,0,0,.65)'
	ctx.shadowBlur = 18
	espacadoEsq(ctx, modelo, -largura / 2, 0, fonte(), ESPACO, g)
	ctx.restore()
}

/** Logotipo do modelo dentro de uma caixa, centrado. */
function logotipoDoModelo(ctx: CanvasRenderingContext2D, img: HTMLImageElement, cx: number, cy: number): void {
	const esc = Math.min(860 / img.width, 100 / img.height)
	const w = img.width * esc
	const h = img.height * esc
	ctx.save()
	ctx.shadowColor = 'rgba(0,0,0,.6)'
	ctx.shadowBlur = 18
	ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h)
	ctx.restore()
}

function linha(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, cor: string, largura: number): void {
	ctx.strokeStyle = cor
	ctx.lineWidth = largura
	ctx.beginPath()
	ctx.moveTo(x1, y1)
	ctx.lineTo(x2, y2)
	ctx.stroke()
}

export function renderPremium({ ctx, estado, imagens, assets, altura: H }: ContextoDesenho): void {
	const FEED = H === ALTURA_FEED // 1080×1350: sem a foto de baixo
	const destaque = corDeDestaque(estado.corDestaque ?? '')
	const corRotulo = corDoRotulo(destaque)

	ctx.fillStyle = '#08090a'
	ctx.fillRect(0, 0, W, H)

	/* ------------------------------------------------ foto principal */

	const foto1 = imagens.foto1
	if (foto1) {
		// Atrás do título, a própria foto maior, desfocada e escura: o topo da
		// caixa da foto (300) fica abaixo do logo, e o que sobra em cima precisa
		// ter a mesma textura de árvore e vidro da referência, não um preto chapado.
		ctx.save()
		ctx.beginPath()
		ctx.rect(0, 0, W, FIM_FOTO)
		ctx.clip()
		const e = enquadrar(foto1, { x: 0, y: 0, largura: W, altura: FIM_FOTO }, { zoom: 1.15, x: 0.5, y: 0.3 })
		ctx.drawImage(desfocada(foto1, e.dw, 28) ?? foto1, e.dx, e.dy, e.dw, e.dh)
		ctx.fillStyle = 'rgba(0,0,0,.45)'
		ctx.fillRect(0, 0, W, FIM_FOTO)
		ctx.restore()
		drawPhotoBanda(ctx, FIM_FOTO, foto1, 0, TOPO_FOTO, W, ALTURA_CAIXA_FOTO, estado.f1)

		// Na referência a loja atrás do carro está quase apagada e só o carro
		// fica aceso — isso é recorte, e o recorte está fora do gerador desde
		// 31/08. A vinheta chega perto sem ele: as fotos do estoque têm o carro
		// centrado e em 3/4, então uma elipse em volta dele mantém o carro e
		// escurece vidro e chão nas bordas.
		ctx.save()
		ctx.beginPath()
		ctx.rect(0, TOPO_FOTO, W, FIM_FOTO - TOPO_FOTO)
		ctx.clip()
		ctx.translate(W / 2, 735)
		ctx.scale(1, 0.4)
		const v = ctx.createRadialGradient(0, 0, 0, 0, 0, 640)
		v.addColorStop(0, 'rgba(0,0,0,0)')
		v.addColorStop(0.76, 'rgba(0,0,0,0)')
		v.addColorStop(1, 'rgba(0,0,0,.62)')
		ctx.fillStyle = v
		ctx.fillRect(-W, -3000, 2 * W, 6000)
		ctx.restore()
	} else {
		ctx.fillStyle = 'rgba(255,255,255,.45)'
		ctx.font = '600 26px Montserrat, sans-serif'
		ctx.textAlign = 'center'
		ctx.fillText('ENVIE A FOTO PRINCIPAL DO VEÍCULO', W / 2, 740)
		ctx.textAlign = 'left'
	}

	// Escurece o topo para o título. Acaba em 660, antes do teto do carro
	// clarear de vez: na referência o carro está aceso desde 565.
	const g = ctx.createLinearGradient(0, 0, 0, 660)
	g.addColorStop(0, 'rgba(0,0,0,.80)')
	g.addColorStop(0.45, 'rgba(0,0,0,.72)')
	g.addColorStop(0.7, 'rgba(0,0,0,.50)')
	g.addColorStop(0.86, 'rgba(0,0,0,.15)')
	g.addColorStop(1, 'rgba(0,0,0,0)')
	ctx.fillStyle = g
	ctx.fillRect(0, 0, W, 660)

	/* ------------------------------------------------ título */

	drawLogoWhite(ctx, assets, imagens, W / 2, 162, 270)

	const marca = estado.marca.trim().toUpperCase()
	if (marca) {
		let tam = 42
		let esp = 27
		while (tam > 26 && spacedWidth(ctx, marca, `300 ${tam}px Montserrat, sans-serif`, esp) > 900) {
			tam -= 2
			esp = Math.max(10, esp - 2)
		}
		spacedText(ctx, marca, W / 2, 312, `300 ${tam}px Montserrat, sans-serif`, esp, '#f4f4f6')
	}

	const modelo = estado.modelo.trim().toUpperCase()
	if (imagens.logoModelo) logotipoDoModelo(ctx, imagens.logoModelo, W / 2, 365)
	else if (modelo) modeloCromado(ctx, modelo, W / 2, 398)

	/* ------------------------------------------------ desempenho */

	const F_VALOR = '300 46px Montserrat, sans-serif'
	const F_UNIDADE = '400 19px Montserrat, sans-serif'
	const F_ROT_DESEMP = '600 13px Montserrat, sans-serif'
	const RESPIRO = 40
	const itens = (estado.desempenho ?? [])
		.map(i => ({ valor: i.valor.trim(), unidade: i.unidade.trim(), rotulo: i.rotulo.trim().toUpperCase() }))
		.filter(i => i.valor)
		.slice(0, 4)
		.map(i => {
			ctx.font = F_VALOR
			const wValor = ctx.measureText(i.valor).width
			ctx.font = F_UNIDADE
			const wUnidade = i.unidade ? ctx.measureText(i.unidade).width + 6 : 0
			const wRotulo = i.rotulo ? spacedWidth(ctx, i.rotulo, F_ROT_DESEMP, 3.5) : 0
			return { ...i, wValor, wUnidade, largura: Math.max(wValor + wUnidade, wRotulo) }
		})
	if (itens.length) {
		const total = itens.reduce((s, i) => s + i.largura, 0) + 2 * RESPIRO * (itens.length - 1)
		let x = W / 2 - total / 2
		itens.forEach((it, n) => {
			const cx = x + it.largura / 2
			const x0 = cx - (it.wValor + it.wUnidade) / 2
			ctx.textAlign = 'left'
			ctx.font = F_VALOR
			ctx.fillStyle = '#f4f4f6'
			ctx.fillText(it.valor, x0, 492)
			if (it.unidade) {
				ctx.font = F_UNIDADE
				ctx.fillStyle = '#a9a9b0'
				ctx.fillText(it.unidade, x0 + it.wValor + 6, 492)
			}
			if (it.rotulo) spacedText(ctx, it.rotulo, cx, 517, F_ROT_DESEMP, 3.5, corRotulo)
			x += it.largura
			if (n < itens.length - 1) {
				linha(ctx, x + RESPIRO, 452, x + RESPIRO, 522, 'rgba(255,255,255,.28)', 1.5)
				x += 2 * RESPIRO
			}
		})
	}

	/* ------------------------------------------------ piso */

	ctx.save()
	ctx.beginPath()
	ctx.rect(0, FIM_FOTO, W, H - FIM_FOTO)
	ctx.clip()
	const piso = assets.pisoConcreto
	if (piso.complete && piso.naturalWidth) {
		// O concreto tem luminância média 189; deixar passar 22% dele leva ao
		// (41,43,42) medido. Escurecido com preto por cima, e não com
		// ctx.filter: o Safari ignora o filter, e o piso saía cinza claro com
		// o texto branco em cima (16/10/2026).
		const e = enquadrar(piso, { x: 0, y: FIM_FOTO, largura: W, altura: H - FIM_FOTO }, NEUTRO)
		ctx.drawImage(piso, e.dx, e.dy, e.dw, e.dh)
		ctx.fillStyle = 'rgba(0,0,0,.78)'
		ctx.fillRect(0, FIM_FOTO, W, H - FIM_FOTO)
	} else {
		ctx.fillStyle = PISO
		ctx.fillRect(0, FIM_FOTO, W, H - FIM_FOTO)
	}
	const sombra = ctx.createLinearGradient(0, FIM_FOTO, 0, FIM_FOTO + 46)
	sombra.addColorStop(0, 'rgba(0,0,0,.5)')
	sombra.addColorStop(1, 'rgba(0,0,0,0)')
	ctx.fillStyle = sombra
	ctx.fillRect(0, FIM_FOTO, W, 46)
	ctx.restore()

	/* ------------------------------------------------ faixa da cor */

	const textoFaixa = [(estado.nomeCor ?? '').trim(), estado.ano.trim()].filter(Boolean).join(' - ').toUpperCase()
	if (textoFaixa) {
		let tam = 26
		let esp = 21
		const fonte = () => `700 ${tam}px Montserrat, sans-serif`
		while (tam > 18 && spacedWidth(ctx, textoFaixa, fonte(), esp) > 820) {
			tam -= 1
			esp = Math.max(8, esp - 1.5)
		}
		const tw = spacedWidth(ctx, textoFaixa, fonte(), esp)
		const x0 = W / 2 - tw / 2 - 44
		const x1 = W / 2 + tw / 2 + 44
		const y0 = FIM_FOTO
		const y1 = FIM_FOTO + 40
		const INCLINA = 11
		ctx.fillStyle = css(destaque)
		ctx.beginPath()
		ctx.moveTo(x0 - INCLINA, y1)
		ctx.lineTo(x0 + INCLINA, y0)
		ctx.lineTo(x1 + INCLINA, y0)
		ctx.lineTo(x1 - INCLINA, y1)
		ctx.closePath()
		ctx.fill()
		// Texto branco, a não ser que a cor do carro seja clara (branco, amarelo).
		const corTexto = razaoDeContraste(lum(destaque), 1) >= 3 ? '#ffffff' : '#141416'
		spacedText(ctx, textoFaixa, W / 2, y0 + 30, fonte(), esp, corTexto)
	}

	/* ------------------------------------------------ 0KM · PRONTA ENTREGA */

	const km = estado.km.trim().replace(/\s*km$/i, '')
	const partesKm: string[] = []
	if (km) partesKm.push(km === '0' ? '0KM' : `${km} KM`)
	if (estado.kmextra.trim()) partesKm.push(estado.kmextra.trim().toUpperCase())
	if (partesKm.length) {
		const y = FIM_FOTO + 68
		const tw = spacedText(ctx, partesKm.join('   ·   '), W / 2, y, '500 16px Montserrat, sans-serif', 5, '#cfcfd4')
		const cor = 'rgba(255,255,255,.4)'
		linha(ctx, W / 2 - tw / 2 - 86, y - 5, W / 2 - tw / 2 - 28, y - 5, cor, 1.5)
		linha(ctx, W / 2 + tw / 2 + 28, y - 5, W / 2 + tw / 2 + 86, y - 5, cor, 1.5)
	}

	/* ------------------------------------------------ grade */

	const blocos = (estado.blocos ?? []).slice(0, 5).map(b => ({
		rotulo: b.rotulo.trim().toUpperCase(),
		linhas: b.texto.split('\n').map(l => l.trim()).filter(Boolean).slice(0, 3),
	}))
	const temBloco = (i: number) => !!blocos[i] && (blocos[i].rotulo !== '' || blocos[i].linhas.length > 0)
	const linhasDaFileira = (fileira: number) =>
		Math.max(0, ...POSICOES.map(([, l], i) => (l === fileira && temBloco(i) ? blocos[i].linhas.length : 0)))

	const yRotulo1 = FIM_FOTO + 110
	const n1 = Math.max(1, linhasDaFileira(0))
	const fimFileira1 = yRotulo1 + 33 + ENTRE_LINHAS * (n1 - 1)
	const temFileira2 = [3, 4].some(temBloco)
	const yRotulo2 = fimFileira1 + 46
	const fimGrade = temFileira2 ? yRotulo2 + 33 + ENTRE_LINHAS * (Math.max(1, linhasDaFileira(1)) - 1) : fimFileira1

	blocos.forEach((b, i) => {
		if (!temBloco(i)) return
		const [col, fil] = POSICOES[i]
		const x = COLUNAS[col]
		const yRot = fil === 0 ? yRotulo1 : yRotulo2
		if (b.rotulo) espacadoEsq(ctx, b.rotulo, x, yRot, F_ROTULO, ESP_ROTULO, corRotulo)
		// Uma fonte por bloco: encolhe até a linha mais longa caber na coluna.
		let tam = 22
		const larguraMaior = () => {
			ctx.font = `400 ${tam}px Montserrat, sans-serif`
			return Math.max(0, ...b.linhas.map(l => ctx.measureText(l).width))
		}
		while (tam > 17 && larguraMaior() > LARGURA_COLUNA) tam -= 1
		ctx.font = `400 ${tam}px Montserrat, sans-serif`
		ctx.textAlign = 'left'
		b.linhas.forEach((l, n) => {
			ctx.fillStyle = n === 0 ? '#f2f2f4' : '#bdbdc4'
			ctx.fillText(caber(ctx, l, LARGURA_COLUNA), x, yRot + 33 + n * ENTRE_LINHAS)
		})
	})

	const corDivisoria = 'rgba(255,255,255,.22)'
	DIVISORIAS.forEach((x, n) => {
		const temAqui = POSICOES.some(([c], i) => (c === n || c === n + 1) && temBloco(i))
		if (temAqui) linha(ctx, x, yRotulo1 - 16, x, fimGrade + 8, corDivisoria, 1.5)
	})
	if (temFileira2) linha(ctx, DIVISORIAS[0], fimFileira1 + 19, W - 70, fimFileira1 + 19, corDivisoria, 1.5)

	/* ------------------------------------------------ valor */

	const preco = estado.preco.trim().replace(/^R\$\s*/i, '')
	if (preco) {
		// Stories: na coluna da direita, logo abaixo da grade, como na
		// referência. Feed: não há diagonal, então vai para a casa livre da
		// coluna da esquerda e a peça fecha mais cedo.
		const x = FEED ? COLUNAS[0] : COLUNAS[2] + 3
		const yRot = FEED ? yRotulo2 : fimGrade + 37
		espacadoEsq(ctx, 'VALOR', x, yRot, '600 13px Montserrat, sans-serif', ESP_ROTULO, corRotulo)
		ctx.textAlign = 'left'
		ctx.font = '400 24px Montserrat, sans-serif'
		ctx.fillStyle = '#d6d6db'
		ctx.fillText('R$', x, yRot + 47)
		const xNum = x + ctx.measureText('R$').width + 10
		let tam = 46
		ctx.font = `300 ${tam}px Montserrat, sans-serif`
		while (tam > 30 && xNum + ctx.measureText(preco).width > W - 36) {
			tam -= 2
			ctx.font = `300 ${tam}px Montserrat, sans-serif`
		}
		ctx.fillStyle = '#f6f6f8'
		ctx.fillText(preco, xNum, yRot + 47)
	}

	/* ------------------------------------------------ foto de baixo (Stories) */

	if (FEED) return

	// Duas retas, medidas na referência: A desce da esquerda para a direita
	// passando sob o valor; B sobe do canto esquerdo até cruzar A. A janela é
	// o que fica abaixo das duas — o "A" da marca, deitado.
	const D = fimGrade - FIM_GRADE_REFERENCIA
	const aEsq = 1130 + D
	const aDir = 1480 + D
	const bBase = 1640 + D
	const yA = (x: number) => aEsq + ((aDir - aEsq) * x) / W
	// B: de (0, bBase) a (270, 1218 + D), estendida até cruzar A.
	const inclB = (1218 + D - bBase) / 270
	const xTopo = (aEsq - bBase) / (inclB - (aDir - aEsq) / W)
	const topo: [number, number] = [xTopo, yA(xTopo)]

	ctx.save()
	ctx.beginPath()
	ctx.moveTo(topo[0], topo[1])
	ctx.lineTo(W, aDir)
	ctx.lineTo(W, H)
	ctx.lineTo(0, H)
	ctx.lineTo(0, bBase)
	ctx.closePath()
	ctx.clip()
	// A caixa da foto começa na ponta da janela. Sem ajuste do operador, o topo
	// da foto encosta ali — é o que deixa o carro baixo, com pouco chão
	// embaixo, como na referência; centralizada, ela subia 100px.
	const caixa = { x: 0, y: topo[1], largura: W, altura: H - topo[1] }
	if (imagens.foto2) {
		// O chão é metade desta foto, então as juntas do calçamento aparecem
		// inteiras: passam pela mesma limpeza da foto principal (juntas.ts).
		const foto2 = fotoSemJuntas(imagens.foto2).tela
		let opt = estado.f2
		if (opt.zoom === 1 && opt.x === 0.5 && opt.y === 0.5) {
			const e = enquadrar(foto2, caixa, NEUTRO)
			const alcance = Math.max(e.dh - caixa.altura, caixa.altura * 0.6)
			opt = { ...opt, y: 0.5 + (caixa.altura - e.dh) / (2 * alcance) }
		}
		drawPhoto(ctx, foto2, caixa.x, caixa.y, caixa.largura, caixa.altura, opt)
	} else placeholder(ctx, caixa.x, caixa.y, caixa.largura, caixa.altura, 'FOTO TRASEIRA / LATERAL')
	ctx.restore()

	const corFilete = 'rgba(200,200,206,.55)'
	linha(ctx, 0, aEsq, W, aDir, corFilete, 9)
	linha(ctx, 0, bBase, topo[0], topo[1], corFilete, 9)
}
