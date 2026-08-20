import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/admin-auth-supabase'
import { evaluateCutouts } from '@/lib/rembg-quality'

export const dynamic = 'force-dynamic'
// Dois modelos em SÉRIE: o pior caso é 2x TIMEOUT_MS mais os recuos das
// retentativas. 120s cortava a segunda predição no meio e recriava justamente
// o candidato único que a sequência existe para evitar.
export const maxDuration = 300

// Remove o fundo da foto do veículo via Replicate. Usado pelo template
// Editorial do Gerador de Criativos: o carro recortado é composto sobre o
// cenário de estúdio embutido.
//
// GATE DE QUALIDADE (decisão de produto — agressivo pra não denegrir a marca):
// rodamos os DOIS modelos EM SEQUÊNCIA e passamos os recortes pelo porteiro
// (src/lib/rembg-quality). Só aceitamos se a integridade >= REMBG_MIN_SCORE
// (default 99%) E a concordância entre os modelos >= REMBG_MIN_AGREEMENT
// (default 90%). Se não passar, devolvemos accepted:false e o cliente usa a
// FOTO ORIGINAL, sem recorte — melhor foto inteira que carro furado.
//
// 851-labs/background-remover: limpo em vão de porta e vidro.
// BRIA: mais robusto em manter o objeto inteiro. Rodar os dois e cruzar dá
// a "confiança" que nenhum modelo entrega sozinho.
//
// Era men1scus/birefnet no lugar do 851-labs. Trocado por duas razões medidas
// (16/08/2026, McLaren GTS de portas abertas): o birefnet abriu buraco na
// soleira — integridade 90%, reprovado pelo próprio porteiro, contra 100% dos
// outros dois — e concorda menos com o BRIA (IoU 94% contra 99% do 851-labs).
// Na picape branca em piso liso os três empatam; a diferença aparece no caso
// difícil, que é justamente o que o gate existe para pegar.

// SEQUENCIAL, não paralelo — medido em 18/08/2026 (scripts/medir-rembg.ts,
// G 63 + McLaren GTS + RAM 1500 + RAM 2500, 6 fotos cada):
//
// Em paralelo, o burst 1 da conta derruba o segundo disparo e a retentativa
// única (com o `retry-after` curto que o Replicate devolve) não alcança: numa
// passada de 48 execuções, 21 das 23 fotos avaliadas terminaram com UM modelo
// só. Com candidato único o IoU não é calculado, `agreementOk` vira true por
// omissão e o gate desaba para "integridade >= 99" puro — exatamente o oposto
// do que este bloco promete.
//
// O custo disso foi medido cruzando as duas passadas nas 23 fotos comparáveis:
// 3 FALSOS ACEITES (McLaren foto 16 com concordância real de 77%; RAM 1500
// foto 20 com 0%; RAM 2500 foto 20 com 15% — os dois modelos discordando da
// silhueta inteira, aprovado com nota 100%) e 2 FALSAS REJEIÇÕES (G 63 foto 9
// e RAM 1500 foto 5, ambas 100%/>=90% quando o par existe).
//
// Em sequência, com o recuo crescente de `runRembg`, o par se formou em 24/24.
// Custa ~10s por recorte (20-25s contra 7-18s). É o preço do consenso que este
// gate pressupõe — sem ele, os dois modelos são teatro.
const REMBG_MODELS = [
  process.env.REMBG_MODEL || '851-labs/background-remover',
  'bria/remove-background',
]
const POLL_MS = 2000
const TIMEOUT_MS = 90_000

/**
 * Endpoint de predição do Replicate, que depende do TIPO do modelo:
 * modelo oficial aceita /v1/models/{slug}/predictions; modelo da comunidade
 * exige /v1/predictions com a `version`.
 *
 * A rota chamava sempre a primeira forma, então todo modelo da comunidade
 * respondia 404 — e como falha vira null silencioso, o par de modelos nunca
 * existiu: rodava só o BRIA, e a concordância por IoU (o motivo de haver dois)
 * jamais foi calculada. Passou despercebido porque o gate cai no ramo de
 * candidato único e continua aprovando.
 *
 * O metadado é lido uma vez por modelo e fica em cache no processo — muda só
 * quando o autor publica versão nova, e um deploy renova.
 */
const metaCache = new Map<string, { oficial: boolean; versao: string | null }>()

async function modeloMeta(model: string, apiToken: string) {
  const emCache = metaCache.get(model)
  if (emCache) return emCache
  const r = await fetch(`https://api.replicate.com/v1/models/${model}`, {
    headers: { 'Authorization': `Bearer ${apiToken}` },
  })
  if (!r.ok) {
    console.warn(`[GeradorRembg] ${model} meta HTTP ${r.status}`)
    return null
  }
  const j = await r.json()
  const meta = { oficial: !!j.is_official, versao: j.latest_version?.id ?? null }
  metaCache.set(model, meta)
  return meta
}

