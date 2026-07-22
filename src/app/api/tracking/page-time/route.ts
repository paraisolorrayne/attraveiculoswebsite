import { NextRequest, NextResponse } from 'next/server'
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
      session_db_id,
      page_path,
      time_on_page_seconds,
      scroll_depth_percent,
      is_exit,
    } = body

    if (!session_db_id || !page_path || time_on_page_seconds === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Atualiza o page view mais recente da sessão+página
    const latest = await db
      .selectFrom('visitor_page_views')
      .select('id')
      .where('session_id', '=', session_db_id)
      .where('page_path', '=', page_path)
      .orderBy('viewed_at', 'desc')
      .limit(1)
      .executeTakeFirst()

    if (latest) {
      const scroll =
        typeof scroll_depth_percent === 'number' && scroll_depth_percent > 0
          ? { scroll_depth_percent }
          : {}
      await db
        .updateTable('visitor_page_views')
        .set({ time_on_page_seconds, ...scroll })
        .where('id', '=', latest.id)
        .execute()
    }

    // Heartbeat da sessão (last_activity_at + ended_at no exit)
    const now = new Date()
    await db
      .updateTable('visitor_sessions')
      .set({
        last_activity_at: now,
        ...(is_exit ? { ended_at: now } : {}),
      })
      .where('id', '=', session_db_id)
      .execute()

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('[Tracking] Page time error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

