/**
 * Vehicle Hero Asset — gerencia a versão "sem background" (PNG transparente)
 * da foto principal do veículo, usada no hero da home pra dar a sensação de
 * carro flutuante sobre o fundo do hero (estilo showroom premium).
 *
 * Pipeline:
 *   1. SSR pede `getCachedHeroAsset(vehicleId)` — só lê do Supabase
 *   2. Se cache hit: retorna URL pública pronta (zero latência)
 *   3. Se miss: o caller dispara `generateAndCacheHeroAsset` em fire-and-forget
 *      enquanto a UI renderiza com a foto original. Próxima visita: cacheado.
 *
 * Custo: ~$0.005/veículo (uma única vez por foto). Total estoque ~R$ 1,25.
 *
 * Dependências externas:
 *   - REPLICATE_API_TOKEN env var (criar conta em replicate.com)
 *   - Bucket Supabase Storage `vehicle-hero-assets` público (criar via dashboard)
 */

import { createAdminClient } from '@/lib/supabase/admin'
import sharp from 'sharp'

// Modelo rembg: BRIA RMBG-2.0 (`bria/remove-background`). Especializado em
// fotos de produto comercial — bordas mais precisas em rodas vazadas,
// vidros, espelhos e reflexos no piso. Custo ~$0.011/img.
//
// Modelo inpainting: Flux Fill Pro (`black-forest-labs/flux-fill-pro`).
// Recebe a foto + máscara invertida → preenche apenas a área da máscara
// (background) mantendo o carro pixel-perfect. Custo ~$0.05/img.
//
// Usamos endpoint path-based (`/v1/models/{owner}/{name}/predictions`)
// que aceita automaticamente a última versão estável do modelo.
const REPLICATE_REMBG_MODEL = 'bria/remove-background'
const REPLICATE_FLUX_FILL_MODEL = 'black-forest-labs/flux-fill-pro'

const REPLICATE_REMBG_URL = `https://api.replicate.com/v1/models/${REPLICATE_REMBG_MODEL}/predictions`
const REPLICATE_FLUX_FILL_URL = `https://api.replicate.com/v1/models/${REPLICATE_FLUX_FILL_MODEL}/predictions`

const REPLICATE_POLL_INTERVAL_MS = 2000
const REPLICATE_TIMEOUT_MS = 90_000 // 90s — inpainting pode demorar mais que rembg

const STORAGE_BUCKET = 'vehicle-hero-assets'

// Dimensões do canvas final 16:9 — proporção nativa do hero da home.
// O carro é posicionado à DIREITA (~55-95% horizontal) deixando a
// metade esquerda pro texto do manifesto. Pre-processamento via sharp
// ANTES de chamar Flux Fill garante esses dois aspectos.
const COMPOSITE_CANVAS_WIDTH = 1920
const COMPOSITE_CANVAS_HEIGHT = 1080

// Prompt do Flux Fill Pro. Reforça:
// 1. Carro à direita (geração coerente com o pre-positioning)
// 2. Metade esquerda dramática/escura (espaço pro texto branco do manifesto)
// 3. Sem texto, logos ou pessoas
const COMPOSITE_PROMPT = [
  'Premium luxury car showroom interior, sophisticated automotive dealership.',
  'The vehicle is positioned on the RIGHT half of the frame.',
  'The LEFT half of the image should be a deep, dramatic, subtly out-of-focus background — dark tones with low contrast, soft shadows — designed to accommodate elegant overlaid text in light typography.',
  'Polished dark concrete floor with subtle reflections under the vehicle on the right.',
  'Modern minimalist architecture with floor-to-ceiling glass walls revealing soft natural light, primarily on the right side framing the vehicle.',
  'Subtle indoor plants and architectural elements in the periphery, fading into shadow toward the left.',
  'Cinematic gradient lighting flowing from bright right to dark left.',
  'Professional automotive editorial photography style, magazine-quality.',
  'The vehicle in the image remains exactly as photographed — only generate the surrounding environment around it.',
  'No people, no other vehicles, no text, no logos, no signs, no writing of any kind. Empty refined showroom.',
  'Wide 16:9 cinematic composition, dramatic, sophisticated, high-end editorial.',
].join(' ')

export interface HeroAsset {
  vehicle_id: number
  source_photo_url: string
  no_bg_storage_path: string
  no_bg_public_url: string
  /**
   * URL pública do composite final (carro + background integrado via
   * Flux Fill Pro). Null se inpainting ainda não foi processado ou falhou
   * — nesse caso o hero cai pro fallback (no_bg + bg fixo).
   */
  composite_storage_path?: string | null
  composite_public_url?: string | null
}

