// Gera o módulo TS com o HTML do Gerador de Criativos embutido como string.
// Fonte da verdade: content/admin/gerador-criativos.html
// Uso: node scripts/gen-gerador-criativos.mjs (rodar após editar o HTML)
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const src = resolve(root, 'content/admin/gerador-criativos.html')
const out = resolve(root, 'src/app/api/admin/marketing/gerador-criativos/gerador-html.ts')

const html = readFileSync(src, 'utf8')

const banner = [
  '/* eslint-disable */',
  '// ARQUIVO GERADO — não editar manualmente.',
  '// Fonte: content/admin/gerador-criativos.html',
  '// Regenerar com: node scripts/gen-gerador-criativos.mjs',
  '',
].join('\n')

writeFileSync(out, `${banner}export const GERADOR_CRIATIVOS_HTML: string = ${JSON.stringify(html)}\n`)
console.log(`OK: ${out} (${(html.length / 1024).toFixed(0)} KB)`)
