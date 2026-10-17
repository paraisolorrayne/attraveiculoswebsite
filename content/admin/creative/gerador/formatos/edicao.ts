/**
 * TIPO 12 — EDIÇÃO (16/10/2026)
 *
 * Linha editorial a partir da peça "Mercedes-Benz GLE 63 S Coupé — Attra
 * Edition" que a Lorrayne mandou, com os ajustes da revisão dela:
 *   - a peça é uma imagem só (`cenaContinua`): a foto do estoque e, acima e
 *     abaixo, o reflexo desfocado dela, com uma vinheta escura no alto e no
 *     pé para o texto. Nada de faixas: a peça nunca pode ler em três partes;
 *   - o "A" do logo, inteiro e reconhecível (o "Λ" e a lâmina vermelha), como
 *     marca-d'água no alto à direita;
 *   - nada de letreiro da loja sobre o carro: com o logo no alto, ele
 *     aparecia duas vezes;
 *   - cabeçalho baixo, com marca, modelo (sempre numa linha, no mesmo lugar,
 *     com o corpo se ajustando a nomes longos) e ano com o traço vermelho;
 *   - preço em serifa num corpo fixo, que cabe até R$ 9.999.999, e o KM numa
 *     coluna própria à direita;
 *   - ficha em sem serifa, legível, a primeira linha em destaque.
 * No Stories, logo e ficha ficam fora das pontas que o Instagram cobre.
 */
import { desfocada, drawLogoWhite, fotoSemJuntas, grainCanvas } from '../desenho'
import { ALTURA_FEED, LARGURA as W, type Assets, type ContextoDesenho, type OpcoesFoto } from '../tipos'

const MARGEM = 106
const BRANCO = '#ecebe7'
const CINZA = '#b9b8b4'
const VERMELHO = '#c8102e'
const SERIFA = '"Gilda Display", Georgia, serif'
const GRAFITE_TOPO = '#1c1c1e'

/** Texto com espaço entre letras, alinhado à esquerda. */
function espacado(ctx: CanvasRenderingContext2D, texto: string, x: number, y: number, fonte: string, espaco: number, cor: string): void {
	ctx.font = fonte
	ctx.fillStyle = cor
	ctx.textAlign = 'left'
	let cx = x
	for (const ch of texto) {
		ctx.fillText(ch, cx, y)
		cx += ctx.measureText(ch).width + espaco
	}
}

/** Corta com "…" até caber. */
function caber(ctx: CanvasRenderingContext2D, texto: string, largura: number): string {
	if (ctx.measureText(texto).width <= largura) return texto
	let s = texto
	while (s.length > 4 && ctx.measureText(s + '…').width > largura) s = s.slice(0, -1).trimEnd()
	return s + '…'
}

/**
 * O "A" do logo como marca-d'água: o "Λ" e a lâmina vermelha, recortados da
 * logo branca (x 0..301, y 0..265 em 1356×367, sem a barra do T que encosta
 * nele). O branco vira um véu claro e a lâmina continua vermelha, mais
 * presente: é ela que faz o "A" ler como o da Attra, e não como uma letra.
 */
const marcasProntas = new Map<string, HTMLCanvasElement | null>()

function letraDaMarca(assets: Assets, altura: number): HTMLCanvasElement | null {
	const logo = assets.logoBranca
	if (!logo.complete || !logo.naturalWidth) return null
	const chave = `${logo.src}|${altura}`
	if (marcasProntas.has(chave)) return marcasProntas.get(chave)!
	const k = logo.naturalWidth / 1356
	const esc = altura / 265
	const largura = 301 * esc
	const c = document.createElement('canvas')
	c.width = Math.ceil(largura)
	c.height = Math.ceil(altura)
	const t = c.getContext('2d', { willReadFrequently: true })!
	t.beginPath()
	t.moveTo(0, 0)
	t.lineTo(270 * esc, 0)
	t.lineTo(largura, altura)
	t.lineTo(0, altura)
	t.closePath()
	t.clip()
	t.drawImage(logo, 0, 0, 301 * k, 265 * k, 0, 0, largura, altura)
	try {
		const d = t.getImageData(0, 0, c.width, c.height)
		for (let i = 0; i < d.data.length; i += 4) {
			const a = d.data[i + 3]
			if (!a) continue
			const vermelho = d.data[i] > d.data[i + 1] + 60
			d.data[i] = vermelho ? 200 : 255
			d.data[i + 1] = vermelho ? 16 : 255
			d.data[i + 2] = vermelho ? 46 : 255
			d.data[i + 3] = Math.round(a * (vermelho ? 0.36 : 0.1))
		}
		t.putImageData(d, 0, 0)
	} catch {
		marcasProntas.set(chave, null)
		return null
	}
	marcasProntas.set(chave, c)
	return c
}

