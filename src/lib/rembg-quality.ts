/**
 * rembg-quality — porteiro de qualidade do recorte de fundo (Replicate).
 *
 * **Por que existir:** os modelos de remoção de fundo (BiRefNet, BRIA) NÃO
 * devolvem nenhuma nota de confiança — só um PNG com canal alpha. Às vezes
 * eles "comem" partes do carro (lataria escura, rodas, vidro reflexivo),
 * deixando buracos ou estilhaçando a silhueta. Em produção isso denigre a
 * imagem da Attra. Este módulo transforma o alpha do PNG numa **nota de
 * integridade 0-100** e, rodando DOIS modelos, mede a **concordância (IoU)**
 * entre eles — quando duas arquiteturas independentes concordam na silhueta,
 * a confiança é alta; quando divergem, uma delas cortou algo.
 *
 * Gate (agressivo, por decisão de produto): aceita o recorte só se a melhor
 * integridade >= REMBG_MIN_SCORE (default 99) E — havendo dois recortes — a
 * concordância >= REMBG_MIN_AGREEMENT (default 90). Caso contrário, o
 * chamador usa a foto ORIGINAL, sem recorte.
 *
 * As funções de geometria (maskMetrics, iou, integrityScore) são puras e
 * testadas em src/lib/__tests__/rembg-quality.test.ts. O sharp só aparece
 * na borda (decodeToMask), decodificando o PNG num mask binário.
 */
import sharp from 'sharp'

/** Resolução do mask normalizado — os dois recortes viram grids desse tamanho
 *  (fit:'fill') pra que o IoU compare pixel a pixel alinhado. A distorção de
 *  proporção não afeta as razões nem a concordância. */
export const MASK_SIZE = 256

/** Fração de buracos (área de furos / área do bounding box do carro) que zera
 *  o holePenalty. 8% de furos internos já é um recorte claramente estragado. */
const HOLE_FULL = 0.08

/** Cobertura (área opaca / área total) válida. Abaixo → o modelo apagou o
 *  carro; acima → praticamente não removeu fundo. Ambos são suspeitos. */
const COVERAGE_MIN = 0.03
const COVERAGE_MAX = 0.97

export interface MaskMetrics {
  /** área opaca / área total (0..1) */
  coverage: number
  /** área de furos internos / área do bounding box do opaco (0..1) */
  holeRatio: number
  /** fração do opaco que está no maior componente conectado (0..1);
   *  carro íntegro ≈ 1, silhueta estilhaçada < 1 */
  largestFrac: number
}

export interface CutoutEvaluation {
  /** PNG (buffer) do melhor recorte, ou null se nenhum modelo respondeu */
  bestBuffer: Buffer | null
  /** true se o recorte passou no gate; false → usar a foto original */
  accepted: boolean
  /** nota de integridade 0-100 do melhor recorte */
  score: number
  /** concordância IoU 0-100 entre os dois modelos; null se só um respondeu */
  agreement: number | null
  /** motivo legível (log/UI) */
  reason: string
  /** limites efetivamente aplicados */
  minScore: number
  minAgreement: number
}

/**
 * Estatísticas de integridade de um mask binário (1 = opaco/carro, 0 = fundo).
 * Puro — sem I/O. `mask` tem comprimento w*h, indexado por y*w + x.
 */
export function maskMetrics(mask: Uint8Array, w: number, h: number): MaskMetrics {
  const total = w * h
  let opaque = 0
  let minX = w, maxX = -1, minY = h, maxY = -1
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (mask[y * w + x]) {
        opaque++
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }

  if (opaque === 0) {
    return { coverage: 0, holeRatio: 0, largestFrac: 0 }
  }

  const coverage = opaque / total

  // Maior componente conectado do opaco (4-conexo, BFS com stack explícita).
  const seen = new Uint8Array(total)
  const stack = new Int32Array(total)
  let largest = 0
  for (let i = 0; i < total; i++) {
    if (!mask[i] || seen[i]) continue
    let sp = 0
    stack[sp++] = i
    seen[i] = 1
    let size = 0
    while (sp > 0) {
      const p = stack[--sp]
      size++
      const px = p % w
      const py = (p / w) | 0
      if (px > 0 && mask[p - 1] && !seen[p - 1]) { seen[p - 1] = 1; stack[sp++] = p - 1 }
      if (px < w - 1 && mask[p + 1] && !seen[p + 1]) { seen[p + 1] = 1; stack[sp++] = p + 1 }
      if (py > 0 && mask[p - w] && !seen[p - w]) { seen[p - w] = 1; stack[sp++] = p - w }
      if (py < h - 1 && mask[p + w] && !seen[p + w]) { seen[p + w] = 1; stack[sp++] = p + w }
    }
    if (size > largest) largest = size
  }
  const largestFrac = largest / opaque

  // Buracos internos: flood-fill do FUNDO (transparente) a partir das bordas.
  // Todo transparente NÃO alcançado = cercado por opaco = furo dentro do carro.
  const outside = new Uint8Array(total)
  let sp2 = 0
  const seed = (i: number) => { if (!mask[i] && !outside[i]) { outside[i] = 1; stack[sp2++] = i } }
  for (let x = 0; x < w; x++) { seed(x); seed((h - 1) * w + x) }
  for (let y = 0; y < h; y++) { seed(y * w); seed(y * w + w - 1) }
  while (sp2 > 0) {
    const p = stack[--sp2]
    const px = p % w
    const py = (p / w) | 0
    if (px > 0 && !mask[p - 1] && !outside[p - 1]) { outside[p - 1] = 1; stack[sp2++] = p - 1 }
    if (px < w - 1 && !mask[p + 1] && !outside[p + 1]) { outside[p + 1] = 1; stack[sp2++] = p + 1 }
    if (py > 0 && !mask[p - w] && !outside[p - w]) { outside[p - w] = 1; stack[sp2++] = p - w }
    if (py < h - 1 && !mask[p + w] && !outside[p + w]) { outside[p + w] = 1; stack[sp2++] = p + w }
  }
  let holes = 0
  for (let i = 0; i < total; i++) if (!mask[i] && !outside[i]) holes++
  const bboxArea = (maxX - minX + 1) * (maxY - minY + 1)
  const holeRatio = bboxArea > 0 ? holes / bboxArea : 0

  return { coverage, holeRatio, largestFrac }
}

