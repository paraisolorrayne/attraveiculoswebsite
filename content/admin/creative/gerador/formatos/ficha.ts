/**
 * TIPO 5 — FICHA (claro: detalhes + foto principal grande)
 *
 * Sem recorte de fundo. As fotos do estoque são todas feitas no mesmo lugar
 * (fachada de vidro da loja, vegetação em cima, piso de concreto claro
 * embaixo, carro em 3/4), então em vez de "flutuar" o carro no branco — o que
 * exigiria recorte — as fotos entram EMOLDURADAS: cantos arredondados e
 * sombra suave. O fundo real vira parte da composição.
 *
 * Porte 1:1 de `renderFicha` do HTML do gerador.
 */
import { cantoArredondado, drawLogoBlack, fotoEmMoldura, linhaTracejada, RED, spacedText, spacedWidth } from '../desenho'
import { ALTURA_FEED, LARGURA as W, type ContextoDesenho } from '../tipos'

export function renderFicha({ ctx, estado, imagens, assets, altura: H }: ContextoDesenho): void {
	const FEED = H === ALTURA_FEED // 1080×1350: só a foto principal, rodapé fecha mais cedo
	const M = 64 // margem lateral
	ctx.fillStyle = '#ffffff'
	ctx.fillRect(0, 0, W, H)

	// Logo da casa no topo (a preta, porque o fundo é claro)
	drawLogoBlack(ctx, assets, W / 2, 132, 300)

	const marca = estado.marca.trim().toUpperCase()
	const modelo = estado.modelo.trim().toUpperCase()
	const ano = estado.ano.trim()
	const km = estado.km.trim()

	if (marca) spacedText(ctx, marca, W / 2, 250, '600 30px Montserrat, sans-serif', 14, RED)

	let msize = 96
	while (msize > 44 && spacedWidth(ctx, modelo, `800 ${msize}px Montserrat, sans-serif`, 2) > W - 2 * M) {
		msize -= 3
	}
	if (modelo) spacedText(ctx, modelo, W / 2, 340, `800 ${msize}px Montserrat, sans-serif`, 2, '#111114')

	// Ano • km dentro de caixa tracejada
	const anoKm = [ano, km ? km + 'km' : ''].filter(Boolean).join('  •  ')
	if (anoKm) {
		ctx.font = '600 30px Montserrat, sans-serif'
		const larg = ctx.measureText(anoKm).width + 56
		const cxCaixa = W / 2 - larg / 2
		const cyCaixa = 372
		const alt = 58
		ctx.save()
		ctx.strokeStyle = RED
		ctx.lineWidth = 2
		ctx.setLineDash([7, 6])
		cantoArredondado(ctx, cxCaixa, cyCaixa, larg, alt, 8)
		ctx.stroke()
		ctx.restore()
		ctx.fillStyle = '#111114'
		ctx.textAlign = 'center'
		ctx.fillText(anoKm, W / 2, cyCaixa + 39)
		ctx.textAlign = 'left'
	}

	// Cores: rótulo fino + valor forte, com tracejado embaixo
	// Rótulo é editável: a linha serve para qualquer informação, não só cor.
	// Sem rótulo, mostra só o conteúdo (sem dois-pontos soltos).
	const cores = [
		{ rotulo: estado.rot1.trim().toUpperCase(), valor: estado.corext.trim().toUpperCase() },
		{ rotulo: estado.rot2.trim().toUpperCase(), valor: estado.corint.trim().toUpperCase() },
	]
		.filter(c => c.valor)
		.map(c => ({ ...c, rotulo: c.rotulo ? c.rotulo + ':' : '' }))
	let cy = 500
	for (const c of cores) {
		// Sem rótulo não entra o espaço separador, senão a linha fica deslocada.
		const prefixo = c.rotulo ? c.rotulo + ' ' : ''
		// A fonte encolhe até a linha caber: conteúdo pode ser longo
		// ("Preto Magno, fosca de fábrica") e antes vazava pelas laterais.
		let fs = 38
		const larguraDe = (tam: number) => {
			ctx.font = `500 ${tam}px Montserrat, sans-serif`
			const r = ctx.measureText(prefixo).width
			ctx.font = `800 ${tam}px Montserrat, sans-serif`
			return r + ctx.measureText(c.valor).width
		}
		while (fs > 22 && larguraDe(fs) > W - 2 * M) fs -= 1

		ctx.font = `500 ${fs}px Montserrat, sans-serif`
		const wRot = ctx.measureText(prefixo).width
		ctx.font = `800 ${fs}px Montserrat, sans-serif`
		const wVal = ctx.measureText(c.valor).width
		const x0 = W / 2 - (wRot + wVal) / 2
		ctx.fillStyle = '#111114'
		ctx.font = `500 ${fs}px Montserrat, sans-serif`
		ctx.fillText(prefixo, x0, cy)
		ctx.font = `800 ${fs}px Montserrat, sans-serif`
		ctx.fillText(c.valor, x0 + wRot, cy)
		linhaTracejada(ctx, x0 - 10, cy + 16, x0 + wRot + wVal + 10, RED)
		cy += 66
	}

	// ---- Tira de detalhes (recortes verticais das fotos horizontais) ----
	// Caixa quase quadrada de propósito: as fotos do estoque são horizontais
	// (1920x1440) e uma caixa alta como a da referência descartaria quase metade
	// da largura. Com 330 o corte cai de ~46% para ~30%, e o resto o operador
	// escolhe pelo zoom/posição de cada foto.
	// A caixa acompanha a proporção REAL da foto (4:3 do estoque): assim o aspect
	// fit não deixa faixa vazia dentro da moldura. Largura da coluna x 3/4.
	// DUAS fotos no topo, sempre. Com três, cada uma ficava com 233px de altura
	// num canvas de 1920 — pequenas demais para ler um detalhe.
	const tiraY = cy + 24
	const gap = 26
	const detalhes = [
		{ img: imagens.foto2, opt: estado.f2 },
		{ img: imagens.foto3, opt: estado.f3 },
	]
	const larguraCol = (W - 2 * M - gap) / 2
	const tiraH = Math.round((larguraCol * 3) / 4)
	// Feed: sem a tira — a foto principal ocupa o lugar dela.
	if (!FEED)
		detalhes.forEach((d, i) => {
			fotoEmMoldura(ctx, d.img, M + i * (larguraCol + gap), tiraY, larguraCol, tiraH, d.opt, 14)
		})

	// ---- Foto principal, grande, com o fundo original ----
	// Em 4:3 da largura útil, MAS limitada pelo que sobra até o rodapé: com a
	// tira de 2 fotos (mais alta) o herói cheio empurraria o valor para fora do
	// canvas. O menor dos dois mantém a peça inteira sempre dentro.
	const heroY = FEED ? tiraY : tiraY + tiraH + gap
	// Reserva do rodapé: selo + valor + respiro na base.
	const ALTURA_RODAPE = FEED ? 200 : 240
	const heroH = H - ALTURA_RODAPE - heroY
	// `preencher` = a foto principal ocupa a largura INTEIRA, alinhada com as
	// bordas das duas de cima. Em aspect fit ela encolhia para caber na altura
	// restante e ficava mais estreita que a tira, quebrando o alinhamento — o
	// corte vertical de poucos por cento é preferível a esse desencontro.
	fotoEmMoldura(ctx, imagens.foto1, M, heroY, W - 2 * M, heroH, estado.f1, 20, true)

	// ---- Rodapé: selo + valor ----
	let py = heroY + heroH + (FEED ? 72 : 92)
	const selo = estado.garantia.trim().toUpperCase()
	if (selo) {
		ctx.font = '800 40px Montserrat, sans-serif'
		ctx.fillStyle = '#111114'
		ctx.textAlign = 'center'
		ctx.fillText(selo, W / 2, py)
		const ws = ctx.measureText(selo).width
		linhaTracejada(ctx, W / 2 - ws / 2 - 12, py + 18, W / 2 + ws / 2 + 12, RED)
		ctx.textAlign = 'left'
		py += 80
	}

	const preco = estado.preco.trim().replace(/^R\$\s*/i, '')
	if (preco) {
		ctx.textAlign = 'center'
		ctx.font = '500 40px Montserrat, sans-serif'
		const wRot = ctx.measureText('VALOR: ').width
		ctx.font = '800 46px Montserrat, sans-serif'
		const wVal = ctx.measureText('R$ ' + preco).width
		const x0 = W / 2 - (wRot + wVal) / 2
		ctx.textAlign = 'left'
		ctx.fillStyle = '#111114'
		ctx.font = '500 40px Montserrat, sans-serif'
		ctx.fillText('VALOR: ', x0, py)
		ctx.font = '800 46px Montserrat, sans-serif'
		ctx.fillText('R$ ' + preco, x0 + wRot, py)
	}
}
