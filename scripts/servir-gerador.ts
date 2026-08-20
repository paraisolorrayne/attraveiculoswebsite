/**
 * Sobe o Gerador de Criativos localmente, a partir do HTML fonte da branch.
 *
 * Existe porque /admin/gerador-criativos exige login e faz iframe da rota da
 * API — para olhar uma mudança de layout não dá para depender de subir o Next
 * inteiro com banco e sessão.
 *
 *   /                  -> content/admin/gerador-criativos.html (o fonte, direto)
 *   /api/*  /_next/*   -> proxy para produção (busca no estoque e fotos reais)
 *   /rembg              -> ATENDIDO AQUI, não proxiado
 *   /salvar            -> grava o PNG exportado em disco, para inspeção
 *
 * O recorte não pode ser proxiado: a rota de produção exige sessão de admin,
 * e o cookie dela é do domínio do site, não de localhost. Em vez de injetar a
 * sessão da operadora no proxy — que seria manusear credencial dela sem
 * necessidade — falamos com o Replicate direto e passamos os recortes pelo
 * MESMO porteiro de produção (src/lib/rembg-quality), com os MESMOS dois
 * modelos, EM SEQUÊNCIA e com recuo crescente. O que se vê aqui é o que
 * produção faz.
 *
 * Uso:
 *   REPLICATE_API_TOKEN=xxx npx tsx scripts/servir-gerador.ts [porta]
 */
import { createServer } from 'node:http'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { evaluateCutouts } from '../src/lib/rembg-quality'

const HTML = resolve(process.cwd(), 'content/admin/gerador-criativos.html')
const SAIDA = resolve(process.cwd(), '.gerador-local')
const ORIGEM = 'https://www.attraveiculos.com.br'
const PORTA = Number(process.argv[2] || 4599)

const REMBG_MODELS = [
  process.env.REMBG_MODEL || '851-labs/background-remover',
  'bria/remove-background',
]
const POLL_MS = 2000
const TIMEOUT_MS = 90_000

const metaCache = new Map<string, { oficial: boolean; versao: string | null }>()

async function modeloMeta(model: string, apiToken: string) {
  const c = metaCache.get(model)
  if (c) return c
  const r = await fetch(`https://api.replicate.com/v1/models/${model}`, {
    headers: { Authorization: `Bearer ${apiToken}` },
  })
  if (!r.ok) { console.warn(`  ! ${model} meta HTTP ${r.status}`); return null }
  const j = await r.json()
  const meta = { oficial: !!j.is_official, versao: j.latest_version?.id ?? null }
  metaCache.set(model, meta)
  return meta
}

async function runRembg(model: string, apiToken: string, image: string): Promise<Buffer | null> {
  const meta = await modeloMeta(model, apiToken)
  if (!meta) return null
  if (!meta.oficial && !meta.versao) return null

  const dispara = () => fetch(
    meta.oficial
      ? `https://api.replicate.com/v1/models/${model}/predictions`
      : 'https://api.replicate.com/v1/predictions',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(meta.oficial ? { input: { image } } : { version: meta.versao, input: { image } }),
    },
  )

  // Recuo crescente: burst 1 devolve 429 com retry-after curto demais.
  let start: Response | null = null
  for (let t = 0; t < 5; t++) {
    start = await dispara()
    if (start.status !== 429) break
    const h = Number(start.headers.get('retry-after'))
    const espera = Math.min(30, Math.max(Number.isFinite(h) && h > 0 ? h : 0, 3 * 2 ** t))
    console.log(`  · ${model}: 429, repetindo em ${espera}s`)
    await new Promise(r => setTimeout(r, espera * 1000))
  }
  if (!start || !start.ok) { console.warn(`  ! ${model} start HTTP ${start?.status}`); return null }

  const pred = await start.json()
  const getUrl = pred.urls?.get
  if (!getUrl) return null
  const fim = Date.now() + TIMEOUT_MS
  while (Date.now() < fim) {
    await new Promise(r => setTimeout(r, POLL_MS))
    const d = await (await fetch(getUrl, { headers: { Authorization: `Bearer ${apiToken}` } })).json()
    if (d.status === 'succeeded') {
      const url = typeof d.output === 'string' ? d.output : d.output?.[0] ?? null
      if (!url) return null
      const img = await fetch(url)
      return img.ok ? Buffer.from(await img.arrayBuffer()) : null
    }
    if (d.status === 'failed' || d.status === 'canceled') { console.warn(`  ! ${model} ${d.status}`); return null }
  }
  console.warn(`  ! ${model} timeout`)
  return null
}

