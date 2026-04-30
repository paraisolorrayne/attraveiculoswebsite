import { NextRequest, NextResponse } from 'next/server'
import { supabase } from "@/lib/supabase/tracking-client"
import { checkRateLimit, getClientIP, RATE_LIMIT_PRESETS } from '@/lib/rate-limit'


// Map interaction types to session flags and identity events
const INTERACTION_CONFIG: Record<string, { 
  sessionFlag?: string
  identityEvent?: string
  updatePageView?: { field: string; value: boolean }
}> = {
  whatsapp_click: {
    sessionFlag: 'contacted_whatsapp',
    identityEvent: 'whatsapp_clicked',
    updatePageView: { field: 'clicked_whatsapp', value: true },
  },
  phone_click: {
    updatePageView: { field: 'clicked_phone', value: true },
  },
  form_click: {
    updatePageView: { field: 'clicked_form', value: true },
  },
  form_submit: {
    sessionFlag: 'submitted_form',
    identityEvent: 'form_submitted',
  },
  engine_sound_play: {
    updatePageView: { field: 'played_engine_sound', value: true },
  },
  calculator_use: {
    sessionFlag: 'used_calculator',
  },
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
      fingerprint_db_id,
      session_db_id,
      type,
      page_path,
      metadata,
    } = body

    if (!fingerprint_db_id || !session_db_id || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const config = INTERACTION_CONFIG[type]
    
    if (!config) {
      return NextResponse.json({ error: 'Unknown interaction type' }, { status: 400 })
    }

    // Update session flag if configured
    if (config.sessionFlag) {
      await supabase
        .from('visitor_sessions')
        .update({ [config.sessionFlag]: true })
        .eq('id', session_db_id)
    }

    // Update latest page view if configured
    if (config.updatePageView) {
      // Get the most recent page view for this session and page
      const { data: pageViews } = await supabase
        .from('visitor_page_views')
        .select('id')
        .eq('session_id', session_db_id)
        .eq('page_path', page_path)
        .order('viewed_at', { ascending: false })
        .limit(1)

      if (pageViews && pageViews.length > 0) {
        await supabase
          .from('visitor_page_views')
          .update({ [config.updatePageView.field]: config.updatePageView.value })
          .eq('id', pageViews[0].id)
      }
    }

    // Create identity event if configured
    if (config.identityEvent) {
      // Get profile ID from fingerprint
      const { data: fingerprint } = await supabase
        .from('visitor_fingerprints')
        .select('resolved_profile_id')
        .eq('id', fingerprint_db_id)
        .single()

      await supabase.from('identity_events').insert({
        fingerprint_id: fingerprint_db_id,
        profile_id: fingerprint?.resolved_profile_id || null,
        event_type: config.identityEvent,
        event_data: { page_path, ...metadata },
        source: 'interaction',
      })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('[Tracking] Interaction error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

