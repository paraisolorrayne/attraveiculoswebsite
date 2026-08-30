/**
 * TIPO 2 — DESTAQUE (claro, ficha técnica, foto em card)
 *
 * Porte 1:1 de `renderDestaque` do HTML do gerador.
 */
import { drawLogoBlack, drawPhoto, placeholder, RED, rr, spacedText, spacedWidth } from '../desenho'
import { ALTURA_FEED, LARGURA as W, type ContextoDesenho } from '../tipos'

export function renderDestaque({ ctx, estado, imagens, assets, altura: H }: ContextoDesenho): void {
	const FEED = H === ALTURA_FEED // 1080×1350: só a foto principal, rodapé fecha mais cedo
	// fundo claro
	const g = ctx.createLinearGradient(0, 0, 0, H)
	g.addColorStop(0, '#ffffff')
	g.addColorStop(1, '#ededf0')
	ctx.fillStyle = g
	ctx.fillRect(0, 0, W, H)

	// logo preta no topo + filete vermelho
	drawLogoBlack(ctx, assets, W / 2, 130, 330)
	ctx.fillStyle = RED
	ctx.fillRect(0, 232, W, 4)

	const marca = estado.marca.trim().toUpperCase()
	const modelo = estado.modelo.trim().toUpperCase()

	if (marca) {
		const tw = spacedText(ctx, marca, W / 2, 322, 'italic 600 34px Montserrat, sans-serif', 8, '#1b1b1e')
		ctx.strokeStyle = '#1b1b1e'
		ctx.lineWidth = 2
		ctx.beginPath()
		ctx.moveTo(W / 2 - tw / 2 - 140, 310)
		ctx.lineTo(W / 2 - tw / 2 - 30, 310)
		ctx.moveTo(W / 2 + tw / 2 + 30, 310)
		ctx.lineTo(W / 2 + tw / 2 + 140, 310)
		ctx.stroke()
	}

	let msize = 76
	while (msize > 36 && spacedWidth(ctx, modelo, `800 ${msize}px Montserrat, sans-serif`, 6) > 940) msize -= 3
	if (modelo) spacedText(ctx, modelo, W / 2, 424, `800 ${msize}px Montserrat, sans-serif`, 6, '#111114')

	const ano = estado.ano.trim()
	const km = estado.km.trim()
	const anokm = [ano, km ? km + ' KM' : ''].filter(Boolean).join('  ·  ')
	if (anokm) spacedText(ctx, anokm, W / 2, 482, 'italic 500 32px Montserrat, sans-serif', 4, '#55555a')

	// preço sóbrio (texto simples, sem pílula)
	const preco = estado.preco.trim().replace(/^R\$\s*/i, '')
	if (preco) spacedText(ctx, 'R$ ' + preco, W / 2, 556, '700 48px Montserrat, sans-serif', 3, '#1b1b1e')

	// pílulas com os diferenciais do carro (o verdadeiro destaque)
	const chips = estado.selo
		.split(',')
		.map(s => s.trim().toUpperCase())
		.filter(Boolean)
		.slice(0, 4)
	if (chips.length) {
		const font = (s: number) => `italic 700 ${s}px Montserrat, sans-serif`
		let fsize = 27
		const totalW = (s: number) => {
			ctx.font = font(s)
			return chips.reduce((a, c) => a + ctx.measureText(c).width + 60, 0) + (chips.length - 1) * 16
		}
		while (fsize > 17 && totalW(fsize) > 950) fsize -= 1
		ctx.font = font(fsize)
		const widths = chips.map(c => ctx.measureText(c).width + 60)
		const total = widths.reduce((a, b) => a + b, 0) + (chips.length - 1) * 16
		let x = W / 2 - total / 2
		const ph = Math.round(fsize * 2.15)
		const py = 604
		chips.forEach((c, i) => {
			ctx.fillStyle = RED
			rr(ctx, x, py, widths[i], ph, ph / 2)
			ctx.fill()
			ctx.fillStyle = '#ffffff'
			ctx.font = font(fsize)
			ctx.textAlign = 'center'
			ctx.fillText(c, x + widths[i] / 2, py + ph / 2 + fsize * 0.36)
			ctx.textAlign = 'left'
			x += widths[i] + 16
		})
	}

	// card da foto principal (foto inteira, sem recorte de fundo)
	// Feed: o card fecha a peça (não há tira de fotos embaixo).
	const cx0 = 90
	const cy0 = 706
	const cw = 900
	const ch = FEED ? H - 706 - 64 : 636
	ctx.save()
	ctx.shadowColor = 'rgba(0,0,0,.20)'
	ctx.shadowBlur = 32
	ctx.shadowOffsetY = 12
	ctx.fillStyle = '#fff'
	rr(ctx, cx0, cy0, cw, ch, 26)
	ctx.fill()
	ctx.restore()
	ctx.save()
	rr(ctx, cx0, cy0, cw, ch, 26)
	ctx.clip()
	if (imagens.foto1) drawPhoto(ctx, imagens.foto1, cx0, cy0, cw, ch, estado.f1)
	else placeholder(ctx, cx0, cy0, cw, ch, 'FOTO DO VEÍCULO', false)
	ctx.restore()

	// rodapé com 1 a 3 fotos (o layout se ajusta sozinho) — só no Stories
	if (FEED) return
	const bots = [imagens.foto2, imagens.foto3, imagens.foto4].filter(Boolean) as HTMLImageElement[]
	const py0 = 1412
	const phh = H - py0
	ctx.fillStyle = RED
	ctx.fillRect(0, py0 - 5, W, 5)
	if (!bots.length) {
		placeholder(ctx, 0, py0, W, phh, 'FOTOS DE BAIXO (1 OU 3)', false)
	} else if (bots.length === 1) {
		drawPhoto(ctx, bots[0], 0, py0, W, phh, estado.f2)
	} else {
		const gap = 6
		const colW = (W - gap * (bots.length - 1)) / bots.length
		bots.forEach((img, i) => {
			drawPhoto(ctx, img, Math.round(i * (colW + gap)), py0, Math.round(colW), phh, i === 0 ? estado.f2 : undefined)
		})
	}
}
