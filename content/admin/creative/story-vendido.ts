/**
 * Attra Veículos — Story "VENDIDO" (1080×1920), "Rota até o cliente".
 *
 * Aprovado pela Lorrayne em 17/10/2026, depois de cinco rodadas. A peça é uma
 * imagem só, de cima para baixo:
 *   - o logo e o slogan "Attra Veículos | De Uberlândia para o Brasil 🇧🇷"
 *     numa névoa da cor do vidro da loja;
 *   - a loja sobe: acima da foto do carro vai o reflexo desfocado dela, e a
 *     névoa abre aos poucos até a foto ficar nítida antes do teto do carro;
 *   - o piso se dissolve no fundo, onde fica o mapa do Brasil inteiro com o
 *     arco vermelho de Uberlândia até a cidade do cliente;
 *   - VENDIDO (ou RESERVADO, ENTREGUE) e a linha "MODELO → CIDADE · UF", que
 *     podem passar por cima do sul do mapa, mas não dos pontos marcados.
 *
 * Tema claro ou escuro, à escolha do operador: carro escuro costuma pedir o
 * claro, e carro claro o escuro.
 *
 * O que ficou de fora, e por quê:
 *   - céu de banco de imagem no alto: o alto de toda foto do estoque é a
 *     marquise escura colada no teto do carro, e qualquer céu posto em cima
 *     deixava uma linha atravessando a peça. Acima do carro, só a própria foto;
 *   - degradê de duas paradas: faz quina, e a quina vira linha. Toda passagem
 *     aqui usa `suave()`;
 *   - mapa recortado em volta da rota, sumindo nas beiradas: lia como um
 *     pedaço de mapa. A Lorrayne pediu o Brasil inteiro, "mesmo que por baixo
 *     do texto" (17/10/2026);
 *   - `ctx.filter`: o Safari ignora sem erro. O desfoque é `desfocada()`.
 *
 * Fotos do estoque passam por /_next/image (fotoDoVeiculo): direto do S3 o
 * canvas fica tingido, a leitura de pixels falha e o download também.
 */
import { desfocada, fotoSemJuntas, grainCanvas } from './gerador/desenho'
import {
	UBERLANDIA,
	controleDoArco,
	enquadrarBrasil,
	ladoDoRotulo,
	limitesDe,
	puxarPara,
	recorteDaFoto,
	suave,
	type Cidade,
	type ContornoUF,
	type RGB,
} from './vendido/calculos'

export const CANVAS = { w: 1080, h: 1920 } as const
const W = CANVAS.w

/** Zonas de UI do Instagram Stories — nada crítico dentro delas. */
export const SAFE = { top: 250, bottom: 250 } as const

export type TemaVendido = 'claro' | 'escuro'
export const SELOS = ['VENDIDO', 'RESERVADO', 'ENTREGUE'] as const
export type Selo = (typeof SELOS)[number]

export interface DadosVendido {
	/** "Mercedes-Benz G 63 AMG" — sai em caixa alta. */
	modelo: string
	selo: Selo
	/** Cidade de entrega; sem ela o mapa marca só Uberlândia. */
	destino: Cidade | null
	tema: TemaVendido
}

export interface AssetsVendido {
	foto: HTMLImageElement
	logoPreta: CanvasImageSource
	logoBranca: CanvasImageSource
	bandeira?: HTMLImageElement
	/** Contorno das UFs; sem ele a peça sai sem mapa, mas sai. */
	ufs: ContornoUF[] | null
}

const SLOGAN = 'ATTRA VEÍCULOS | DE UBERLÂNDIA PARA O BRASIL'
const VERMELHO = '#c8102e'
const GRADE = {
	logoY: 252,
	logoW: 270,
	sloganY: 340,
	fotoY: 400,
	/** Foto em pé perde o excesso: acima disso o mapa não cabe. */
	fotoHMax: 860,
	/** O norte do mapa fica isto abaixo da base do carro. */
	mapaFolga: 50,
	/** Até onde o sul do mapa pode descer (a faixa de baixo do Stories começa em 1670). */
	mapaFundo: 1690,
	/** Uberlândia e o destino ficam acima daqui: o VENDIDO começa em ~1484 e o halo maior do ponto tem 38px. */
	mapaLivre: 1444,
	seloY: 1548,
	linhaY: 1614,
} as const

