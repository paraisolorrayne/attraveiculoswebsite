/**
 * TIPO 1 — CLÁSSICO (original, em produção)
 *
 * Desenho aprovado e em uso. O texto vive sobre uma FAIXA DE PISO PINTADA
 * (as texturas de `assets`), com PISO_TOP fixo em 1000 e a paleta derivada do
 * piso escolhido (`dark = piso === 'asfalto'`) — por isso o fundo sob o preço
 * é conhecido e o contraste não depende da foto.
 *
 * O Clássico Loja trocou essa faixa pelo chão da própria foto de fundo. Ganhou
 * continuidade e perdeu o controle do contraste: no G 63, com o carro em piso
 * escuro, o preço mediu 1,00:1 contra a fachada. É por isso que os dois
 * convivem em vez de um substituir o outro.
 *
 * Porte 1:1 de `renderClassicoOriginal` do HTML do gerador.
 */
import {
	amostrar,
	corMediaDaCaixa,
	distanciaDeCor,
	hexParaRgb,
	luminanciaRelativa,
	razaoDeContraste,
} from '../contraste'
import {
	drawLogoWhite,
	drawPhoto,
	drawPhotoFeather,
	espelharBaseDaFoto,
	placeholder,
	spacedText,
	spacedWidth,
} from '../desenho'
import { ALTURA_FEED, LARGURA as W, type ContextoDesenho } from '../tipos'

/**
 * Até onde o casamento da divisa se dissolve, piso adentro.
 *
 * Curto de propósito. O preço começa 24px abaixo da divisa (base em +62, corpo
 * de 48px), e quanto mais longe a rampa vai, mais ela escurece o fundo do
 * número que mais importa na peça.
 */
const ALCANCE_EMENDA = 90
/** Contraste que o preço não pode perder por causa da emenda. */
const CONTRASTE_MINIMO = 4.5
/**
 * Aproxima o TOPO DA FAIXA ao tom do piso da foto, para a divisa não ler como
 * uma linha cortada.
 *
 * POR QUE MEXER NA FAIXA E NÃO NA FOTO. Já houve duas tentativas do outro lado,
 * e as duas estão comentadas logo abaixo: uma dissolvência de 56px no topo do
 * piso (que invadia as rodas em carros baixos, e por isso FUSAO_H é 0) e um véu
 * branco sobre os últimos 110px da foto (que lavava a borracha do pneu e a
 * sombra de contato). Ambas falharam pelo mesmo motivo — mexiam no veículo, que
 * é o assunto da peça. A faixa, ao contrário, é pintada por nós: puxá-la na
 * direção do piso da foto não tira nada de ninguém.
 *
 * Só roda com foto no lugar: sem ela, o que está acima da divisa é o aviso de
 * "envie a foto principal", e espelhá-lo dentro do piso não faria sentido.
 *
 * A FORÇA É LIMITADA PELA LEGIBILIDADE. O preço fica a 62px da divisa, dentro
 * do alcance do degradê. Escurecer a faixa ali sem olhar derrubaria o contraste
 * do número que mais importa na peça — então a emenda só vai até onde o preço
 * ainda fecha 4,5:1, e cede o resto.
 */