async function corpo(req: import('node:http').IncomingMessage): Promise<string> {
  const cs: Buffer[] = []
  for await (const c of req) cs.push(c as Buffer)
  return Buffer.concat(cs).toString()
}

createServer(async (req, res) => {
  const url = req.url || '/'
  const caminho = url.split('?')[0]

  if (caminho === '/' || caminho === '/gerador') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(readFileSync(HTML, 'utf8'))
    return
  }

  // Recorte — atendido AQUI. Mesmos modelos, mesma ordem, mesmo porteiro.
  if (caminho.endsWith('/rembg') && req.method === 'POST') {
    const apiToken = process.env.REPLICATE_API_TOKEN
    if (!apiToken) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'REPLICATE_API_TOKEN não está no ambiente deste servidor local' }))
      return
    }
    try {
      const { image, imageUrl } = JSON.parse(await corpo(req))
      const entrada = typeof imageUrl === 'string' && /^https:\/\//.test(imageUrl) ? imageUrl : image
      if (!entrada) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'envie image (data URL) ou imageUrl (https)' })); return
      }
      console.log(`\n[recorte] iniciando — ${REMBG_MODELS.length} modelos em sequência`)
      const t0 = Date.now()
      const buffers: (Buffer | null)[] = []
      for (const m of REMBG_MODELS) {
        const b = await runRembg(m, apiToken, entrada)
        console.log(`  ${b ? '✓' : '✗'} ${m}`)
        buffers.push(b)
      }
      if (!buffers.some(Boolean)) {
        res.writeHead(502, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'recorte falhou nos dois modelos' })); return
      }
      const e = await evaluateCutouts(buffers)
      console.log(`[recorte] ${e.reason}  (${((Date.now() - t0) / 1000).toFixed(0)}s)`)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(
        e.accepted && e.bestBuffer
          ? { accepted: true, score: e.score, agreement: e.agreement, image: `data:image/png;base64,${e.bestBuffer.toString('base64')}` }
          : { accepted: false, score: e.score, agreement: e.agreement, reason: e.reason },
      ))
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }))
    }
    return
  }

  if (caminho === '/salvar' && req.method === 'POST') {
    const { nome, dataUrl } = JSON.parse(await corpo(req))
    const destino = resolve(SAIDA, String(nome).replace(/[^\w.-]/g, '_'))
    writeFileSync(destino, Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64'))
    console.log(`[salvar] ${destino}`)
    res.writeHead(200); res.end('ok'); return
  }

  // Harness do Story Vendido: bundle do módulo, fontes e assets servidos da
  // MESMA origem, para que fotoDoVeiculo() -> /_next/image (proxiado abaixo)
  // não tinja o canvas — igual ao que acontece no site.
  const estaticos: Record<string, [string, string]> = {
    '/harness': ['.gerador-local/harness.html', 'text/html; charset=utf-8'],
    '/story-vendido.js': ['.gerador-local/story-vendido.js', 'text/javascript'],
    '/creative-css/fonts.css': ['content/admin/creative/fonts.css', 'text/css'],
    '/creative/truck-base.webp': ['public/creative/truck-base.webp', 'image/webp'],
    '/creative/flag-br.png': ['public/creative/flag-br.png', 'image/png'],
    '/fonts/Archivo.woff2': ['public/fonts/Archivo.woff2', 'font/woff2'],
    '/fonts/Inter.woff2': ['public/fonts/Inter.woff2', 'font/woff2'],
  }
  if (estaticos[caminho]) {
    const [arq, tipo] = estaticos[caminho]
    res.writeHead(200, { 'Content-Type': tipo })
    res.end(readFileSync(resolve(process.cwd(), arq)))
    return
  }

  if (caminho.startsWith('/api/') || caminho.startsWith('/_next/')) {
    try {
      const r = await fetch(ORIGEM + url, { headers: { 'user-agent': 'gerador-local' } })
      const buf = Buffer.from(await r.arrayBuffer())
      res.writeHead(r.status, { 'Content-Type': r.headers.get('content-type') || 'application/octet-stream' })
      res.end(buf)
    } catch (e) { res.writeHead(502); res.end(String(e)) }
    return
  }

  res.writeHead(404); res.end('nao encontrado')
}).listen(PORTA, () => {
  console.log(`\nGerador em  http://localhost:${PORTA}/`)
  console.log(`  recorte:  ${process.env.REPLICATE_API_TOKEN ? 'ATIVO (Replicate direto, par sequencial)' : 'DESLIGADO — falta REPLICATE_API_TOKEN'}`)
  console.log(`  PNGs exportados vão para ${SAIDA}\n`)
})
