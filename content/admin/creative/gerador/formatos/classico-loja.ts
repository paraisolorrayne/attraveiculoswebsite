/**
 * TIPO 6 — CLÁSSICO LOJA (fundo inteiro da loja)
 *
 * Fundo ÚNICO: uma foto só da loja, sangrando na peça inteira. Com o carro
 * recortado pousando neste chão e o piso da foto dele apagado, existe UM piso
 * só na peça — a diferença de tom que motivou tudo isso deixa de existir por
 * construção, em vez de ser corrigida.
 *
 * Porte 1:1 de `renderClassicoLoja` do HTML do gerador.
 */
import {
	drawLogoWhite,
	drawPhoto,
	drawPhotoBanda,
	suavizarDivisa,
	casarPisoAbaixoDaDivisa,
	placeholder,
	spacedText,
	spacedWidth,
} from '../desenho'
import { amostrar, corMediaDaCaixa, fundoDaCaixa, haloCss, paletaLegivel, type Amostra } from '../contraste'
import { ALTURA_FEED, ALTURA_STORIES, LARGURA as W, type ContextoDesenho } from '../tipos'


export function renderClassicoLoja({ ctx, estado, imagens, assets, altura: H }: ContextoDesenho): void {
	const FEED = H === ALTURA_FEED // 1080×1350: só a foto principal, rodapé fecha mais cedo
	const PHOTO1_H = 1000

	const fachada = assets.fachadaLoja
	if (fachada.complete && fachada.naturalWidth) {
		// Puxada para CIMA: medido na imagem, as letras do "ATTRA" começam na
		// linha 157 — o deslocamento de -117 as coloca em y=40, no topo da peça.
		// Com o letreiro lá em cima, o bloco de título vive ABAIXO dele e a marca
		// do veículo nunca mais disputa espaço com o nome da loja.
		const DESLOC_Y = -117
		// Sempre na escala do Stories, mesmo no Feed: o DESLOC_Y foi medido nessa
		// escala e é o que põe o letreiro em y=40. O Feed só recorta a parte de
		// baixo do fundo.
		const esc = Math.max(W / fachada.naturalWidth, ALTURA_STORIES / fachada.naturalHeight)
		ctx.drawImage(
			fachada,
			(W - fachada.naturalWidth * esc) / 2,
			DESLOC_Y,
			fachada.naturalWidth * esc,
			fachada.naturalHeight * esc,
		)
	} else {
		ctx.fillStyle = '#101013'
		ctx.fillRect(0, 0, W, H)
	}

	// A foto entra INTEIRA na banda, sempre.
	//
	// Havia aqui um segundo caminho, com o fundo removido por IA: a foto era
	// mascarada pelo recorte, o piso dela apagado numa fatia e o carro
	// redesenhado por último. Saiu em 31/08/2026 junto com o próprio recorte.
	let baseDaFoto: number | null = null

	// Até onde o carro pode descer sem espremer o texto.
	//
	// A divisa acompanha a base do veículo, então descer a foto empurrava o
	// bloco para baixo até os destaques serem cortados pela borda da faixa
	// (14/08). O bloco tem tamanho conhecido — preço (+54), KM (+102),
	// destaques a partir de +156, três linhas de 44 com respiro mínimo de 20 —
	// e a faixa termina no corte da foto 2. Daí sai o limite: além dele o
	// slider simplesmente para, em vez de estragar a peça.
	const CUT_ = FEED ? H : 1416 - (estado.corte || 0)
	const ALTURA_TEXTO = FEED
		? 156 + 3 * 42 + 2 * 16 + 20 // Feed: linhas de 42, respiro 16, sem diagonal
		: 156 + 3 * 44 + 2 * 20 + 46 // = 374 até a borda da faixa
	const BASE_MAX = CUT_ - ALTURA_TEXTO

	// A FAIXA DA FOTO TERMINA ONDE O TEXTO COMEÇA.
	//
	// A faixa era fixa em 520 (540..1060) enquanto o início do bloco de texto
	// sobe junto com o corte. Passando de corte -18, BASE_MAX cai abaixo de 1060
	// e o preço passava a ser desenhado EM CIMA da foto — foi assim que a peça da
	// RAM saiu, com "R$ 335.000" fantasma sobre a roda. O slider do corte, que é
	// justamente o que se usa para caber uma picape no rodapé, estragava o texto.
	//
	// Derivando a altura da faixa do mesmo limite que segura o texto, subir o
	// corte passa a trocar foto principal por rodapé — nunca sobrepor um ao
	// outro. O piso do slider (300) existe para a faixa não colapsar: além disso
	// não há peça, há uma tira.
	// Feed: a faixa sobe para logo abaixo do ano. Uma foto 4:3 full-bleed tem
	// 810px de altura; com a faixa em 540 o carro só terminava perto de 1100 e
	// o preço caía nas rodas (medido no G 63, 24/08). Subindo 100px, a base do
	// carro fica acima de BASE_MAX e o bloco de texto cabe embaixo. O topo da
	// foto é esfumado em 70px, então ela funde no escuro sob o título.
	const BANDA_TOPO = FEED ? 440 : 540
	const pisoShiftPre = estado.pisoy || 0
	const BANDA_H = Math.max(300, Math.min(520, BASE_MAX + Math.min(0, pisoShiftPre) - BANDA_TOPO))

	let topGap = PHOTO1_H
	if (imagens.foto1) {
		const r = drawPhotoBanda(ctx, H, imagens.foto1, 0, BANDA_TOPO, W, BANDA_H, estado.f1)
		topGap = Math.max(0, r.topo)
		baseDaFoto = r.base
		// A EMENDA DO CHÃO, no caminho da foto inteira.
		//
		// drawPhotoBanda esfuma SÓ o topo ("nunca o carro"), então embaixo a foto
		// termina numa linha reta contra a fachada — e as duas foram fotografadas
		// com luz diferente. É a emenda que aparece no uso normal: sem recorte,
		// que é como a maioria das peças sai.
		//
		// Aqui não há trava de legibilidade porque não precisa: neste formato a
		// cor do texto já é medida do fundo (ver contraste.ts), e o espelho é
		// desenhado antes dessa medição — então o preço se adapta ao que sobrar.
		// O corte é DIAGONAL: começa em CUT-20 à direita e em CUT+20 à esquerda.
		// A correção ia só até a borda ALTA, e sobrava uma cunha de fachada crua
		// entre o piso e a foto de baixo — uma tira clara, mais grossa do lado
		// esquerdo. Vai até a borda BAIXA; o que passar dali é coberto pela
		// própria faixa da foto de baixo, desenhada depois.
		const bordaAltaDoCorte = FEED ? H - 40 : CUT_ - 20
		const bordaBaixaDoCorte = FEED ? H : CUT_ + 24
		const base = Math.round(r.base)
		if (base > BANDA_TOPO && base < bordaAltaDoCorte) {
			// Mede o chão dos dois lados da divisa e corrige a EXPOSIÇÃO da
			// fachada até o corte, preservando o grão dela.
			const am = amostrar(ctx.canvas, 0, base - 26, W, Math.min(200, bordaAltaDoCorte - base + 26))
			const deCima = corMediaDaCaixa(am, 0, base - 22, W, 18)
			const deBaixo = corMediaDaCaixa(am, 0, base + 8, W, 60)
			if (deCima && deBaixo) {
				casarPisoAbaixoDaDivisa(ctx, base, W, bordaBaixaDoCorte - base, deCima, deBaixo)
				suavizarDivisa(ctx, base, W)
			}
		}
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

	// Título colado no letreiro. Medido no fundo já deslocado: o letreiro ocupa
	// 40-203 (base do "VEÍCULOS") e a faixa preta da fachada só termina em 471,
	// onde começa a vegetação. O bloco vive nesses 268px — marca em 270, modelo
	// em 368, ano em 424 — então cabe inteiro no preto, sem encostar nas
	// trepadeiras, e lê como continuação do letreiro em vez de um bloco solto.
	//
	// O respiro entre as linhas é o que sobra da altura de cada fonte: o modelo
	// pode chegar a 92px, então sua caixa alta começa ~66px acima da base. Com
	// marca em 270 e modelo em 342 sobravam 6px entre uma linha e outra e o
	// bloco lia como um carimbo só. 368 abre 32px ali, e o ano em 424 repete o
	// mesmo respiro embaixo — ainda com 41px de folga até a vegetação.
	if (marca) spacedText(ctx, marca, W / 2, 270, '600 30px Montserrat, sans-serif', 11, '#ffffff')

	// Largura máxima 920 (era 980): em nome longo — "2500 LARAMIE" — a linha
	// chegava a 60px de cada borda e lia como se fosse estourar a peça. 920 dá
	// 80px de margem, que é a mesma respiração do bloco de destaques.
	let msize = 92
	let mspace = 26
	while (msize > 40 && spacedWidth(ctx, modelo, `200 ${msize}px Montserrat, sans-serif`, mspace) > 920) {
		msize -= 3
		mspace = Math.max(8, mspace - 1)
	}
	if (modelo) spacedText(ctx, modelo, W / 2, 368, `200 ${msize}px Montserrat, sans-serif`, mspace, '#ffffff')

	if (ano) {
		const yy = 424
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
	// (o `areaPath` do HTML não entrou: era declarado e nunca chamado.)

	// Sem faixa de piso desenhada: o chão da peça é o da própria foto de fundo.
	// O `pisoy` sobra como ajuste fino da altura do bloco de texto, e o `corte`
	// continua definindo onde entra a foto de baixo.
	const pisoShift = pisoShiftPre
	// O texto ancora no pé da foto, MAS a divisa nunca passa de BASE_MAX: além
	// dele o bloco não caberia inteiro e os destaques eram cortados. A trava é
	// no TEXTO, não na foto — travar a foto prendia o slider em quase toda a
	// faixa, que não é o que se quer: o enquadramento continua livre.
	const pisoBruto =
		baseDaFoto !== null ? Math.round(baseDaFoto) : BANDA_TOPO + BANDA_H + 4
	const PISO_TOP = Math.min(pisoBruto, BASE_MAX) + pisoShift

	// SEM véu sobre a foto — ver a nota no Clássico original: o degradê branco
	// lavava a borracha do pneu e a sombra de contato, e o carro parecia flutuar.

	// PALETA DOS TEXTOS: MEDIDA, NÃO FIXADA.
	//
	// Preço e KM caem sobre a FOTO, e o chão dela muda a cada veículo: asfalto
	// escuro no G 63, concreto claro na McLaren. Aqui havia `const dark = false`
	// e uma paleta escrita à mão, calibradas numa medição única da fachada —
	// com um aviso de que trocar a imagem sem trocar a constante deixaria texto
	// branco sobre concreto claro. No G 63 o preço media 1,00:1: invisível.
	//
	// Agora o fundo é lido do próprio canvas, na faixa exata onde o texto cai, e
	// a cor sai da medição. Ver contraste.ts para o porquê de percentis em vez
	// de média, e de contraste em vez de harmonização de cores.
	// A MEDIÇÃO É NA CAIXA DO TEXTO, NÃO NUMA FAIXA LARGA.
	//
	// Primeira tentativa aqui mediu a faixa inteira (x 160..920). A caixa real
	// do preço é x 368..714: mais da metade da amostra vinha de FORA do texto, e
	// era ela que decidia a cor. Medido no G 63 recortado: sob o glifo o fundo
	// tem luminância 0,371, onde o texto escuro dá 5,6:1 e o claro 2,3:1 — e a
	// faixa larga, puxada pelas bordas escuras, mandava escolher o claro. Piorou
	// quatro dos cinco casos antes de eu medir de novo.
	//
	// Por isso a largura sai do próprio spacedWidth, com o mesmo espaçamento do
	// desenho: o que se mede é exatamente onde a letra vai cair.
	// Peso 600, e não o 400 de antes.
	//
	// Os destaques logo abaixo são 700, e o preço em 400 lia como o elemento
	// mais FRACO do bloco — a hierarquia invertida, com o número que mais
	// importa parecendo apagado. Já havia sido 300 e subido para 400 pelo mesmo
	// motivo; 600 é o que faz o corpo de 48px pesar mais que o de 34 dos
	// destaques, que é o que a hierarquia pede.
	const FONTE_PRECO = '600 48px Montserrat, sans-serif'
	const preco = estado.preco.trim().replace(/^R\$\s*/i, '')
	const textoPreco = preco ? 'R$ ' + preco : ''
	const yPreco = PISO_TOP + 54
	const larguraPreco = textoPreco ? spacedWidth(ctx, textoPreco, FONTE_PRECO, 10) : 0
	// Em 48px os algarismos sobem ~38px da linha de base e descem ~8.
	// UMA leitura do bloco inteiro serve às três caixas. Cada getImageData de um
	// canvas da GPU espera o desenho terminar; cinco leituras por quadro
	// custavam 16,7ms nesta peça — mais que o render inteiro.
	const amostraTexto: Amostra | null = amostrar(ctx.canvas, 100, PISO_TOP, W - 200, 380)
	const fundoPreco = textoPreco
		? fundoDaCaixa(amostraTexto, W / 2 - larguraPreco / 2 - 8, yPreco - 40, larguraPreco + 16, 52)
		: null
	// 4,5:1 no preço, e não os 3:1 que o WCAG permitiria a 48px.
	//
	// Enquanto o texto caía sobre a fachada — fundo previsível — 3:1 bastava.
	// Agora ele cai sobre o CHÃO DA FOTO, que muda a cada veículo e tem textura:
	// medido na McLaren, 3,49:1 passava no papel e lia mal na peça. O custo de
	// exigir mais é um halo um pouco mais forte, que só aparece quando precisa.
	const pPreco = paletaLegivel(fundoPreco, { alvo: 4.5, corEscura: '#1c1c22', corClara: '#f7f7fa' })

	const kmParts: string[] = []
	if (estado.km.trim()) kmParts.push(estado.km.trim() + ' KM')
	if (estado.kmextra.trim()) kmParts.push(estado.kmextra.trim().toUpperCase())
	const textoKm = kmParts.join('  |  ')
	const yKm = PISO_TOP + 102
	// Mede com o peso 500; o 600 muda a largura em poucos pixels e a caixa é só
	// para amostrar o fundo.
	const larguraKm = textoKm ? spacedWidth(ctx, textoKm, '500 24px Montserrat, sans-serif', 5) : 0
	const fundoKm = textoKm
		? fundoDaCaixa(amostraTexto, W / 2 - larguraKm / 2 - 8, yKm - 20, larguraKm + 16, 28)
		: null
	// O KM era #6f6f74 — cinza médio sobre concreto médio, ~2,6:1, a linha
	// sumia. Vira grafite, um passo abaixo do preço: a hierarquia entre as duas
	// linhas vem do CORPO (48px contra 24px), não de apagar a de baixo.
	const pKm = paletaLegivel(fundoKm, { alvo: 4.5, corEscura: '#3d3d44', corClara: '#e9e9ef' })
	const dark = pKm.textoClaro

	// O halo dá a borda que o fundo não dá, e cada texto tem a sua força: ele só
	// aparece se a cor sozinha não fechou o alvo. É limpo logo depois — ligado,
	// vazaria para os destaques e para o carro, que é redesenhado no fim.
	ctx.shadowColor = haloCss(pPreco)
	ctx.shadowBlur = 10
	ctx.shadowOffsetY = 0

	// Peso 400 no claro (era 300): em 48px a haste do 300 é fina demais, o halo
	// comia metade dela e o preço saía MAIS FRACO que o KM logo abaixo — a
	// hierarquia invertida, com o número que mais importa sendo o que menos lê.
	if (textoPreco) spacedText(ctx, textoPreco, W / 2, yPreco, FONTE_PRECO, 10, pPreco.cor)

	if (textoKm) {
		ctx.shadowColor = haloCss(pKm)
		spacedText(ctx, textoKm, W / 2, yKm, (dark ? '600' : '500') + ' 24px Montserrat, sans-serif', 5, pKm.cor)
	}

	ctx.shadowColor = 'transparent'
	ctx.shadowBlur = 0

	// Máximo 3 destaques, UMA linha cada: a fonte encolhe até caber (mín. 25px)
	// e em último caso o texto é cortado com "…" — nunca quebra de linha.
	const bullets = [estado.b1, estado.b2, estado.b3].map(b => b.trim()).filter(Boolean)
	const textX = 208
	const maxW = 800
	const lineH = FEED ? 42 : 44
	const areaTop = PISO_TOP + 156
	const areaBot = Math.min(DIAG_L, DIAG_R) - (FEED ? 20 : 26)
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
		gap = Math.max(FEED ? 16 : 20, Math.min(48, (areaBot - areaTop - items.length * lineH) / (items.length - 1)))
	const totalH = items.length * lineH + gap * Math.max(0, items.length - 1)
	let by = areaTop + Math.max(0, (areaBot - areaTop - totalH) / 2) + 30

	// Os destaques caem sobre o mesmo chão variável do preço, e sofriam do mesmo
	// mal: quase-preto (#141416) some no asfalto do G 63 tanto quanto o preço
	// sumia. Mede-se a faixa deles, que é outra e fica mais abaixo.
	// Mesma correção do preço: a caixa é a das LINHAS (do ícone ao fim do texto
	// mais largo), não a área inteira reservada aos destaques.
	const larguraMaxItem = items.reduce((m, it) => {
		ctx.font = `700 ${it.size}px Montserrat, sans-serif`
		return Math.max(m, ctx.measureText(it.text).width)
	}, 0)
	const alturaMaxItem = items.reduce((m, it) => Math.max(m, it.size), 0)
	const ultimaBase = by + (items.length - 1) * (lineH + gap)
	const fundoBullets =
		items.length > 0
			? fundoDaCaixa(amostraTexto, 142, by - alturaMaxItem - 6, textX - 142 + larguraMaxItem + 12, ultimaBase - by + alturaMaxItem + 18)
			: null
	const pBullet = paletaLegivel(fundoBullets, { alvo: 4.5, corEscura: '#141416', corClara: '#f2f2f5' })
	// O ícone é traço, não texto: acompanha a cor do destaque, mas dispensa o
	// alvo do WCAG — um círculo de 3,5px de traço não é lido, é visto.
	const corIcone = pBullet.textoClaro ? '#e8e8ee' : '#1a1a1c'

	if (pBullet.haloAlfa > 0) {
		ctx.shadowColor = haloCss(pBullet)
		ctx.shadowBlur = 10
		ctx.shadowOffsetY = 0
	}
	for (const it of items) {
		const iy = by - 11
		ctx.strokeStyle = corIcone
		ctx.lineWidth = 3.5
		ctx.beginPath()
		ctx.arc(158, iy, 16, 0, Math.PI * 2)
		ctx.stroke()
		ctx.fillStyle = corIcone
		ctx.beginPath()
		ctx.arc(158, iy, 7.5, 0, Math.PI * 2)
		ctx.fill()
		ctx.font = `700 ${it.size}px Montserrat, sans-serif`
		ctx.fillStyle = pBullet.cor
		ctx.fillText(it.text, textX, by)
		by += lineH + gap
	}
	ctx.shadowColor = 'transparent'
	ctx.shadowBlur = 0

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
		{
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