function casarFaixaComOPisoDaFoto(
	ctx: CanvasRenderingContext2D,
	o: { PISO_TOP: number; W: number; corDoPreco: string; feed: boolean },
): void {
	const { PISO_TOP, W, corDoPreco } = o
	if (PISO_TOP < 60) return

	// Uma leitura cobre os dois lados da divisa: a faixa já está pintada abaixo,
	// e acima dela continua a foto (a fusão é 0, então nada se sobrepõe).
	const amostra = amostrar(ctx.canvas, 0, PISO_TOP - 56, W, 126)
	// A janela do piso é ESTREITA e colada na divisa: são esses pixels que fazem
	// o degrau. Medi 50px primeiro e a sombra sob o carro entrou na média — o
	// alvo saiu mais escuro que a borda real, o véu passou do ponto e o degrau
	// do G 63 aumentou 61%. O que importa aqui é a cor que ENCOSTA na faixa.
	const doPiso = corMediaDaCaixa(amostra, 0, PISO_TOP - 22, W, 18)
	const daFaixa = corMediaDaCaixa(amostra, 0, PISO_TOP + 10, W, 60)
	if (!doPiso || !daFaixa) return

	if (distanciaDeCor(doPiso, daFaixa) < 0.02) return // os dois pisos já casam

	// A rampa começa CASANDO (alfa 1 na divisa) e morre piso adentro.
	//
	// A primeira versão usava a própria distância entre as cores como força, e
	// isso corrige de menos exatamente quando a diferença é maior — o contrário
	// do que uma transição precisa fazer. Aqui o degrau é fechado por
	// construção, e quem limita é a legibilidade, não a magnitude.
	let forca = 1

	// Trava de legibilidade, no TOPO do glifo do preço — é ali que o fundo fica
	// mais escuro, e é o glifo inteiro que precisa passar, não só a linha de base.
	const topoDoPreco = (o.feed ? 54 : 62) - 38
	const lumTexto = luminanciaRelativa(...hexParaRgb(corDoPreco))
	const restante = Math.max(0, 1 - topoDoPreco / ALCANCE_EMENDA)
	const contrasteCom = (f: number) => {
		const a = f * restante
		const mistura = daFaixa.map((c, i) => c * (1 - a) + doPiso[i] * a) as [number, number, number]
		return razaoDeContraste(lumTexto, luminanciaRelativa(...mistura))
	}
	while (forca > 0.02 && contrasteCom(forca) < CONTRASTE_MINIMO) forca -= 0.05
	if (forca < 0.02) return

	// COLUNA A COLUNA, não um tom chapado.
	//
	// Um tom só não resolve: a base da foto não tem uma cor, tem várias ao longo
	// da largura — piso claro nas laterais, sombra de contato sob o carro. Medi
	// a média da largura inteira primeiro, e o carro puxou o alvo 15 níveis para
	// baixo: a faixa casou com uma cor que não existe em lugar nenhum da divisa,
	// e nas laterais o degrau ficou igual ao que era.
	//
	// Aqui a própria base da foto é esticada para dentro da faixa e dissolvida.
	// Cada coluna encontra a sua continuação, e o degrau fecha em toda a largura
	// — inclusive sob o carro, onde a sombra de contato continua como sombra.
	espelharBaseDaFoto(ctx, PISO_TOP, W, ALCANCE_EMENDA, forca)
}

