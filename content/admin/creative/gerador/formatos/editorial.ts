/**
 * TIPO 4 — EDITORIAL (premium, integrado à foto — referência: layouts de
 * importadoras de luxo em que a foto full-bleed escurece na base e vira a área
 * de informação; funciona com QUALQUER foto, sem recorte de fundo)
 *
 * Porte 1:1 de `renderEditorial` do HTML do gerador.
 */
import { drawLogoWhite, edTextoEsq } from '../desenho'
import { ALTURA_FEED, ALTURA_STORIES, LARGURA as W, type ContextoDesenho } from '../tipos'

const ED = {
	fonte: "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif",
}

export function renderEditorial({ ctx, estado, imagens, assets, altura: H }: ContextoDesenho): void {
	const FEED = H === ALTURA_FEED // 1080×1350: só a foto principal, rodapé fecha mais cedo
	// ---------- cenário de estúdio (palco elevado) ----------
	const fundo = assets.fundoEditorial
	if (fundo.complete && fundo.naturalWidth) {
		// Feed: o cenário entra na altura do Stories, deslocado para cima, para o
		// piso do palco cair onde o carro pousa (e não esticar as barras de luz).
		if (FEED) ctx.drawImage(fundo, 0, -342, W, ALTURA_STORIES)
		else ctx.drawImage(fundo, 0, 0, W, H)
	} else {
		ctx.fillStyle = '#121317'
		ctx.fillRect(0, 0, W, H)
	}

	// ---------- topo: sombreamento suave (as barras de luz não ofuscam
	// a logo) + logo maior ----------
	const topo = ctx.createLinearGradient(0, 0, 0, 420)
	topo.addColorStop(0, 'rgba(0,0,0,.85)')
	topo.addColorStop(0.55, 'rgba(0,0,0,.45)')
	topo.addColorStop(1, 'rgba(0,0,0,0)')
	ctx.fillStyle = topo
	ctx.fillRect(0, 0, W, 420)
	drawLogoWhite(ctx, assets, imagens, W / 2, 128, 250)

	// ---------- carro (recortado pela IA) no palco ----------
	const carro = imagens.foto1Cut || imagens.foto1
	if (carro) {
		const bx = 30
		const bw = W - 60
		const by = FEED ? 280 : 340
		const bh = FEED ? 760 : 1080
		const base = Math.min(bw / carro.width, bh / carro.height)
		const sc = base * (estado.f1.zoom || 1)
		const dw = carro.width * sc
		const dh = carro.height * sc
		const dx = bx + (bw - dw) / 2 + (estado.f1.x - 0.5) * bw * 0.8
		const dy = by + (bh - dh) / 2 + (estado.f1.y - 0.5) * bh * 0.8

		// rotação em torno do centro do carro (controle "Rotação do veículo")
		if (estado.edRot) {
			const rcx = dx + dw / 2
			const rcy = dy + dh / 2
			ctx.save()
			ctx.translate(rcx, rcy)
			ctx.rotate((estado.edRot * Math.PI) / 180)
			ctx.translate(-rcx, -rcy)
		}

		// sombra elíptica suave no piso (só quando o carro está recortado)
		if (imagens.foto1Cut) {
			const scx = dx + dw / 2
			const scy = dy + dh - 8
			const sombra = ctx.createRadialGradient(scx, scy, 0, scx, scy, dw * 0.42)
			sombra.addColorStop(0, 'rgba(0,0,0,.34)')
			sombra.addColorStop(1, 'rgba(0,0,0,0)')
			ctx.save()
			ctx.translate(scx, scy)
			ctx.scale(1, 0.16)
			ctx.translate(-scx, -scy)
			ctx.fillStyle = sombra
			ctx.beginPath()
			ctx.arc(scx, scy, dw * 0.42, 0, Math.PI * 2)
			ctx.fill()
			ctx.restore()
		}

		ctx.drawImage(carro, dx, dy, dw, dh)
		if (estado.edRot) ctx.restore()
	} else {
		ctx.fillStyle = 'rgba(255,255,255,.4)'
		ctx.font = '400 24px ' + ED.fonte
		ctx.textAlign = 'center'
		ctx.fillText('ENVIE A FOTO PRINCIPAL E USE "REMOVER FUNDO"', W / 2, 900)
		ctx.textAlign = 'left'
	}

	// ---------- bottom: sombreamento espelhado ao do topo garante a
	// legibilidade — textos claros sobre o véu escuro ----------
	const RODAPE_Y = FEED ? 840 : 1400
	const rodape = ctx.createLinearGradient(0, RODAPE_Y, 0, H)
	rodape.addColorStop(0, 'rgba(0,0,0,0)')
	rodape.addColorStop(0.45, 'rgba(0,0,0,.38)')
	rodape.addColorStop(1, 'rgba(0,0,0,.66)')
	ctx.fillStyle = rodape
	ctx.fillRect(0, RODAPE_Y, W, H - RODAPE_Y)

	const M = 76
	let y = FEED ? 978 : 1548 // mesmos 372px até a base nos dois formatos

	// rótulo de curadoria com filete vermelho
	ctx.fillStyle = '#c33a39'
	ctx.fillRect(M, y - 16, 42, 3)
	edTextoEsq(ctx, 'SELEÇÃO ATTRA', M + 58, y - 8, '500 21px ' + ED.fonte, 7, '#d4d4da')

	y += 66
	const marca = estado.marca.trim().toUpperCase()
	if (marca) edTextoEsq(ctx, marca, M, y, '500 30px ' + ED.fonte, 9, '#e4e4e9')

	y += 74
	const modelo = estado.modelo.trim().toUpperCase()
	if (modelo) {
		let ms = 62
		ctx.font = `600 ${ms}px ` + ED.fonte
		while (ms > 36 && ctx.measureText(modelo).width > W - 2 * M) {
			ms -= 2
			ctx.font = `600 ${ms}px ` + ED.fonte
		}
		ctx.fillStyle = '#ffffff'
		ctx.fillText(modelo, M, y)
	}

	y += 56
	const km = estado.km.trim()
	const meta = [estado.ano.trim(), km ? km + ' KM' : '', estado.kmextra.trim().toUpperCase()]
		.filter(Boolean)
		.join('   •   ')
	if (meta) edTextoEsq(ctx, meta, M, y, '400 27px ' + ED.fonte, 3, '#cfcfd6')

	y += 84
	const preco = estado.preco.trim().replace(/^R\$\s*/i, '')
	if (preco) {
		const ptxt = 'R$ ' + preco
		let ps = 52
		ctx.font = `500 ${ps}px ` + ED.fonte
		while (ps > 34 && ctx.measureText(ptxt).width > W - 2 * M) {
			ps -= 1
			ctx.font = `500 ${ps}px ` + ED.fonte
		}
		ctx.fillStyle = '#ffffff'
		ctx.fillText(ptxt, M, y)
	}
}
