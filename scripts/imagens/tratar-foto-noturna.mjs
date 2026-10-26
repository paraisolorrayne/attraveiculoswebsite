// Tratamento da foto noturna da fachada (hero de /jornada).
// Uso: EXPO=0.5 BRILHO=0.5 CUBO=1 CUBO_PRETO=30 CUBO_GAMA=1.25 node scripts/imagens/tratar-foto-noturna.mjs <entrada> <saida> 1
// (assim saiu a foto do topo da /jornada em 23/10/2026; saiu do site em 26/10/2026, trocada por vídeo)
//
// O cubo de vidro da esquerda (os feixes de LED) tem tratamento próprio
// (CUBO, passo 7): é uma área toda clara, e o brilho e a vinheta do resto da
// foto a deixavam leitosa, com os feixes sem desenho.
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const sharp = require('sharp')
const [entrada, saida, intens = '1', usarClahe] = process.argv.slice(2)
const k = Number(intens)

const { data, info } = await sharp(entrada).removeAlpha().raw().toBuffer({ resolveWithObject: true })
const W = info.width, H = info.height
const out = Buffer.alloc(data.length)
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
const mix = (a, b, t) => a + (b - a) * t
const toLin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
const toSrgb = (v) => { v = Math.min(1, Math.max(0, v)); return 255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055) }
const lut = new Float64Array(256).map((_, i) => toLin(i))

// Onde fica o cubo de vidro, em fração da foto, com borda suave de ~2%.
const forcaCubo = Number(process.env.CUBO ?? 0)
const CUBO = { x0: 0.012, x1: 0.215, y0: 0.37, y1: 0.615, borda: 0.02 }
const noCubo = (fx, fy) => forcaCubo *
  ss(CUBO.x0 - CUBO.borda, CUBO.x0 + CUBO.borda, fx) * (1 - ss(CUBO.x1 - CUBO.borda, CUBO.x1 + CUBO.borda, fx)) *
  ss(CUBO.y0 - CUBO.borda, CUBO.y0 + CUBO.borda, fy) * (1 - ss(CUBO.y1 - CUBO.borda, CUBO.y1 + CUBO.borda, fy))

for (let y = 0; y < H; y++) {
  const fy = y / H
  for (let x = 0; x < W; x++) {
    const fx = x / W
    const i = (y * W + x) * 3
    let r = lut[data[i]], g = lut[data[i + 1]], b = lut[data[i + 2]]

    // 1. Luz de sódio (laranja) da rua: neutraliza onde o pixel é quente.
    //    O interior da loja (branco frio) não entra na máscara.
    // Luz de poste é laranja-amarelada (tem verde); pintura vermelha quase não
    // tem. Sem o teste do verde, as Ferraris saíam cor-de-rosa.
    const quente = ss(0.25, 0.6, (r - b) / Math.max(r, 1e-4)) * ss(0.004, 0.03, r) * ss(0.18, 0.38, g / Math.max(r, 1e-4))
    const q = quente * 0.75 * k
    r *= mix(1, 0.78, q); g *= mix(1, 0.97, q); b *= mix(1, 1.55, q)

    // 2. Primeiro plano (calçada e canteiro, que eram a área mais clara da
    //    foto) e o canto esquerdo escurecem; a loja vira o ponto de luz.
    const baixo = ss(0.6, 1.0, fy)
    const vinheta = ss(0.35, 0.95, Math.hypot((fx - 0.62) * 1.1, (fy - 0.5) * 1.4))
    const queima = 1 - k * (0.45 * baixo + 0.3 * vinheta * (1 - baixo * 0.5))
    // A faixa da vitrine (carros e interior) ganha um pouco de exposição.
    const faixa = ss(0.3, 0.42, fy) * (1 - ss(0.58, 0.68, fy)) * ss(0.12, 0.3, fx)
    const expo = 1 + Number(process.env.EXPO ?? 0.3) * k * faixa
    const semVinheta = mix(queima, 1, noCubo(fx, fy))
    r *= semVinheta * expo; g *= semVinheta * expo; b *= semVinheta * expo

    // 3. Curva de tom na luminância: abre as sombras da fachada (o céu preto
    //    continua preto) e segura as altas luzes do letreiro e da vitrine.
    const L = 0.2126 * r + 0.7152 * g + 0.0722 * b
    let L2 = L
    if (L > 1e-5) {
      // Só a partir de um piso: abaixo dele (o céu e a borda entre céu e
      // fachada) abrir a sombra fazia aparecer manchas do upscale da foto.
      const sombra = Math.pow(L, mix(1, 0.86, k))
      L2 = mix(L, sombra, ss(0.002, 0.012, L) * (1 - ss(0.05, 0.35, L)))
      const joelho = 0.75
      if (L2 > joelho) L2 = joelho + (L2 - joelho) / (1 + (L2 - joelho) * mix(0, 1.0, k))
    }
    const f = L > 1e-5 ? L2 / L : 1
    r *= f; g *= f; b *= f

    // 4. Vibração: satura um pouco o que tem pouca cor (carros e vitrine),
    //    sem estourar o azul do carro.
    const m = (r + g + b) / 3
    const sat = (Math.max(r, g, b) - Math.min(r, g, b)) / Math.max(Math.max(r, g, b), 1e-4)
    const v = 1 + 0.15 * k * (1 - sat)
    r = m + (r - m) * v; g = m + (g - m) * v; b = m + (b - m) * v

    out[i] = toSrgb(r); out[i + 1] = toSrgb(g); out[i + 2] = toSrgb(b)
  }
}

