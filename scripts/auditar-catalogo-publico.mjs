// Auditoria do catálogo como um robô o vê: HTML do servidor, sem executar JS.
//
// Existe por causa do handoff "Attra × ChatGPT Search" (20/10/2026), que pediu
// as regras da seção 11 num teste repetível. Na primeira rodada ele achou:
// /sitemap.xml em 500, a paginação de /veiculos em botão (o robô via 12 dos 68
// carros) e a FAQ do 911 GTS com a ficha do Carrera base (385 cv, 2.981 cc).
//
// Uso:
//   node scripts/auditar-catalogo-publico.mjs                       # produção
//   node scripts/auditar-catalogo-publico.mjs http://127.0.0.1:3000 # build local
//   node scripts/auditar-catalogo-publico.mjs --json                # saída para CI
//
// Sai com código 1 quando há FALHA (AVISO não muda o código). Não precisa de
// credencial nem de dependência: só fetch, expressão regular e o leitor de
// robots.txt do próprio repositório (scripts/lib/robots-txt.mjs).

import { decidir, lerRobots } from './lib/robots-txt.mjs'

const args = process.argv.slice(2)
const BASE = (args.find(a => /^https?:\/\//.test(a)) ?? 'https://attraveiculos.com.br').replace(/\/$/, '')
const JSON_OUT = args.includes('--json')
const UA = 'Attra-Auditoria-Catalogo/1.0 (+https://attraveiculos.com.br)'
// O canonical sai com o domínio de produção mesmo num build local.
const CANONICAL_BASE = 'https://attraveiculos.com.br'

const falhas = []
const avisos = []
const falha = (onde, msg) => falhas.push({ onde, msg })
const aviso = (onde, msg) => avisos.push({ onde, msg })

async function buscar(caminho) {
  const url = caminho.startsWith('http') ? caminho : `${BASE}${caminho}`
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'manual' })
    return { status: r.status, tipo: r.headers.get('content-type') ?? '', corpo: await r.text(), local: r.headers.get('location') }
  } catch (err) {
    return { status: 0, tipo: '', corpo: '', erro: String(err) }
  }
}

/** Caminho relativo à base, para comparar produção e build local. */
const caminhoDe = url => url.replace(/^https?:\/\/[^/]+/, '')

const texto = html => html
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

function jsonLd(html) {
  const nos = []
  for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const dado = JSON.parse(m[1])
      const fila = Array.isArray(dado) ? [...dado] : [dado]
      while (fila.length) {
        const no = fila.shift()
        if (!no || typeof no !== 'object') continue
        nos.push(no)
        if (Array.isArray(no['@graph'])) fila.push(...no['@graph'])
      }
    } catch {
      nos.push({ '@type': '__invalido__' })
    }
  }
  return nos
}

const temTipo = (no, tipo) => [].concat(no['@type'] ?? []).includes(tipo)
const meta = (html, re) => html.match(re)?.[1] ?? null

