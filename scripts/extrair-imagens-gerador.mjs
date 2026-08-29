// Uso único: tira as imagens embutidas do HTML do gerador e grava em
// public/gerador/. Depois de rodar, o HTML passa a referenciá-las por URL —
// 1,04 MB de base64 que o iframe baixava a cada abertura viram arquivos que o
// navegador cacheia. Removido na última etapa da conversão para React.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const html = readFileSync(resolve(root, 'content/admin/gerador-criativos.html'), 'utf8')
mkdirSync(resolve(root, 'public/gerador'), { recursive: true })

const ALVOS = [
  { nome: 'logo-branca.png',      re: /class="hdr-logo" src="data:image\/png;base64,([^"]+)"/ },
  { nome: 'logo-preta.jpg',       re: /blackLogoImg\.src = 'data:image\/jpeg;base64,([^']+)'/ },
  { nome: 'fundo-editorial.jpg',  re: /edFundoImg\.src = 'data:image\/jpeg;base64,([^']+)'/ },
  { nome: 'fachada-classico.jpg', re: /facadeClassicoImg\.src = 'data:image\/jpeg;base64,([^']+)'/ },
  { nome: 'fachada-loja.jpg',     re: /facadeImg\.src = 'data:image\/jpeg;base64,([^']+)'/ },
  { nome: 'piso-concreto.jpg',    re: /concreto: 'data:image\/jpeg;base64,([^']+)'/ },
  { nome: 'piso-asfalto.jpg',     re: /asfalto: 'data:image\/jpeg;base64,([^']+)'/ },
]

for (const { nome, re } of ALVOS) {
  const m = html.match(re)
  if (!m) throw new Error(`não achei o base64 de ${nome}`)
  const bytes = Buffer.from(m[1], 'base64')
  writeFileSync(resolve(root, 'public/gerador', nome), bytes)
  console.log(`${nome.padEnd(24)} ${(m[1].length / 1024).toFixed(0).padStart(4)} KB base64 → ${(bytes.length / 1024).toFixed(0).padStart(4)} KB`)
}