/**
 * Nota de integridade 0-100 a partir das métricas. Pura.
 * Cobertura fora da faixa → 0 (carro apagado ou fundo não removido).
 * Senão: 100 × largestFrac × holePenalty, onde holePenalty cai linearmente
 * até 0 quando os furos atingem HOLE_FULL do bounding box.
 */
export function integrityScore(m: MaskMetrics): number {
  if (m.coverage < COVERAGE_MIN || m.coverage > COVERAGE_MAX) return 0
  const holePenalty = 1 - Math.min(m.holeRatio / HOLE_FULL, 1)
  return Math.round(100 * m.largestFrac * holePenalty)
}

/** Intersection-over-Union de dois masks binários de mesmo comprimento (0..1). */
export function iou(a: Uint8Array, b: Uint8Array): number {
  let inter = 0, union = 0
  const n = Math.min(a.length, b.length)
  for (let i = 0; i < n; i++) {
    const ai = a[i], bi = b[i]
    if (ai && bi) inter++
    if (ai || bi) union++
  }
  return union === 0 ? 0 : inter / union
}

/** Decodifica um PNG recortado num mask binário MASK_SIZE×MASK_SIZE (alpha>128). */
export async function decodeToMask(png: Buffer): Promise<Uint8Array> {
  const { data } = await sharp(png)
    .ensureAlpha()
    .resize(MASK_SIZE, MASK_SIZE, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true })
  const n = MASK_SIZE * MASK_SIZE
  const mask = new Uint8Array(n)
  for (let i = 0; i < n; i++) mask[i] = data[i * 4 + 3] > 128 ? 1 : 0
  return mask
}

function envInt(name: string, fallback: number): number {
  const v = parseInt(process.env[name] ?? '', 10)
  return Number.isFinite(v) ? v : fallback
}

/**
 * Avalia os recortes dos dois modelos e decide aceite/rejeição.
 *
 * @param buffers PNGs dos modelos (ordem = ordem dos modelos); null = o modelo
 *                falhou/timeout. Passe [buf] pra avaliar um só.
 * @param opts    limites; default lê REMBG_MIN_SCORE (99) e REMBG_MIN_AGREEMENT (90).
 */
export async function evaluateCutouts(
  buffers: (Buffer | null)[],
  opts?: { minScore?: number; minAgreement?: number },
): Promise<CutoutEvaluation> {
  const minScore = opts?.minScore ?? envInt('REMBG_MIN_SCORE', 99)
  const minAgreement = opts?.minAgreement ?? envInt('REMBG_MIN_AGREEMENT', 90)

  const decoded = await Promise.all(
    buffers.map(async (b) => {
      if (!b) return null
      try {
        const mask = await decodeToMask(b)
        return { buf: b, mask, score: integrityScore(maskMetrics(mask, MASK_SIZE, MASK_SIZE)) }
      } catch {
        return null
      }
    }),
  )
  const cands = decoded.filter((d): d is NonNullable<typeof d> => d !== null)

  if (cands.length === 0) {
    return {
      bestBuffer: null, accepted: false, score: 0, agreement: null,
      reason: 'nenhum modelo retornou recorte válido', minScore, minAgreement,
    }
  }

  const best = cands.reduce((a, c) => (c.score > a.score ? c : a))
  const agreement = cands.length >= 2
    ? Math.round(100 * iou(cands[0].mask, cands[1].mask))
    : null

  const scoreOk = best.score >= minScore
  const agreementOk = agreement === null ? true : agreement >= minAgreement
  const accepted = scoreOk && agreementOk

  let reason: string
  if (accepted) {
    reason = agreement === null
      ? `aceito — integridade ${best.score}% (modelo único)`
      : `aceito — integridade ${best.score}%, concordância ${agreement}%`
  } else if (!scoreOk) {
    reason = `rejeitado — integridade ${best.score}% < ${minScore}%`
  } else {
    reason = `rejeitado — concordância ${agreement}% < ${minAgreement}%`
  }

  return { bestBuffer: best.buf, accepted, score: best.score, agreement, reason, minScore, minAgreement }
}