const normalizar = s => (s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()

// --- 1. robots e sitemaps ---------------------------------------------------

// Os robôs que trazem visita: busca orgânica e ChatGPT. O GPTBot (treinamento)
// fica de fora de propósito — liberar ou bloquear é decisão da Attra.
const ROBOS_DE_BUSCA = ['OAI-SearchBot', 'ChatGPT-User', 'Googlebot', 'Bingbot']

const robots = await buscar('/robots.txt')
// Lido como os robôs leem (RFC 9309): um grupo por nome substitui o `*` inteiro.
const regras = lerRobots(robots.status === 200 ? robots.corpo : '')
if (robots.status !== 200) falha('/robots.txt', `HTTP ${robots.status}`)
else {
  if (!/^text\/plain/.test(robots.tipo)) aviso('/robots.txt', `Content-Type ${robots.tipo || 'ausente'}`)
  if (!/^sitemap:/im.test(robots.corpo)) falha('/robots.txt', 'sem linha Sitemap')
  if (regras.outras.some(o => o.campo === 'host')) aviso('/robots.txt', 'linha Host: (não é diretiva do protocolo)')
  for (const robo of ROBOS_DE_BUSCA) {
    for (const c of ['/', '/veiculos']) {
      if (!decidir(regras, robo, c).permitido) falha('/robots.txt', `${robo} bloqueado em ${c}`)
    }
    // Restrição que some não derruba o site, mas é regressão do handoff de 21/10.
    for (const c of ['/admin/', '/private/', '/api/auditoria-robots', '/auditoria.json']) {
      if (decidir(regras, robo, c).permitido) aviso('/robots.txt', `${robo} pode rastrear ${c}`)
    }
  }
}

const indice = await buscar('/sitemap.xml')
let subSitemaps = []
if (indice.status !== 200) {
  falha('/sitemap.xml', `HTTP ${indice.status} — o índice que o robots.txt anuncia não abre`)
  subSitemaps = ['/sitemap-pages.xml', '/sitemap-blog.xml', '/sitemap-estoque.xml', '/sitemap-manual.xml']
} else {
  subSitemaps = [...indice.corpo.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => caminhoDe(m[1]))
}

const urlsPorSitemap = {}
for (const s of subSitemaps) {
  const r = await buscar(s)
  if (r.status !== 200 || !/xml/.test(r.tipo)) {
    falha(s, `HTTP ${r.status} (${r.tipo || 'sem tipo'})`)
    continue
  }
  if (!/<urlset[\s>]/.test(r.corpo) || !/<\/urlset>\s*$/.test(r.corpo)) falha(s, 'XML sem <urlset> completo')
  urlsPorSitemap[s] = [...r.corpo.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1])
  if (/<lastmod>\s*<\/lastmod>/.test(r.corpo)) aviso(s, 'lastmod vazio')
  const futuras = [...r.corpo.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].filter(m => Date.parse(m[1]) > Date.now() + 86_400_000)
  if (futuras.length) aviso(s, `${futuras.length} lastmod no futuro (ex.: ${futuras[0][1]})`)
}

// Toda URL do sitemap no domínio canônico e liberada para quem busca: sitemap
// que anuncia URL bloqueada no robots é sinal contraditório para o robô.
for (const [s, urls] of Object.entries(urlsPorSitemap)) {
  for (const url of urls) {
    if (url !== CANONICAL_BASE && !url.startsWith(`${CANONICAL_BASE}/`)) falha(s, `URL fora do domínio canônico: ${url}`)
    const caminho = caminhoDe(url) || '/'
    const bloqueadoPara = ROBOS_DE_BUSCA.find(robo => !decidir(regras, robo, caminho).permitido)
    if (bloqueadoPara) falha(s, `${caminho} está no sitemap e bloqueada no robots.txt para ${bloqueadoPara}`)
  }
}

const fichas = (urlsPorSitemap['/sitemap-estoque.xml'] ?? []).map(caminhoDe)
if (fichas.length === 0) falha('/sitemap-estoque.xml', 'nenhuma ficha listada')

// --- 2. listagem sem JS ------------------------------------------------------
// Segue só <a href> de paginação, como um robô que não clica em botão.

