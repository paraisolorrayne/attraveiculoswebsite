/**
 * Tira as juntas do calçamento do chão da FOTO do veículo.
 *
 * O PROBLEMA. No Clássico Loja a foto entra inteira, e o chão dela é o chão da
 * peça: preço e destaques são escritos em cima. As fotos são feitas na calçada
 * da loja, que é concreto em placas — então uma junta de dilatação atravessa o
 * chão da peça. No G 63 ela desce reta por baixo do "R$"; na McLaren corta em
 * diagonal, amarelada. Lê como rachadura. A fachada não tem junta nenhuma: o
 * defeito é de cada foto, e por isso a correção tem de ser feita na foto.
 *
 * A SOLUÇÃO é morfologia, não IA. Uma junta é uma estrutura FINA — poucos
 * pixels de largura, qualquer comprimento. Fechamento (máximo, depois mínimo)
 * com janela mais larga que a junta apaga o que é fino e escuro e devolve
 * intacto tudo o que é largo; abertura faz o mesmo com o fino e claro. Pneu,
 * sombra e meio-fio são largos e sobrevivem.
 *
 * Duas travas para não estragar o resto:
 *
 *   1. SÓ NO CHÃO. A mesma conta apagaria raio de roda e grade. O chão é
 *      achado subindo, coluna a coluna, a partir da borda de baixo da foto,
 *      enquanto a cor seguir parecida com a do chão; a sombra do carro encerra
 *      a subida. Sem certeza, para antes: errar para menos deixa uma junta,
 *      errar para mais come o carro.
 *   2. SÓ ONDE HÁ JUNTA. Trocar o chão todo daria a "cara de tinta". Só são
 *      trocados os pixels em que o filtrado difere do original acima do grão
 *      — e o remendo é a média do chão bom em volta, com grão por cima.
 *
 * Função pura sobre os bytes (sem canvas) para o teste conseguir afirmar.
 */

/** Largura de referência em que os raios abaixo foram calibrados. */
const LARGURA_REF = 1080

/** Chão: a região onde a limpeza pode agir. `topo[x]` = primeira linha de chão. */
export function acharChao(d: Uint8ClampedArray, w: number, h: number): Int32Array {
	const cel = Math.max(4, Math.round((w / LARGURA_REF) * 8))
	const cw = Math.ceil(w / cel)
	const ch = Math.ceil(h / cel)

	// média por célula — uma junta fina quase não move a média de 8×8
	const media = new Float32Array(cw * ch * 3)
	for (let cy = 0; cy < ch; cy++) {
		for (let cx = 0; cx < cw; cx++) {
			let r = 0
			let g = 0
			let b = 0
			let n = 0
			const y1 = Math.min(h, (cy + 1) * cel)
			const x1 = Math.min(w, (cx + 1) * cel)
			for (let y = cy * cel; y < y1; y++) {
				for (let x = cx * cel; x < x1; x++) {
					const i = (y * w + x) * 4
					r += d[i]
					g += d[i + 1]
					b += d[i + 2]
					n++
				}
			}
			const k = (cy * cw + cx) * 3
			media[k] = r / n
			media[k + 1] = g / n
			media[k + 2] = b / n
		}
	}

	// PASSO = o quanto uma célula pode diferir da referência corrente (que
	// acompanha o degradê de perspectiva); TOTAL = o quanto pode se afastar da
	// borda de baixo — é o que impede a referência de escorregar sombra adentro.
	const PASSO = 26
	const TOTAL = 64
	const topoCel = new Int32Array(cw)
	for (let cx = 0; cx < cw; cx++) {
		const k0 = ((ch - 1) * cw + cx) * 3
		const base = [media[k0], media[k0 + 1], media[k0 + 2]]
		const ref = [...base]
		let cy = ch - 1
		while (cy > 0) {
			const k = ((cy - 1) * cw + cx) * 3
			const dRef = (Math.abs(media[k] - ref[0]) + Math.abs(media[k + 1] - ref[1]) + Math.abs(media[k + 2] - ref[2])) / 3
			const dBase =
				(Math.abs(media[k] - base[0]) + Math.abs(media[k + 1] - base[1]) + Math.abs(media[k + 2] - base[2])) / 3
			if (dRef > PASSO || dBase > TOTAL) break
			for (let c = 0; c < 3; c++) ref[c] = ref[c] * 0.8 + media[k + c] * 0.2
			cy--
		}
		topoCel[cx] = cy
	}

	// OBSTÁCULO ESTREITO NÃO É CARRO. Uma marca de tinta ou uma folha grande no
	// chão interrompe a subida só nas colunas dela, e o resultado era uma faixa
	// vertical de foto crua — sem limpeza e sem fusão — no meio do chão tratado
	// (RAM, 21/09). Mediana entre colunas numa janela de 9 células: o que tem
	// menos de ~4 células de largura some; pneu e sombra, que têm dezenas, ficam.
	const bruto = Int32Array.from(topoCel)
	const janela: number[] = []
	for (let cx = 0; cx < cw; cx++) {
		janela.length = 0
		for (let v = Math.max(0, cx - 4); v <= Math.min(cw - 1, cx + 4); v++) janela.push(bruto[v])
		janela.sort((p, q) => p - q)
		topoCel[cx] = Math.min(bruto[cx], janela[janela.length >> 1])
	}

	// Conservador: cada coluna herda o topo mais BAIXO das duas vizinhas, e ainda
	// desce uma célula — a borda da sombra é macia, e é nela que mora o pneu.
	const topo = new Int32Array(w)
	for (let x = 0; x < w; x++) {
		const cx = Math.min(cw - 1, Math.floor(x / cel))
		let t = 0
		for (let v = Math.max(0, cx - 1); v <= Math.min(cw - 1, cx + 1); v++) t = Math.max(t, topoCel[v])
		topo[x] = Math.min(h, (t + 1) * cel)
	}
	return topo
}

