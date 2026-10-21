// Os robôs da OpenAI no log do nginx: quem veio, se era mesmo da OpenAI e o que
// o site respondeu.
//
// Existe por causa do handoff "Attra × ChatGPT Search" (20/10/2026). Um teste
// com `curl -A 'OAI-SearchBot'` não prova nada: o nome do robô se falsifica, e
// a pergunta que importa é se os IPs REAIS da OpenAI recebem 200. Este script
// confere o IP de cada acesso contra as faixas oficiais, separadas por robô:
//
//   OAI-SearchBot  — rastreio da busca do ChatGPT (o que decide citação)
//   ChatGPT-User   — página aberta a pedido de um usuário
//   GPTBot         — coleta para treinamento (não afeta a busca)
//   OAI-AdsBot     — revisão de landing page de anúncio no ChatGPT
//
// Uso (na VPS, onde está o log):
//   node scripts/robos-openai-nos-logs.mjs /var/log/nginx/access.log /var/log/nginx/access.log.1
//   node scripts/robos-openai-nos-logs.mjs /var/log/nginx/access.log.*.gz --json
//
// Lê o formato `combined` do nginx. Não grava nada e não guarda IP: o relatório
// só traz contagens e caminhos.

import { createReadStream } from 'node:fs'
import { createGunzip } from 'node:zlib'
import { createInterface } from 'node:readline'
import { isIPv4, isIPv6 } from 'node:net'

const args = process.argv.slice(2)
const JSON_OUT = args.includes('--json')
const arquivos = args.filter(a => !a.startsWith('--'))
if (arquivos.length === 0) {
  console.error('Uso: node scripts/robos-openai-nos-logs.mjs <access.log> [mais logs, .gz aceito] [--json]')
  process.exit(1)
}

// Ordem importa: "OAI-SearchBot" antes de qualquer token mais curto.
const ROBOS = [
  { nome: 'OAI-SearchBot', token: /OAI-SearchBot/i, faixas: 'https://openai.com/searchbot.json' },
  { nome: 'ChatGPT-User', token: /ChatGPT-User/i, faixas: 'https://openai.com/chatgpt-user.json' },
  { nome: 'GPTBot', token: /GPTBot/i, faixas: 'https://openai.com/gptbot.json' },
  { nome: 'OAI-AdsBot', token: /OAI-AdsBot/i, faixas: 'https://openai.com/adsbot.json' },
]

// --- faixas oficiais ---------------------------------------------------------

function ipv4ParaBigInt(ip) {
  return ip.split('.').reduce((acc, p) => (acc << 8n) + BigInt(Number(p)), 0n)
}

function ipv6ParaBigInt(ip) {
  let [cabeca, cauda = ''] = ip.split('::')
  const partes = s => (s ? s.split(':') : [])
  let a = partes(cabeca)
  let b = partes(cauda)
  // IPv4 embutido no fim ("::ffff:1.2.3.4")
  const ultimo = (b.length ? b : a).at(-1)
  if (ultimo && ultimo.includes('.')) {
    const v4 = ipv4ParaBigInt(ultimo)
    const extra = [((v4 >> 16n) & 0xffffn).toString(16), (v4 & 0xffffn).toString(16)]
    if (b.length) b = [...b.slice(0, -1), ...extra]
    else a = [...a.slice(0, -1), ...extra]
  }
  const zeros = ip.includes('::') ? Array(8 - a.length - b.length).fill('0') : []
  return [...a, ...zeros, ...b].reduce((acc, h) => (acc << 16n) + BigInt(parseInt(h || '0', 16)), 0n)
}

function prefixo(cidr) {
  const [ip, bits] = cidr.split('/')
  const v6 = ip.includes(':')
  const total = v6 ? 128n : 32n
  const n = BigInt(Number(bits))
  const valor = v6 ? ipv6ParaBigInt(ip) : ipv4ParaBigInt(ip)
  const mascara = ((1n << total) - 1n) ^ ((1n << (total - n)) - 1n)
  return { v6, rede: valor & mascara, mascara }
}

