// Confere a "Descrição Customizada para o Site" da AutoConf contra o molde de
// ficha técnica (22/10/2026) — só leitura.
//
// Existe para liberar o preenchimento ao marketing da Attra: antes de o site
// ler o campo, cada carro-piloto passa por aqui. O molde segue o jeito que o
// marketing escreveu no S 63 (22/10): a ficha começa sempre no MOTOR (o que
// vier antes é texto livre, fora da ficha), uma linha por rótulo fixo
// ("POTÊNCIA: 802 cv"), e DIFERENCIAIS e OPCIONAIS como títulos de lista, com
// um item por linha embaixo ("- " opcional). Linha sem dado confirmado não
// existe; nada de telefone, link ou preço; procedência e garantia só com
// documento.
//
// O site lê o campo com as mesmas regras em src/lib/ficha-do-anuncio.ts: linha
// com ERRO não é publicada, e o resto da ficha continua. Mudou uma, muda a outra.
//
// Uso (na VPS, com as credenciais que o site já usa; não precisa de commit):
//   ssh attra-vps 'cd /var/www/attra && set -a && . ./.env.production && set +a \
//     && /root/.nvm/versions/node/v20.20.0/bin/node --input-type=module - 1142317' \
//     < scripts/diagnostico/validar-molde-autoconf.mjs
//
// Sem ids, confere o 1142317 (Mercedes S 63 2025). Nunca imprime token, placa,
// contato da revenda nem fotos; o texto sai saneado.

const BASE = 'https://api.autoconf.com.br/api/v1'
const BEARER = process.env.AUTOCONF_BEARER_TOKEN
const DEALER = process.env.AUTOCONF_DEALER_TOKEN
if (!BEARER || !DEALER) {
  console.error('AUTOCONF_BEARER_TOKEN / AUTOCONF_DEALER_TOKEN ausentes no ambiente (carregar o .env.production antes).')
  process.exit(1)
}

const ids = process.argv.slice(1).filter(a => /^\d+$/.test(a))
if (ids.length === 0) ids.push('1142317')

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

function limparTexto(s) {
  return s
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[email]')
    .replace(/\(?\d{2}\)?\s?9?\d{4}[-\s]?\d{4}/g, '[telefone]')
    .replace(/\b[A-Z]{3}-?\d[A-Z0-9]\d{2}\b/g, '[placa]')
}

// --- texto do editor da AutoConf → linhas -------------------------------------

const ENTIDADES = {
  nbsp: ' ', amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', ndash: '–', mdash: '—', bull: '•', deg: '°',
  aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', atilde: 'ã', otilde: 'õ', ccedil: 'ç',
  acirc: 'â', ecirc: 'ê', ocirc: 'ô', agrave: 'à', Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó',
  Uacute: 'Ú', Atilde: 'Ã', Otilde: 'Õ', Ccedil: 'Ç', Acirc: 'Â', Ecirc: 'Ê', Ocirc: 'Ô', Agrave: 'À',
}

function paraLinhas(bruto) {
  const texto = bruto
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h\d)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, '')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTIDADES[n] ?? m)
  return texto.split(/\r?\n/).map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean)
}

// --- o molde --------------------------------------------------------------------

const ROTULOS = ['MOTOR', 'POTÊNCIA', 'TORQUE', 'CÂMBIO', 'TRAÇÃO', '0-100 KM/H',
  'VELOCIDADE MÁXIMA', 'COR', 'INTERIOR', 'SOM', 'RODAS', 'FREIOS', 'DIFERENCIAIS', 'OPCIONAIS']
const LISTAS = ['DIFERENCIAIS', 'OPCIONAIS']

// Sem acento, sem espaço e em maiúsculas: "Potencia", "0 - 100 km/h" e "0-100" contam.
const chave = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '').toUpperCase()
const PELA_CHAVE = new Map(ROTULOS.map(r => [chave(r), r]))
PELA_CHAVE.set('0-100', '0-100 KM/H')
PELA_CHAVE.set('0A100KM/H', '0-100 KM/H')
// Nomes do primeiro molde (DESTAQUES/EQUIPAMENTOS) continuam valendo.
PELA_CHAVE.set('DESTAQUES', 'DIFERENCIAIS')
PELA_CHAVE.set('EQUIPAMENTOS', 'OPCIONAIS')

