import { NextRequest, NextResponse } from 'next/server'
import { sql } from 'kysely'
import { db } from '@/lib/db'
import type { Database } from '@/lib/db/types'
import type { Insertable } from 'kysely'
import { checkRateLimit, getClientIP, RATE_LIMIT_PRESETS } from '@/lib/rate-limit'

// Tracking roda com acesso total ao banco (rota server-side, sem auth de user).
// Migrado de supabase-js → Kysely (ver docs/MIGRACAO_POSTGRES_PURO.md).

// Insere a sessão, ou devolve o id da linha existente quando o session_id já
// existe (reload dentro do mesmo sessionStorage). ON CONFLICT DO NOTHING troca
// o antigo tratamento do erro 23505.
async function getOrCreateSession(
  row: Insertable<Database['visitor_sessions']>,
): Promise<string | null> {
  const inserted = await db
    .insertInto('visitor_sessions')
    .values(row)
    .onConflict((oc) => oc.column('session_id').doNothing())
    .returning('id')
    .executeTakeFirst()

  if (inserted?.id) return inserted.id

  const existing = await db
    .selectFrom('visitor_sessions')
    .select('id')
    .where('session_id', '=', row.session_id)
    .executeTakeFirst()
  return existing?.id ?? null
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request)
    const rateLimitResult = checkRateLimit(clientIP, RATE_LIMIT_PRESETS.api)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { 'Retry-After': String(rateLimitResult.retryAfter) } }
      )
    }

    const body = await request.json()
    const {
      visitor_id,
      session_id,
      device_data,
      utm_params,
      click_ids,
      referrer_url,
    } = body

    if (!visitor_id || !session_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get client IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]
      || request.headers.get('x-real-ip')
      || null

    // Extract referrer domain
    let referrer_domain = null
    if (referrer_url) {
      try {
        referrer_domain = new URL(referrer_url).hostname
      } catch {}
    }

    // Upsert do fingerprint: cria na 1ª visita; nas seguintes, atualiza os
    // dados do dispositivo/last_seen e INCREMENTA total_visits (antes o
    // supabase-js resetava pra 1 no upsert — aqui fica correto).
    const now = new Date()
    const fingerprint = await db
      .insertInto('visitor_fingerprints')
      .values({
        visitor_id,
        browser_name: device_data?.browser_name || null,
        browser_version: device_data?.browser_version || null,
        os_name: device_data?.os_name || null,
        os_version: device_data?.os_version || null,
        device_type: device_data?.device_type || null,
        screen_resolution: device_data?.screen_resolution || null,
        timezone: device_data?.timezone || null,
        language: device_data?.language || null,
        confidence_score: 0.9,
        last_seen_at: now,
        total_visits: 1,
      })
      .onConflict((oc) =>
        oc.column('visitor_id').doUpdateSet({
          browser_name: (eb) => eb.ref('excluded.browser_name'),
          browser_version: (eb) => eb.ref('excluded.browser_version'),
          os_name: (eb) => eb.ref('excluded.os_name'),
          os_version: (eb) => eb.ref('excluded.os_version'),
          device_type: (eb) => eb.ref('excluded.device_type'),
          screen_resolution: (eb) => eb.ref('excluded.screen_resolution'),
          timezone: (eb) => eb.ref('excluded.timezone'),
          language: (eb) => eb.ref('excluded.language'),
          last_seen_at: now,
          total_visits: sql`visitor_fingerprints.total_visits + 1`,
          updated_at: now,
        }),
      )
      .returning(['id', 'resolved_profile_id'])
      .executeTakeFirst()

    if (!fingerprint?.id) {
      return NextResponse.json({ error: 'Failed to create fingerprint' }, { status: 500 })
    }

    // Cria a sessão (devolve a existente em caso de conflito)
    const sessionId = await getOrCreateSession({
      fingerprint_id: fingerprint.id,
      session_id,
      referrer_url,
      referrer_domain,
      utm_source: utm_params?.utm_source || null,
      utm_medium: utm_params?.utm_medium || null,
      utm_campaign: utm_params?.utm_campaign || null,
      utm_content: utm_params?.utm_content || null,
      utm_term: utm_params?.utm_term || null,
      utm_id: utm_params?.utm_id || null,
      adset_id: utm_params?.adset_id || null,
      ad_id: utm_params?.ad_id || null,
      gclid: click_ids?.gclid || null,
      fbclid: click_ids?.fbclid || null,
      ttclid: click_ids?.ttclid || null,
      ip_address: ip,
    })

    return NextResponse.json({
      success: true,
      fingerprint_db_id: fingerprint.id,
      session_db_id: sessionId,
    })

  } catch (error) {
    console.error('[Tracking] Session error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
