// Guarda: o módulo TS gerado precisa bater com o HTML fonte.
//
// Por que existe: content/admin/gerador-criativos.html é declarado como fonte
// da verdade, mas o arquivo GERADO já foi editado à mão pelo menos uma vez. Em
// 02/08/2026 os dois estavam dessincronizados em 72 linhas — o .ts em produção
// tinha o piso Pérola texturizado e o fonte tinha um gradiente sólido. Quem
// editasse o fonte e regenerasse reverteria produção sem perceber, porque nada
// avisava. Esta checagem transforma esse silêncio em erro.
//
// NÃO escreve nada: gera em memória e compara. Rodar num repositório de deploy
// não pode deixar arquivo modificado para trás.
import { readFileSync } from 'node:fs'
import { resolve, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const src = resolve(root, 'content/admin/gerador-criativos.html')
const out = resolve(root, 'src/app/api/admin/marketing/gerador-criativos/gerador-html.ts')

const banner = [
  '/* eslint-disable */',
  '// ARQUIVO GERADO — não editar manualmente.',
  '// Fonte: content/admin/gerador-criativos.html',
  '// Regenerar com: node scripts/gen-gerador-criativos.mjs',
  '',
].join('\n')

const html = readFileSync(src, 'utf8')
const esperado = `${banner}export const GERADOR_CRIATIVOS_HTML: string = ${JSON.stringify(html)}\n`

let atual
try {
  atual = readFileSync(out, 'utf8')
} catch {
  console.error(`ERRO: ${relative(root, out)} não existe. Rode: node scripts/gen-gerador-criativos.mjs`)
  process.exit(1)
}

if (atual === esperado) {
  console.log(`OK: ${relative(root, out)} está em dia com o HTML fonte.`)
  process.exit(0)
}

// Ajuda a entender O QUE divergiu, em vez de só dizer que divergiu.
const linhasEsperadas = esperado.split('\n').length
const linhasAtuais = atual.split('\n').length
console.error(`
ERRO: o gerador de criativos está DESSINCRONIZADO.

  fonte:  ${relative(root, src)}
  gerado: ${relative(root, out)}

  tamanho esperado: ${esperado.length} bytes (${linhasEsperadas} linhas)
  tamanho atual:    ${atual.length} bytes (${linhasAtuais} linhas)

O arquivo gerado não corresponde ao HTML fonte. Isso acontece quando alguém
edita o .ts diretamente — e o próximo que regenerar apaga essa edição sem
perceber.

Como resolver:
  - Se a mudança verdadeira está no HTML fonte:
      node scripts/gen-gerador-criativos.mjs && git add -A

  - Se a mudança verdadeira está no .ts (foi editado à mão), traga-a para o
    HTML fonte ANTES de regenerar, senão ela se perde. Para extrair o HTML
    que está no .ts:
      node -e "const s=require('fs').readFileSync('${relative(root, out)}','utf8').replace('export const GERADOR_CRIATIVOS_HTML: string =','globalThis.H =');eval(s);require('fs').writeFileSync('/tmp/gerado.html',globalThis.H)"
`)
process.exit(1)
