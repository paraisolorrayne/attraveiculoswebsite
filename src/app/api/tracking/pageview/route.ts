import { NextRequest, NextResponse } from 'next/server'
import { sql } from 'kysely'
import { db } from '@/lib/db'
import { getVehicleBySlug } from '@/lib/autoconf-api'
import { getTrustedVehicleIdFromSlug, TRACKING_RATE_LIMIT } from '@/lib/visitor-tracking'
import { checkRateLimit, getClientIP } from '@/lib/rate-limit'

// =====================================================
// Enriquecimento server-side do veículo
//
// O cliente só consegue mandar slug e ID sem risco de corrida (ambos saem do
// pathname /veiculo/<slug>). Marca, modelo e preço são resolvidos aqui — mas
// FORA do caminho da escrita: o page view é gravado primeiro e a consulta à
// AutoConf acontece depois, sem segurar a resposta. Antes o insert esperava até
// 2s por uma API externa, e como só sucesso era cacheado, cada acesso a uma
// página de carro já vendido (que continua indexada e recebendo bot) repetia a
// chamada pesada. Daí o cache negativo e a deduplicação de chamadas em voo.
// =====================================================
const VEHICLE_CACHE_TTL_MS = 10 * 60_000
// Cache negativo curto: "não achei" pode virar "achei" quando o estoque muda,
// mas 1 minuto já mata a repetição em rajada de bots numa página vendida.
const VEHICLE_NEGATIVE_CACHE_TTL_MS = 60_000
const VEHICLE_CACHE_MAX_ENTRIES = 200
const VEHICLE_LOOKUP_TIMEOUT_MS = 2_000

interface CachedVehicle {
  found: boolean
  id: string | null
  brand: string | null
  model: string | null
  price: number | null
  expiresAt: number
}

const vehicleCache = new Map<string, CachedVehicle>()
// Consultas em voo por slug: uma rajada simultânea no mesmo slug vira 1 chamada.
const vehicleInflight = new Map<string, Promise<CachedVehicle>>()

function rememberVehicle(slug: string, entry: CachedVehicle): void {
  // Cache simples: ao estourar o teto, descarta a entrada mais antiga.
  if (!vehicleCache.has(slug) && vehicleCache.size >= VEHICLE_CACHE_MAX_ENTRIES) {
    const oldest = vehicleCache.keys().next().value
    if (oldest) vehicleCache.delete(oldest)
  }
  vehicleCache.set(slug, entry)
}

async function fetchVehicle(slug: string): Promise<CachedVehicle> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    // Timeout curto: mesmo em segundo plano, nada pode ficar pendurado
    // esperando a AutoConf para sempre. (O fetch perdedor não é abortável pela
    // API atual do client, mas fora do caminho da escrita ele não atrasa
    // ninguém — só não pode manter a entrada "em voo" presa.)
    const vehicle = await Promise.race([
      getVehicleBySlug(slug),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), VEHICLE_LOOKUP_TIMEOUT_MS)
      }),
    ])

    const entry: CachedVehicle = vehicle
      ? {
          found: true,
          id: vehicle.id || null,
          brand: vehicle.brand || null,
          model: vehicle.model || null,
          price: Number.isFinite(vehicle.price) ? vehicle.price : null,
          expiresAt: Date.now() + VEHICLE_CACHE_TTL_MS,
        }
      : {
          found: false,
          id: null,
          brand: null,
          model: null,
          price: null,
          expiresAt: Date.now() + VEHICLE_NEGATIVE_CACHE_TTL_MS,
        }

    rememberVehicle(slug, entry)
    return entry
  } finally {
    if (timer) clearTimeout(timer)
  }
}

async function lookupVehicleBySlug(slug: string): Promise<CachedVehicle | null> {
  const cached = vehicleCache.get(slug)
  if (cached && cached.expiresAt > Date.now()) return cached.found ? cached : null

  const inflight = vehicleInflight.get(slug)
  if (inflight) {
    const entry = await inflight
    return entry.found ? entry : null
  }

  const pending = fetchVehicle(slug).finally(() => vehicleInflight.delete(slug))
  vehicleInflight.set(slug, pending)

  try {
    const entry = await pending
    return entry.found ? entry : null
  } catch (error) {
    console.error('[Tracking] Vehicle lookup error:', error)
    return null
  }
}