function dentro(ip, prefixos) {
  const v6 = isIPv6(ip)
  if (!v6 && !isIPv4(ip)) return false
  // IPv4 mapeado em IPv6 ("::ffff:1.2.3.4") é comparado como IPv4.
  const mapeado = v6 && /^::ffff:\d+\.\d+\.\d+\.\d+$/i.test(ip) ? ip.split(':').at(-1) : null
  const alvoV6 = v6 && !mapeado
  const valor = alvoV6 ? ipv6ParaBigInt(ip) : ipv4ParaBigInt(mapeado ?? ip)
  return prefixos.some(p => p.v6 === alvoV6 && (valor & p.mascara) === p.rede)
}

for (const robo of ROBOS) {
  try {
    const r = await fetch(robo.faixas)
    const dado = await r.json()
    robo.prefixos = (dado.prefixes ?? [])
      .map(p => p.ipv4Prefix ?? p.ipv6Prefix)
      .filter(Boolean)
      .map(prefixo)
    robo.faixasDe = dado.creationTime ?? null
  } catch (err) {
    console.error(`Não consegui baixar ${robo.faixas} (${err.message}); acessos de ${robo.nome} ficam como "sem verificação".`)
    robo.prefixos = null
  }
}

// --- leitura do log ----------------------------------------------------------

// combined: IP - usuario [data] "METODO caminho PROTO" status bytes "referer" "user-agent"
const LINHA = /^(\S+) \S+ \S+ \[([^\]]+)\] "(?:[A-Z]+) (\S+)[^"]*" (\d{3}) (\d+|-) "[^"]*" "([^"]*)"/

const estatisticas = new Map(ROBOS.map(r => [r.nome, {
  acessos: 0,
  verificados: 0,
  falsos: 0,
  semVerificacao: 0,
  porStatus: {},
  caminhos: new Map(),
  erros: new Map(),
  primeiro: null,
  ultimo: null,
}]))

// Agrupa fichas, posts e páginas do manual: interessa o tipo de página.
function modeloDoCaminho(caminho) {
  const semQuery = caminho.split('?')[0]
  if (/^\/veiculo\//.test(semQuery)) return '/veiculo/:slug'
  if (/^\/blog\/[^/]+/.test(semQuery)) return '/blog/:slug'
  if (/^\/manual-attra\/[^/]+/.test(semQuery)) return '/manual-attra/:termo'
  // Foto otimizada e bundle separados: um 500 em /_next/image é foto que o
  // robô não consegue ler; em /_next/static, chunk de build que já não existe.
  if (semQuery === '/_next/image') return '/_next/image'
  if (/^\/_next\/static\//.test(semQuery)) return '/_next/static/*'
  if (/^\/_next\//.test(semQuery)) return '/_next/*'
  if (semQuery === '/veiculos' && caminho.includes('?')) return '/veiculos?…'
  return semQuery
}

const somar = (mapa, chave) => mapa.set(chave, (mapa.get(chave) ?? 0) + 1)

// "21/Oct/2026:00:47:45 +0200" → ms. Os arquivos rotacionados chegam em
// qualquer ordem (access.log antes do .1), então primeiro/último saem da data
// de cada linha, não da ordem de leitura.
const MESES = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 }
function instante(data) {
  const m = data.match(/^(\d{2})\/(\w{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2}) ([+-])(\d{2})(\d{2})$/)
  if (!m) return null
  const [, d, mes, a, h, min, seg, sinal, oh, om] = m
  const fuso = (sinal === '-' ? -1 : 1) * (Number(oh) * 60 + Number(om))
  return Date.UTC(Number(a), MESES[mes], Number(d), Number(h), Number(min), Number(seg)) - fuso * 60_000
}
const dataBR = ms => (ms == null ? '—' : new Date(ms).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }))