let tela: HTMLCanvasElement | null = null

/**
 * A peça é UMA imagem: a foto do carro e, acima e abaixo dela, o reflexo da
 * própria foto, desfocado — em cima a fachada continua, embaixo o piso
 * continua. A nítida se dissolve no desfoque dela mesma, então não sobra
 * borda nem fundo liso; o escuro do alto e do pé, onde vai o texto, é uma
 * vinheta sobre essa imagem, em curva, sem patamar. Faixa de grafite chapado
 * com a foto no meio partia a peça em três (16/10/2026), e isso não pode.
 *
 * Devolve onde o carro encosta no chão (achado no chão da foto, juntas.ts).
 */
function cenaContinua(
	ctx: CanvasRenderingContext2D,
	foto: HTMLImageElement,
	opt: OpcoesFoto,
	H: number,
	y0: number,
	largura: number,
): number {
	const { tela: img, chao } = fotoSemJuntas(foto)
	const w = largura * opt.zoom
	const h = (w * img.height) / img.width
	const x = (W - w) * opt.x
	const y = y0 + (0.5 - opt.y) * 400
	let base = y + h * 0.86
	if (chao) {
		const meio = Array.from(chao.slice(Math.round(chao.length * 0.15), Math.round(chao.length * 0.85))).sort((p, q) => p - q)
		const linha = meio[Math.floor(meio.length * 0.9)]
		if (linha > 0) base = y + (linha * h) / img.height
	}

	// O desfoque: a foto no lugar e os reflexos dela em cima e embaixo, até
	// cobrir a peça. Refletir (e não esticar) mantém a emenda contínua e não
	// escorre nada: a porta aberta de uma McLaren esticada virava um risco.
	const borrada = desfocada(img, w, 48) ?? img
	ctx.drawImage(borrada, x, y, w, h)
	for (let n = 1; y - (n - 1) * h > 0; n++) {
		ctx.save()
		ctx.translate(0, y - (n - 1) * h)
		ctx.scale(1, n % 2 ? -1 : 1)
		ctx.drawImage(borrada, x, n % 2 ? 0 : -h, w, h)
		ctx.restore()
	}
	for (let n = 1; y + n * h < H; n++) {
		ctx.save()
		ctx.translate(0, y + n * h)
		ctx.scale(1, n % 2 ? -1 : 1)
		ctx.drawImage(borrada, x, n % 2 ? -h : 0, w, h)
		ctx.restore()
	}

	// A nítida, dissolvendo no desfoque em cima e embaixo. Em cima fica a
	// marquise da loja, uma faixa escura e reta: a curva só sobe depois dela.
	if (!tela) tela = document.createElement('canvas')
	tela.width = W
	tela.height = H
	const t = tela.getContext('2d')!
	t.clearRect(0, 0, W, H)
	t.imageSmoothingQuality = 'high'
	t.drawImage(img, x, y, w, h)
	t.globalCompositeOperation = 'destination-in'
	const fim = y + h
	const p = (yy: number) => Math.min(1, Math.max(0, (yy - y) / h))
	const m = t.createLinearGradient(0, y, 0, fim)
	m.addColorStop(0, 'rgba(0,0,0,0)')
	m.addColorStop(p(y + h * 0.12), 'rgba(0,0,0,0)')
	m.addColorStop(p(y + h * 0.24), 'rgba(0,0,0,.6)')
	m.addColorStop(p(y + h * 0.32), 'rgba(0,0,0,1)')
	m.addColorStop(p(base + 10), 'rgba(0,0,0,1)')
	m.addColorStop(p(base + (fim - base) * 0.6), 'rgba(0,0,0,.35)')
	m.addColorStop(1, 'rgba(0,0,0,0)')
	t.fillStyle = m
	// Na tela inteira: destination-in apaga o que fica fora do que é pintado.
	t.fillRect(0, 0, W, H)
	t.globalCompositeOperation = 'source-over'
	ctx.drawImage(tela, 0, 0)
	return base
}

