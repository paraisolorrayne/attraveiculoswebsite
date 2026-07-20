import { describe, it, expect } from 'vitest'
import sharp from 'sharp'
import { maskMetrics, integrityScore, iou, evaluateCutouts } from '../rembg-quality'

/** Gera um PNG RGBA (carro opaco preto sobre fundo transparente) a partir de
 *  uma função que decide, por pixel normalizado, se é opaco. */
async function pngFrom(size: number, opaque: (x: number, y: number) => boolean): Promise<Buffer> {
  const buf = Buffer.alloc(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      buf[i + 3] = opaque(x / size, y / size) ? 255 : 0 // alpha
    }
  }
  return sharp(buf, { raw: { width: size, height: size, channels: 4 } }).png().toBuffer()
}

/** Cria um mask w×h e pinta um retângulo [x0,x1)×[y0,y1) como opaco (1). */
function rectMask(w: number, h: number, rects: Array<[number, number, number, number]>): Uint8Array {
  const m = new Uint8Array(w * h)
  for (const [x0, y0, x1, y1] of rects) {
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) m[y * w + x] = 1
  }
  return m
}

describe('maskMetrics', () => {
  it('bloco sólido: sem furos, um componente, cobertura correta', () => {
    // 10×10 grid, retângulo central 4×4 (16 px opacos de 100)
    const m = maskMetrics(rectMask(10, 10, [[3, 3, 7, 7]]), 10, 10)
    expect(m.coverage).toBeCloseTo(0.16, 5)
    expect(m.holeRatio).toBe(0)
    expect(m.largestFrac).toBe(1)
  })

  it('detecta furo interno (pixel arrancado do meio do carro)', () => {
    // retângulo 6×6 com um furo 1×1 no centro
    const mask = rectMask(12, 12, [[3, 3, 9, 9]])
    mask[6 * 12 + 6] = 0 // fura o meio
    const m = maskMetrics(mask, 12, 12)
    // bbox = 6×6 = 36; 1 furo → holeRatio = 1/36
    expect(m.holeRatio).toBeCloseTo(1 / 36, 5)
    expect(m.largestFrac).toBe(1) // opaco continua conectado ao redor do furo
  })

  it('transparente que toca a borda NÃO é furo', () => {
    // retângulo colado na borda esquerda, com um entalhe aberto na borda
    const mask = rectMask(10, 10, [[0, 2, 6, 8]])
    mask[4 * 10 + 0] = 0 // remove um pixel na coluna 0 (borda) → escapa pra fora
    const m = maskMetrics(mask, 10, 10)
    expect(m.holeRatio).toBe(0)
  })

  it('silhueta estilhaçada: largestFrac cai', () => {
    // dois blocos iguais e separados → maior componente = metade do opaco
    const m = maskMetrics(rectMask(20, 10, [[1, 3, 5, 7], [14, 3, 18, 7]]), 20, 10)
    expect(m.largestFrac).toBeCloseTo(0.5, 5)
  })

  it('mask vazio: tudo zero', () => {
    const m = maskMetrics(new Uint8Array(100), 10, 10)
    expect(m).toEqual({ coverage: 0, holeRatio: 0, largestFrac: 0 })
  })
})

describe('integrityScore', () => {
  it('recorte perfeito = 100', () => {
    expect(integrityScore({ coverage: 0.4, holeRatio: 0, largestFrac: 1 })).toBe(100)
  })

  it('cobertura baixíssima (carro apagado) = 0', () => {
    expect(integrityScore({ coverage: 0.01, holeRatio: 0, largestFrac: 1 })).toBe(0)
  })

  it('cobertura altíssima (fundo não removido) = 0', () => {
    expect(integrityScore({ coverage: 0.99, holeRatio: 0, largestFrac: 1 })).toBe(0)
  })

  it('furos penalizam a nota', () => {
    const s = integrityScore({ coverage: 0.4, holeRatio: 0.04, largestFrac: 1 })
    expect(s).toBeLessThan(100)
    expect(s).toBeGreaterThan(0)
  })

  it('fragmentação penaliza a nota', () => {
    expect(integrityScore({ coverage: 0.4, holeRatio: 0, largestFrac: 0.6 })).toBe(60)
  })
})

describe('iou', () => {
  it('masks idênticos = 1', () => {
    const a = rectMask(10, 10, [[2, 2, 8, 8]])
    expect(iou(a, a)).toBe(1)
  })

  it('masks disjuntos = 0', () => {
    const a = rectMask(10, 10, [[0, 0, 3, 3]])
    const b = rectMask(10, 10, [[7, 7, 10, 10]])
    expect(iou(a, b)).toBe(0)
  })

  it('sobreposição parcial conhecida', () => {
    // a = colunas 0..5, b = colunas 3..8, ambos linhas 0..10 (grid 10×10)
    const a = rectMask(10, 10, [[0, 0, 5, 10]]) // 50 px
    const b = rectMask(10, 10, [[3, 0, 8, 10]]) // 50 px
    // interseção colunas 3..5 = 2 col × 10 = 20; união = 50+50-20 = 80
    expect(iou(a, b)).toBeCloseTo(20 / 80, 5)
  })
})

describe('evaluateCutouts (decisão)', () => {
  it('sem nenhum recorte → rejeita', async () => {
    const r = await evaluateCutouts([null, null])
    expect(r.accepted).toBe(false)
    expect(r.bestBuffer).toBeNull()
    expect(r.score).toBe(0)
  })

  it('dois recortes bons e concordantes → aceita', async () => {
    // carro "sólido" ocupando ~40% (bloco central), idêntico nos dois modelos
    const car = (x: number, y: number) => x > 0.25 && x < 0.75 && y > 0.3 && y < 0.7
    const a = await pngFrom(200, car)
    const b = await pngFrom(200, car)
    const r = await evaluateCutouts([a, b], { minScore: 99, minAgreement: 90 })
    expect(r.score).toBe(100)
    expect(r.agreement).toBeGreaterThanOrEqual(95)
    expect(r.accepted).toBe(true)
    expect(r.bestBuffer).not.toBeNull()
  })

  it('modelos discordam muito → rejeita mesmo com integridade alta', async () => {
    // dois blocos sólidos (nota 100 cada) mas em posições distintas → IoU baixo
    const a = await pngFrom(200, (x, y) => x > 0.1 && x < 0.45 && y > 0.3 && y < 0.7)
    const b = await pngFrom(200, (x, y) => x > 0.55 && x < 0.9 && y > 0.3 && y < 0.7)
    const r = await evaluateCutouts([a, b], { minScore: 99, minAgreement: 90 })
    expect(r.score).toBe(100)
    expect(r.agreement).toBeLessThan(90)
    expect(r.accepted).toBe(false)
  })

  it('recorte estilhaçado (furos grandes) → rejeita pela integridade', async () => {
    // bloco com listras transparentes internas = pedaços arrancados do carro
    const holey = (x: number, y: number) =>
      x > 0.25 && x < 0.75 && y > 0.3 && y < 0.7 && Math.floor(y * 40) % 3 !== 0
    const a = await pngFrom(200, holey)
    const b = await pngFrom(200, holey)
    const r = await evaluateCutouts([a, b], { minScore: 99, minAgreement: 90 })
    expect(r.score).toBeLessThan(99)
    expect(r.accepted).toBe(false)
  })
})
