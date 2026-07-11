import { NextRequest, NextResponse } from 'next/server'
import { supabase } from "@/lib/supabase/tracking-client"
import { checkRateLimit, getClientIP, RATE_LIMIT_PRESETS } from '@/lib/rate-limit'


/**
 * API route for abandoned session lead capture.
 * Called from the client via sendBeacon on exit intent or session timeout.
 * Verifies the visitor has identifiable data and logs the abandonment event.
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
      reason,             // 'exit_intent' | 'session_timeout'
      behavioral_signals, // { pageHistory, totalDwellTimeMs, visitCount, productPagesViewed, currentSessionPages }
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