/**
 * Completa marca/modelo/preço do page view DEPOIS de ele já estar gravado.
 * Falha aqui nunca pode virar erro para o visitante nem perder o evento.
 */
async function enrichPageViewVehicle(
  pageViewId: string,
  slug: string,
  expectedVehicleId: string,
  missing: { brand: boolean; model: boolean; price: boolean },
): Promise<void> {
  try {
    const resolved = await lookupVehicleBySlug(slug)
    if (!resolved) return

    // Trava final: se a AutoConf devolveu um veículo com OUTRO id, o slug não
    // corresponde ao carro — melhor page view sem marca/modelo do que com os
    // dados do carro errado.
    if (resolved.id && resolved.id !== expectedVehicleId) return

    const patch: {
      vehicle_brand?: string
      vehicle_model?: string
      vehicle_price?: number
    } = {}
    if (missing.brand && resolved.brand) patch.vehicle_brand = resolved.brand
    if (missing.model && resolved.model) patch.vehicle_model = resolved.model
    if (missing.price && resolved.price !== null) patch.vehicle_price = resolved.price
    if (Object.keys(patch).length === 0) return

    await db
      .updateTable('visitor_page_views')
      .set(patch)
      .where('id', '=', pageViewId)
      .execute()
  } catch (error) {
    console.error('[Tracking] Vehicle enrichment error:', error)
  }
}

/** ID de veículo aceitável quando não veio de um slug (só dígitos, tamanho são). */
function sanitizeVehicleId(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null
  const asText = String(value).trim()
  return /^\d{1,10}$/.test(asText) ? asText : null
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting — bucket próprio das rotas de tracking (ver
    // TRACKING_RATE_LIMIT).
    const clientIP = getClientIP(request)
    const rateLimitResult = checkRateLimit(clientIP, TRACKING_RATE_LIMIT)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { 'Retry-After': String(rateLimitResult.retryAfter) } }
      )
    }

    const body = await request.json()
    const {
      fingerprint_db_id,
      session_db_id,
      page_url,
      page_path,
      page_title,
      page_type,
      vehicle_id,
      vehicle_slug,
      vehicle_brand,
      vehicle_model,
      vehicle_price,
    } = body

    if (!fingerprint_db_id || !session_db_id || !page_path) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const slug: string | null = typeof vehicle_slug === 'string' && vehicle_slug ? vehicle_slug : null

    // Com slug, o id SÓ pode vir do próprio slug e só se for confiável — o
    // vehicle_id que o cliente mandou saiu do mesmo lugar e carrega o mesmo
    // risco (em "gol-1-6-2020" o último número é o ano, não o id). Sem id
    // confiável, não gravamos id nenhum e não consultamos a AutoConf.
    const vehicleId = slug ? getTrustedVehicleIdFromSlug(slug) : sanitizeVehicleId(vehicle_id)

    const brand: string | null = vehicle_brand || null
    const model: string | null = vehicle_model || null
    const price: number | null = vehicle_price ?? null

    // Insert page view — primeiro, sem depender de nenhuma API externa.
    const inserted = await db
      .insertInto('visitor_page_views')
      .values({
        fingerprint_id: fingerprint_db_id,
        session_id: session_db_id,
        page_url,
        page_path,
        page_title,
        page_type,
        vehicle_id: vehicleId,
        vehicle_slug: slug,
        vehicle_brand: brand,
        vehicle_model: model,
        vehicle_price: price,
      })
      .returning('id')
      .executeTakeFirst()

    // Incrementa page_views_count (+ vehicles_viewed em páginas de veículo) —
    // era o RPC increment_session_page_views, agora inline em SQL.
    await db
      .updateTable('visitor_sessions')
      .set({
        page_views_count: sql`page_views_count + 1`,
        vehicles_viewed:
          page_type === 'vehicle' ? sql`vehicles_viewed + 1` : sql`vehicles_viewed`,
      })
      .where('id', '=', session_db_id)
      .execute()

    // Enriquecimento fora do caminho crítico: o evento já está no banco e a
    // resposta não espera a AutoConf.
    const missing = { brand: !brand, model: !model, price: price === null }
    if (inserted?.id && slug && vehicleId && (missing.brand || missing.model || missing.price)) {
      void enrichPageViewVehicle(inserted.id, slug, vehicleId, missing)
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('[Tracking] Page view error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