export function renderEdicao({ ctx, estado, imagens, assets, altura: H }: ContextoDesenho): void {
	const FEED = H === ALTURA_FEED
	// Stories ~ 27% cabeçalho, 47% foto, 26% informações; o que se lê fica
	// entre ~220 e ~1745 (o Instagram cobre perfil em cima e resposta embaixo).
	const L = FEED
		? { logo: 72, larguraLogo: 200, marca: 168, modelo: 252, tamModelo: 84, ano: 306, foto: 236, larguraFoto: 1123, alturaA: 360, topoA: 16, sobraA: 40, preco: 1206, tamPreco: 72, ficha: 1278, linhasFicha: 2 }
		: { logo: 262, larguraLogo: 220, marca: 362, modelo: 456, tamModelo: 96, ano: 516, foto: 430, larguraFoto: 1200, alturaA: 500, topoA: 112, sobraA: 40, preco: 1556, tamPreco: 84, ficha: 1660, linhasFicha: 3 }

	/* ------------------------------------------------ a imagem */

	ctx.fillStyle = GRAFITE_TOPO
	ctx.fillRect(0, 0, W, H)
	let base = L.foto + 760
	if (imagens.foto1) base = cenaContinua(ctx, imagens.foto1, estado.f1, H, L.foto, L.larguraFoto)
	else {
		ctx.fillStyle = 'rgba(255,255,255,.5)'
		ctx.font = '500 24px Montserrat, sans-serif'
		ctx.textAlign = 'center'
		ctx.fillText('ENVIE A FOTO PRINCIPAL', W / 2, L.foto + 400)
		ctx.textAlign = 'left'
	}

	// A vinheta: escurece o alto (título) e o pé (preço e ficha) em curva,
	// sobre a mesma imagem. Nunca chega ao preto liso: a textura da fachada e
	// do piso continua por baixo do texto.
	const topo = ctx.createLinearGradient(0, 0, 0, L.foto + 300)
	topo.addColorStop(0, 'rgba(16,16,17,.9)')
	topo.addColorStop(0.45, 'rgba(16,16,17,.8)')
	topo.addColorStop(0.75, 'rgba(16,16,17,.42)')
	topo.addColorStop(1, 'rgba(16,16,17,0)')
	ctx.fillStyle = topo
	ctx.fillRect(0, 0, W, L.foto + 300)
	const pe = ctx.createLinearGradient(0, base - 30, 0, H)
	pe.addColorStop(0, 'rgba(16,16,17,0)')
	pe.addColorStop(0.18, 'rgba(16,16,17,.5)')
	pe.addColorStop(0.42, 'rgba(16,16,17,.84)')
	pe.addColorStop(1, 'rgba(16,16,17,.93)')
	ctx.fillStyle = pe
	ctx.fillRect(0, base - 30, W, H - base + 30)
	ctx.save()
	ctx.globalAlpha = 0.04
	ctx.fillStyle = ctx.createPattern(grainCanvas(), 'repeat')!
	ctx.fillRect(0, 0, W, H)
	ctx.restore()

	// O "A" da Attra, inteiro e grande, no alto à direita — afastado do canto
	// para ler como o "A" do logo, e não como uma diagonal solta.
	const a = letraDaMarca(assets, L.alturaA)
	if (a) ctx.drawImage(a, W - a.width + L.sobraA, L.topoA)

	/* ------------------------------------------------ cabeçalho: lugar fixo */

	drawLogoWhite(ctx, assets, imagens, MARGEM + L.larguraLogo / 2, L.logo, L.larguraLogo)

	const marca = estado.marca.trim().toUpperCase()
	if (marca) espacado(ctx, marca, MARGEM, L.marca, `300 ${FEED ? 24 : 27}px Montserrat, sans-serif`, 8, '#d6d4cf')

	// Uma linha sempre, na mesma altura; o corpo desce até o nome caber.
	const modelo = estado.modelo.trim().toUpperCase()
	if (modelo) {
		let tam = L.tamModelo
		ctx.font = `400 ${tam}px ${SERIFA}`
		while (tam > 44 && ctx.measureText(modelo).width > W - 2 * MARGEM) {
			tam -= 1
			ctx.font = `400 ${tam}px ${SERIFA}`
		}
		ctx.fillStyle = BRANCO
		ctx.textAlign = 'left'
		ctx.fillText(caber(ctx, modelo, W - 2 * MARGEM), MARGEM - 3, L.modelo)
	}

	const ano = estado.ano.trim()
	if (ano) {
		ctx.fillStyle = VERMELHO
		ctx.fillRect(MARGEM, L.ano - 10, FEED ? 70 : 84, 3)
		espacado(ctx, ano, MARGEM + (FEED ? 104 : 124), L.ano, `300 ${FEED ? 22 : 25}px Montserrat, sans-serif`, 10, '#d6d4cf')
	}

	/* ------------------------------------------------ preço e KM: colunas fixas */

	// O preço tem um corpo só, o que cabe até "R$ 9.999.999" na coluna dele:
	// assim R$ 439.000 e R$ 1.790.000 saem do mesmo tamanho, e o KM nunca é
	// espremido. Só encolhe se alguém digitar algo maior que isso.
	const xDivisoria = FEED ? 650 : 676
	const colunaPreco = xDivisoria - MARGEM - 40
	const preco = estado.preco.trim().replace(/^R\$\s*/i, '')
	if (preco) {
		let tam = L.tamPreco
		ctx.font = `400 ${tam}px ${SERIFA}`
		while (tam > 40 && Math.max(ctx.measureText('R$ 9.999.999').width, ctx.measureText('R$ ' + preco).width) > colunaPreco) {
			tam -= 1
			ctx.font = `400 ${tam}px ${SERIFA}`
		}
		ctx.fillStyle = BRANCO
		ctx.textAlign = 'left'
		ctx.fillText('R$ ' + preco, MARGEM - 2, L.preco)
	}
	ctx.fillStyle = 'rgba(255,255,255,.3)'
	ctx.fillRect(xDivisoria, L.preco - (FEED ? 58 : 66), 1.5, FEED ? 70 : 80)

	const km = estado.km.trim().replace(/\s*km$/i, '')
	const xKm = xDivisoria + (FEED ? 44 : 48)
	if (km) {
		espacado(ctx, 'QUILOMETRAGEM', xKm, L.preco - (FEED ? 34 : 40), `400 ${FEED ? 14 : 15}px Montserrat, sans-serif`, 4, '#8f8e8a')
		ctx.font = `400 ${FEED ? 30 : 34}px Montserrat, sans-serif`
		ctx.fillStyle = BRANCO
		ctx.textAlign = 'left'
		ctx.fillText(km === '0' ? '0 km' : `${km} km`, xKm, L.preco)
	}
	const extra = estado.kmextra.trim()
	if (extra) {
		ctx.font = `400 ${FEED ? 16 : 18}px Montserrat, sans-serif`
		ctx.fillStyle = '#8f8e8a'
		ctx.fillText(caber(ctx, extra, W - MARGEM - xKm), xKm, L.preco + (FEED ? 26 : 30))
	}

	/* ------------------------------------------------ ficha: legível, com hierarquia */

	const linhas = [estado.b1, estado.b2, estado.b3].map(t => t.trim()).filter(Boolean).slice(0, L.linhasFicha)
	if (linhas.length) {
		ctx.fillStyle = 'rgba(255,255,255,.22)'
		ctx.fillRect(MARGEM, L.ficha - (FEED ? 44 : 52), W - 2 * MARGEM, 1.5)
	}
	let y = L.ficha
	linhas.forEach((t, n) => {
		const destaque = n === 0
		ctx.font = destaque ? `500 ${FEED ? 26 : 30}px Montserrat, sans-serif` : `400 ${FEED ? 23 : 26}px Montserrat, sans-serif`
		ctx.fillStyle = destaque ? BRANCO : CINZA
		ctx.textAlign = 'left'
		ctx.fillText(caber(ctx, t, W - 2 * MARGEM), MARGEM, y)
		y += destaque ? (FEED ? 38 : 44) : FEED ? 34 : 40
	})
}
