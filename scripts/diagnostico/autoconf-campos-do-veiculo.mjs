// Que campos o /veiculo da AutoConf devolve para a Attra — só leitura.
//
// Existe por causa do handoff "enriquecimento AutoConf" (20/10/2026): antes de
// mapear a "Descrição Customizada para o Site", é preciso ver o campo no
// payload REAL, não no exemplo do Postman (que é de outra revenda). A coleção
// pública documenta `descricao`, `versao_descricao`, `garantia_id`,
// `garantiafabrica` e `acessorios` no POST /api/v1/veiculo; o site hoje não lê
// `descricao` nem `garantia_id`.
//
// Uso (na VPS, com as credenciais que o site já usa; não precisa de commit):
//   ssh attra-vps 'cd /var/www/attra && set -a && . ./.env.production && set +a \
//     && /root/.nvm/versions/node/v20.20.0/bin/node --input-type=module - 1148612 --todos' \
//     < scripts/diagnostico/autoconf-campos-do-veiculo.mjs
//
// Sem ids, usa o 1148612. Com --todos, varre o estoque inteiro (uma chamada
// por carro, espaçadas) e mostra só estatística. Nunca imprime token, placa,
// contato da revenda nem fotos; textos longos saem cortados.

const BASE = 'https://api.autoconf.com.br/api/v1'
const BEARER = process.env.AUTOCONF_BEARER_TOKEN
const DEALER = process.env.AUTOCONF_DEALER_TOKEN
if (!BEARER || !DEALER) {
  console.error('AUTOCONF_BEARER_TOKEN / AUTOCONF_DEALER_TOKEN ausentes no ambiente (carregar o .env.production antes).')
  process.exit(1)
}

const args = process.argv.slice(1)
const TODOS = args.includes('--todos')
const ids = args.filter(a => /^\d+$/.test(a))
if (ids.length === 0) ids.push('1148612')