let linhas = 0
for (const arquivo of arquivos) {
  const fluxo = arquivo.endsWith('.gz') ? createReadStream(arquivo).pipe(createGunzip()) : createReadStream(arquivo)
  for await (const linha of createInterface({ input: fluxo, crlfDelay: Infinity })) {
    linhas++
    const m = linha.match(LINHA)
    if (!m) continue
    const [, ip, data, caminho, status, , ua] = m
    const robo = ROBOS.find(r => r.token.test(ua))
    if (!robo) continue

    const e = estatisticas.get(robo.nome)
    e.acessos++
    if (robo.prefixos == null) e.semVerificacao++
    else if (dentro(ip, robo.prefixos)) e.verificados++
    else { e.falsos++; continue } // nome de robô em IP de fora: não conta como acesso da OpenAI

    const faixa = `${status[0]}xx`
    e.porStatus[status] = (e.porStatus[status] ?? 0) + 1
    e.porStatus[faixa] = (e.porStatus[faixa] ?? 0) + 1
    const modelo = modeloDoCaminho(caminho)
    somar(e.caminhos, modelo)
    if (status[0] !== '2' && status !== '304') somar(e.erros, `${status} ${modelo}`)
    const t = instante(data)
    if (t != null) {
      if (e.primeiro == null || t < e.primeiro) e.primeiro = t
      if (e.ultimo == null || t > e.ultimo) e.ultimo = t
    }
  }
}

// --- relatório ---------------------------------------------------------------

const topo = (mapa, n = 8) => [...mapa.entries()].sort((a, b) => b[1] - a[1]).slice(0, n)

const relatorio = ROBOS.map(r => {
  const e = estatisticas.get(r.nome)
  const reais = e.verificados + e.semVerificacao
  const ok = (e.porStatus['2xx'] ?? 0) + (e.porStatus['304'] ?? 0)
  return {
    robo: r.nome,
    faixas_oficiais_de: r.faixasDe ?? null,
    acessos_com_o_nome: e.acessos,
    ip_verificado: e.verificados,
    ip_fora_das_faixas: e.falsos,
    sem_verificacao: e.semVerificacao,
    sucesso: reais ? Number((ok / reais).toFixed(3)) : null,
    bloqueio_403_429: (e.porStatus['403'] ?? 0) + (e.porStatus['429'] ?? 0),
    erro_5xx: e.porStatus['5xx'] ?? 0,
    status: Object.fromEntries(Object.entries(e.porStatus).filter(([k]) => /^\d{3}$/.test(k))),
    primeiro: e.primeiro == null ? null : new Date(e.primeiro).toISOString(),
    ultimo: e.ultimo == null ? null : new Date(e.ultimo).toISOString(),
    paginas_mais_lidas: topo(e.caminhos),
    erros: topo(e.erros),
  }
})

if (JSON_OUT) {
  console.log(JSON.stringify({ linhas_lidas: linhas, arquivos, robos: relatorio }, null, 2))
} else {
  console.log(`Robôs da OpenAI — ${linhas.toLocaleString('pt-BR')} linhas em ${arquivos.length} arquivo(s)\n`)
  for (const r of relatorio) {
    if (!r.acessos_com_o_nome) { console.log(`${r.robo}: nenhum acesso\n`); continue }
    const pct = r.sucesso == null ? '—' : `${(r.sucesso * 100).toFixed(1)}%`
    console.log(`${r.robo}: ${r.acessos_com_o_nome} acesso(s) com o nome · ${r.ip_verificado} de IP oficial · ${r.ip_fora_das_faixas} de IP de fora (falsos, ignorados)${r.sem_verificacao ? ` · ${r.sem_verificacao} sem verificação` : ''}`)
    console.log(`  sucesso (2xx/304): ${pct} · 403/429: ${r.bloqueio_403_429} · 5xx: ${r.erro_5xx} · de ${dataBR(r.primeiro && Date.parse(r.primeiro))} a ${dataBR(r.ultimo && Date.parse(r.ultimo))}`)
    if (r.paginas_mais_lidas.length) console.log(`  mais lidas: ${r.paginas_mais_lidas.map(([p, n]) => `${p} (${n})`).join(', ')}`)
    if (r.erros.length) console.log(`  erros: ${r.erros.map(([p, n]) => `${p} (${n})`).join(', ')}`)
    console.log('')
  }
}
