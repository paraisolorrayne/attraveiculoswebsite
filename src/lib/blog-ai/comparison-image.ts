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

/** Monta o JPEG 1200×630 com os dois carros lado a lado. */
export async function composeComparisonImage(photoUrlA: string, photoUrlB: string): Promise<Buffer> {
  const [rawA, rawB] = await Promise.all([fetchImage(photoUrlA), fetchImage(photoUrlB)])

  const [left, right] = await Promise.all([
    sharp(rawA).resize(HALF, H, { fit: 'cover', position: 'attention' }).toBuffer(),
    sharp(rawB).resize(HALF, H, { fit: 'cover', position: 'attention' }).toBuffer(),
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