function vehicleIdToNumber(id: string): number {
  return parseInt(id, 10)
}

/**
 * Cache lookup. Invalida se source_photo_url mudar (foto principal trocada
 * no Autoconf — precisa reprocessar).
 */
export async function getCachedHeroAsset(
  vehicleId: string,
  currentSourceUrl: string,
): Promise<HeroAsset | null> {
  const numericId = vehicleIdToNumber(vehicleId)
  if (Number.isNaN(numericId)) return null

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('vehicle_hero_asset')
      .select('*')
      .eq('vehicle_id', numericId)
      .maybeSingle()

    if (error || !data) return null
    if (data.source_photo_url !== currentSourceUrl) return null

    return {
      vehicle_id: data.vehicle_id,
      source_photo_url: data.source_photo_url,
      no_bg_storage_path: data.no_bg_storage_path,
      no_bg_public_url: data.no_bg_public_url,
      composite_storage_path: data.composite_storage_path ?? null,
      composite_public_url: data.composite_public_url ?? null,
    }
  } catch (error) {
    console.error('[vehicle-hero-asset] cache read failed:', error)
    return null
  }
}

/**
 * Chama Replicate rembg model. Retorna URL do PNG transparente (hospedado
 * temporariamente nos servidores deles, expira em ~24h — por isso precisamos
 * baixar e re-uploadar no nosso storage).
 */
async function callReplicateRembg(imageUrl: string): Promise<string | null> {
  const apiToken = process.env.REPLICATE_API_TOKEN
  if (!apiToken) {
    console.warn('[vehicle-hero-asset] REPLICATE_API_TOKEN não configurada')
    return null
  }

  try {
    // 1. Inicia prediction
    const startResp = await fetch(REPLICATE_REMBG_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      // Endpoint path-based (`/v1/models/.../predictions`) não precisa de
      // `version` — usa automaticamente a versão estável mais recente.
      body: JSON.stringify({
        input: { image: imageUrl },
      }),
    })

    if (!startResp.ok) {
      const errText = await startResp.text().catch(() => '')
      console.error(`[vehicle-hero-asset] Replicate start HTTP ${startResp.status}:`, errText.substring(0, 200))
      return null
    }

    const startData = await startResp.json()
    const predictionUrl = startData.urls?.get
    if (!predictionUrl) {
      console.error('[vehicle-hero-asset] Replicate response missing get URL')
      return null
    }

    // 2. Poll até completar (Replicate predictions ficam em "starting" → "processing" → "succeeded" | "failed")
    const startedAt = Date.now()
    while (Date.now() - startedAt < REPLICATE_TIMEOUT_MS) {
      await new Promise((r) => setTimeout(r, REPLICATE_POLL_INTERVAL_MS))

      const pollResp = await fetch(predictionUrl, {
        headers: { 'Authorization': `Bearer ${apiToken}` },
      })

      if (!pollResp.ok) {
        console.error(`[vehicle-hero-asset] Replicate poll HTTP ${pollResp.status}`)
        return null
      }

      const pollData = await pollResp.json()
      const status = pollData.status

      if (status === 'succeeded') {
        // Diferentes modelos rembg retornam output em formatos distintos:
        //   - string: "https://replicate.delivery/..."
        //   - array: ["https://..."]
        //   - objeto: { image: "https://..." } ou { url: "https://..." }
        // Cobrimos os 3 casos defensivamente — se algum modelo novo aparecer
        // com formato diferente, vai logar e retornar null pra fallback.
        const output = pollData.output
        let outputUrl: string | null = null
        if (typeof output === 'string') {
          outputUrl = output
        } else if (Array.isArray(output) && typeof output[0] === 'string') {
          outputUrl = output[0]
        } else if (output && typeof output === 'object') {
          outputUrl = output.image ?? output.url ?? output.output ?? null
        }
        if (!outputUrl) {
          console.error(
            '[vehicle-hero-asset] Replicate succeeded mas output inesperado:',
            JSON.stringify(output).substring(0, 200),
          )
          return null
        }
        return outputUrl
      }

      if (status === 'failed' || status === 'canceled') {
        console.error(`[vehicle-hero-asset] Replicate ${status}:`, pollData.error)
        return null
      }
      // 'starting' | 'processing' — continua poll
    }

    console.error('[vehicle-hero-asset] Replicate timeout após', REPLICATE_TIMEOUT_MS, 'ms')
    return null
  } catch (error) {
    console.error('[vehicle-hero-asset] Replicate fetch failed:', error)
    return null
  }
}