interface Paleta {
	/** Para onde vão o vidro (névoa do alto) e o piso (fundo de baixo), e até que luz. */
	alvo: RGB
	nevoa: { t: number; limite: number }
	fundo: { t: number; limite: number }
	logo: 'preta' | 'branca'
	slogan: string
	sombraTexto: string
	tinta: string
	cinza: string
	mapa: { preenche: string; traco: string; origem: string; anel: string; rotuloOrigem: string; rotuloDestino: string }
}

const PALETAS: Record<TemaVendido, Paleta> = {
	claro: {
		alvo: [246, 246, 246],
		nevoa: { t: 0.84, limite: 222 },
		fundo: { t: 0.66, limite: 232 },
		logo: 'preta',
		slogan: '#3a3b3d',
		sombraTexto: 'rgba(255,255,255,.5)',
		tinta: '#161616',
		cinza: '#6e6c67',
		mapa: {
			preenche: 'rgba(22,22,22,.045)',
			traco: 'rgba(22,22,22,.26)',
			origem: '#161616',
			anel: 'rgba(22,22,22,.4)',
			rotuloOrigem: '#6e6c67',
			rotuloDestino: '#161616',
		},
	},
	escuro: {
		alvo: [10, 11, 12],
		nevoa: { t: 0.8, limite: 34 },
		fundo: { t: 0.84, limite: 22 },
		logo: 'branca',
		slogan: '#c4c5c7',
		sombraTexto: 'rgba(0,0,0,.45)',
		tinta: '#f2f1ee',
		cinza: '#9d9b96',
		mapa: {
			preenche: 'rgba(255,255,255,.035)',
			traco: 'rgba(255,255,255,.22)',
			origem: '#ecebe7',
			anel: 'rgba(236,235,231,.45)',
			rotuloOrigem: '#9d9b96',
			rotuloDestino: '#f2f1ee',
		},
	},
}