export function renderClassicoOriginal({ ctx, estado, imagens, assets, altura: H }: ContextoDesenho): void {
	const FEED = H === ALTURA_FEED // 1080×1350: só a foto principal, rodapé fecha mais cedo
	const PHOTO1_H = 1000

	// fachada da loja como fundo do topo — o letreiro ATTRA é o logo
	ctx.save()
	ctx.beginPath()
	ctx.rect(0, 0, W, PHOTO1_H)
	ctx.clip()
	const fachada = assets.fachadaClassico
	if (fachada.complete && fachada.naturalWidth) {
		// -60px esconde o toldo; escala 1.06 ancorada à esquerda desloca o
		// conteúdo pra direita (letreiro ~+16px vs 1.03) mantendo o full-bleed:
		// borda esquerda fixa em 0, sobra recortada só à direita
		const fw = W * 1.06
		ctx.drawImage(fachada, 0, -60, fw, fachada.height * (fw / fachada.width))
	} else {
		ctx.fillStyle = '#101013'
		ctx.fillRect(0, 0, W, PHOTO1_H)
	}
	// (piso da fachada tratado direto na imagem editada — sem overlay)
	ctx.restore()

	// foto do carro com bordas esfumadas, fundida na fachada
	let topGap = PHOTO1_H
	if (imagens.foto1) {
		topGap = Math.max(0, drawPhotoFeather(ctx, imagens.foto1, 0, 0, W, PHOTO1_H, estado.f1))
	} else {
		ctx.fillStyle = 'rgba(255,255,255,.45)'
		ctx.font = '600 26px Montserrat, sans-serif'
		ctx.textAlign = 'center'
		ctx.fillText('ENVIE A FOTO PRINCIPAL DO VEÍCULO', W / 2, 750)
		ctx.textAlign = 'left'
	}

	// gradiente p/ legibilidade do título
	let g: CanvasGradient
	if (topGap < 150) {
		// foto cobre o letreiro (ex.: foto vertical ou zoom alto) — comportamento antigo
		g = ctx.createLinearGradient(0, 0, 0, 760)
		g.addColorStop(0, 'rgba(0,0,0,.62)')
		g.addColorStop(0.55, 'rgba(0,0,0,.28)')
		g.addColorStop(1, 'rgba(0,0,0,0)')
		ctx.fillStyle = g
		ctx.fillRect(0, 0, W, 760)
	} else {
		// preserva o brilho do letreiro; escurece só a área do título
		g = ctx.createLinearGradient(0, 170, 0, 780)
		g.addColorStop(0, 'rgba(0,0,0,0)')
		g.addColorStop(0.22, 'rgba(0,0,0,.60)')
		g.addColorStop(0.48, 'rgba(0,0,0,.48)')
		g.addColorStop(0.75, 'rgba(0,0,0,.22)')
		g.addColorStop(1, 'rgba(0,0,0,0)')
		ctx.fillStyle = g
		ctx.fillRect(0, 170, W, 610)
	}

	// logo desenhado só quando a foto cobre o letreiro da fachada
	if (topGap < 150) drawLogoWhite(ctx, assets, imagens, W / 2, 168, 340)

	const marca = estado.marca.trim().toUpperCase()
	const modelo = estado.modelo.trim().toUpperCase()
	const ano = estado.ano.trim()

	// sombra suave para o título não se perder no fundo da fachada/foto
	ctx.save()
	ctx.shadowColor = 'rgba(0,0,0,.85)'
	ctx.shadowBlur = 30
	ctx.shadowOffsetY = 3

	if (marca) spacedText(ctx, marca, W / 2, 316, '600 30px Montserrat, sans-serif', 11, '#ffffff')

	let msize = 92
	let mspace = 26
	while (msize > 40 && spacedWidth(ctx, modelo, `200 ${msize}px Montserrat, sans-serif`, mspace) > 980) {
		msize -= 3
		mspace = Math.max(8, mspace - 1)
	}
	if (modelo) spacedText(ctx, modelo, W / 2, 400, `200 ${msize}px Montserrat, sans-serif`, mspace, '#ffffff')

	if (ano) {
		const yy = 458
		const tw = spacedText(ctx, ano, W / 2, yy, '300 34px Montserrat, sans-serif', 15, '#ffffff')
		ctx.strokeStyle = 'rgba(255,255,255,.85)'
		ctx.lineWidth = 1.5
		ctx.beginPath()
		ctx.moveTo(W / 2 - tw / 2 - 195, yy - 11)
		ctx.lineTo(W / 2 - tw / 2 - 40, yy - 11)
		ctx.moveTo(W / 2 + tw / 2 + 40, yy - 11)
		ctx.lineTo(W / 2 + tw / 2 + 195, yy - 11)
		ctx.stroke()
	}

	ctx.restore() // fim da sombra do título

	// corte transversal ajustável (slider): positivo sobe, negativo desce
	const corte = estado.corte || 0
	// Feed 4:5: não há foto de baixo — o piso vai até a borda, sem diagonal.
	const CUT = FEED ? H : 1416 - corte
	// diagonal de volta (assinatura do layout): 40px de inclinação
	const DIAG_L = FEED ? H : CUT + 20
	const DIAG_R = FEED ? H : CUT - 20
	// (o `areaPath` do HTML não entrou: era declarado e nunca chamado — o piso
	// é desenhado pelo caminho montado logo abaixo.)

	// Fundo da área de texto: Concreto ou Asfalto
	// (texturas reais fundidas dentro da foto por máscara de alpha).
	const piso = estado.pisoTipo || 'concreto'
	// sem fusão no topo: a dissolvência de 56px invadia as rodas em carros
	// baixos. A divisa fica seca e a continuidade vem do véu (abaixo), como no
	// tratamento manual do Photoshop.
	const FUSAO_H = 0
	// altura da divisa ajustável: posicionar SEMPRE abaixo do veículo
	const pisoShift = estado.pisoy || 0
	// Feed: o bloco de texto (preço, KM, 3 destaques) precisa de ~340px até a
	// borda — o slider do piso não pode empurrá-lo para fora da peça.
	const PISO_TOP = FEED ? Math.min(PHOTO1_H + pisoShift, H - 340) : PHOTO1_H + pisoShift

	// paleta dos textos conforme o fundo
	const dark = piso === 'asfalto'
	// Fundo escuro: branco puro + sombra. Fundo claro: grafite.
	//
	// O preço era #35353b e o KM #6f6f74, calibrados quando a faixa era o Pérola
	// (rgb 232) — com o Pérola fora, a faixa é o Concreto cru (rgb 192) e o preço
	// caiu de 5,39:1 para 3,78:1 no G 63. Escurecer o texto recupera o contraste
	// sem enfraquecer a emenda, que é a outra saída e custaria a divisa.
	const tx = dark
		? { preco: '#ffffff', km: '#dfe0e6', bullet: '#ffffff', icone: '#f1f1f5' }
		: { preco: '#232329', km: '#5c5c62', bullet: '#141416', icone: '#1a1a1c' }

	{
		// Concreto/Asfalto = piso texturizado REAL (imagem embutida).
		//
		// Havia um terceiro, "Pérola", que reusava a textura do concreto com um
		// véu claro por cima. Saiu a pedido em 31/08/2026, e o Concreto passou a
		// ser o padrão — era ele por baixo do véu.
		const img = piso === 'asfalto' ? assets.pisoAsfalto : assets.pisoConcreto
		// overlap dentro da foto = tamanho da máscara → textura chega 100% opaca na divisa
		const bandTop = PISO_TOP - FUSAO_H
		const bandH = DIAG_L - bandTop
		ctx.save()
		ctx.beginPath()
		ctx.moveTo(0, bandTop)
		ctx.lineTo(W, bandTop)
		ctx.lineTo(W, DIAG_R)
		ctx.lineTo(0, DIAG_L)
		ctx.closePath()
		ctx.clip()
		if (img && img.complete && img.naturalWidth) {
			const osc = document.createElement('canvas')
			osc.width = W
			osc.height = bandH
			const ox = osc.getContext('2d')!
			const ps = Math.max(W / img.width, bandH / img.height)
			ox.drawImage(img, (W - img.width * ps) / 2, (bandH - img.height * ps) / 2, img.width * ps, img.height * ps)
			ctx.drawImage(osc, 0, bandTop)
		} else {
			ctx.fillStyle = piso === 'asfalto' ? '#3a3a3c' : '#eceeed'
			ctx.fillRect(0, bandTop, W, bandH)
		}
		// sombras internas discretas (intensidade conforme o tom do piso)
		const sa = piso === 'asfalto' ? 0.14 : 0.07
		const sombraTopo = ctx.createLinearGradient(0, PISO_TOP, 0, PISO_TOP + 160)
		sombraTopo.addColorStop(0, `rgba(0,0,0,${sa})`)
		sombraTopo.addColorStop(1, 'rgba(0,0,0,0)')
		ctx.fillStyle = sombraTopo
		ctx.fillRect(0, PISO_TOP, W, 160)
		const sombraBase = ctx.createLinearGradient(0, CUT - 160, 0, CUT)
		sombraBase.addColorStop(0, 'rgba(0,0,0,0)')
		sombraBase.addColorStop(1, `rgba(0,0,0,${sa})`)
		ctx.fillStyle = sombraBase
		ctx.fillRect(0, CUT - 160, W, DIAG_L - (CUT - 160))

		if (imagens.foto1) casarFaixaComOPisoDaFoto(ctx, { PISO_TOP, W, corDoPreco: tx.preco, feed: FEED })

		ctx.restore()
	}

	// SEM véu sobre a foto.
	//
	// Havia aqui um degradê branco (até 42% de opacidade) pintado sobre os
	// ÚLTIMOS 110px DA FOTO, para a passagem foto→piso não ler como linha dura.
	// O custo era alto demais: essa faixa é justamente onde ficam os pneus e o
	// chão sob o carro, e o véu lavava a borracha e a sombra de contato — o carro
	// parecia flutuar. A divisa seca é preferível a estragar o veículo, que é o
	// assunto da peça. (A fusão do topo do piso já era 0 pelo mesmo motivo.)

	if (dark) {
		ctx.shadowColor = 'rgba(0,0,0,.55)'
		ctx.shadowBlur = 8
		ctx.shadowOffsetY = 1
	}

	const preco = estado.preco.trim().replace(/^R\$\s*/i, '')
	if (preco)
		spacedText(
			ctx,
			'R$ ' + preco,
			W / 2,
			PISO_TOP + (FEED ? 54 : 62),
			(dark ? '400' : '300') + ' 48px Montserrat, sans-serif',
			10,
			tx.preco,
		)

	const kmParts: string[] = []
	if (estado.km.trim()) kmParts.push(estado.km.trim() + ' KM')
	if (estado.kmextra.trim()) kmParts.push(estado.kmextra.trim().toUpperCase())
	if (kmParts.length)
		spacedText(
			ctx,
			kmParts.join('  |  '),
			W / 2,
			PISO_TOP + (FEED ? 102 : 118),
			(dark ? '600' : '500') + ' 24px Montserrat, sans-serif',
			5,
			tx.km,
		)

	// Máximo 3 destaques, UMA linha cada: a fonte encolhe até caber (mín. 25px)
	// e em último caso o texto é cortado com "…" — nunca quebra de linha.
	const bullets = [estado.b1, estado.b2, estado.b3].map(b => b.trim()).filter(Boolean)
	const textX = 208
	const maxW = 800
	const lineH = FEED ? 42 : 44
	const areaTop = PISO_TOP + (FEED ? 150 : 188)
	const areaBot = Math.min(DIAG_L, DIAG_R) - 26
	const items = bullets.map(b => {
		let size = 34
		ctx.font = `700 ${size}px Montserrat, sans-serif`
		while (size > 25 && ctx.measureText(b).width > maxW) {
			size -= 1
			ctx.font = `700 ${size}px Montserrat, sans-serif`
		}
		let text = b
		while (text.length > 4 && ctx.measureText(text + '…').width > maxW) text = text.slice(0, -1).trimEnd()
		if (text !== b) text += '…'
		return { text, size }
	})
	let gap = 30
	if (items.length > 1)
		gap = Math.max(20, Math.min(48, (areaBot - areaTop - items.length * lineH) / (items.length - 1)))
	const totalH = items.length * lineH + gap * Math.max(0, items.length - 1)
	let by = areaTop + Math.max(0, (areaBot - areaTop - totalH) / 2) + 30

	for (const it of items) {
		const iy = by - 11
		ctx.strokeStyle = tx.icone
		ctx.lineWidth = 3.5
		ctx.beginPath()
		ctx.arc(158, iy, 16, 0, Math.PI * 2)
		ctx.stroke()
		ctx.fillStyle = tx.icone
		ctx.beginPath()
		ctx.arc(158, iy, 7.5, 0, Math.PI * 2)
		ctx.fill()
		ctx.font = `700 ${it.size}px Montserrat, sans-serif`
		ctx.fillStyle = tx.bullet
		ctx.fillText(it.text, textX, by)
		by += lineH + gap
	}
	ctx.shadowColor = 'transparent'
	ctx.shadowBlur = 0
	ctx.shadowOffsetY = 0

	if (!FEED) {
		// faixa da foto de baixo: só no Stories
		ctx.save()
		ctx.beginPath()
		ctx.moveTo(0, DIAG_L)
		ctx.lineTo(W, DIAG_R)
		ctx.lineTo(W, H)
		ctx.lineTo(0, H)
		ctx.closePath()
		ctx.clip()
		if (imagens.foto2) {
			// A faixa é sempre preenchida por inteiro (sem sobras, sem blur).
			// Foto mais alta que a faixa: âncora automática na BASE da foto —
			// as rodas nunca cortam; sai céu/fundo por cima. Se o usuário mexer
			// no slider de posição da Foto 2, o valor dele prevalece.
			const bw = W
			const bh = H - DIAG_R
			const cover = Math.max(bw / imagens.foto2.width, bh / imagens.foto2.height)
			const dh = imagens.foto2.height * cover * (estado.f2.zoom || 1)
			let opt = estado.f2
			if (dh > bh * 1.15 && estado.f2.y === 0.5) {
				const rangeY = Math.max(dh - bh, bh * 0.6)
				opt = { ...estado.f2, y: 0.5 + (dh - bh) / (2 * rangeY) }
			}
			drawPhoto(ctx, imagens.foto2, 0, DIAG_R - 2, bw, bh + 2, opt)
		} else placeholder(ctx, 0, DIAG_R, W, H - DIAG_R, 'FOTO TRASEIRA / LATERAL')

		// sombra de acomodação: o piso projeta penumbra suave no topo da foto
		// (só nos pisos de textura; no pérola a divisa limpa é a estética)
		{
			// acomodação da base em todos os pisos (agora todos texturizados)
			const acomA = estado.pisoTipo === 'asfalto' ? 0.42 : 0.22
			g = ctx.createLinearGradient(0, DIAG_R - 2, 0, DIAG_L + 78)
			g.addColorStop(0, `rgba(0,0,0,${acomA})`)
			g.addColorStop(0.55, `rgba(0,0,0,${acomA * 0.38})`)
			g.addColorStop(1, 'rgba(0,0,0,0)')
			ctx.fillStyle = g
			ctx.fillRect(0, DIAG_R - 2, W, DIAG_L - DIAG_R + 82)
		}

		ctx.restore()
	} // fim da faixa da foto de baixo
}
