import sharp from 'sharp'
import { putObject } from '@/lib/storage/disk'
import { BLOG_IMAGES_BUCKET } from '@/lib/supabase/storage'

// Storage migrado p/ disco (Fase 6) — ver docs/MIGRACAO_POSTGRES_PURO.md.

// Imagem destacada para posts de comparação (dois carros): split 50/50 com
// divisor e selo "VS" nas cores da marca. 1200×630 (proporção OG/social).
//
// Best-effort: qualquer falha (download, sharp, upload) retorna null e o
// chamador usa a primeira foto como fallback — nunca bloqueia a geração.

const W = 1200
const H = 630
const HALF = W / 2
const ATTRA_RED = '#9a1c1c'

const VS_OVERLAY = Buffer.from(`
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect x="${HALF - 3}" y="0" width="6" height="${H}" fill="${ATTRA_RED}"/>
  <circle cx="${HALF}" cy="${H / 2}" r="58" fill="#101014" stroke="${ATTRA_RED}" stroke-width="5"/>
  <text x="${HALF}" y="${H / 2 + 17}" text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif" font-size="46"
        font-weight="800" fill="#ffffff" letter-spacing="2">VS</text>
</svg>`)

async function fetchImage(url: string): Promise<Buffer> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20_000)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status} ao baixar ${url}`)
    return Buffer.from(await res.arrayBuffer())
  } finally {
    clearTimeout(timeout)
  }
}

/** Fração dos pixels de uma região (a partir do canto inferior direito) que são vermelho de faixa. */
async function fracaoVermelhaNoCanto(foto: Buffer, fracLargura: number, fracAltura: number): Promise<number> {
  const { width = 0, height = 0 } = await sharp(foto).metadata()
  const w = Math.max(1, Math.round(width * fracLargura))
  const h = Math.max(1, Math.round(height * fracAltura))
  const { data, info } = await sharp(foto)
    .extract({ left: width - w, top: height - h, width: w, height: h })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  let vermelhos = 0
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i], g = data[i + 1], b = data[i + 2]
    if (r > 130 && r > g * 2.2 && r > b * 2.2) vermelhos++
  }
  return vermelhos / (info.width * info.height)
}

/**
 * A foto tem a faixa vermelha de anúncio ("PPF FULL", "EDIÇÃO ESPECIAL…") no
 * canto inferior direito? Ela vem gravada na própria foto do estoque, colada
 * na borda direita, logo abaixo do carro.
 *
 * Duas condições porque só a cor confundiria com carro vermelho: a faixa ENCOSTA
 * na borda, o carro não (as fotos da loja têm margem). Calibrado em 30/09/2026
 * com 12 fotos reais: com faixa, ~12% do canto e ~15% da borda; sem, no máximo
 * 0,8% e 0% (a McLaren laranja-avermelhada incluída).
 */
export async function temFaixaNoCanto(foto: Buffer): Promise<boolean> {
  const [canto, borda] = await Promise.all([
    fracaoVermelhaNoCanto(foto, 0.45, 0.3),
    fracaoVermelhaNoCanto(foto, 0.02, 0.3),
  ])
  return canto >= 0.05 && borda >= 0.08
}

/**
 * Monta o JPEG 1200×630 com os dois carros lado a lado.
 *
 * Todas as fotos da loja são feitas com a frente do carro para a ESQUERDA. Por
 * isso a foto da esquerda é espelhada: os dois carros ficam de frente um para
 * o outro, olhando para o selo VS. Exceção: foto com faixa de anúncio, que
 * espelhada mostraria o texto ao contrário — essa fica como está.
 */
export async function composeComparisonImage(photoUrlA: string, photoUrlB: string): Promise<Buffer> {
  const [rawA, rawB] = await Promise.all([fetchImage(photoUrlA), fetchImage(photoUrlB)])
  const espelharA = !(await temFaixaNoCanto(rawA))

  // 'contain' (não 'cover'): mostra o carro INTEIRO, sem cortar nas laterais/divisa.
  // O que sobra vira faixa na cor do fundo do card (#101014), parecendo intencional.
  const bg = { r: 16, g: 16, b: 20, alpha: 1 }
  const [left, right] = await Promise.all([
    sharp(rawA).flop(espelharA).resize(HALF, H, { fit: 'contain', background: bg }).toBuffer(),
    sharp(rawB).resize(HALF, H, { fit: 'contain', background: bg }).toBuffer(),
  ])

  return sharp({ create: { width: W, height: H, channels: 3, background: '#101014' } })
    .composite([
      { input: left, left: 0, top: 0 },
      { input: right, left: HALF, top: 0 },
      { input: VS_OVERLAY, left: 0, top: 0 },
    ])
    .jpeg({ quality: 84 })
    .toBuffer()
}

/**
 * Gera a imagem destacada de comparação e sobe no bucket do blog.
 * Retorna a URL pública, ou null em qualquer falha (caller usa fallback).
 */
export async function composeComparisonFeaturedImage(
  photoUrlA: string | undefined,
  photoUrlB: string | undefined,
  slugHint: string,
): Promise<string | null> {
  if (!photoUrlA || !photoUrlB) return null
  try {
    const jpeg = await composeComparisonImage(photoUrlA, photoUrlB)

    const safeSlug = slugHint.toLowerCase().replace(/[^a-z0-9-]+/g, '-').slice(0, 80)
    const path = `comparisons/${safeSlug}-${Date.now()}.jpg`

    const publicUrl = await putObject(BLOG_IMAGES_BUCKET, path, jpeg)
    console.log('[ComparisonImage] Gerada:', publicUrl)
    return publicUrl
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn('[ComparisonImage] Falhou, usando fallback de foto única:', msg)
    return null
  }
}