/** Roda um modelo e devolve o PNG recortado (buffer), ou null se falhar. */
async function runRembg(model: string, apiToken: string, image: string): Promise<Buffer | null> {
  const meta = await modeloMeta(model, apiToken)
  if (!meta) return null
  if (!meta.oficial && !meta.versao) {
    console.warn(`[GeradorRembg] ${model} sem versão publicada`)
    return null
  }

  // Conta sem método de pagamento fica com burst 1: disparo negado vem como
  // 429 com `retry-after` curto (< 2s), cedo demais para a predição anterior
  // ter terminado. Uma repetição só não alcançava — daí o recuo CRESCENTE.
  const dispara = () => fetch(
    meta.oficial
      ? `https://api.replicate.com/v1/models/${model}/predictions`
      : 'https://api.replicate.com/v1/predictions',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(meta.oficial ? { input: { image } } : { version: meta.versao, input: { image } }),
    },
  )

  let start: Response | null = null
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    start = await dispara()
    if (start.status !== 429) break
    const header = Number(start.headers.get('retry-after'))
    const espera = Math.min(
      30,
      Math.max(Number.isFinite(header) && header > 0 ? header : 0, 3 * 2 ** tentativa),
    )
    console.warn(`[GeradorRembg] ${model} 429 — repetindo em ${espera}s (tentativa ${tentativa + 1}/5)`)
    await new Promise(r => setTimeout(r, espera * 1000))
  }
  if (!start || !start.ok) {
    console.warn(`[GeradorRembg] ${model} start HTTP ${start?.status ?? 'sem resposta'}`)
    return null
  }
  const pred = await start.json()
  const getUrl = pred.urls?.get
  if (!getUrl) return null

  const deadline = Date.now() + TIMEOUT_MS
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, POLL_MS))
    const poll = await fetch(getUrl, { headers: { 'Authorization': `Bearer ${apiToken}` } })
    const data = await poll.json()
    if (data.status === 'succeeded') {
      const url = typeof data.output === 'string' ? data.output : data.output?.[0] ?? null
      if (!url) return null
      const imgResp = await fetch(url)
      if (!imgResp.ok) {
        console.warn(`[GeradorRembg] ${model} download HTTP ${imgResp.status}`)
        return null
      }
      return Buffer.from(await imgResp.arrayBuffer())
    }
    if (data.status === 'failed' || data.status === 'canceled') {
      console.warn(`[GeradorRembg] ${model} ${data.status}: ${data.error || ''}`)
      return null
    }
  }
  console.warn(`[GeradorRembg] ${model} timeout`)
  return null
}

export async function POST(request: NextRequest) {
  const admin = await getCurrentAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiToken = process.env.REPLICATE_API_TOKEN
  if (!apiToken) {
    return NextResponse.json({ error: 'REPLICATE_API_TOKEN não configurada no servidor' }, { status: 500 })
  }

  const { image, imageUrl } = await request.json()

  // Duas formas de entrada: dataURL (upload manual, já reduzido no browser)
  // ou URL pública (foto do estoque — sem upload, o Replicate baixa direto)
  let input: string
  if (typeof imageUrl === 'string' && /^https:\/\//.test(imageUrl)) {
    input = imageUrl
  } else if (typeof image === 'string' && image.startsWith('data:image/')) {
    if (image.length > 14_000_000) {
      return NextResponse.json({ error: 'Imagem grande demais (máx ~10MB)' }, { status: 413 })
    }
    input = image
  } else {
    return NextResponse.json({ error: 'Envie image (data URL) ou imageUrl (https)' }, { status: 400 })
  }

  try {
    // Um modelo de cada vez: o segundo só dispara depois de o primeiro
    // terminar, que é o que o burst 1 permite. Ver a medição no topo.
    const buffers: (Buffer | null)[] = []
    for (const m of REMBG_MODELS) {
      buffers.push(await runRembg(m, apiToken, input))
    }

    if (!buffers.some(Boolean)) {
      return NextResponse.json({ error: 'Recorte falhou nos dois modelos — tente outra foto' }, { status: 502 })
    }

    const evaluation = await evaluateCutouts(buffers)
    console.log(`[GeradorRembg] ${admin.email}: ${evaluation.reason}`)

    if (!evaluation.accepted || !evaluation.bestBuffer) {
      // Gate reprovou — o cliente usa a foto original.
      return NextResponse.json({
        accepted: false,
        score: evaluation.score,
        agreement: evaluation.agreement,
        reason: evaluation.reason,
      })
    }

    // Devolve o melhor recorte como data URL — mesma origem, o canvas do
    // gerador continua exportável.
    return NextResponse.json({
      accepted: true,
      score: evaluation.score,
      agreement: evaluation.agreement,
      image: `data:image/png;base64,${evaluation.bestBuffer.toString('base64')}`,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
