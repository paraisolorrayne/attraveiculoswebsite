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

// Modelo: BRIA RMBG-2.0 (`bria/remove-background`). Especializado em fotos
// de produto comercial — bordas mais precisas em rodas vazadas, vidros,
// espelhos e reflexos no piso. Custo ~$0.011/img (vs $0.005 do 851-labs
// anterior). Pra fotos de carros premium da Attra, vale a precisão extra.
//
// Usamos o endpoint path-based (`/v1/models/{owner}/{name}/predictions`)
// que aceita automaticamente a última versão estável do modelo — não
// precisamos atualizar version hashes manualmente.
const REPLICATE_MODEL = 'bria/remove-background'
const REPLICATE_API_URL = `https://api.replicate.com/v1/models/${REPLICATE_MODEL}/predictions`

const REPLICATE_POLL_INTERVAL_MS = 2000
const REPLICATE_TIMEOUT_MS = 60_000

const STORAGE_BUCKET = 'vehicle-hero-assets'

export interface HeroAsset {
  vehicle_id: number
  source_photo_url: string
  no_bg_storage_path: string
  no_bg_public_url: string
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
    const startResp = await fetch(REPLICATE_API_URL, {
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

  // 1. Roda rembg via Replicate
  const replicateUrl = await callReplicateRembg(sourcePhotoUrl)
  if (!replicateUrl) return null

  // 2. Upload pro Supabase Storage
  const stored = await uploadToSupabaseStorage(replicateUrl, numericId)
  if (!stored) return null

  // 3. Upsert na tabela
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

  return {
    vehicle_id: numericId,
    source_photo_url: sourcePhotoUrl,
    no_bg_storage_path: stored.storagePath,
    no_bg_public_url: stored.publicUrl,
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
      results[vehicle.id] = cached?.no_bg_public_url ?? null
    }),
  )

  return results
}