const precoNaListagem = new Map()
const achadasNaListagem = new Set()
const fila = ['/veiculos']
const visitadas = new Set()
while (fila.length && visitadas.size < 30) {
  const pagina = fila.shift()
  if (visitadas.has(pagina)) continue
  visitadas.add(pagina)
  const r = await buscar(pagina)
  if (r.status !== 200) { falha(pagina, `HTTP ${r.status}`); continue }
  for (const m of r.corpo.matchAll(/href="(\/veiculo\/[^"?#]+)"/g)) achadasNaListagem.add(m[1])
  for (const m of r.corpo.matchAll(/href="(\/veiculos\?pagina=\d+)"/g)) {
    if (!visitadas.has(m[1])) fila.push(m[1])
  }
  for (const no of jsonLd(r.corpo)) {
    if (!temTipo(no, 'ItemList')) continue
    for (const el of no.itemListElement ?? []) {
      const item = el.item ?? {}
      if (item.url && item.offers?.price != null) precoNaListagem.set(caminhoDe(item.url), Number(item.offers.price))
    }
  }
  const canonical = meta(r.corpo, /<link rel="canonical" href="([^"]+)"/)
  const esperado = `${CANONICAL_BASE}${pagina}`
  if (pagina !== '/veiculos' && canonical !== esperado) {
    aviso(pagina, `canonical ${canonical ?? 'ausente'} (página de listagem deveria apontar para si mesma)`)
  }
}
const naoAlcancadas = fichas.filter(f => !achadasNaListagem.has(f))
if (fichas.length && naoAlcancadas.length) {
  aviso('/veiculos', `${naoAlcancadas.length} de ${fichas.length} fichas do sitemap não têm <a href> a partir da listagem (${visitadas.size} página(s) lidas sem JS)`)
}

// --- 3. cada ficha -----------------------------------------------------------

// FAQ com número de motor que o anúncio não tem: cilindrada e 0–100 nunca vêm
// do feed, então qualquer valor desses na FAQ veio de ficha de referência.
const SPEC_INVENTADA = /\d[\d.]*\s*(cc|cm³|cm3)\b|0\s*(a|–|-)\s*100\s*km\/h\s*em\s*\d/i
const PROMESSA_SEM_DOCUMENTO = /\b(integral|100%|garantid[ao]|excelente estado)\b/i

async function auditarFicha(caminho) {
  const r = await buscar(caminho)
  if (r.status !== 200) { falha(caminho, `HTTP ${r.status}${r.local ? ` → ${r.local}` : ''} (está no sitemap de estoque)`); return }
  const html = r.corpo
  const titulo = texto(meta(html, /<title>([\s\S]*?)<\/title>/) ?? '')
  const h1 = texto(meta(html, /<h1[^>]*>([\s\S]*?)<\/h1>/) ?? '')
  const canonical = meta(html, /<link rel="canonical" href="([^"]+)"/)
  const robotsMeta = meta(html, /<meta name="robots" content="([^"]+)"/) ?? ''

  if (!h1) falha(caminho, 'sem h1')
  if (canonical !== `${CANONICAL_BASE}${caminho}`) falha(caminho, `canonical ${canonical ?? 'ausente'}`)
  if (/noindex/i.test(robotsMeta)) falha(caminho, `noindex numa ficha do sitemap (${robotsMeta})`)

  const nos = jsonLd(html)
  if (nos.some(n => temTipo(n, '__invalido__'))) falha(caminho, 'JSON-LD inválido')
  const veiculo = nos.find(n => temTipo(n, 'Vehicle') || temTipo(n, 'Car'))
  if (!veiculo) { falha(caminho, 'sem nó Vehicle no JSON-LD'); return }

  const oferta = [].concat(veiculo.offers ?? [])[0]
  const preco = Number(oferta?.price)
  if (!oferta || !(preco > 0) || oferta.priceCurrency !== 'BRL') falha(caminho, 'Offer sem preço em BRL')
  if (oferta && !/InStock/.test(oferta.availability ?? '')) falha(caminho, `availability ${oferta.availability ?? 'ausente'} numa ficha ativa`)
  const precoLista = precoNaListagem.get(caminho)
  if (precoLista != null && preco > 0 && precoLista !== preco) falha(caminho, `preço diverge: listagem ${precoLista}, ficha ${preco}`)

  // A versão está no JSON-LD (vehicleConfiguration) e no h1; o título precisa dela.
  const versao = veiculo.vehicleConfiguration
  if (versao && !normalizar(titulo).includes(normalizar(versao))) aviso(caminho, `título sem a versão "${versao}": "${titulo}"`)

  // Potência que o anúncio declara: o campo do feed e o número que às vezes vem
  // no nome da versão ("M35i 306cv"). Os dois podem até discordar entre si.
  const potencia = Number(veiculo.vehicleEngine?.enginePower?.value) || null
  const cvDaVersao = [...`${veiculo.name ?? ''} ${versao ?? ''}`.matchAll(/(\d{3,4})\s*cv\b/gi)].map(m => Number(m[1]))
  if (potencia && cvDaVersao.length && !cvDaVersao.includes(potencia)) {
    aviso(caminho, `o feed se contradiz: potência ${potencia} cv, versão diz ${cvDaVersao.join('/')} cv`)
  }
  const faq = nos.find(n => temTipo(n, 'FAQPage'))
  for (const q of faq?.mainEntity ?? []) {
    const resposta = q.acceptedAnswer?.text ?? ''
    if (SPEC_INVENTADA.test(resposta)) falha(caminho, `FAQ com especificação que o anúncio não traz: "${q.name}"`)
    for (const m of resposta.matchAll(/(\d{3,4})\s*cv\b/gi)) {
      const cv = Number(m[1])
      if (cv !== potencia && !cvDaVersao.includes(cv)) falha(caminho, `FAQ diz ${cv} cv, anúncio diz ${potencia ?? 'nada'}: "${q.name}"`)
    }
    if (PROMESSA_SEM_DOCUMENTO.test(resposta)) aviso(caminho, `FAQ promete sem documento ("${resposta.match(PROMESSA_SEM_DOCUMENTO)[0]}"): "${q.name}"`)
  }

  return { caminho, titulo, h1, preco }
}

