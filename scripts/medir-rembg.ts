/**
 * Medidor da taxa de rejeição do gate de recorte (rembg).
 *
 * Reproduz EXATAMENTE o caminho de produção: mesmos dois modelos, mesma
 * ordem, mesmo `evaluateCutouts` de src/lib/rembg-quality. A única diferença
 * é que aqui varremos várias fotos por veículo em vez de uma, para medir a
 * taxa em vez de observar um caso.
 *
 * Uso:
 *   REPLICATE_API_TOKEN=xxx npx tsx scripts/medir-rembg.ts [ids...] [--fotos N]
 *
 * Sem ids, usa os carros de teste: G 63, McLaren GTS e as duas RAM.
 */
import { evaluateCutouts } from '../src/lib/rembg-quality'

const REMBG_MODELS = [
  process.env.REMBG_MODEL || '851-labs/background-remover',
  'bria/remove-background',
]
const POLL_MS = 2000
const TIMEOUT_MS = 90_000
const API = 'https://www.attraveiculos.com.br'

/** Só o que este medidor lê da listagem de veículos. */
interface VeiculoApi {
  id: string | number
  brand?: string
  model?: string
  photos?: string[]
}

const metaCache = new Map<string, { oficial: boolean; versao: string | null }>()

async function modeloMeta(model: string, apiToken: string) {
  const emCache = metaCache.get(model)
  if (emCache) return emCache
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
  if (!meta.oficial && !meta.versao) { console.warn(`  ! ${model} sem versão`); return null }

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

  // Retentativa com recuo CRESCENTE, não única.
  //
  // A conta tem burst 1 (ver comentário da rota): enquanto uma predição está
  // viva, a próxima leva 429. A rota tenta uma vez só, respeitando o
  // `retry-after` — que o Replicate devolve curto (< 2s). Medido em 18/08/2026
  // numa passada de 48 execuções: 21 das 23 fotos avaliadas terminaram com UM
  // modelo só, porque a segunda tentativa caía antes de a primeira predição
  // terminar. Com um candidato só o IoU não é calculado e o gate vira
  // "integridade >= 99" puro — foi o que reprovou recortes de 96-98%.
  let start: Response | null = null
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    start = await dispara()
    if (start.status !== 429) break
    const header = Number(start.headers.get('retry-after'))
    const espera = Math.min(30, Math.max(Number.isFinite(header) && header > 0 ? header : 0, 3 * 2 ** tentativa))
    await new Promise(r => setTimeout(r, espera * 1000))
  }
  if (!start || !start.ok) { console.warn(`  ! ${model} start HTTP ${start?.status ?? '???'}`); return null }
  const pred = await start.json()
  const getUrl = pred.urls?.get
  if (!getUrl) return null

  const deadline = Date.now() + TIMEOUT_MS
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, POLL_MS))
    const data = await (await fetch(getUrl, { headers: { Authorization: `Bearer ${apiToken}` } })).json()
    if (data.status === 'succeeded') {
      const url = typeof data.output === 'string' ? data.output : data.output?.[0] ?? null
      if (!url) return null
      const img = await fetch(url)
      return img.ok ? Buffer.from(await img.arrayBuffer()) : null
    }
    if (data.status === 'failed' || data.status === 'canceled') {
      console.warn(`  ! ${model} ${data.status}: ${data.error || ''}`)
      return null
    }
  }
  console.warn(`  ! ${model} timeout`)
  return null
}

/** Espalha N posições ao longo da galeria — evita medir só o mesmo ângulo. */
function amostrar<T>(fotos: T[], n: number): { pos: number; url: T }[] {
  if (n <= 0) return []
  if (fotos.length <= n) return fotos.map((url, i) => ({ pos: i + 1, url }))
  // n === 1 dividiria por zero (n-1) e produzia `foto NaN`.
  if (n === 1) return [{ pos: 1, url: fotos[0] }]
  return Array.from({ length: n }, (_, i) => {
    const idx = Math.round((i * (fotos.length - 1)) / (n - 1))
    return { pos: idx + 1, url: fotos[idx] }
  })
}

