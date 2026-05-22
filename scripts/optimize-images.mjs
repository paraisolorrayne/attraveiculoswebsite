/**
 * Otimiza imagens grandes em public/ — comprime in-place mantendo o formato
 * (.jpg/.png), sem mudar nenhuma referência no código.
 *
 * Por quê: originais de 2-7MB (logo 3.3MB, fotos de showroom) deixam o Next
 * Image lento — ele precisa ler/processar o original gigante toda vez que o
 * cache de 24h expira. Reduzir o peso do original acelera tudo. O Next
 * continua entregando WebP/AVIF pro browser automaticamente.
 *
 * O que faz, pra cada imagem > THRESHOLD:
 *   - Resize se largura > MAX_WIDTH (ninguém precisa de mais que retina 2x)
 *   - Re-encode: JPEG mozjpeg q82 / PNG compressão máxima + paleta
 *   - Só sobrescreve se o resultado for MENOR (nunca piora)
 *
 * Uso:  node scripts/optimize-images.mjs            (aplica)
 *       node scripts/optimize-images.mjs --dry-run  (só mostra o que faria)
 *
 * Reversível: imagens são tracked no git → `git checkout public/` desfaz.
 */

import sharp from 'sharp'
import { readdir, stat, writeFile, readFile } from 'fs/promises'
import { join, extname } from 'path'

const PUBLIC_DIR = 'public'
const SIZE_THRESHOLD = 500 * 1024 // 500 KB — só mexe em imagens acima disso
const MAX_WIDTH = 2400 // largura máxima (retina 2x de um container ~1200px)
const JPEG_QUALITY = 82
const DRY_RUN = process.argv.includes('--dry-run')

// Pastas a ignorar (assets que não devem ser tocados)
const SKIP_DIRS = new Set(['blog-old']) // imagens legadas do WordPress

const exts = new Set(['.jpg', '.jpeg', '.png'])

async function* walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      yield* walk(full)
    } else if (exts.has(extname(entry.name).toLowerCase())) {
      yield full
    }
  }
}

function fmtKB(bytes) {
  return `${(bytes / 1024).toFixed(0)} KB`
}

async function optimizeOne(path) {
  const original = await readFile(path)
  if (original.length < SIZE_THRESHOLD) return null

  const ext = extname(path).toLowerCase()
  const img = sharp(original, { failOn: 'none' })
  const meta = await img.metadata()

  let pipeline = img
  let resized = false
  if (meta.width && meta.width > MAX_WIDTH) {
    pipeline = pipeline.resize({ width: MAX_WIDTH, withoutEnlargement: true })
    resized = true
  }

  if (ext === '.jpg' || ext === '.jpeg') {
    pipeline = pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
  } else if (ext === '.png') {
    // compressionLevel 9 + palette quando possível (logos/ilustrações)
    pipeline = pipeline.png({ compressionLevel: 9, palette: true })
  }

  const output = await pipeline.toBuffer()

  // Só aceita se reduziu (nunca piora o arquivo)
  if (output.length >= original.length) {
    return {
      path,
      before: original.length,
      after: original.length,
      resized,
      skipped: true,
    }
  }

  if (!DRY_RUN) {
    await writeFile(path, output)
  }

  return {
    path,
    before: original.length,
    after: output.length,
    resized,
    skipped: false,
  }
}

async function main() {
  console.log(`[optimize-images] ${DRY_RUN ? 'DRY-RUN (nada será escrito)' : 'Aplicando otimização'}`)
  console.log(`[optimize-images] Threshold: ${fmtKB(SIZE_THRESHOLD)} | Max width: ${MAX_WIDTH}px | JPEG q${JPEG_QUALITY}\n`)

  let totalBefore = 0
  let totalAfter = 0
  let count = 0

  for await (const path of walk(PUBLIC_DIR)) {
    const result = await optimizeOne(path)
    if (!result) continue

    totalBefore += result.before
    totalAfter += result.after

    if (result.skipped) {
      console.log(`  ~ ${path} — ${fmtKB(result.before)} (já otimizado, mantido)`)
    } else {
      const pct = (100 * (1 - result.after / result.before)).toFixed(0)
      count++
      console.log(`  ✓ ${path} — ${fmtKB(result.before)} → ${fmtKB(result.after)} (-${pct}%)${result.resized ? ' [resized]' : ''}`)
    }
  }

  const savedKB = (totalBefore - totalAfter) / 1024
  console.log('\n[optimize-images] ────────────────────────────────────────')
  console.log(`  Imagens otimizadas:  ${count}`)
  console.log(`  Economia total:      ${(savedKB / 1024).toFixed(1)} MB`)
  console.log('[optimize-images] ────────────────────────────────────────')
}

main().catch((err) => {
  console.error('[optimize-images] Erro:', err)
  process.exit(1)
})