const MARCA_DE_ITEM = /^[-•–*]\s*/
const COM_ROTULO = /^([^:]{2,30}):\s*(.*)$/
const rotuloDa = linha => {
  const m = linha.match(COM_ROTULO)
  return m ? { nome: m[1], rotulo: PELA_CHAVE.get(chave(m[1].replace(MARCA_DE_ITEM, ''))), valor: m[2].trim() } : null
}

function lerMolde(linhas) {
  const campos = new Map()
  const listas = Object.fromEntries(LISTAS.map(l => [l, []]))
  const soltas = []
  const problemas = []

  const inicio = linhas.findIndex(l => rotuloDa(l)?.rotulo === 'MOTOR')
  if (inicio === -1) {
    problemas.push(['erro', 'não achei a linha "MOTOR:" — a ficha começa nela'])
    return { campos, listas, soltas: linhas, problemas }
  }
  if (inicio > 0) {
    soltas.push(...linhas.slice(0, inicio))
    problemas.push(['aviso', `${inicio} linha(s) antes do MOTOR ficam fora da ficha (texto livre; o site não publica)`])
  }

  let lista = null
  for (const linha of linhas.slice(inicio)) {
    const r = rotuloDa(linha)
    if (r?.rotulo) {
      if (campos.has(r.rotulo)) problemas.push(['erro', `${r.rotulo} aparece duas vezes; fica só uma linha`])
      campos.set(r.rotulo, r.valor)
      lista = LISTAS.includes(r.rotulo) ? r.rotulo : null
      // "DIFERENCIAIS: a; b" na mesma linha também vale.
      if (lista && r.valor) listas[lista].push(...r.valor.split(';').map(t => t.trim()).filter(Boolean))
      continue
    }
    if (lista) {
      if (r) problemas.push(['aviso', `em ${lista}, "${r.nome}:" virou item; se era uma seção nova, ela não existe no molde`])
      listas[lista].push(linha.replace(MARCA_DE_ITEM, '').trim())
      continue
    }
    if (r) problemas.push(['erro', `rótulo fora do molde: "${r.nome}:" — o site ignora essa linha`])
    else {
      soltas.push(linha)
      problemas.push(['aviso', `linha sem rótulo (o site não lê): "${linha.slice(0, 80)}"`])
    }
  }
  return { campos, listas, soltas, problemas }
}

// --- regras ---------------------------------------------------------------------

const VAZIO_OU_PROVISORIO = /^(|\?+|-+|x+|n\/?a|tbd|pendente|verificar|a confirmar|confirmar|\.\.\.)$/i
const COMERCIAL = /(R\$|\bwhats|\bzap\b|ligue|financ|parcel|\bentrada\b|aceita troca|\bipva\b|desconto|https?:\/\/|www\.|\.com\b)/i
const CONTATO = /([\w.+-]+@[\w-]+\.[\w.]+|\(?\d{2}\)?\s?9?\d{4}[-\s]?\d{4})/
const PROCEDENCIA = /(garantia|revis[ãa]o|revis[õo]es|[úu]nico dono|\b1 dono|laudo|cautelar|proced[êe]ncia|nota fiscal|manual|chave reserva)/i
const DECIMAL_COM_PONTO = /\b\d+\.\d{1,2}\b/

const UNIDADE = {
  'POTÊNCIA': [/^\d{2,4}(,\d)?\s?cv\b/i, /\b(b?hp|ps|kw)\b/i, 'número em cv, ex.: "802 cv"'],
  'TORQUE': [/^\d{1,3}(,\d{1,2})?\s?kgfm\b/i, /\bn\.?m\b/i, 'número em kgfm, ex.: "145,8 kgfm"'],
  '0-100 KM/H': [/^\d{1,2}(,\d{1,2})?\s?s\b/i, /seg/i, 'segundos com vírgula, ex.: "3,3 s"'],
  'VELOCIDADE MÁXIMA': [/^\d{3}\s?km\/h\b/i, /mph/i, 'número em km/h, ex.: "250 km/h"'],
}

