import { NextRequest, NextResponse } from 'next/server'
import { supabase } from "@/lib/supabase/tracking-client"
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

    // Update the most recent page view for this session and page
    const { data: pageViews } = await supabase
      .from('visitor_page_views')
      .select('id')
      .eq('session_id', session_db_id)
      .eq('page_path', page_path)
      .order('viewed_at', { ascending: false })
      .limit(1)

    if (pageViews && pageViews.length > 0) {
      const updateData: Record<string, unknown> = { time_on_page_seconds }
      if (typeof scroll_depth_percent === 'number' && scroll_depth_percent > 0) {
        updateData.scroll_depth_percent = scroll_depth_percent
      }
      await supabase
        .from('visitor_page_views')
        .update(updateData)
        .eq('id', pageViews[0].id)
    }

    // Update session heartbeat (last_activity_at + duration)
    await supabase
      .from('visitor_sessions')
      .update({
        last_activity_at: new Date().toISOString(),
        ...(is_exit ? { ended_at: new Date().toISOString() } : {}),
      })
      .eq('id', session_db_id)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('[Tracking] Page time error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