/** Mínimo ou máximo corrente numa janela de raio `r`, separável (linhas, depois colunas). */
function extremo(src: Uint8Array, w: number, h: number, r: number, maximo: boolean): Uint8Array {
	const tmp = new Uint8Array(src.length)
	const out = new Uint8Array(src.length)
	for (let y = 0; y < h; y++) {
		const l = y * w
		for (let x = 0; x < w; x++) {
			let v = src[l + x]
			const a = Math.max(0, x - r)
			const b = Math.min(w - 1, x + r)
			for (let k = a; k <= b; k++) {
				const s = src[l + k]
				if (maximo ? s > v : s < v) v = s
			}
			tmp[l + x] = v
		}
	}
	for (let y = 0; y < h; y++) {
		const a = Math.max(0, y - r)
		const b = Math.min(h - 1, y + r)
		for (let x = 0; x < w; x++) {
			let v = tmp[y * w + x]
			for (let k = a; k <= b; k++) {
				const s = tmp[k * w + x]
				if (maximo ? s > v : s < v) v = s
			}
			out[y * w + x] = v
		}
	}
	return out
}

/** Grão determinístico em [-1, 1] — sem Math.random, para o desenho ser idempotente. */
function grao(x: number, y: number, c: number): number {
	let n = (x * 374761393 + y * 668265263 + c * 1274126177) | 0
	n = Math.imul(n ^ (n >>> 13), 1274126177)
	n ^= n >>> 16
	return ((n >>> 0) / 4294967295) * 2 - 1
}

/**
 * Limpa as juntas do chão, no próprio buffer RGBA. Devolve quantos pixels
 * foram substituídos — zero quando a foto não tem chão reconhecível.
 */