/**
 * Baixa o PNG do Replicate e faz upload pro nosso Supabase Storage.
 * Retorna { storagePath, publicUrl }.
 */
async function uploadToSupabaseStorage(
  imageUrl: string,
  vehicleId: number,
): Promise<{ storagePath: string; publicUrl: string } | null> {
  try {
    const imageResp = await fetch(imageUrl)
    if (!imageResp.ok) {
      console.error('[vehicle-hero-asset] download Replicate output HTTP', imageResp.status)
      return null
    }
    const buffer = await imageResp.arrayBuffer()
    const bytes = new Uint8Array(buffer)

    const supabase = createAdminClient()
    const storagePath = `hero/${vehicleId}-${Date.now()}.png`

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, bytes, {
        contentType: 'image/png',
        cacheControl: '31536000', // 1 ano — imagem é imutável até source mudar
        upsert: false,
      })

    if (uploadError) {
      console.error('[vehicle-hero-asset] Supabase upload failed:', uploadError.message)
      return null
    }

    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath)

    return {
      storagePath,
      publicUrl: urlData.publicUrl,
    }
  } catch (error) {
    console.error('[vehicle-hero-asset] upload failed:', error)
    return null
  }
}

/**
 * Pipeline completo: chama Replicate → baixa PNG → upload no Storage → upsert DB.
 * Retorna a HeroAsset criada ou null em qualquer falha.
 */
export async function generateAndCacheHeroAsset(
  vehicleId: string,
  vehicleSlug: string,
  sourcePhotoUrl: string,
): Promise<HeroAsset | null> {
  const numericId = vehicleIdToNumber(vehicleId)
  if (Number.isNaN(numericId)) {
    console.warn(`[vehicle-hero-asset] vehicle.id "${vehicleId}" não é numérico`)
    return null
  }

  // 0. Checa cache existente — reutiliza no_bg se já foi processado
  //    pra economizar a chamada do BRIA (~$0.011). Útil quando o composite
  //    falhou em execução anterior e estamos só completando ele.
  const existing = await getCachedHeroAsset(vehicleId, sourcePhotoUrl)

  let noBgAsset: HeroAsset

  if (existing) {
    // Cache parcial detectado — pula BRIA, reusa no_bg cached
    noBgAsset = existing
  } else {
    // Cache vazio — roda pipeline completo (BRIA + upload + upsert)
    const replicateUrl = await callReplicateRembg(sourcePhotoUrl)
    if (!replicateUrl) return null

    const stored = await uploadToSupabaseStorage(replicateUrl, numericId)
    if (!stored) return null

    try {
      const supabase = createAdminClient()
      await supabase
        .from('vehicle_hero_asset')
        .upsert(
          {
            vehicle_id: numericId,
            vehicle_slug: vehicleSlug,
            source_photo_url: sourcePhotoUrl,
            no_bg_storage_path: stored.storagePath,
            no_bg_public_url: stored.publicUrl,
          },
          { onConflict: 'vehicle_id' },
        )
    } catch (error) {
      console.error('[vehicle-hero-asset] DB upsert failed:', error)
      return null
    }

    noBgAsset = {
      vehicle_id: numericId,
      source_photo_url: sourcePhotoUrl,
      no_bg_storage_path: stored.storagePath,
      no_bg_public_url: stored.publicUrl,
    }
  }

  // NOTA: a geração de composite (inpainting Flux Fill Pro) foi REMOVIDA.
  // O modelo alucinava texto e distorcia a foto premium do veículo —
  // inaceitável pra marca. O hero da home agora usa vídeo do YouTube.
  // Mantemos só o no_bg (BRIA rembg), ainda usado no FeaturedVehicleHero
  // da página /veiculos (carro flutuante sobre o card).

  return noBgAsset
}

/**
 * Pre-processa o PNG transparente do carro pra um canvas 16:9 widescreen
 * com o carro posicionado à direita, e gera a máscara correspondente.
 *
 * Convenções:
 *   - IMAGE: canvas 1920×1080 PNG, carro à direita (~55-95% horizontal),
 *     resto transparente. Vira o `image` input do Flux Fill.
 *   - MASK: canvas 1920×1080 PNG grayscale. Carro=preto (preservar),
 *     resto=branco (preencher com bg gerado).
 *
 * Garante:
 *   ✅ Aspect ratio 16:9 nativo do hero (sem object-cover cortando)
 *   ✅ Espaço esquerdo livre pro texto do manifesto
 *   ✅ Carro proporcional, não esticado nem cortado
 */
