import { NextRequest, NextResponse } from 'next/server'
import { supabase } from "@/lib/supabase/tracking-client"
import { checkRateLimit, getClientIP, RATE_LIMIT_PRESETS } from '@/lib/rate-limit'


const N8N_ABANDONED_WEBHOOK = process.env.N8N_ABANDONED_LEAD_WEBHOOK_URL
const N8N_WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET

/**
 * API route for abandoned session lead capture.
 * Called from the client via sendBeacon on exit intent or session timeout.
 * Verifies the visitor has identifiable data before forwarding to N8N.
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting (moderate - one abandon per session typically)
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
      session_db_id,
      reason,             // 'exit_intent' | 'session_timeout'
      behavioral_signals, // { pageHistory, totalDwellTimeMs, visitCount, productPagesViewed, currentSessionPages }
      geolocation,        // { city, region, country }
      utm_params,         // UTM parameters
      click_ids,          // { gclid, fbclid, ttclid }
    } = body

    if (!fingerprint_db_id) {
      return NextResponse.json({ error: 'Missing fingerprint_db_id' }, { status: 400 })
    }

    // Look up the visitor profile linked to this fingerprint
    const { data: fingerprint } = await supabase
      .from('visitor_fingerprints')
      .select('resolved_profile_id')
      .eq('id', fingerprint_db_id)
      .single()

    if (!fingerprint?.resolved_profile_id) {
      // No profile linked - visitor is fully anonymous, nothing to recover
      return NextResponse.json({ success: false, reason: 'no_profile' })
    }

    const profileId = fingerprint.resolved_profile_id

    // Fetch the profile to check for identifiable data
    const { data: profile } = await supabase
      .from('visitor_profiles')
      .select('id, email, phone, full_name, first_name, status, enrichment_source')
      .eq('id', profileId)
      .single()

    if (!profile) {
      return NextResponse.json({ success: false, reason: 'profile_not_found' })
    }

    // Check minimum identifiable data: must have email or phone
    const hasIdentifiableData = !!(profile.email || profile.phone)
    if (!hasIdentifiableData) {
      return NextResponse.json({ success: false, reason: 'no_identifiable_data' })
    }

    // Build the N8N webhook payload
    const abandonedLeadPayload = {
      profile_id: profileId,
      fingerprint_id: fingerprint_db_id,
      session_id: session_db_id,
      reason,
      timestamp: new Date().toISOString(),
      local_timestamp: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      // Visitor data (from profile)
      visitor: {
        email: profile.email || null,
        phone: profile.phone || null,
        name: profile.full_name || profile.first_name || null,
        status: profile.status,
        enrichment_source: profile.enrichment_source || null,
      },
      // Behavioral signals
      behavioral_signals: behavioral_signals || {},
      // Context
      geolocation: geolocation || null,
      utm_params: utm_params || null,
      click_ids: click_ids || null,
    }

    // Log the abandonment event in identity_events
    await supabase.from('identity_events').insert({
      fingerprint_id: fingerprint_db_id,
      profile_id: profileId,
      event_type: 'session_abandoned',
      event_data: {
        reason,
        pages_viewed: behavioral_signals?.currentSessionPages || 0,
        total_dwell_ms: behavioral_signals?.totalDwellTimeMs || 0,
        product_pages: behavioral_signals?.productPagesViewed || 0,
      },
      source: 'abandonment_detection',
    })

    // Send to N8N webhook if configured
    if (N8N_ABANDONED_WEBHOOK) {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (N8N_WEBHOOK_SECRET) {
        headers['Authorization'] = `Bearer ${N8N_WEBHOOK_SECRET}`
      }

      fetch(N8N_ABANDONED_WEBHOOK, {
        method: 'POST',
        headers,
        body: JSON.stringify(abandonedLeadPayload),
      }).catch(err => console.error('[Abandoned] N8N webhook error:', err))

      console.log('[Abandoned] Webhook sent for profile:', profileId, 'reason:', reason)
    } else {
      console.warn('[Abandoned] N8N_ABANDONED_LEAD_WEBHOOK_URL not configured')
    }

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

