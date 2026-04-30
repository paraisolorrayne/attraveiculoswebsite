import { NextRequest, NextResponse } from 'next/server'
import { supabase } from "@/lib/supabase/tracking-client"
import { checkRateLimit, getClientIP, RATE_LIMIT_PRESETS } from '@/lib/rate-limit'


// Google Ads Enhanced Conversions config
const GOOGLE_ADS_CUSTOMER_ID = process.env.GOOGLE_ADS_CUSTOMER_ID
const GOOGLE_ADS_CONVERSION_ACTION_ID = process.env.GOOGLE_ADS_CONVERSION_ACTION_ID
const GOOGLE_ADS_API_TOKEN = process.env.GOOGLE_ADS_API_TOKEN

// Meta Conversions API config
const META_PIXEL_ID = process.env.META_PIXEL_ID
const META_CONVERSIONS_TOKEN = process.env.META_CONVERSIONS_TOKEN

/**
 * POST /api/tracking/conversion
 * Records conversion events and sends to Google Ads / Meta Conversions APIs.
 * Uses SHA256 hashed email/phone for enhanced conversions (LGPD compliant).
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
      event_name,         // 'lead', 'contact', 'whatsapp_click', 'purchase'
      event_value,        // monetary value (optional)
      hashed_email,       // SHA256 hashed (from frontend)
      hashed_phone,       // SHA256 hashed (from frontend)
      page_path,
      vehicle_id,
      metadata,
    } = body

    if (!fingerprint_db_id || !event_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get click IDs and profile from session
    let gclid: string | null = null
    let fbclid: string | null = null
    let ttclid: string | null = null
    let profileId: string | null = null

    if (session_db_id) {
      const { data: session } = await supabase
        .from('visitor_sessions')
        .select('gclid, fbclid, ttclid')
        .eq('id', session_db_id)
        .single()

      if (session) {
        gclid = session.gclid
        fbclid = session.fbclid
        ttclid = session.ttclid
      }
    }

    // Get profile ID from fingerprint
    const { data: fingerprint } = await supabase
      .from('visitor_fingerprints')
      .select('resolved_profile_id')
      .eq('id', fingerprint_db_id)
      .single()

    profileId = fingerprint?.resolved_profile_id || null

    // Insert conversion event
    const { data: conversionEvent, error: insertError } = await supabase
      .from('conversion_events')
      .insert({
        fingerprint_id: fingerprint_db_id,
        profile_id: profileId,
        session_id: session_db_id || null,
        event_name,
        event_value: event_value || null,
        gclid,
        fbclid,
        ttclid,
        hashed_email: hashed_email || null,
        hashed_phone: hashed_phone || null,
        page_path: page_path || null,
        vehicle_id: vehicle_id || null,
        metadata: metadata || {},
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('[Conversion] Insert error:', insertError)
      return NextResponse.json({ error: 'Failed to record conversion' }, { status: 500 })
    }

    // Send to Google Ads Enhanced Conversions (async, non-blocking)
    if (gclid && GOOGLE_ADS_CUSTOMER_ID && GOOGLE_ADS_API_TOKEN) {
      sendToGoogleAds(conversionEvent.id, {
        gclid,
        event_name,
        event_value,
        hashed_email,
        hashed_phone,
      }).catch(err => console.error('[Conversion] Google Ads send error:', err))
    }

    // Send to Meta Conversions API (async, non-blocking)
    if (META_PIXEL_ID && META_CONVERSIONS_TOKEN) {
      sendToMetaConversions(conversionEvent.id, {
        fbclid,
        event_name,
        event_value,
        hashed_email,
        hashed_phone,
        page_path,
        clientIP,
      }).catch(err => console.error('[Conversion] Meta send error:', err))
    }

    return NextResponse.json({
      success: true,
      conversion_id: conversionEvent.id,
      sent_to: {
        google: !!(gclid && GOOGLE_ADS_CUSTOMER_ID),
        meta: !!(META_PIXEL_ID && META_CONVERSIONS_TOKEN),
      },
    })
  } catch (error) {
    console.error('[Conversion] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}



/**
 * Send enhanced conversion to Google Ads API
 * https://developers.google.com/google-ads/api/docs/conversions/upload-clicks
 */
