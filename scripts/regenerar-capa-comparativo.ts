// Regenera a imagem destacada de um post de comparação (dois carros no split
// com selo VS), usando o mesmo compositor do pipeline de blog-ai.
//
// Uso:
//   npx tsx scripts/regenerar-capa-comparativo.ts <slug>            # gera preview local
//   npx tsx scripts/regenerar-capa-comparativo.ts <slug> --apply    # sobe no bucket e atualiza o post
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// Carrega env ANTES de importar módulos que leem process.env
for (const file of ['.env.production.vps', '.env.local']) {
  const p = resolve(root, file)
  if (!existsSync(p)) continue
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) break
}

async function main() {
  const { createClient } = await import('@supabase/supabase-js')
  const { composeComparisonImage, composeComparisonFeaturedImage } = await import('../src/lib/blog-ai/comparison-image')

  const slug = process.argv[2]
  const apply = process.argv.includes('--apply')
  if (!slug) {
    console.error('Uso: npx tsx scripts/regenerar-capa-comparativo.ts <slug> [--apply]')
    process.exit(1)
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: post, error } = await supabase
    .from('dual_blog_posts')
    .select('id, title, content, featured_image')
    .eq('slug', slug)
    .single()
  if (error || !post) {
    console.error('Post não encontrado:', error?.message)
    process.exit(1)
  }
  console.log('Post:', post.title)

  // Fotos do conteúdo: intercaladas A,B — pega as duas primeiras de veículos
  // diferentes (o id do veículo aparece no caminho da foto do AutoConf).
  const imgUrls = [...post.content.matchAll(/<img[^>]+src="([^"]+)"/g)].map(m => m[1])
  const vehicleIdOf = (u: string) => u.match(/veiculos\/fotos\/(\d+)\//)?.[1] ?? u
  const photoA = imgUrls[0]
  const photoB = imgUrls.find(u => vehicleIdOf(u) !== vehicleIdOf(photoA))
  if (!photoA || !photoB) {
    console.error('Não achei fotos de dois carros distintos no conteúdo.')
    process.exit(1)
  }
  console.log('Carro A:', photoA)
  console.log('Carro B:', photoB)

  if (!apply) {
    const preview = await composeComparisonImage(photoA, photoB)
    const out = resolve(root, 'backups/preview-capa-comparativo.jpg')
    writeFileSync(out, preview)
    console.log('Preview salvo em:', out)
  } else {
    const url = await composeComparisonFeaturedImage(photoA, photoB, slug)
    if (!url) {
      console.error('Falha ao compor/subir a imagem.')
      process.exit(1)
    }
    const { error: upErr } = await supabase
      .from('dual_blog_posts')
      .update({ featured_image: url })
      .eq('id', post.id)
    if (upErr) {
      console.error('Falha ao atualizar o post:', upErr.message)
      process.exit(1)
    }
    console.log('Post atualizado. Nova featured_image:', url)
  }

}

main().catch(err => { console.error(err); process.exit(1) })
