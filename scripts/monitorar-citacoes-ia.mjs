// Proxy automático do painel de AEO: roda os prompts de
// docs/seo/monitoramento/README.md na busca web da Jina (s.jina.ai) e mostra em
// que posição attraveiculos.com.br aparece. NÃO é a resposta de um assistente —
// é o que eles leem para responder. Uso:
//   JINA_API_KEY=... node scripts/monitorar-citacoes-ia.mjs [--md]
// Com --md imprime uma tabela Markdown para colar no arquivo do mês.
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const readme = readFileSync(resolve(root, 'docs/seo/monitoramento/README.md'), 'utf8')

// Lê os prompts da própria tabela do README: uma fonte só.
const prompts = readme
  .split('\n')
  .map(l => l.match(/^\|\s*(\d+)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|$/))
  .filter(Boolean)
  .map(m => ({ n: Number(m[1]), prompt: m[2].replace(/\s*\(en\)$/, ''), pagina: m[3] }))
  .filter(p => p.n >= 1 && p.n <= 22)

const key = process.env.JINA_API_KEY
if (!key) {
  console.error('JINA_API_KEY ausente (é a mesma do embeddings-sync no .env.production).')
  process.exit(1)
}
const md = process.argv.includes('--md')
const DOMINIO = 'attraveiculos.com.br'

async function buscar(q) {
  const r = await fetch(`https://s.jina.ai/?q=${encodeURIComponent(q)}`, {
    headers: { Authorization: `Bearer ${key}`, Accept: 'application/json', 'X-Respond-With': 'no-content' },
  })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  const j = await r.json()
  return (j.data ?? []).map(d => d.url)
}

const linhas = []
for (const p of prompts) {
  let posicao = '—', primeiros = ''
  try {
    const urls = await buscar(p.prompt)
    const i = urls.findIndex(u => u.includes(DOMINIO))
    posicao = i >= 0 ? `#${i + 1}` : 'ausente'
    primeiros = urls.slice(0, 3).map(u => new URL(u).hostname.replace(/^www\./, '')).join(', ')
  } catch (e) {
    posicao = `erro: ${e.message}`
  }
  linhas.push({ ...p, posicao, primeiros })
  if (!md) console.log(`${String(p.n).padStart(2)}  ${posicao.padEnd(8)}  ${p.prompt}  →  ${primeiros}`)
  await new Promise(r => setTimeout(r, 1200)) // respeita o rate limit
}

if (md) {
  console.log(`| # | Prompt | Posição na busca (Jina) | Top 3 |\n|---|---|---|---|`)
  for (const l of linhas) console.log(`| ${l.n} | ${l.prompt} | ${l.posicao} | ${l.primeiros} |`)
}
const citaveis = linhas.filter(l => l.posicao.startsWith('#')).length
console.error(`\n${DOMINIO} aparece em ${citaveis}/${linhas.length} buscas.`)
