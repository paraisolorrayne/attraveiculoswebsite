import { NextRequest, NextResponse } from 'next/server'
import { sql } from 'kysely'
import { db } from '@/lib/db'
import { checkRateLimit, getClientIP, RATE_LIMIT_PRESETS } from '@/lib/rate-limit'

// Migrado de supabase-js → Kysely (ver docs/MIGRACAO_POSTGRES_PURO.md).
//
// Rota de captura de sessão abandonada. Chamada via sendBeacon no exit intent
// ou timeout de sessão. Confere se o visitante tem dado identificável e loga
// o evento de abandono.
export async function POST(request: NextRequest) {
  try {
    // Rate limiting (moderado — um abandono por sessão tipicamente)
    const clientIP = getClientIP(request)
    const rateLimitResult = checkRateLimit(clientIP, RATE_LIMIT_PRESETS.form)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { 'Retry-After': String(rateLimitResult.retryAfter) } }
      )
    }

    const body = await request.json()
    const {
      fingerprint_db_id,
      reason,             // 'exit_intent' | 'session_timeout'
      behavioral_signals, // { pageHistory, totalDwellTimeMs, visitCount, productPagesViewed, currentSessionPages }
    } = body

    if (!fingerprint_db_id) {
      return NextResponse.json({ error: 'Missing fingerprint_db_id' }, { status: 400 })
    }

    // Perfil ligado a este fingerprint
    const fingerprint = await db.selectFrom('visitor_fingerprints')
      .select('resolved_profile_id')
      .where('id', '=', fingerprint_db_id)
      .executeTakeFirst()

    if (!fingerprint?.resolved_profile_id) {
      // Sem perfil ligado — visitante totalmente anônimo, nada a recuperar
      return NextResponse.json({ success: false, reason: 'no_profile' })
    }

    const profileId = fingerprint.resolved_profile_id

    // Busca o perfil pra checar dado identificável
    const profile = await db.selectFrom('visitor_profiles')
      .select(['id', 'email', 'phone', 'full_name', 'first_name', 'status', 'enrichment_source'])
      .where('id', '=', profileId)
      .executeTakeFirst()

    if (!profile) {
      return NextResponse.json({ success: false, reason: 'profile_not_found' })
    }

    // Mínimo identificável: precisa de email ou telefone
    const hasIdentifiableData = !!(profile.email || profile.phone)
    if (!hasIdentifiableData) {
      return NextResponse.json({ success: false, reason: 'no_identifiable_data' })
    }

    // Loga o abandono em identity_events
    await db.insertInto('identity_events').values({
      fingerprint_id: fingerprint_db_id,
      profile_id: profileId,
      event_type: 'session_abandoned',
      event_data: sql`${JSON.stringify({
        reason,
        pages_viewed: behavioral_signals?.currentSessionPages || 0,
        total_dwell_ms: behavioral_signals?.totalDwellTimeMs || 0,
        product_pages: behavioral_signals?.productPagesViewed || 0,
      })}::jsonb`,
      source: 'abandonment_detection',
    }).execute()

    return NextResponse.json({
      success: true,
      profile_id: profileId,
      reason,
    })

  } catch (error) {
    console.error('[Abandoned] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
