/**
 * Regenera as imagens destacadas dos posts de COMPARAÇÃO (VS) com o novo
 * enquadramento 'contain' (carro inteiro, sem cortar na divisa) — ver
 * src/lib/blog-ai/comparison-image.ts.
 *
 * Como funciona:
 *   - Acha os posts cujo featured_image é um composite de comparação
 *     (path '/comparisons/').
 *   - Extrai as 2 primeiras <img> do conteúdo — que são as fotos dos dois
 *     carros (A0 e B0, intercaladas na geração original).
 *   - Regenera a imagem VS e atualiza o featured_image do post.
 *
 * Uso (na VPS, DEPOIS do deploy que traz o código novo):
 *   npx tsx scripts/regenerate-comparison-images.ts --dry-run   # só mostra o que faria
 *   npx tsx scripts/regenerate-comparison-images.ts             # aplica
 *
 * As imagens antigas ficam órfãs no disco (inofensivo). Roda quantas vezes quiser.
 */
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

// Carrega env (.env.local em dev, .env.production em deploy) ANTES dos imports
// que leem process.env no top-level.
const envLocal = path.resolve(process.cwd(), '.env.local')
const envProd = path.resolve(process.cwd(), '.env.production')
if (fs.existsSync(envLocal)) dotenv.config({ path: envLocal })
else if (fs.existsSync(envProd)) dotenv.config({ path: envProd })

import { db } from '../src/lib/db'
import { composeComparisonFeaturedImage } from '../src/lib/blog-ai/comparison-image'

const DRY_RUN = process.argv.includes('--dry-run')

/** Primeiras N URLs de <img src="..."> do HTML, na ordem em que aparecem. */
function firstImageUrls(html: string, n: number): string[] {
  const urls: string[] = []
  const re = /<img[^>]+src=["']([^"']+)["']/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) && urls.length < n) urls.push(m[1])
  return urls
}

async function main() {
  if (DRY_RUN) console.log('[regen] MODO DRY-RUN — nada será alterado\n')

  const posts = await db
    .selectFrom('dual_blog_posts')
    .select(['id', 'slug', 'title', 'content', 'featured_image'])
    .where('featured_image', 'like', '%/comparisons/%')
    .execute()

  console.log(`[regen] ${posts.length} post(s) de comparação encontrados\n`)
  let ok = 0, skip = 0, fail = 0

  for (const p of posts) {
    const imgs = firstImageUrls(p.content ?? '', 2)
    if (imgs.length < 2 || imgs[0] === imgs[1]) {
      console.warn(`[regen] PULADO  "${p.slug}" — não achei 2 fotos distintas no conteúdo`)
      skip++
      continue
    }
    console.log(`[regen] ${p.slug}`)
    console.log(`         A: ${imgs[0]}`)
    console.log(`         B: ${imgs[1]}`)

    if (DRY_RUN) { skip++; continue }

    try {
      const novaUrl = await composeComparisonFeaturedImage(imgs[0], imgs[1], p.slug)
      if (!novaUrl) {
        console.warn(`         -> FALHOU (geração retornou null)\n`)
        fail++
        continue
      }
      await db.updateTable('dual_blog_posts')
        .set({ featured_image: novaUrl })
        .where('id', '=', p.id)
        .execute()
      console.log(`         -> OK: ${novaUrl}\n`)
      ok++
    } catch (e) {
      console.error(`         -> ERRO: ${e instanceof Error ? e.message : String(e)}\n`)
      fail++
    }
  }

  console.log(`\n[regen] concluído: ${ok} regenerado(s), ${skip} pulado(s), ${fail} falha(s)`)
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