async function buildCompositeInputs(
  noBgPngUrl: string,
): Promise<{ image: Buffer; mask: Buffer } | null> {
  try {
    const resp = await fetch(noBgPngUrl)
    if (!resp.ok) {
      console.error('[vehicle-hero-asset] download no_bg pra composite HTTP', resp.status)
      return null
    }
    const sourceBuffer = Buffer.from(await resp.arrayBuffer())

    const metadata = await sharp(sourceBuffer).metadata()
    const origWidth = metadata.width ?? 1500
    const origHeight = metadata.height ?? 1100

    // Carro ocupa no máximo:
    //   - 50% da largura do canvas (deixa 50% pro texto à esquerda)
    //   - 85% da altura do canvas (margem 7.5% top/bottom)
    // Usa o menor scale pra manter proporção.
    const maxCarWidth = COMPOSITE_CANVAS_WIDTH * 0.5
    const maxCarHeight = COMPOSITE_CANVAS_HEIGHT * 0.85
    const carScale = Math.min(maxCarWidth / origWidth, maxCarHeight / origHeight)
    const carWidth = Math.round(origWidth * carScale)
    const carHeight = Math.round(origHeight * carScale)

    // Posicionamento:
    //   - Horizontal: margem 5% da borda DIREITA do canvas → carro centrado
    //     em ~75% horizontal (centro visual da metade direita).
    //   - Vertical: centralizado.
    const right = Math.round(COMPOSITE_CANVAS_WIDTH * 0.05)
    const left = COMPOSITE_CANVAS_WIDTH - carWidth - right
    const top = Math.round((COMPOSITE_CANVAS_HEIGHT - carHeight) / 2)
    const bottom = COMPOSITE_CANVAS_HEIGHT - top - carHeight

    // Redimensiona o carro mantendo alpha
    const resizedCar = await sharp(sourceBuffer)
      .resize(carWidth, carHeight, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .ensureAlpha()
      .png()
      .toBuffer()

    // IMAGE: canvas 16:9 transparente com o carro posicionado.
    const image = await sharp(resizedCar)
      .extend({
        top,
        bottom,
        left,
        right,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer()

    // MASK: extrai alpha do canvas 16:9 (carro=255, resto=0), inverte
    // (carro=0/preto/preservar, resto=255/branco/preencher).
    const mask = await sharp(image)
      .ensureAlpha()
      .extractChannel('alpha')
      .negate()
      .png()
      .toBuffer()

    return { image, mask }
  } catch (error) {
    console.error('[vehicle-hero-asset] buildCompositeInputs failed:', error)
    return null
  }
}

/**
 * Chama Flux Fill Pro no Replicate. Recebe buffers de imagem (canvas 16:9
 * com carro à direita) e máscara, retorna URL do PNG gerado.
 *
 * Ambos enviados como data URIs (base64) — mais simples que upload
 * temporário e Replicate aceita até ~10MB por input.
 */
async function callFluxFillPro(
  imageBuffer: Buffer,
  maskBuffer: Buffer,
): Promise<string | null> {
  const apiToken = process.env.REPLICATE_API_TOKEN
  if (!apiToken) {
    console.warn('[vehicle-hero-asset] REPLICATE_API_TOKEN não configurada (Flux Fill)')
    return null
  }

  const imageDataUri = `data:image/png;base64,${imageBuffer.toString('base64')}`
  const maskDataUri = `data:image/png;base64,${maskBuffer.toString('base64')}`

  try {
    const startResp = await fetch(REPLICATE_FLUX_FILL_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: {
          image: imageDataUri,
          mask: maskDataUri,
          prompt: COMPOSITE_PROMPT,
          steps: 28,
          guidance: 30,
          output_format: 'png',
          safety_tolerance: 2,
        },
      }),
    })

    if (!startResp.ok) {
      const errText = await startResp.text().catch(() => '')
      console.error(`[vehicle-hero-asset] Flux Fill start HTTP ${startResp.status}:`, errText.substring(0, 300))
      return null
    }

    const startData = await startResp.json()
    const predictionUrl = startData.urls?.get
    if (!predictionUrl) {
      console.error('[vehicle-hero-asset] Flux Fill response missing get URL')
      return null
    }

    // Poll até completar — Flux Fill geralmente demora 20-60s
    const startedAt = Date.now()
    while (Date.now() - startedAt < REPLICATE_TIMEOUT_MS) {
      await new Promise((r) => setTimeout(r, REPLICATE_POLL_INTERVAL_MS))

      const pollResp = await fetch(predictionUrl, {
        headers: { 'Authorization': `Bearer ${apiToken}` },
      })

      if (!pollResp.ok) {
        console.error(`[vehicle-hero-asset] Flux Fill poll HTTP ${pollResp.status}`)
        return null
      }

      const pollData = await pollResp.json()
      const status = pollData.status

      if (status === 'succeeded') {
        const output = pollData.output
        const outputUrl =
          typeof output === 'string'
            ? output
            : Array.isArray(output) && typeof output[0] === 'string'
              ? output[0]
              : output && typeof output === 'object'
                ? (output.image ?? output.url ?? null)
                : null
        if (!outputUrl) {
          console.error('[vehicle-hero-asset] Flux Fill output inesperado:', JSON.stringify(output).substring(0, 200))
          return null
        }
        return outputUrl
      }

      if (status === 'failed' || status === 'canceled') {
        console.error(`[vehicle-hero-asset] Flux Fill ${status}:`, pollData.error)
        return null
      }
    }

    console.error('[vehicle-hero-asset] Flux Fill timeout após', REPLICATE_TIMEOUT_MS, 'ms')
    return null
  } catch (error) {
    console.error('[vehicle-hero-asset] Flux Fill fetch failed:', error)
    return null
  }
}

