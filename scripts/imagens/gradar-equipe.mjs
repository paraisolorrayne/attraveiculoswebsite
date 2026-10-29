// Gradação de cor das fotos da equipe dirigindo (/sobre), para as três
// parecerem uma só produção: a do Thiago é de cinema, as da Cris e do Gabriel
// são de celular (céu estourado, saturadas).
// Uso: node scripts/imagens/gradar-equipe.mjs <entrada> <saida> <cinema|cinema-escuro|pb> [thiago]
//   cinema         saturação 70% (90% no Thiago), céu 25% mais escuro, tom quente, grão 3%, vinheta 15%
//   cinema-escuro  o mesmo com exposição 8% menor e vinheta 20%
//   pb             preto e branco (R .5, G .35, B .15), curva em S, preto 6% e branco 94%, grão 4%
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const sharp = require('sharp')
const [entrada, saida, modo, quem] = process.argv.slice(2)
const ehThiago = quem === 'thiago'

const { data, info } = await sharp(entrada).removeAlpha().raw().toBuffer({ resolveWithObject: true })
const W = info.width, H = info.height
const out = Buffer.alloc(data.length)
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
const mix = (a, b, t) => a + (b - a) * t
// Ruído determinístico (o mesmo arquivo sai sempre igual).
let semente = 1234567
const aleatorio = () => { semente = (semente * 1103515245 + 12345) & 0x7fffffff; return semente / 0x7fffffff }
const grao = () => (aleatorio() + aleatorio() + aleatorio() - 1.5) / 1.5

const pb = modo === 'pb'
const escuro = modo === 'cinema-escuro'
const forcaGrao = pb ? 0.04 : 0.03
const forcaVinheta = escuro ? 0.2 : pb ? 0 : 0.15
const exposicao = escuro ? 0.92 : 1

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 3
    let r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255
    const fx = x / W, fy = y / H

    if (pb) {
      let L = 0.5 * r + 0.35 * g + 0.15 * b
      L = mix(L, L * L * (3 - 2 * L), 0.5)
      L = 0.06 + L * 0.88
      r = g = b = L
    } else {
      // Céu: azul dominante e claro (Cris e Gabriel).
      if (!ehThiago) {
        const ceu = ss(0.06, 0.18, b - r) * ss(0.45, 0.7, b)
        const f = 1 - 0.25 * ceu
        r *= f; g *= f; b *= f
      }
      // Saturação.
      const L = 0.2126 * r + 0.7152 * g + 0.0722 * b
      const sat = ehThiago ? 0.9 : 0.7
      r = L + (r - L) * sat; g = L + (g - L) * sat; b = L + (b - L) * sat
      // Tom quente (#3b2a1a a 8%, em luz suave): puxa o azul para baixo e o vermelho para cima.
      const t = 0.08
      r = mix(r, r * 1.06 + 0.01, t * 2); g = mix(g, g * 1.0, t); b = mix(b, b * 0.86, t * 2)
      // Curva em S leve.
      const L2 = 0.2126 * r + 0.7152 * g + 0.0722 * b
      const L3 = mix(L2, L2 * L2 * (3 - 2 * L2), 0.25)
      const k = L2 > 1e-4 ? L3 / L2 : 1
      r *= k * exposicao; g *= k * exposicao; b *= k * exposicao
    }

    // Vinheta.
    if (forcaVinheta) {
      const d = Math.hypot((fx - 0.5) / 0.75, (fy - 0.5) / 0.75)
      const v = 1 - forcaVinheta * ss(0.45, 1.0, d)
      r *= v; g *= v; b *= v
    }
    // Grão (o mesmo nos três canais, como filme).
    const n = grao() * forcaGrao
    r += n; g += n; b += n

    out[i] = Math.round(255 * Math.min(1, Math.max(0, r)))
    out[i + 1] = Math.round(255 * Math.min(1, Math.max(0, g)))
    out[i + 2] = Math.round(255 * Math.min(1, Math.max(0, b)))
  }
}

await sharp(out, { raw: { width: W, height: H, channels: 3 } })
  .jpeg({ quality: 84, mozjpeg: true, progressive: true, chromaSubsampling: pb ? '4:4:4' : '4:2:0' })
  .toFile(saida)
console.log('ok', saida, W + 'x' + H)
