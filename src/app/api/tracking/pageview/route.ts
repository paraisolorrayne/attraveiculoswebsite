import { NextRequest, NextResponse } from 'next/server'
import { sql } from 'kysely'
import { db } from '@/lib/db'
import { checkRateLimit, getClientIP, RATE_LIMIT_PRESETS } from '@/lib/rate-limit'


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

    // Insert page view
    await db
      .insertInto('visitor_page_views')
      .values({
        fingerprint_id: fingerprint_db_id,
        session_id: session_db_id,
        page_url,
        page_path,
        page_title,
        page_type,
        vehicle_id: vehicle_id || null,
        vehicle_slug: vehicle_slug || null,
        vehicle_brand: vehicle_brand || null,
        vehicle_model: vehicle_model || null,
        vehicle_price: vehicle_price || null,
      })
      .execute()

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

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('[Tracking] Page view error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