/**
 * Pipeline composite: gera mask invertida → chama Flux Fill Pro →
 * upload no Storage → upsert no DB. Retorna { storagePath, publicUrl }
 * ou null em qualquer falha.
 */
async function generateComposite(
  vehicleId: number,
  noBgPublicUrl: string,
): Promise<{ storagePath: string; publicUrl: string } | null> {
  // 1. Pré-processa: posiciona o carro no canvas 16:9 + gera mask
  const inputs = await buildCompositeInputs(noBgPublicUrl)
  if (!inputs) return null

  // 2. Chama Flux Fill Pro com image+mask 16:9
  const fluxUrl = await callFluxFillPro(inputs.image, inputs.mask)
  if (!fluxUrl) return null

  // 3. Baixa resultado e upload no Storage
  try {
    const imageResp = await fetch(fluxUrl)
    if (!imageResp.ok) {
      console.error('[vehicle-hero-asset] download Flux Fill output HTTP', imageResp.status)
      return null
    }
    const buffer = await imageResp.arrayBuffer()
    const bytes = new Uint8Array(buffer)

    const supabase = createAdminClient()
    const storagePath = `composite/${vehicleId}-${Date.now()}.png`

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, bytes, {
        contentType: 'image/png',
        cacheControl: '31536000',
        upsert: false,
      })

    if (uploadError) {
      console.error('[vehicle-hero-asset] Composite upload failed:', uploadError.message)
      return null
    }

    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath)

    // 4. Update DB com composite_*
    await supabase
      .from('vehicle_hero_asset')
      .update({
        composite_storage_path: storagePath,
        composite_public_url: urlData.publicUrl,
        composite_generated_at: new Date().toISOString(),
      })
      .eq('vehicle_id', vehicleId)

    return { storagePath, publicUrl: urlData.publicUrl }
  } catch (error) {
    console.error('[vehicle-hero-asset] generateComposite failed:', error)
    return null
  }
}

/**
 * Batch read-only do cache para uma lista de veículos.
 *
 * Retorna { vehicleId → publicUrl | null }, onde null significa "não tem
 * cache". O SSR usa esse retorno; cache miss aparece como `null` e o
 * componente cai pro fallback (foto original com mask radial).
 *
 * **Importante:** Esta função NÃO dispara geração em background. A geração
 * é responsabilidade do script `scripts/preprocess-hero-assets.ts` (rodando
 * via cron na VPS). Esta separação evita LCP ruim e gastos de Replicate
 * acionados por bots/visitas únicas.
 */
export async function getCachedHeroAssets(
  vehicles: Array<{ id: string; photos: string[] }>,
): Promise<Record<string, string | null>> {
  const results: Record<string, string | null> = {}

  await Promise.all(
    vehicles.map(async (vehicle) => {
      const sourceUrl = vehicle.photos?.[0]
      if (!sourceUrl) {
        results[vehicle.id] = null
        return
      }
      const cached = await getCachedHeroAsset(vehicle.id, sourceUrl)
      // Prefere composite (carro + bg integrado pelo Flux Fill).
      // Fallback pra no_bg (carro PNG transparente sobre bg fixo CSS).
      results[vehicle.id] =
        cached?.composite_public_url ?? cached?.no_bg_public_url ?? null
    }),
  )

  return results
}