export function limparJuntas(d: Uint8ClampedArray, w: number, h: number): number {
	const topo = acharChao(d, w, h)
	let y0 = h
	for (let x = 0; x < w; x++) if (topo[x] < y0) y0 = topo[x]
	const esc = w / LARGURA_REF
	const r = Math.max(2, Math.round(5 * esc))
	const cel = Math.max(4, Math.round(esc * 8))
	const SUBIDA = cel * 4 // o quanto o refino abaixo pode subir além de `topo`
	const margem = r * 2 + SUBIDA
	y0 = Math.max(0, y0 - margem) // a janela precisa de vizinhança acima do chão
	const hh = h - y0
	if (hh < r * 4) return 0

	const n = w * hh
	const filtrado: Uint8Array[] = []
	for (let c = 0; c < 3; c++) {
		const plano = new Uint8Array(n)
		for (let i = 0; i < n; i++) plano[i] = d[(i + y0 * w) * 4 + c]
		const fechado = extremo(extremo(plano, w, hh, r, true), w, hh, r, false)
		filtrado.push(extremo(extremo(fechado, w, hh, r, false), w, hh, r, true))
	}

	// REFINO DA BORDA. `acharChao` para longe da sombra de propósito (célula de
	// 8px, mais uma de folga) — e nessa folga sobrava um toco de junta colado na
	// sombra, que na RAM era o que mais aparecia. Aqui dá para chegar perto com
	// segurança porque o FILTRADO já não tem junta: sobe-se coluna a coluna
	// enquanto a luz dele seguir a do chão, e a borda da sombra (um degrau largo,
	// que a morfologia preserva) encerra a subida. Fica a 2px dela: o limiar de
	// 14 já para no começo da penumbra.
	const lum = (i: number): number => (filtrado[0][i] + filtrado[1][i] + filtrado[2][i]) / 3
	const lim = new Int32Array(w)
	for (let x = 0; x < w; x++) {
		const yT = topo[x] - y0
		if (yT >= hh) {
			lim[x] = topo[x]
			continue
		}
		const ref = lum(Math.min(hh - 1, yT + r) * w + x)
		let y = yT
		const teto = Math.max(0, yT - SUBIDA)
		while (y > teto && Math.abs(lum((y - 1) * w + x) - ref) < 14) y--
		lim[x] = Math.min(topo[x], y + Math.max(2, Math.round(r / 3)) + y0)
	}

	// Máscara: onde o filtrado difere do original ACIMA DO GRÃO DAQUELE PISO.
	// O limiar é medido, não fixo: asfalto áspero tem grão de amplitude 15 e
	// concreto liso, 5 — um número só ou deixaria junta no liso ou trocaria o
	// áspero inteiro. Junta é sempre minoria do chão, então o percentil 93 da
	// diferença é grão; o que passa disso com folga é estrutura.
	const dif = new Uint8Array(n)
	const hist = new Uint32Array(256)
	let nChao = 0
	for (let y = 0; y < hh; y++) {
		for (let x = 0; x < w; x++) {
			if (y + y0 < lim[x]) continue
			const i = y * w + x
			const j = (i + y0 * w) * 4
			const v = Math.max(
				Math.abs(d[j] - filtrado[0][i]),
				Math.abs(d[j + 1] - filtrado[1][i]),
				Math.abs(d[j + 2] - filtrado[2][i]),
			)
			dif[i] = v
			hist[v]++
			nChao++
		}
	}
	if (!nChao) return 0
	let p93 = 0
	let p50 = -1
	for (let v = 0, acc = 0; v < 256; v++) {
		acc += hist[v]
		if (p50 < 0 && acc >= nChao * 0.5) p50 = v
		if (acc >= nChao * 0.93) {
			p93 = v
			break
		}
	}
	const LIMIAR = Math.max(12, Math.round(p93 * 1.25))
	// NA FAIXA DO REFINO, SOMBRA NÃO É JUNTA. A ponta da sombra do carro afina
	// até virar um traço — fino e escuro, exatamente o que o filtro apaga — e
	// apagada pela metade ela vira um borrão solto no chão (visto na RAM). O que
	// separa as duas é a força: sombra dura difere do chão em 70+, junta em
	// 30-60. Então, entre `lim` e `topo`, nada é trocado perto de diferença
	// forte. Abaixo de `topo` a regra não vale: lá não há sombra, e folha escura
	// tem de sair.
	const FORTE = 70
	const forte = new Uint8Array(n)
	for (let i = 0; i < n; i++) if (dif[i] > FORTE) forte[i] = 255
	const pertoDeForte = extremo(forte, w, hh, Math.max(2, Math.round(r / 2)), true)
	const dura = new Uint8Array(n)
	for (let y = 0; y < hh; y++) {
		for (let x = 0; x < w; x++) {
			if (y + y0 < lim[x]) continue
			const i = y * w + x
			if (dif[i] <= LIMIAR) continue
			if (y + y0 < topo[x] && pertoDeForte[i]) continue
			dura[i] = 255
		}
	}
	// dilata: a borda da junta é mais fraca que o miolo, e a amarelada tem um
	// halo de cor mais largo que o traço escuro
	const rm = Math.max(2, Math.round(3 * esc))
	const larga = extremo(dura, w, hh, rm, true)

	// O PREENCHIMENTO NÃO É O FILTRADO. Ele serviu para ACHAR a junta, mas como
	// remendo é ruim: janela quadrada deixa manchas quadradas, e por ser canal a
	// canal deixa um fantasma amarelo onde a junta era amarela. O remendo é a
	// média do CHÃO BOM em volta — convolução normalizada: soma só os pixels
	// fora da máscara e divide por quantos foram. Duas passadas de caixa dão um
	// núcleo em tenda, sem quina.
	const R = r * 3
	// fora do chão também não conta: sombra e pneu escureceriam o remendo
	const peso = new Float32Array(n)
	for (let y = 0; y < hh; y++) {
		for (let x = 0; x < w; x++) {
			const i = y * w + x
			peso[i] = larga[i] || y + y0 < lim[x] ? 0 : 1
		}
	}
	const pesoBorrado = caixa(caixa(peso, w, hh, R), w, hh, R)
	const remendo: Float32Array[] = []
	for (let c = 0; c < 3; c++) {
		const v = new Float32Array(n)
		for (let i = 0; i < n; i++) v[i] = peso[i] ? d[(i + y0 * w) * 4 + c] : 0
		const b = caixa(caixa(v, w, hh, R), w, hh, R)
		for (let i = 0; i < n; i++) b[i] = pesoBorrado[i] > 0.02 ? b[i] / pesoBorrado[i] : filtrado[c][i]
		remendo.push(b)
	}

	// transição macia entre remendo e original
	const alfa = new Float32Array(n)
	for (let i = 0; i < n; i++) alfa[i] = larga[i] / 255
	const macia = caixa(alfa, w, hh, Math.max(1, Math.round(1.5 * esc)))

	const amplitude = Math.min(10, Math.max(0, p50) * 1.5)
	let trocados = 0
	for (let y = 0; y < hh; y++) {
		for (let x = 0; x < w; x++) {
			if (y + y0 < lim[x]) continue
			const i = y * w + x
			const m = macia[i]
			if (m <= 0.004) continue
			const j = (i + y0 * w) * 4
			const g = grao(x, y, 0) * amplitude // igual nos 3 canais: grão é de luz, não de cor
			for (let c = 0; c < 3; c++) d[j + c] = d[j + c] * (1 - m) + (remendo[c][i] + g) * m
			trocados++
		}
	}
	return trocados
}