function cvs(texto) {
  return [...String(texto ?? '').matchAll(/(\d{2,4})\s*cv\b/gi)].map(m => Number(m[1]))
}

function conferir(v, campos, listas, soltas) {
  const p = []
  const todos = [...[...campos].filter(([r]) => !LISTAS.includes(r)),
    ...LISTAS.flatMap(l => listas[l].map(item => [l, item]))]

  for (const [rotulo, valor] of todos) {
    if (VAZIO_OU_PROVISORIO.test(valor) || /a confirmar/i.test(valor)) {
      p.push(['erro', `${rotulo} sem dado ("${valor}"): sem dado confirmado, a linha sai inteira`])
    }
  }
  // Mesmo a linha que o site não lê pode ir para os portais (descricao_anuncio).
  for (const [rotulo, valor] of [...todos, ...soltas.map(l => ['linha sem rótulo', l])]) {
    if (COMERCIAL.test(valor) || CONTATO.test(valor)) p.push(['erro', `${rotulo} tem preço, link ou contato: "${valor}"`])
    if (PROCEDENCIA.test(valor)) p.push(['aviso', `${rotulo} fala de procedência/garantia ("${valor}"): o site não publica esta linha (só com documento)`])
  }
  // "4.0 V8" no MOTOR é a forma de sempre; a vírgula vale para os números com unidade.
  for (const rotulo of Object.keys(UNIDADE)) {
    const valor = campos.get(rotulo)
    if (valor && DECIMAL_COM_PONTO.test(valor)) p.push(['erro', `${rotulo} usa ponto decimal ("${valor}"): use vírgula`])
  }
  for (const l of LISTAS) {
    if (campos.has(l) && listas[l].length === 0) p.push(['erro', `${l} sem nenhum item: tire a linha ou liste um item por linha embaixo`])
  }

  for (const [rotulo, [certo, errado, dica]] of Object.entries(UNIDADE)) {
    const valor = campos.get(rotulo)
    if (!valor) continue
    if (!certo.test(valor)) p.push(['erro', `${rotulo} "${valor}" fora do formato: ${dica}${errado.test(valor) ? ' (unidade errada)' : ''}`])
  }

  // Potência: o site não publica se o número do molde brigar com o do catálogo.
  const potencia = cvs(campos.get('POTÊNCIA'))[0]
  const doCatalogo = [...cvs(v.modelo_nome), ...cvs(v.versao_descricao),
    ...[v.potencia, v.potencia2].filter(n => Number(n) > 0).map(Number)]
  if (potencia && doCatalogo.length && !doCatalogo.includes(potencia)) {
    p.push(['erro', `POTÊNCIA ${potencia} cv diverge do cadastro (${[...new Set(doCatalogo)].join(' / ')} cv): corrigir um dos dois pelo documento`])
  } else if (potencia && !doCatalogo.length) {
    p.push(['aviso', `POTÊNCIA ${potencia} cv: o cadastro não tem potência para comparar; conferir na ficha oficial do fabricante`])
  }

  // Blindado: os números de fábrica de aceleração e velocidade não valem.
  // A própria ficha dizer "Blindado" também conta (o site faz igual).
  const ehBlindado = [v.modelo_nome, v.versao_descricao, ...(v.acessorios ?? []).map(a => a.nome), ...(v.tags ?? []),
    ...LISTAS.flatMap(l => listas[l])]
    .some(t => /blind/i.test(String(t ?? '')))
  if (ehBlindado) {
    for (const r of ['0-100 KM/H', 'VELOCIDADE MÁXIMA']) {
      if (campos.has(r)) p.push(['erro', `carro BLINDADO com ${r} "${campos.get(r)}": é número de fábrica do carro sem blindagem; tirar a linha ou ter medição do carro blindado`])
    }
    const blindagem = todos.map(([, t]) => t).find(t => /blind/i.test(t))
    if (!blindagem) p.push(['aviso', 'carro blindado e a ficha não cita a blindagem: em DIFERENCIAIS, com blindadora e nível do certificado'])
    else if (!/n[íi]vel|\bIII-?A?\b|\bIV\b/i.test(blindagem)) p.push(['aviso', `a blindagem não diz o nível ("${blindagem}"): pôr o nível do certificado (ex.: III-A)`])
  }

  return p
}