let img = sharp(out, { raw: { width: W, height: H, channels: 3 } })

// 5a. Brilho (bloom) nas luzes: o que passa de ~60% de luminância vira uma
//     camada desfocada somada por "screen". A vitrine e o letreiro ganham o
//     halo de luz que a câmera do celular achatou.
const forcaBrilho = Number(process.env.BRILHO ?? 0)
if (forcaBrilho > 0) {
  const luz = Buffer.alloc(out.length)
  for (let i = 0; i < out.length; i += 3) {
    const L = (0.2126 * out[i] + 0.7152 * out[i + 1] + 0.0722 * out[i + 2]) / 255
    const p = i / 3
    const t = ss(0.55, 0.95, L) * forcaBrilho * (1 - 0.9 * noCubo((p % W) / W, Math.floor(p / W) / H))
    luz[i] = out[i] * t; luz[i + 1] = out[i + 1] * t; luz[i + 2] = out[i + 2] * t
  }
  const halo = await sharp(luz, { raw: { width: W, height: H, channels: 3 } }).blur(22).removeAlpha().png().toBuffer()
  const base = await sharp(out, { raw: { width: W, height: H, channels: 3 } }).composite([{ input: halo, blend: 'screen' }]).removeAlpha().raw().toBuffer()
  img = sharp(base, { raw: { width: W, height: H, channels: 3 } })
}
// 5. Contraste local leve (traz textura da fachada e das plantas).
if (usarClahe) img = img.clahe({ width: 200, height: 200, maxSlope: Number(usarClahe) || 1.6 })
// 6. Suaviza o serrilhado do upscale antes de afiar de leve.
img = img.median(3).sharpen({ sigma: 0.8, m1: 0.5, m2: 1.2 })