async function sendToGoogleAds(
  conversionId: string,
  data: {
    gclid: string
    event_name: string
    event_value?: number
    hashed_email?: string
    hashed_phone?: string
  }
) {
  const conversionAction = `customers/${GOOGLE_ADS_CUSTOMER_ID}/conversionActions/${GOOGLE_ADS_CONVERSION_ACTION_ID}`

  const userIdentifiers = []
  if (data.hashed_email) {
    userIdentifiers.push({ hashedEmail: data.hashed_email })
  }
  if (data.hashed_phone) {
    userIdentifiers.push({ hashedPhoneNumber: data.hashed_phone })
  }

  const payload = {
    conversions: [{
      conversionAction,
      gclid: data.gclid,
      conversionDateTime: new Date().toISOString().replace('T', ' ').slice(0, 23) + '+00:00',
      conversionValue: data.event_value || 0,
      currencyCode: 'BRL',
      userIdentifiers: userIdentifiers.length > 0 ? userIdentifiers : undefined,
    }],
    partialFailure: true,
  }

  const response = await fetch(
    `https://googleads.googleapis.com/v18/customers/${GOOGLE_ADS_CUSTOMER_ID}:uploadClickConversions`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GOOGLE_ADS_API_TOKEN}`,
        'Content-Type': 'application/json',
        'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
      },
      body: JSON.stringify(payload),
    }
  )

  const result = await response.json()

  // Update conversion event with Google response
  await supabase
    .from('conversion_events')
    .update({
      sent_to_google: true,
      sent_to_google_at: new Date().toISOString(),
      google_response: result,
    })
    .eq('id', conversionId)

  if (!response.ok) {
    console.error('[Conversion] Google Ads API error:', result)
  }
}

/**
 * Send conversion to Meta Conversions API (formerly Facebook Server-Side API)
 * https://developers.facebook.com/docs/marketing-api/conversions-api
 */
async function sendToMetaConversions(
  conversionId: string,
  data: {
    fbclid?: string | null
    event_name: string
    event_value?: number
    hashed_email?: string
    hashed_phone?: string
    page_path?: string
    clientIP?: string
  }
) {
  // Map internal event names to Meta standard events
  const metaEventMap: Record<string, string> = {
    lead: 'Lead',
    contact: 'Contact',
    whatsapp_click: 'Contact',
    purchase: 'Purchase',
    form_submit: 'SubmitApplication',
  }

  const eventName = metaEventMap[data.event_name] || 'Lead'

  const userData: Record<string, unknown> = {}
  if (data.hashed_email) userData.em = [data.hashed_email]
  if (data.hashed_phone) userData.ph = [data.hashed_phone]
  if (data.fbclid) userData.fbc = `fb.1.${Date.now()}.${data.fbclid}`
  if (data.clientIP) userData.client_ip_address = data.clientIP

  const payload = {
    data: [{
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      action_source: 'website',
      event_source_url: data.page_path
        ? `${process.env.NEXT_PUBLIC_SITE_URL || 'https://attraveiculos.com.br'}${data.page_path}`
        : undefined,
      user_data: userData,
      custom_data: data.event_value ? {
        currency: 'BRL',
        value: data.event_value,
      } : undefined,
    }],
  }

  const response = await fetch(
    `https://graph.facebook.com/v21.0/${META_PIXEL_ID}/events?access_token=${META_CONVERSIONS_TOKEN}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  )

  const result = await response.json()

  // Update conversion event with Meta response
  await supabase
    .from('conversion_events')
    .update({
      sent_to_meta: true,
      sent_to_meta_at: new Date().toISOString(),
      meta_response: result,
    })
    .eq('id', conversionId)

  if (!response.ok) {
    console.error('[Conversion] Meta API error:', result)
  }
}