const rgba = (c: RGB, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`
const fonte = (peso: number, px: number) => `${peso} ${px}px Montserrat, sans-serif`

/* ------------------------------------------------ texto */

function larguraEspacada(ctx: CanvasRenderingContext2D, texto: string, espaco: number): number {
	return [...texto].reduce((t, ch) => t + ctx.measureText(ch).width, 0) + espaco * ([...texto].length - 1)
}

/** Escreve letra a letra a partir de x e devolve onde terminou. */
function espacado(ctx: CanvasRenderingContext2D, texto: string, x: number, y: number, espaco: number): number {
	ctx.textAlign = 'left'
	for (const ch of texto) {
		ctx.fillText(ch, x, y)
		x += ctx.measureText(ch).width + espaco
	}
	return x - espaco
}

/** Texto espaçado e centrado, encolhendo até caber em `max`. */
function centrado(ctx: CanvasRenderingContext2D, texto: string, y: number, peso: number, px: number, espacoEm: number, cor: string, max: number): void {
	ctx.font = fonte(peso, px)
	while (px > 14 && larguraEspacada(ctx, texto, px * espacoEm) > max) ctx.font = fonte(peso, --px)
	ctx.fillStyle = cor
	espacado(ctx, texto, (W - larguraEspacada(ctx, texto, px * espacoEm)) / 2, y, px * espacoEm)
}

/* ------------------------------------------------ foto */

/** Cor média de uma faixa horizontal da imagem (de fy0 a fy1, em fração da altura). */
function corMedia(img: CanvasImageSource, fy0: number, fy1: number): RGB {
	const c = document.createElement('canvas')
	c.width = 24
	c.height = 18
	const x = c.getContext('2d', { willReadFrequently: true })!
	x.drawImage(img, 0, 0, 24, 18)
	const y0 = Math.min(17, Math.floor(fy0 * 18))
	const d = x.getImageData(0, y0, 24, Math.max(1, Math.min(18 - y0, Math.ceil((fy1 - fy0) * 18)))).data
	const s = [0, 0, 0]
	for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) s[k] += d[i + k]
	const n = d.length / 4
	return [s[0] / n, s[1] / n, s[2] / n].map(Math.round) as RGB
}

/** Desenha a imagem no lugar, visível só onde a máscara vertical (y → alfa) manda. */
function comMascara(
	ctx: CanvasRenderingContext2D,
	img: CanvasImageSource,
	origem: [number, number, number, number],
	destino: [number, number, number, number],
	H: number,
	paradas: [number, number][],
): void {
	const t = document.createElement('canvas')
	t.width = W
	t.height = H
	const c = t.getContext('2d')!
	c.imageSmoothingQuality = 'high'
	c.drawImage(img, ...origem, ...destino)
	c.globalCompositeOperation = 'destination-in'
	c.fillStyle = degrade(c, H, paradas, a => `rgba(0,0,0,${a})`)
	c.fillRect(0, 0, W, H)
	ctx.drawImage(t, 0, 0)
}

/** Degradê vertical de 0 a H com as paradas (y → alfa), na cor que `cor(alfa)` der. */
function degrade(ctx: CanvasRenderingContext2D, H: number, paradas: [number, number][], cor: (a: number) => string): CanvasGradient {
	const g = ctx.createLinearGradient(0, 0, 0, H)
	let ultimo = -1
	for (const [y, a] of paradas) {
		const p = Math.min(1, Math.max(0, y / H))
		if (p < ultimo) continue
		g.addColorStop((ultimo = p), cor(Math.min(1, Math.max(0, a))))
	}
	return g
}

/**
 * A cena: reflexo desfocado → foto → piso → fundo. Devolve a linha do chão
 * (onde o mapa começa).
 */
function cena(ctx: CanvasRenderingContext2D, foto: HTMLImageElement, p: Paleta, H: number): number {
	const { tela: img, chao } = fotoSemJuntas(foto)
	const iw = img.width
	const ih = img.height
	const { sy, sh } = recorteDaFoto(iw, ih, W, GRADE.fotoHMax)
	const y = GRADE.fotoY
	const h = (W * sh) / iw
	const fim = y + h

	// A base do carro: o chão medido nas colunas do meio, como na Edição.
	let base = y + h * 0.86
	if (chao) {
		const meio = Array.from(chao.slice(Math.round(chao.length * 0.15), Math.round(chao.length * 0.85))).sort((a, b) => a - b)
		const linha = meio[Math.floor(meio.length * 0.9)]
		if (linha > sy) base = Math.min(fim - 20, y + ((linha - sy) * h) / sh)
	}

	// As cores saem da própria foto: o vidro da fachada vira a névoa do alto e
	// o piso vira o fundo — assim a peça inteira tem a luz da foto.
	const fb = (base - y) / h
	const piso = corMedia(img, (sy + Math.min(fb + 0.03, 0.94) * sh) / ih, (sy + sh) / ih)
	const vidro = corMedia(img, (sy + 0.15 * sh) / ih, (sy + 0.32 * sh) / ih)
	const fundo = puxarPara(piso, p.alvo, p.fundo.t, p.fundo.limite)
	const nevoa = puxarPara(vidro, p.alvo, p.nevoa.t, p.nevoa.limite)
	ctx.fillStyle = rgba(fundo)
	ctx.fillRect(0, 0, W, H)

	// Acima da foto, o reflexo desfocado dela até o alto da peça. Refletir (e
	// não esticar) deixa a emenda sem borda: a última linha do reflexo é a
	// primeira da foto. Esticar fazia a porta aberta de uma McLaren virar risco.
	const borrada = desfocada(img, W, 40) ?? img
	const k = borrada.height / ih
	ctx.save()
	ctx.translate(0, y)
	ctx.scale(1, -1)
	ctx.drawImage(borrada, 0, sy * k, borrada.width, sh * k, 0, 0, W, Math.max(h, y))
	ctx.restore()

	// A foto: o desfoque por baixo e a nítida entrando aos poucos pelo alto;
	// embaixo as duas se dissolvem no piso.
	comMascara(ctx, borrada, [0, sy * k, borrada.width, sh * k], [0, y, W, h], H, [
		[y, 1],
		...suave(base + 40, 1, fim - 4, 0),
	])
	comMascara(ctx, img, [0, sy, iw, sh], [0, y, W, h], H, [
		...suave(y, 0, y + h * 0.1, 1),
		...suave(base + 10, 1, Math.min(base + 110, fim - 6), 0),
	])

	// A névoa do alto numa curva só: cobre o reflexo atrás do logo e abre até
	// sumir antes do teto do carro.
	ctx.fillStyle = degrade(ctx, H, [[0, 0.94], ...suave(GRADE.sloganY - 40, 0.94, y + h * 0.14, 0)], a => rgba(nevoa, a))
	ctx.fillRect(0, 0, W, H)

	// O piso vira o fundo.
	const f1 = Math.min(base + 160, fim)
	ctx.fillStyle = degrade(ctx, H, [[0, 0], ...suave(base - 30, 0, f1, 1), [H, 1]], a => rgba(fundo, a))
	ctx.fillRect(0, base - 30, W, H - base + 30)
	return base
}

/* ------------------------------------------------ mapa */

function mapa(ctx: CanvasRenderingContext2D, ufs: ContornoUF[], destino: Cidade | null, p: Paleta, base: number): void {
	const o = UBERLANDIA
	const d = destino ?? o
	// O Brasil inteiro, sem recorte nem borda apagada: o sul pode passar por
	// baixo do VENDIDO, Uberlândia e o destino nunca.
	const proj = enquadrarBrasil(
		limitesDe(ufs),
		{ cx: W / 2, topo: base + GRADE.mapaFolga, largura: 820, fundo: GRADE.mapaFundo, livreAte: GRADE.mapaLivre },
		[o.lat, d.lat],
	)
	if (proj.altura < 200) return

	const caminho = new Path2D()
	for (const u of ufs)
		for (const anel of u.aneis) {
			for (let i = 0; i < anel.length; i += 2) {
				const X = proj.x(anel[i] / 100)
				const Y = proj.y(anel[i + 1] / 100)
				if (i === 0) caminho.moveTo(X, Y)
				else caminho.lineTo(X, Y)
			}
			caminho.closePath()
		}
	ctx.fillStyle = p.mapa.preenche
	ctx.fill(caminho)
	ctx.strokeStyle = p.mapa.traco
	ctx.lineWidth = 1.2
	ctx.lineJoin = 'round'
	ctx.stroke(caminho)

	const O = { x: proj.x(o.lon), y: proj.y(o.lat) }
	const D = { x: proj.x(d.lon), y: proj.y(d.lat) }
	const rotulo = (texto: string, x: number, y: number, folga: number, preferido: 1 | -1, peso: number, px: number, cor: string) => {
		ctx.font = fonte(peso, px)
		const lado = ladoDoRotulo(x, ctx.measureText(texto).width, folga, preferido, W)
		ctx.textAlign = lado > 0 ? 'left' : 'right'
		ctx.fillStyle = cor
		ctx.fillText(texto, x + lado * folga, y + px / 3)
		ctx.textAlign = 'left'
	}
	const marcarOrigem = (preferido: 1 | -1) => {
		ctx.fillStyle = p.mapa.origem
		ctx.beginPath()
		ctx.arc(O.x, O.y, 5.5, 0, Math.PI * 2)
		ctx.fill()
		ctx.strokeStyle = p.mapa.anel
		ctx.lineWidth = 1.5
		ctx.beginPath()
		ctx.arc(O.x, O.y, 13, 0, Math.PI * 2)
		ctx.stroke()
		rotulo(o.nome.toUpperCase(), O.x, O.y, 24, preferido, 500, 19, p.mapa.rotuloOrigem)
	}

	// Sem cidade de entrega: só de onde o carro saiu.
	if (!destino) {
		marcarOrigem(1)
		return
	}
	const ctrl = controleDoArco(O, D)
	if (ctrl) {
		const g = ctx.createLinearGradient(O.x, O.y, D.x, D.y)
		g.addColorStop(0, 'rgba(200,16,46,.35)')
		g.addColorStop(1, 'rgba(200,16,46,1)')
		ctx.strokeStyle = g
		ctx.lineWidth = 3.5
		ctx.lineCap = 'round'
		ctx.beginPath()
		ctx.moveTo(O.x, O.y)
		ctx.quadraticCurveTo(ctrl.x, ctrl.y, D.x, D.y)
		ctx.stroke()
		marcarOrigem(O.x <= D.x ? -1 : 1)
	}
	ctx.fillStyle = VERMELHO
	ctx.beginPath()
	ctx.arc(D.x, D.y, 9, 0, Math.PI * 2)
	ctx.fill()
	ctx.lineWidth = 1.5
	ctx.strokeStyle = 'rgba(200,16,46,.5)'
	ctx.beginPath()
	ctx.arc(D.x, D.y, 22, 0, Math.PI * 2)
	ctx.stroke()
	// O halo de fora só quando não engole Uberlândia (Goiânia fica a ~30px).
	if (Math.hypot(D.x - O.x, D.y - O.y) > 38 + 13) {
		ctx.strokeStyle = 'rgba(200,16,46,.2)'
		ctx.beginPath()
		ctx.arc(D.x, D.y, 38, 0, Math.PI * 2)
		ctx.stroke()
	}
	rotulo(d.nome.toUpperCase(), D.x, D.y, 50, D.x >= O.x ? 1 : -1, 600, 21, p.mapa.rotuloDestino)
}

/* ------------------------------------------------ API */

export function renderStory(canvas: HTMLCanvasElement, dados: DadosVendido, assets: AssetsVendido): HTMLCanvasElement {
	canvas.width = CANVAS.w
	canvas.height = CANVAS.h
	const H = CANVAS.h
	const ctx = canvas.getContext('2d')!
	const p = PALETAS[dados.tema]

	const base = cena(ctx, assets.foto, p, H)
	if (assets.ufs) mapa(ctx, assets.ufs, dados.destino, p, base)

	ctx.save()
	ctx.globalAlpha = 0.03
	ctx.fillStyle = ctx.createPattern(grainCanvas(), 'repeat')!
	ctx.fillRect(0, 0, W, H)
	ctx.restore()

	// Alto: logo e slogan, com a bandeira no fim da linha.
	const logo = p.logo === 'preta' ? assets.logoPreta : assets.logoBranca
	const lw = (logo as HTMLImageElement).naturalWidth || (logo as HTMLCanvasElement).width
	const lh = (logo as HTMLImageElement).naturalHeight || (logo as HTMLCanvasElement).height
	if (lw && lh) {
		const h = (lh / lw) * GRADE.logoW
		ctx.drawImage(logo, (W - GRADE.logoW) / 2, GRADE.logoY - h / 2, GRADE.logoW, h)
	}
	ctx.save()
	ctx.shadowColor = p.sombraTexto
	ctx.shadowBlur = 10
	ctx.font = fonte(500, 21)
	const espaco = 21 * 0.12
	const largura = larguraEspacada(ctx, SLOGAN, espaco)
	const b = assets.bandeira
	const bh = 20
	const bw = b ? (b.naturalWidth * bh) / b.naturalHeight : 0
	const folga = b ? 12 : 0
	ctx.fillStyle = p.slogan
	const xFim = espacado(ctx, SLOGAN, (W - (largura + folga + bw)) / 2, GRADE.sloganY, espaco)
	ctx.restore()
	if (b) ctx.drawImage(b, xFim + folga, GRADE.sloganY - bh + 2, bw, bh)

	// Embaixo: a situação e o carro → a cidade.
	centrado(ctx, dados.selo, GRADE.seloY, 600, 92, 0.33, p.tinta, W - 160)
	const modelo = dados.modelo.trim().toUpperCase()
	const d = dados.destino
	const linha = d ? `${modelo}  →  ${d.nome.toUpperCase()} · ${d.uf}` : modelo
	if (linha) centrado(ctx, linha, GRADE.linhaY, 400, 25, 0.16, p.cinza, W - 200)
	return canvas
}


/**
 * Carrega a foto pelo otimizador do próprio site. A URL crua do S3 tinge o
 * canvas e quebra o toBlob(); o /_next/image é mesma origem. w=1200 é mais
 * que a largura da peça.
 */
export function fotoDoVeiculo(urlS3: string, w = 1200): Promise<HTMLImageElement> {
	return carregar(`/_next/image?url=${encodeURIComponent(urlS3)}&w=${w}&q=90`)
}

export function carregar(src: string): Promise<HTMLImageElement> {
	return new Promise((ok, erro) => {
		const img = new Image()
		img.crossOrigin = 'anonymous'
		img.onload = () => ok(img)
		img.onerror = () => erro(new Error(`falhou ao carregar ${src}`))
		img.src = src
	})
}

export function exportarPng(canvas: HTMLCanvasElement): Promise<Blob> {
	return new Promise((ok, erro) => canvas.toBlob(b => (b ? ok(b) : erro(new Error('toBlob falhou'))), 'image/png'))
}