async function post(rota, campos) {
  const corpo = new URLSearchParams({ token: DEALER, ...campos })
  const r = await fetch(`${BASE}${rota}`, {
    method: 'POST',
    headers: { Authorization: BEARER, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: corpo.toString(),
  })
  if (!r.ok) throw new Error(`${rota} → HTTP ${r.status}`)
  return r.json()
}

// --- saneamento ---------------------------------------------------------------

const CHAVE_SENSIVEL = /token|senha|password|cpf|cnpj|chassi|renavam|placa|email|telefone|celular|whatsapp/i
const OMITIR = new Set(['revenda', 'sugestoes', 'fotos', 'foto'])

function limparTexto(s) {
  return s
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[email]')
    .replace(/\(?\d{2}\)?\s?9?\d{4}[-\s]?\d{4}/g, '[telefone]')
    .replace(/\b[A-Z]{3}-?\d[A-Z0-9]\d{2}\b/g, '[placa]')
}

function sanear(valor, chave = '') {
  if (CHAVE_SENSIVEL.test(chave)) return valor == null ? null : '[omitido]'
  if (Array.isArray(valor)) return valor.map(v => sanear(v))
  if (valor && typeof valor === 'object') {
    return Object.fromEntries(Object.entries(valor).map(([k, v]) => [k, sanear(v, k)]))
  }
  return typeof valor === 'string' ? limparTexto(valor) : valor
}

function descreverTexto(s) {
  if (s == null) return 'null'
  if (s === '') return '"" (vazio)'
  const html = /<[a-z][^>]*>/i.test(s) ? ' · TEM HTML' : ''
  const padrao = /^A procura de um/i.test(s.trim()) ? ' · texto padrão da AutoConf ("A procura de um…")' : ' · texto próprio'
  return `${s.length} caracteres${html}${padrao}`
}

// --- um veículo em detalhe ----------------------------------------------------

function caminhos(o, p = '') {
  if (Array.isArray(o)) return o.length ? caminhos(o[0], `${p}[]`).map(([c, v]) => [c, v, o.length]) : [[`${p}[]`, '(lista vazia)']]
  if (o && typeof o === 'object') return Object.entries(o).flatMap(([k, v]) => caminhos(v, p ? `${p}.${k}` : k))
  const s = JSON.stringify(o)
  return [[p, s && s.length > 100 ? `${s.slice(0, 100)}…` : s]]
}

for (const id of ids) {
  let bruto
  try {
    bruto = await post('/veiculo', { id })
  } catch (err) {
    console.log(`\n=== /veiculo id=${id}: ${err.message}`)
    continue
  }
  const v = bruto?.veiculo ?? bruto
  const omitidos = [...OMITIR].filter(k => k in v)
  const limpo = Object.fromEntries(Object.entries(v).filter(([k]) => !OMITIR.has(k)))
  const s = sanear(limpo)

  console.log(`\n=== /veiculo id=${id} — ${v.marca_nome ?? '?'} ${v.modelo_nome ?? '?'} ${v.anofabricacao ?? ''}/${v.anomodelo ?? ''}`)
  console.log(`chaves no topo: ${Object.keys(v).sort().join(' ')}`)
  console.log(`omitidas aqui (contato/fotos/sugestões): ${omitidos.join(', ') || 'nenhuma'}`)
  for (const [c, val, n] of caminhos(s)) console.log(`  ${c} = ${val}${n > 1 ? `  (${n} itens)` : ''}`)

  console.log('\n  -- campos do handoff --')
  console.log(`  descricao: ${descreverTexto(v.descricao)}`)
  if (typeof v.descricao === 'string' && v.descricao) {
    console.log(`  descricao (início, saneado): ${JSON.stringify(limparTexto(v.descricao).slice(0, 500))}`)
  }
  console.log(`  versao_descricao: ${JSON.stringify(v.versao_descricao ?? null)}  ·  modelo_nome: ${JSON.stringify(v.modelo_nome ?? null)}`)
  console.log(`  garantia_id: ${JSON.stringify(v.garantia_id ?? null)}  ·  garantiafabrica: ${JSON.stringify(v.garantiafabrica ?? null)}`)
  console.log(`  cor_nome: ${JSON.stringify(v.cor_nome ?? null)}  ·  potencia: ${JSON.stringify(v.potencia ?? null)}  ·  pericia: ${JSON.stringify(v.pericia ?? null)}`)
  console.log(`  acessorios: ${(v.acessorios ?? []).map(a => `${a.nome} [${a.categoria ?? '-'}]`).join(', ') || '(nenhum)'}`)
  console.log(`  acessorios_destaque: ${(v.acessorios_destaque ?? []).map(a => a.nome).join(', ') || '(nenhum)'}`)
  console.log(`  tags: ${JSON.stringify(v.tags ?? null)}  ·  video_embed: ${v.video_embed ? 'preenchido' : 'vazio'}`)
}

// --- o estoque inteiro, só números --------------------------------------------

if (TODOS) {
  const lista = await post('/veiculos', { tipo: 'carros', pagina: '1', registros_por_pagina: '200' })
  const veiculos = lista.veiculos ?? []
  const contagem = { total: veiculos.length, descricaoVazia: 0, descricaoPadrao: 0, descricaoPropria: 0, comHtml: 0, garantiaFabrica: 0, semAcessorio: 0, versaoDescricao: 0, versaoDescricaoDiferente: 0 }
  const garantiaIds = {}
  const acessorios = new Map()
  const proprias = []
  for (const item of veiculos) {
    await new Promise(r => setTimeout(r, 250))
    let v
    try {
      const r = await post('/veiculo', { id: String(item.id) })
      v = r?.veiculo ?? r
    } catch {
      v = null
    }
    v ??= item // sem o detalhe, conta só o que a lista traz (que não tem `descricao`)
    const d = typeof v.descricao === 'string' ? v.descricao.trim() : ''
    if (!d) contagem.descricaoVazia++
    else if (/^A procura de um/i.test(d)) contagem.descricaoPadrao++
    else { contagem.descricaoPropria++; proprias.push(`${v.id} ${v.marca_nome} ${v.modelopai_nome}`) }
    if (/<[a-z][^>]*>/i.test(d)) contagem.comHtml++
    if (v.garantiafabrica) contagem.garantiaFabrica++
    garantiaIds[v.garantia_id ?? 'null'] = (garantiaIds[v.garantia_id ?? 'null'] ?? 0) + 1
    if (!(v.acessorios ?? []).length) contagem.semAcessorio++
    for (const a of v.acessorios ?? []) acessorios.set(a.nome, (acessorios.get(a.nome) ?? 0) + 1)
    if (v.versao_descricao) {
      contagem.versaoDescricao++
      if (v.versao_descricao.toUpperCase() !== (v.modelo_nome ?? '').toUpperCase()) contagem.versaoDescricaoDiferente++
    }
  }
  console.log('\n=== estoque inteiro (/veiculo de cada carro)')
  console.log(JSON.stringify(contagem))
  console.log(`garantia_id: ${JSON.stringify(garantiaIds)}`)
  console.log(`descrição própria (não é o texto padrão): ${proprias.join(' | ') || 'nenhuma'}`)
  console.log(`acessórios usados (${acessorios.size}): ${[...acessorios.entries()].sort((a, b) => b[1] - a[1]).map(([n, q]) => `${n} (${q})`).join(', ')}`)
}