async function main() {
  const apiToken = process.env.REPLICATE_API_TOKEN
  if (!apiToken) { console.error('Falta REPLICATE_API_TOKEN no ambiente.'); process.exit(1) }

  const args = process.argv.slice(2)
  const fi = args.indexOf('--fotos')
  const N_FOTOS = fi >= 0 ? parseInt(args[fi + 1], 10) : 6

  // Resolvidos pela BUSCA, não por id: /api/vehicles/{id} devolve 404 para os
  // ids que a listagem expõe (medido 18/08/2026) — o par busca+id é o único
  // caminho que funciona hoje.
  const PADRAO = [
    { busca: 'G-63', id: '1006232' },
    { busca: 'GTS', id: '1086724' },
    { busca: 'RAM', id: '1082535' },
    { busca: 'RAM', id: '1071060' },
  ]
  const alvos = args.filter((a, i) => /^\d+$/.test(a) && i !== fi + 1)
    .map(id => ({ busca: id, id }))
  const lista = alvos.length ? alvos : PADRAO

  console.log(`Gate: integridade >= ${process.env.REMBG_MIN_SCORE ?? 99}%  E  concordância >= ${process.env.REMBG_MIN_AGREEMENT ?? 90}%`)
  console.log(`Modelos: ${REMBG_MODELS.join('  +  ')}`)
  console.log(`${lista.length} veículos × ${N_FOTOS} fotos = ${lista.length * N_FOTOS * 2} execuções\n`)

  const geral: { veiculo: string; aceitos: number; total: number; pares: number }[] = []

  for (const { busca, id } of lista) {
    const r = await fetch(`${API}/api/vehicles?search=${encodeURIComponent(busca)}&limit=20`)
    const d = await r.json().catch(() => null)
    const itens: VeiculoApi[] = d?.vehicles ?? d?.data ?? (Array.isArray(d) ? d : [])
    const v = itens.find(x => String(x.id) === id) ?? null
    const veiculo = v ? `${v.brand ?? ''} ${v.model ?? ''}`.trim() : `id ${id}`
    const fotos: string[] = (v?.photos ?? []) as string[]
    if (!fotos.length) { console.log(`${veiculo} (id ${id}): não encontrado / sem fotos, pulado\n`); continue }

    console.log(`── ${veiculo} (id ${id}, ${fotos.length} fotos) ──`)
    let aceitos = 0, total = 0, pares = 0
    for (const { pos, url } of amostrar(fotos, N_FOTOS)) {
      const t0 = Date.now()
      // SEQUENCIAL de propósito. Em paralelo (como a rota faz hoje) o burst 1
      // derruba o segundo modelo e o par nunca se forma — era esse o vício da
      // primeira medição. Aqui queremos a taxa do gate COM os dois modelos.
      const buffers: (Buffer | null)[] = []
      for (const m of REMBG_MODELS) buffers.push(await runRembg(m, apiToken, url))
      if (!buffers.some(Boolean)) { console.log(`  foto ${String(pos).padStart(2)}  FALHA nos dois modelos`); continue }
      const e = await evaluateCutouts(buffers)
      total++; if (e.accepted) aceitos++
      if (e.agreement !== null) pares++
      const seg = ((Date.now() - t0) / 1000).toFixed(0)
      const modelos = buffers.map(b => (b ? '✓' : '✗')).join('')
      console.log(
        `  foto ${String(pos).padStart(2)}  ${e.accepted ? 'ACEITO ' : 'REJEIT.'}` +
        `  integridade ${String(e.score).padStart(3)}%` +
        `  concordância ${e.agreement === null ? ' —  ' : String(e.agreement).padStart(3) + '%'}` +
        `  modelos ${modelos}  ${seg}s`,
      )
    }
    console.log(total
      ? `  → aceitos ${aceitos}/${total}  |  REJEIÇÃO ${Math.round((100 * (total - aceitos)) / total)}%` +
        `  |  par de modelos em ${pares}/${total}\n`
      : `  → SEM DADOS (nenhuma foto avaliada)\n`)
    geral.push({ veiculo, aceitos, total, pares })
  }

  const a = geral.reduce((s, g) => s + g.aceitos, 0)
  const t = geral.reduce((s, g) => s + g.total, 0)
  console.log('═══ RESUMO ═══')
  const pct = (ac: number, tt: number) =>
    tt ? `rejeição ${Math.round((100 * (tt - ac)) / tt)}%` : 'SEM DADOS'
  for (const g of geral) {
    console.log(`  ${g.veiculo.padEnd(24)} aceitos ${g.aceitos}/${g.total}  ${pct(g.aceitos, g.total)}`)
  }
  console.log(`  ${'TOTAL'.padEnd(24)} aceitos ${a}/${t}  ${pct(a, t)}`)

  const pr = geral.reduce((s2, g) => s2 + g.pares, 0)
  console.log(`\n  par de modelos formado em ${pr}/${t} fotos`)
  if (t && pr < t) {
    console.log(
      `  AVISO: em ${t - pr} foto(s) só um modelo respondeu. Nessas, o IoU não é\n` +
      `  calculado e o gate vira "integridade >= ${process.env.REMBG_MIN_SCORE ?? 99}" puro —\n` +
      `  a taxa acima MISTURA dois regimes e não representa produção.`,
    )
  }
}

main().catch(e => { console.error(e); process.exit(1) })
