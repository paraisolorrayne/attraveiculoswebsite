import { NextRequest, NextResponse } from 'next/server'
import { supabase } from "@/lib/supabase/tracking-client"
import { checkRateLimit, getClientIP, RATE_LIMIT_PRESETS } from '@/lib/rate-limit'


// N8N webhook for enrichment pipeline
const N8N_ENRICHMENT_WEBHOOK = process.env.N8N_ENRICHMENT_WEBHOOK_URL
const N8N_WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET

// Minimum engagement thresholds for enrichment
const MIN_PRODUCT_VIEWS = 3
const MIN_SESSION_PAGES = 4
const MIN_DWELL_TIME_MS = 60_000 // 1 minute

/**
 * POST /api/tracking/enrich
 * Receives behavioral signals from the frontend and triggers enrichment
 * for high-engagement visitors via data brokers (through N8N pipeline).
 *
 * Enrichment only triggers when:
 * - Visitor has viewed 3+ product pages
 * - Visited 4+ pages in the session
 * - Spent 1+ minute total on site
 *
 * LGPD: Only uses IP + behavioral signals for probabilistic identification.
 * No PII is stored until enriched AND qualified.
 */
export async function POST(request: NextRequest) {
  try {
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
      behavioral_signals,
    } = body

    if (!fingerprint_db_id || !behavioral_signals) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const {
      pageHistory,
      totalDwellTimeMs,
      visitCount,
      productPagesViewed,
      currentSessionPages,
    } = behavioral_signals

    // Check minimum engagement thresholds before enrichment
    const qualifiesForEnrichment =
      productPagesViewed >= MIN_PRODUCT_VIEWS &&
      currentSessionPages >= MIN_SESSION_PAGES &&
      totalDwellTimeMs >= MIN_DWELL_TIME_MS

    if (!qualifiesForEnrichment) {
      return NextResponse.json({
        success: true,
        enrichment_triggered: false,
        reason: 'Engagement below threshold',
        thresholds: {
          productPagesViewed: `${productPagesViewed}/${MIN_PRODUCT_VIEWS}`,
          currentSessionPages: `${currentSessionPages}/${MIN_SESSION_PAGES}`,
          totalDwellTimeMs: `${totalDwellTimeMs}/${MIN_DWELL_TIME_MS}`,
        },
      })
    }

    // Get fingerprint data for IP + device signals
    const { data: fingerprint } = await supabase
      .from('visitor_fingerprints')
      .select('id, visitor_id, resolved_profile_id, browser_name, os_name, device_type, timezone, language')
      .eq('id', fingerprint_db_id)
      .single()

    if (!fingerprint) {
      return NextResponse.json({ error: 'Fingerprint not found' }, { status: 404 })
    }

    // Get session data for IP + UTM
    let sessionData = null
    if (session_db_id) {
      const { data: session } = await supabase
        .from('visitor_sessions')
        .select('ip_address, utm_source, utm_medium, utm_campaign, gclid, fbclid, referrer_domain, city, region')
        .eq('id', session_db_id)
        .single()
      sessionData = session
    }

    // Get or create profile
    let profileId = fingerprint.resolved_profile_id
    if (!profileId) {
      const { data: newProfile } = await supabase
        .from('visitor_profiles')
        .insert({
          status: 'anonymous',
          legitimate_interest_basis: 'behavioral_engagement',
          total_sessions: visitCount,
          total_page_views: currentSessionPages,
          total_product_views: productPagesViewed,
          total_dwell_time_seconds: Math.round(totalDwellTimeMs / 1000),
          last_active_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (newProfile) {
        profileId = newProfile.id
        // Link fingerprint to profile
        await supabase
          .from('visitor_fingerprints')
          .update({ resolved_profile_id: profileId })
          .eq('id', fingerprint_db_id)
      }
    } else {
      // Update existing profile behavioral signals via SQL function
      await supabase.rpc('update_profile_behavioral_signals', { p_profile_id: profileId })
    }

    if (!profileId) {
      return NextResponse.json({ error: 'Failed to create/get profile' }, { status: 500 })
    }

    // Build enrichment payload for N8N/data brokers
    const enrichmentPayload = buildEnrichmentPayload({
      profileId,
      fingerprintId: fingerprint_db_id,
      ip: sessionData?.ip_address || clientIP,
      deviceSignals: {
        browser: fingerprint.browser_name,
        os: fingerprint.os_name,
        deviceType: fingerprint.device_type,
        timezone: fingerprint.timezone,
        language: fingerprint.language,
      },
      trafficSignals: {
        utmSource: sessionData?.utm_source,
        utmMedium: sessionData?.utm_medium,
        utmCampaign: sessionData?.utm_campaign,
        referrerDomain: sessionData?.referrer_domain,
        gclid: sessionData?.gclid,
        fbclid: sessionData?.fbclid,
      },
    })

    // Trigger enrichment via N8N pipeline (async)
    const enrichmentResult = await triggerEnrichment(enrichmentPayload)

    return NextResponse.json({
      success: true,
      enrichment_triggered: true,
      profile_id: profileId,
      ...enrichmentResult,
    })
  } catch (error) {
    console.error('[Enrich] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// =====================================================
// Helper types and functions
// =====================================================

interface EnrichmentPayload {
  profileId: string
  fingerprintId: string
  ip: string
  deviceSignals: Record<string, string | null | undefined>
  trafficSignals: Record<string, string | null | undefined>
}

function buildEnrichmentPayload(data: {
  profileId: string
  fingerprintId: string
  ip: string
  deviceSignals: Record<string, string | null | undefined>
  trafficSignals: Record<string, string | null | undefined>
}): EnrichmentPayload {
  return {
    profileId: data.profileId,
    fingerprintId: data.fingerprintId,
    ip: data.ip,
    deviceSignals: data.deviceSignals,
    trafficSignals: data.trafficSignals,
  }
}

/**
 * Trigger enrichment via N8N webhook pipeline.
 * N8N will orchestrate calls to data brokers (Clearbit, BigDataCorp, etc.)
 * and return enriched data via /api/webhooks/enrichment callback.
 */
async function triggerEnrichment(
  payload: EnrichmentPayload
): Promise<{ sent_to_n8n: boolean; error?: string }> {
  if (!N8N_ENRICHMENT_WEBHOOK) {
    console.warn('[Enrich] N8N_ENRICHMENT_WEBHOOK_URL not configured, skipping enrichment')
    return { sent_to_n8n: false, error: 'Webhook not configured' }
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (N8N_WEBHOOK_SECRET) {
      headers['Authorization'] = `Bearer ${N8N_WEBHOOK_SECRET}`
    }

    const response = await fetch(N8N_ENRICHMENT_WEBHOOK, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        type: 'behavioral_enrichment',
        profile_id: payload.profileId,
        fingerprint_id: payload.fingerprintId,
        ip_address: payload.ip,
        device_signals: payload.deviceSignals,
        traffic_signals: payload.trafficSignals,
        timestamp: new Date().toISOString(),
      }),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      console.error('[Enrich] N8N webhook error:', response.status, errorText)
      return { sent_to_n8n: false, error: `N8N returned ${response.status}` }
    }

    // Log enrichment request as identity event
    await supabase.from('identity_events').insert({
      fingerprint_id: payload.fingerprintId,
      profile_id: payload.profileId,
      event_type: 'enrichment_requested',
      event_data: {
        source: 'behavioral',
        ip: payload.ip,
        device_type: payload.deviceSignals.deviceType,
        traffic_source: payload.trafficSignals.utmSource,
      },
      source: 'behavioral_enrichment',
    })

    return { sent_to_n8n: true }
  } catch (error) {
    console.error('[Enrich] N8N webhook fetch error:', error)
    return { sent_to_n8n: false, error: 'Network error' }
  }
}