// --- um carro -------------------------------------------------------------------

for (const id of ids) {
  let v
  try {
    const r = await post('/veiculo', { id })
    v = r?.veiculo ?? r
  } catch (err) {
    console.log(`\n=== id=${id}: ${err.message}`)
    continue
  }

  console.log(`\n=== id=${id} — ${v.marca_nome ?? '?'} ${v.modelo_nome ?? '?'} ${v.anofabricacao ?? ''}/${v.anomodelo ?? ''}`)
  console.log(`cadastro: cor_nome=${JSON.stringify(v.cor_nome ?? null)} · potencia=${JSON.stringify(v.potencia ?? null)} · potencia2=${JSON.stringify(v.potencia2 ?? null)} · versao_descricao=${JSON.stringify(v.versao_descricao ?? null)}`)
  console.log(`acessórios: ${(v.acessorios ?? []).map(a => a.nome).join(', ') || '(nenhum)'} · atualizacao=${JSON.stringify(v.atualizacao ?? null)}`)

  const bruto = typeof v.descricao === 'string' ? v.descricao : ''
  if (!bruto.trim() || /^A procura de um/i.test(bruto.trim())) {
    console.log('\nRESULTADO: a descrição ainda é a padrão da AutoConf ("A procura de um…") ou está vazia — o molde não foi salvo neste carro.')
    continue
  }

  const linhas = paraLinhas(bruto)
  console.log(`\ntexto salvo (${bruto.length} caracteres${/<[a-z][^>]*>/i.test(bruto) ? ', com HTML do editor' : ''}), saneado:`)
  for (const l of linhas) console.log(`  | ${limparTexto(l)}`)

  const { campos, listas, soltas, problemas } = lerMolde(linhas)
  const todos = [...problemas, ...conferir(v, campos, listas, soltas)]

  console.log('\ncomo o site leria:')
  for (const r of ROTULOS) {
    if (LISTAS.includes(r)) {
      console.log(`  ${r.padEnd(18)} ${listas[r].length ? listas[r].map(e => limparTexto(e)).join(' · ') : '— (sem lista)'}`)
    } else {
      console.log(`  ${r.padEnd(18)} ${campos.has(r) ? limparTexto(campos.get(r)) : '— (sem linha)'}`)
    }
  }
  if (campos.get('COR') && v.cor_nome) console.log(`  (cor no cadastro: ${v.cor_nome})`)

  const anuncio = typeof v.descricao_anuncio === 'string' ? v.descricao_anuncio.trim() : ''
  console.log(`\nportais: descricao_anuncio ${anuncio === bruto.trim() ? 'IGUAL ao texto do site (indício de que vai para os anúncios)' : anuncio ? 'diferente do texto do site' : 'vazia'}`)

  const erros = todos.filter(([t]) => t === 'erro')
  const avisos = todos.filter(([t]) => t === 'aviso')
  for (const [, msg] of erros) console.log(`  ERRO  ${limparTexto(msg)}`)
  for (const [, msg] of avisos) console.log(`  AVISO ${limparTexto(msg)}`)
  const itens = LISTAS.map(l => `${listas[l].length} em ${l}`).join(', ')
  console.log(`\nRESULTADO: ${erros.length ? `${erros.length} erro(s) — não liberar ainda` : 'formato OK'} · ${avisos.length} aviso(s) · ${campos.size} rótulo(s) lido(s), ${itens}`)
}
