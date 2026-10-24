// Tratamento de foto de fachada com luz de meio-dia (galeria de /sobre).
// Uso: node scripts/imagens/tratar-foto-diurna.mjs <entrada> <saida>
// (assim saiu public/about/attra-fachada-lamborghinis-2026.jpg, em 23/10/2026)
//
// O sol a pino achata a foto: céu desbotado, véu cinza no conjunto, piso
// claro ocupando metade do quadro. O tratamento:
//   1. céu mais denso e mais azul (efeito de polarizador), só no que é céu;
//   2. ponto preto e curva em S na luminância: tira o véu sem mexer na cor;
//   3. mais cor no que tem pouca (carros, letreiro), sem estourar o laranja;
//   4. piso escurecido de baixo para cima, para o olho ir aos carros;
//   5. nitidez leve.
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const sharp = require('sharp')
const [entrada, saida] = process.argv.slice(2)

const { data, info } = await sharp(entrada).removeAlpha().raw().toBuffer({ resolveWithObject: true })
const W = info.width, H = info.height
const out = Buffer.alloc(data.length)
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
const mix = (a, b, t) => a + (b - a) * t
const toLin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
const toSrgb = (v) => { v = Math.min(1, Math.max(0, v)); return 255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055) }

for (let y = 0; y < H; y++) {
  const fy = y / H
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 3
    let r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255

    // 1. Céu: azul dominante e claro, na parte de cima.
    const ceu = ss(0.08, 0.2, b - r) * ss(0.35, 0.55, b) * (1 - ss(0.2, 0.3, fy))
    if (ceu > 0) {
      const L = 0.2126 * r + 0.7152 * g + 0.0722 * b
      const sat = 1 + 0.35 * ceu, esc = 1 - 0.14 * ceu
      r = (L + (r - L) * sat) * esc; g = (L + (g - L) * sat) * esc; b = (L + (b - L) * sat) * esc
    }

    // 2. Curva no brilho: ponto preto em 0,05 e S suave.
    const L0 = 0.2126 * r + 0.7152 * g + 0.0722 * b
    let L1 = Math.max(0, (L0 - 0.05) / 0.95)
    L1 = mix(L1, L1 * L1 * (3 - 2 * L1), 0.35)
    const f = L0 > 1e-4 ? L1 / L0 : 1
    r *= f; g *= f; b *= f

    // 3. Vibração.
    const m = (r + g + b) / 3
    const satAtual = (Math.max(r, g, b) - Math.min(r, g, b)) / Math.max(Math.max(r, g, b), 1e-4)
    const v = 1 + 0.22 * (1 - satAtual)
    r = m + (r - m) * v; g = m + (g - m) * v; b = m + (b - m) * v

    // 4. Piso: escurece a partir de 70% da altura.
    const piso = 1 - 0.32 * ss(0.68, 1.0, fy)
    r *= piso; g *= piso; b *= piso

    out[i] = Math.round(255 * Math.min(1, Math.max(0, r)))
    out[i + 1] = Math.round(255 * Math.min(1, Math.max(0, g)))
    out[i + 2] = Math.round(255 * Math.min(1, Math.max(0, b)))
  }
}
void toLin; void toSrgb

await sharp(out, { raw: { width: W, height: H, channels: 3 } })
  .sharpen({ sigma: 0.7, m1: 0.4, m2: 1 })
  .jpeg({ quality: 86, mozjpeg: true, progressive: true })
  .toFile(saida)
console.log('ok', saida)
