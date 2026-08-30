/**
 * TIPO 3 — ESTOQUE (lista de até 4 carros)
 *
 * Porte 1:1 de `renderEstoque` do HTML do gerador.
 */
import { drawLogoBlack, drawPhoto, placeholder, RED, rr, wrapLines } from '../desenho'
import { ALTURA_FEED, ALTURA_STORIES, LARGURA as W, type ContextoDesenho } from '../tipos'

export function renderEstoque({ ctx, estado, imagens, assets, altura: H }: ContextoDesenho): void {
	const FEED = H === ALTURA_FEED // 1080×1350: só a foto principal, rodapé fecha mais cedo
	// fundo
	const g = ctx.createLinearGradient(0, 0, 0, H)
	g.addColorStop(0, '#efefef')
	g.addColorStop(1, '#dfdfe2')
	ctx.fillStyle = g
	ctx.fillRect(0, 0, W, H)

	// linhas retas diagonais, ancoradas na geometria do logo
	// (mesma inclinação da faixa vermelha do "A": ~0.4)
	const m = 0.4
	const diag = (c: number, color: string, wdt: number, x0: number, x1: number) => {
		ctx.strokeStyle = color
		ctx.lineWidth = wdt
		ctx.lineCap = 'butt'
		ctx.beginPath()
		ctx.moveTo(x0, m * x0 + c)
		ctx.lineTo(x1, m * x1 + c)
		ctx.stroke()
	}
	// canto superior direito
	diag(-330, RED, 18, 700, 1120)
	diag(-376, '#2a2a2f', 13, 800, 1120)
	diag(-422, '#b9b9be', 9, 900, 1120)
	// canto inferior esquerdo (eco discreto) — ancorado na base da peça
	const dz = H - ALTURA_STORIES
	diag(1806 + dz, RED, 18, -40, 320)
	diag(1852 + dz, '#2a2a2f', 13, -40, 220)
	diag(1898 + dz, '#b9b9be', 9, -40, 120)

	// título
	const t1 = estado.et1.trim().toUpperCase()
	const t2 = estado.et2.trim().toUpperCase()
	ctx.textAlign = 'left'
	ctx.font = 'italic 900 92px Montserrat, sans-serif'
	ctx.fillStyle = '#161619'
	if (t1) ctx.fillText(t1, 80, 200)
	ctx.fillStyle = RED
	if (t2) ctx.fillText(t2, 80, 308)

	// carros preenchidos
	const cars: { nome: string; ano: string; km: string; preco: string; tag: string; foto: HTMLImageElement | null }[] = []
	for (let i = 0; i < 4; i++) {
		const c = estado.estoque[i]
		const nome = (c?.nome ?? '').trim()
		if (nome || imagens.estFotos[i])
			cars.push({
				nome,
				ano: (c?.ano ?? '').trim(),
				km: (c?.km ?? '').trim(),
				preco: (c?.preco ?? '').trim(),
				tag: (c?.tag ?? '').trim(),
				foto: imagens.estFotos[i],
			})
	}
	if (!cars.length) {
		ctx.fillStyle = 'rgba(0,0,0,.35)'
		ctx.font = '600 30px Montserrat, sans-serif'
		ctx.textAlign = 'center'
		ctx.fillText('PREENCHA OS CARROS DA LISTA', W / 2, 900)
		ctx.textAlign = 'left'
	}

	// Feed: os mesmos 4 cards, mais baixos, com os textos em ~74%.
	const areaTop = 400
	const areaBot = FEED ? H - 110 : 1770
	const rowH = Math.min(372, (areaBot - areaTop) / Math.max(cars.length, 1))
	const blockTop = areaTop + Math.max(0, (areaBot - areaTop - rowH * cars.length) / 2)
	const cardX = 60
	const cardW = 960

	cars.forEach((car, i) => {
		const cardY = blockTop + i * rowH + 16
		const cardH = rowH - 32
		// janela de largura FIXA em todos os cards — grade alinhada; a foto
		// preenche por cover (corta sobra em vez de desalinhar as colunas)
		const photoW = Math.round(cardH * 1.5)

		// card branco de linha inteira
		ctx.save()
		ctx.shadowColor = 'rgba(0,0,0,.10)'
		ctx.shadowBlur = 26
		ctx.shadowOffsetY = 8
		ctx.fillStyle = '#ffffff'
		rr(ctx, cardX, cardY, cardW, cardH, 22)
		ctx.fill()
		ctx.restore()

		// foto à esquerda (cover — janela uniforme)
		ctx.save()
		rr(ctx, cardX, cardY, cardW, cardH, 22)
		ctx.clip()
		ctx.beginPath()
		ctx.rect(cardX, cardY, photoW, cardH)
		ctx.clip()
		if (car.foto) drawPhoto(ctx, car.foto, cardX, cardY, photoW, cardH)
		else placeholder(ctx, cardX, cardY, photoW, cardH, 'FOTO', false)
		ctx.restore()

		// chip discreto sobre a foto
		if (car.tag) {
			const cFont = '700 21px Montserrat, sans-serif'
			ctx.font = cFont
			const tw = ctx.measureText(car.tag.toUpperCase()).width
			ctx.fillStyle = RED
			rr(ctx, cardX + 16, cardY + 16, tw + 36, 38, 9)
			ctx.fill()
			ctx.fillStyle = '#ffffff'
			ctx.fillText(car.tag.toUpperCase(), cardX + 34, cardY + 43)
		}

		// textos à direita — a fonte do nome diminui sozinha p/ nunca cortar
		const textX = cardX + photoW + 42
		const textW = cardX + cardW - textX - 36
		let nf = FEED ? 30 : 41
		let nomeFont: string
		let nomeLines: string[]
		for (;;) {
			nomeFont = `700 ${nf}px Montserrat, sans-serif`
			nomeLines = wrapLines(ctx, car.nome.toUpperCase(), nomeFont, textW)
			if (nomeLines.length <= 2 || nf <= (FEED ? 22 : 29)) break
			nf -= 2
		}
		// evita linha órfã (uma palavrinha sozinha na 2ª linha)
		if (nomeLines.length === 2 && nomeLines[1].length <= 4) {
			for (let t = nf - 2; t >= (FEED ? 22 : 30); t -= 2) {
				const tf = `700 ${t}px Montserrat, sans-serif`
				const tl = wrapLines(ctx, car.nome.toUpperCase(), tf, textW)
				if (tl.length === 1) {
					nf = t
					nomeFont = tf
					nomeLines = tl
					break
				}
			}
		}
		nomeLines = nomeLines.slice(0, 3)
		const nameLH = nf + 9
		const anokm = [car.ano, car.km ? (car.km.toUpperCase().includes('KM') ? car.km.toUpperCase() : car.km + ' KM') : '']
			.filter(Boolean)
			.join('  ·  ')
		const infoH =
			nomeLines.length * nameLH + (anokm ? (FEED ? 34 : 46) : 0) + (car.preco ? (FEED ? 44 : 58) : 0)
		let ty = cardY + Math.max(24, (cardH - infoH) / 2) + nf * 0.82
		ctx.font = nomeFont
		ctx.fillStyle = '#17181b'
		nomeLines.forEach(l => {
			ctx.fillText(l, textX, ty)
			ty += nameLH
		})
		if (anokm) {
			ty += 6
			ctx.font = `500 ${FEED ? 22 : 29}px Montserrat, sans-serif`
			ctx.fillStyle = '#7a7a81'
			ctx.fillText(anokm, textX, ty)
			ty += FEED ? 44 : 58
		} else ty += 12
		if (car.preco) {
			ctx.font = `800 ${FEED ? 31 : 40}px Montserrat, sans-serif`
			ctx.fillStyle = RED
			ctx.fillText('R$ ' + car.preco, textX, ty)
		}
	})

	// logo preta no rodapé
	drawLogoBlack(ctx, assets, W / 2, H - 72, 250)
}