// 7. Cubo de vidro: parte da foto original, não do resultado acima.
//    - Alisa o vidro com mediana 5 (preserva as bordas): a foto foi ampliada
//      por IA, e realçar contraste local ali deixava o vidro "craquelado".
//    - Ponto preto mais alto e curva nos meios-tons: a estrutura fica preta
//      e o vidro deixa de parecer leitoso.
//    - O azulado dos LEDs puxado para o branco; um pouco mais de cor (a
//      Ferrari).
//    - Brilho curto só no que é quase branco (os feixes), para lerem como luz.
//    Entra por cima do resto com a borda suave de noCubo, sem o que é luz de
//    poste (o chão e as plantas na borda).
if (forcaCubo > 0) {
  const base = await img.removeAlpha().raw().toBuffer()
  const suave = await sharp(data, { raw: { width: W, height: H, channels: 3 } })
    .median(5).sharpen({ sigma: 1, m1: 0.2, m2: 0.6 }).removeAlpha().raw().toBuffer()
  const xa = Math.max(0, Math.floor((CUBO.x0 - CUBO.borda) * W)), xb = Math.min(W, Math.ceil((CUBO.x1 + CUBO.borda) * W))
  const ya = Math.max(0, Math.floor((CUBO.y0 - CUBO.borda) * H)), yb = Math.min(H, Math.ceil((CUBO.y1 + CUBO.borda) * H))
  const cubo = new Float32Array(data.length)
  const luz = Buffer.alloc(data.length)
  const PRETO = Number(process.env.CUBO_PRETO ?? 24), GAMA = Number(process.env.CUBO_GAMA ?? 1.18)
  for (let y = ya; y < yb; y++) {
    for (let x = xa; x < xb; x++) {
      const i = (y * W + x) * 3
      let c = [suave[i], suave[i + 1], suave[i + 2]].map((v) => Math.max(0, (v - PRETO) / (255 - PRETO)))
      // Curva no brilho, não em cada canal: por canal ela deslocava a cor
      // (a Ferrari vermelha puxava para o rosa).
      const L1 = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
      const fator = L1 > 1e-5 ? Math.pow(L1, GAMA) / L1 : 1
      c = c.map((v) => v * fator)
      c[0] *= 1.02; c[2] *= 0.975
      const L = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
      c = c.map((v) => Math.min(1, Math.max(0, L + (v - L) * 1.08)))
      // Cor seletiva no vermelho: sob a luz branca fria dos LEDs a Ferrari sai
      // carmim (192/79/92 no original, mais azul que verde). Onde o vermelho
      // domina, o azul desce até perto do verde e a cor ganha corpo.
      const vermelho = ss(1.5, 2.2, c[0] / Math.max(c[1], 1e-4)) * ss(1.3, 1.8, c[0] / Math.max(c[2], 1e-4)) * ss(0.12, 0.25, c[0])
      if (vermelho > 0) {
        c[2] = mix(c[2], Math.min(c[2], c[1] * 0.8), vermelho)
        c[1] *= mix(1, 0.85, vermelho)
        c[0] = Math.min(1, c[0] * mix(1, 1.06, vermelho))
      }
      for (let ch = 0; ch < 3; ch++) cubo[i + ch] = c[ch]
      const t = ss(0.82, 0.97, L)
      for (let ch = 0; ch < 3; ch++) luz[i + ch] = Math.round(255 * c[ch] * t)
    }
  }
  const halo = await sharp(luz, { raw: { width: W, height: H, channels: 3 } }).blur(5).removeAlpha().raw().toBuffer()
  const BRILHO_CUBO = Number(process.env.CUBO_BRILHO ?? 0.4)
  for (let y = ya; y < yb; y++) {
    for (let x = xa; x < xb; x++) {
      const i = (y * W + x) * 3
      const r0 = lut[data[i]], g0 = lut[data[i + 1]], b0 = lut[data[i + 2]]
      const quente = ss(0.2, 0.45, (r0 - b0) / Math.max(r0, 1e-4)) * ss(0.004, 0.03, r0) * ss(0.18, 0.38, g0 / Math.max(r0, 1e-4))
      const m = noCubo(x / W, y / H) * (1 - quente)
      if (m <= 0) continue
      for (let ch = 0; ch < 3; ch++) {
        const a = cubo[i + ch], h = (halo[i + ch] / 255) * BRILHO_CUBO
        const v = 255 * (1 - (1 - a) * (1 - h))
        base[i + ch] = Math.round(Math.min(255, Math.max(0, mix(base[i + ch], v, m))))
      }
    }
  }
  img = sharp(base, { raw: { width: W, height: H, channels: 3 } })
}
await img.jpeg({ quality: 86, mozjpeg: true, progressive: true }).toFile(saida)
console.log('ok', saida)