const resultados = []
for (let i = 0; i < fichas.length; i += 4) {
  resultados.push(...(await Promise.all(fichas.slice(i, i + 4).map(auditarFicha))))
}

// --- 4. relatório ------------------------------------------------------------

const resumo = {
  base: BASE,
  sitemaps: Object.fromEntries(Object.entries(urlsPorSitemap).map(([s, u]) => [s, u.length])),
  fichas_no_sitemap: fichas.length,
  fichas_alcancadas_pela_listagem_sem_js: fichas.filter(f => achadasNaListagem.has(f)).length,
  paginas_de_listagem_lidas: visitadas.size,
  falhas: falhas.length,
  avisos: avisos.length,
}

if (JSON_OUT) {
  console.log(JSON.stringify({ resumo, falhas, avisos, fichas: resultados.filter(Boolean) }, null, 2))
} else {
  console.log(`Auditoria do catálogo — ${BASE}`)
  console.log(`  sitemaps: ${Object.entries(resumo.sitemaps).map(([s, n]) => `${s} (${n})`).join(', ') || 'nenhum'}`)
  console.log(`  fichas no sitemap de estoque: ${resumo.fichas_no_sitemap}`)
  console.log(`  alcançadas pela listagem sem JS: ${resumo.fichas_alcancadas_pela_listagem_sem_js} (${resumo.paginas_de_listagem_lidas} página(s))`)
  const agrupar = lista => {
    const porMsg = new Map()
    for (const { onde, msg } of lista) {
      const chave = msg.replace(/"[^"]*"/g, '"…"').replace(/\d[\d.]*/g, 'N')
      if (!porMsg.has(chave)) porMsg.set(chave, [])
      porMsg.get(chave).push(`${onde}: ${msg}`)
    }
    return porMsg
  }
  for (const [rotulo, lista] of [['FALHA', falhas], ['AVISO', avisos]]) {
    if (!lista.length) continue
    console.log(`\n${rotulo} (${lista.length})`)
    for (const [, itens] of agrupar(lista)) {
      for (const item of itens.slice(0, 5)) console.log(`  - ${item}`)
      if (itens.length > 5) console.log(`    … e mais ${itens.length - 5} igual(is)`)
    }
  }
  if (!falhas.length && !avisos.length) console.log('\nNada a apontar.')
}

process.exit(falhas.length ? 1 : 0)
