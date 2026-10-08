import sharp from 'sharp'
import { putObject } from '@/lib/storage/disk'
import { BLOG_IMAGES_BUCKET } from '@/lib/supabase/storage'

// Storage migrado p/ disco (Fase 6) — ver docs/MIGRACAO_POSTGRES_PURO.md.

// Imagem destacada para posts de comparação (dois carros): split 50/50 com
// divisor e selo "VS" nas cores da marca. 2400×1260 (proporção OG/social),
// em 2× para continuar nítida quando exibida em telas de alta densidade.
//
// Best-effort: qualquer falha (download, sharp, upload) retorna null e o
// chamador usa a primeira foto como fallback — nunca bloqueia a geração.

const W = 2400
const H = 1260
const OUTER_PADDING = 90
const GAP = 100
const PANEL_W = (W - OUTER_PADDING * 2 - GAP) / 2
const PANEL_H = Math.round(PANEL_W * 0.75)
const PANEL_TOP = Math.round((H - PANEL_H) / 2)
const RIGHT_PANEL_LEFT = OUTER_PADDING + PANEL_W + GAP
const ATTRA_RED = '#9a1c1c'

const VS_OVERLAY = Buffer.from(`
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect x="${OUTER_PADDING}" y="${PANEL_TOP}" width="${PANEL_W}" height="${PANEL_H}" rx="20" fill="none" stroke="#34343b" stroke-width="2"/>
  <rect x="${RIGHT_PANEL_LEFT}" y="${PANEL_TOP}" width="${PANEL_W}" height="${PANEL_H}" rx="20" fill="none" stroke="#34343b" stroke-width="2"/>
  <path d="M${OUTER_PADDING + PANEL_W + 20} ${H / 2}H${RIGHT_PANEL_LEFT - 20}" stroke="${ATTRA_RED}" stroke-width="4"/>
  <circle cx="${W / 2}" cy="${H / 2}" r="58" fill="#101014" stroke="${ATTRA_RED}" stroke-width="5"/>
  <text x="${W / 2}" y="${H / 2 + 17}" text-anchor="middle"
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

/**
 * Monta o JPEG com os dois carros lado a lado.
 *
 * As fotos NUNCA são espelhadas, retocadas ou geradas por IA. Em vez de
 * forçar dois carros a se encararem com um reflexo que inverteria placas,
 * logos e textos, a capa usa dois painéis editoriais e um selo VS. Assim cada
 * veículo, inclusive o cenário original, permanece fiel à foto do estoque.
 */
export async function composeComparisonBuffers(rawA: Buffer, rawB: Buffer): Promise<Buffer> {
  // 'contain' preserva a foto inteira. Cada painel mantém a proporção 4:3,
  // típica das fotos do estoque, e o fundo só aparece em imagens fora dela.
  const bg = { r: 16, g: 16, b: 20, alpha: 1 }
  const [left, right] = await Promise.all([
    sharp(rawA).resize(PANEL_W, PANEL_H, { fit: 'contain', background: bg }).toBuffer(),
    sharp(rawB).resize(PANEL_W, PANEL_H, { fit: 'contain', background: bg }).toBuffer(),
  ])

  return sharp({ create: { width: W, height: H, channels: 3, background: '#101014' } })
    .composite([
      { input: left, left: OUTER_PADDING, top: PANEL_TOP },
      { input: right, left: RIGHT_PANEL_LEFT, top: PANEL_TOP },
      { input: VS_OVERLAY, left: 0, top: 0 },
    ])
    .jpeg({ quality: 88 })
    .toBuffer()
}

export async function composeComparisonImage(photoUrlA: string, photoUrlB: string): Promise<Buffer> {
  const [rawA, rawB] = await Promise.all([fetchImage(photoUrlA), fetchImage(photoUrlB)])
  return composeComparisonBuffers(rawA, rawB)
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
