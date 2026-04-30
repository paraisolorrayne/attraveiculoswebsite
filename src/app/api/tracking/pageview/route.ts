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
    const { error } = await supabase
      .from('visitor_page_views')
      .insert({
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

    if (error) {
      console.error('[Tracking] Page view insert error:', error)
      return NextResponse.json({ error: 'Failed to track page view' }, { status: 500 })
    }

    // Update session page_views_count
    await supabase.rpc('increment_session_page_views', { 
      p_session_id: session_db_id,
      is_vehicle: page_type === 'vehicle',
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('[Tracking] Page view error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

