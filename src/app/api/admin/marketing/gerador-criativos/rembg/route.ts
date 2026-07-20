import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/admin-auth-supabase'
import { evaluateCutouts } from '@/lib/rembg-quality'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// Remove o fundo da foto do veículo via Replicate. Usado pelo template
// Editorial do Gerador de Criativos: o carro recortado é composto sobre o
// cenário de estúdio embutido.
//
// GATE DE QUALIDADE (decisão de produto — agressivo pra não denegrir a marca):
// rodamos os DOIS modelos em paralelo e passamos os recortes pelo porteiro
// (src/lib/rembg-quality). Só aceitamos se a integridade >= REMBG_MIN_SCORE
// (default 99%) E a concordância entre os modelos >= REMBG_MIN_AGREEMENT
// (default 90%). Se não passar, devolvemos accepted:false e o cliente usa a
// FOTO ORIGINAL, sem recorte — melhor foto inteira que carro furado.
//
// BiRefNet: recorte afiado em bordas finas (rodas, aerofólios, vãos).
// BRIA: mais robusto em manter o objeto inteiro. Rodar os dois e cruzar dá
// a "confiança" que nenhum modelo entrega sozinho.
const REMBG_MODELS = [
  process.env.REMBG_MODEL || 'men1scus/birefnet',
  'bria/remove-background',
]
const POLL_MS = 2000
const TIMEOUT_MS = 90_000

/** Roda um modelo e devolve o PNG recortado (buffer), ou null se falhar. */
async function runRembg(model: string, apiToken: string, image: string): Promise<Buffer | null> {
  const start = await fetch(`https://api.replicate.com/v1/models/${model}/predictions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ input: { image } }),
  })
  if (!start.ok) {
    console.warn(`[GeradorRembg] ${model} start HTTP ${start.status}`)
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
    // Roda os dois modelos EM PARALELO — a latência fica ~= a de um só,
    // e ficamos com os dois recortes pra cruzar.
    const buffers = await Promise.all(REMBG_MODELS.map(m => runRembg(m, apiToken, input)))

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