/** Média em caixa de raio `r`, separável, por soma corrente — O(n) qualquer que seja o raio. */
function caixa(src: Float32Array, w: number, h: number, r: number): Float32Array {
	const tmp = new Float32Array(src.length)
	const out = new Float32Array(src.length)
	for (let y = 0; y < h; y++) {
		const l = y * w
		let s = 0
		for (let x = 0; x <= Math.min(w - 1, r); x++) s += src[l + x]
		for (let x = 0; x < w; x++) {
			const a = Math.max(0, x - r)
			const b = Math.min(w - 1, x + r)
			tmp[l + x] = s / (b - a + 1)
			if (x + r + 1 < w) s += src[l + x + r + 1]
			if (x - r >= 0) s -= src[l + x - r]
		}
	}
	for (let x = 0; x < w; x++) {
		let s = 0
		for (let y = 0; y <= Math.min(h - 1, r); y++) s += tmp[y * w + x]
		for (let y = 0; y < h; y++) {
			const a = Math.max(0, y - r)
			const b = Math.min(h - 1, y + r)
			out[y * w + x] = s / (b - a + 1)
			if (y + r + 1 < h) s += tmp[(y + r + 1) * w + x]
			if (y - r >= 0) s -= tmp[(y - r) * w + x]
		}
	}
	return out
}
