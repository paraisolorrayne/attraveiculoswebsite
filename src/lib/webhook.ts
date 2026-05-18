import { WhatsAppWebhookPayload, WebhookResponse, GeoLocation } from '@/types'
import {
  collectBehavioralSignals,
  getFingerprintDbId,
  getSessionDbId,
  collectClickIds,
  collectUTMParams,
  getIdentifiedContact,
} from '@/lib/visitor-tracking'

// Webhook N8N para SDR / notificação interna de leads do site.
// Definir via env; sem fallback hardcoded (clique não dispara webhook
// quando não configurado — o redirect pro WhatsApp acontece normalmente).
const SDR_WEBHOOK_URL = process.env.NEXT_PUBLIC_SDR_WEBHOOK_URL || ''

// Cache for geolocation to avoid multiple API calls
let cachedGeoLocation: GeoLocation | null = null

/**
 * Fetches user's geolocation using internal API route
 * This avoids CORS issues by making the request server-side
 */
export async function getGeoLocation(): Promise<GeoLocation | null> {
  // Return cached result if available
  if (cachedGeoLocation) {
    return cachedGeoLocation
  }

  try {
    // Use internal API route to fetch geolocation server-side
    const response = await fetch('/api/geolocation', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      console.error('[GeoLocation] Failed to fetch:', response.status)
      return null
    }

    const data = await response.json()

    cachedGeoLocation = {
      city: data.city || 'Não identificada',
      region: data.region || 'Não identificada',
      country: data.country || 'Brasil',
      ip: data.ip || '',
    }

    console.log('[GeoLocation] Successfully fetched:', cachedGeoLocation.city, cachedGeoLocation.region)
    return cachedGeoLocation
  } catch (error) {
    console.error('[GeoLocation] Error fetching location:', error)
    return null
  }
}

/**
 * Generates formatted message with vehicle info and location
 * Gracefully handles cases where geolocation is unavailable or has invalid data
 */
export function generateVehicleMessage(
  vehicleBrand?: string,
  vehicleModel?: string,
  vehicleYear?: string | number,
  geoLocation?: GeoLocation | null
): string {
  const hasVehicleInfo = vehicleBrand && vehicleModel
  const vehicle = hasVehicleInfo
    ? `${vehicleBrand} ${vehicleModel}${vehicleYear ? ` ${vehicleYear}` : ''}`
    : null

  // Check if we have valid geolocation data
  // Gracefully omit location if city/region are undefined, empty, or "Não identificada"
  const hasValidLocation = geoLocation &&
    geoLocation.city &&
    geoLocation.region &&
    geoLocation.city !== 'Não identificada' &&
    geoLocation.region !== 'Não identificada'

  const locationSuffix = hasValidLocation
    ? `, sou de ${geoLocation.city}/${geoLocation.region}.`
    : '.'

  // When vehicle info is available, include it in the message
  if (vehicle) {
    return `Vim do site e tenho interesse no ${vehicle}${locationSuffix}`
  }

  // When vehicle info is NOT available, use a professional generic message
  // that does not expose the missing data
  return `Vim do site e gostaria de mais informações sobre os veículos disponíveis${locationSuffix}`
}

/**
 * Sends lead data to N8N webhook for automated SDR processing
 * Includes geolocation data and formatted message
 */
export async function sendWhatsAppWebhook(
  payload: Omit<WhatsAppWebhookPayload, 'timestamp' | 'sessionId' | 'pageUrl' | 'userAgent' | 'localTimestamp' | 'geoLocation'>,
  geoLocation?: GeoLocation | null
): Promise<WebhookResponse> {
  // Sem URL configurada → noop silencioso (o clique no botão continua
  // funcionando porque o redirect wa.me é independente do webhook).
  if (!SDR_WEBHOOK_URL) {
    return { success: false, message: 'SDR webhook URL not configured' }
  }

  try {
    const sessionId = getSessionId()
    const now = new Date()

    // Generate formatted message with vehicle and location info
    const formattedMessage = generateVehicleMessage(
      payload.context.vehicleBrand,
      payload.context.vehicleModel,
      payload.context.vehicleYear,
      geoLocation
    )

    // Atribuição coletada no browser (snake_case nos helpers; convertemos
    // aqui para camelCase porque é o formato aceito pelo Zod de
    // /api/webhook/whatsapp — assim o N8N pode forwardar context verbatim.
    const utm = collectUTMParams()
    const cids = collectClickIds()
    const attributionInContext = {
      sessionId,
      sessionDbId:     typeof window !== 'undefined' ? sessionStorage.getItem('attra_session_db_id') || undefined : undefined,
      fingerprintDbId: typeof window !== 'undefined' ? localStorage.getItem('attra_fingerprint_db_id') || undefined : undefined,
      utmSource:   utm.utm_source   || undefined,
      utmMedium:   utm.utm_medium   || undefined,
      utmCampaign: utm.utm_campaign || undefined,
      utmContent:  utm.utm_content  || undefined,
      utmTerm:     utm.utm_term     || undefined,
      utmId:       utm.utm_id       || undefined,
      adsetId:     utm.adset_id     || undefined,
      adId:        utm.ad_id        || undefined,
      gclid:       cids.gclid       || undefined,
      fbclid:      cids.fbclid      || undefined,
      ttclid:      cids.ttclid      || undefined,
      referrer:    typeof document !== 'undefined' ? document.referrer || undefined : undefined,
      landingPage: typeof window !== 'undefined' ? window.location.href : undefined,
    }

    // Enhanced payload with additional context for N8N agent
    const enhancedPayload: WhatsAppWebhookPayload = {
      ...payload,
      context: {
        ...payload.context,
        userMessage: formattedMessage, // Override with formatted message
        ...attributionInContext,
      },
      sessionId,
      timestamp: now.toISOString(),
      localTimestamp: now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      pageUrl: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : '',
      geoLocation: geoLocation || undefined,
      // Mantém traffic (snake_case) para compat com templates de mensagem já em uso
      traffic: {
        ...utm,
        ...cids,
        referrer: typeof document !== 'undefined' ? document.referrer || null : null,
        landingPage: typeof window !== 'undefined' ? window.location.href : null,
      },
      // Contato identificado em formulário anterior (se houver)
      user: getIdentifiedContact() || undefined,
    } as WhatsAppWebhookPayload & { traffic: Record<string, string | null>; user?: { name?: string; email?: string; phone?: string } }

    console.log('[Webhook] Sending to N8N:', enhancedPayload.eventType, enhancedPayload.sourcePage)
    console.log('[Webhook] Message:', formattedMessage)
    console.log('[Webhook] GeoLocation:', geoLocation?.city, geoLocation?.region)

    const response = await fetch(SDR_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(enhancedPayload),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      console.error('[Webhook] N8N response error:', response.status, errorText)
      throw new Error(`Webhook failed: ${response.status}`)
    }

    console.log('[Webhook] Successfully sent to N8N')

    return {
      success: true,
      message: 'Mensagem enviada! Nossa equipe entrará em contato em breve.',
    }
  } catch (error) {
    console.error('[Webhook] Error sending to N8N:', error)

    return {
      success: false,
      message: 'Erro ao enviar mensagem. Por favor, tente novamente ou ligue para (34) 3014-3232.',
    }
  }
}

/**
 * Gets or creates a unique session ID for tracking user journey
 */
function getSessionId(): string {
  if (typeof window === 'undefined') return ''

  let sessionId = sessionStorage.getItem('attra_session_id')
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    sessionStorage.setItem('attra_session_id', sessionId)
  }
  return sessionId
}

/**
 * Sends abandoned lead data to the server-side API route using sendBeacon.
 * This ensures the request completes even during page unload (exit intent / tab close).
 *
 * The server route validates identifiable data, logs the event, and forwards to N8N.
 *
 * @param reason - 'exit_intent' | 'beforeunload'
 * @param geolocation - Cached geolocation data
 */
export function sendAbandonedLeadWebhook(
  reason: 'exit_intent' | 'beforeunload',
  geolocation?: GeoLocation | null,
): boolean {
  if (typeof window === 'undefined') return false

  const fingerprintDbId = getFingerprintDbId()
  const sessionDbId = getSessionDbId()

  if (!fingerprintDbId) {
    console.log('[Abandoned] No fingerprint_db_id, skipping')
    return false
  }

  const payload = JSON.stringify({
    fingerprint_db_id: fingerprintDbId,
    session_db_id: sessionDbId,
    reason,
    behavioral_signals: collectBehavioralSignals(),
    geolocation: geolocation || null,
    utm_params: collectUTMParams(),
    click_ids: collectClickIds(),
  })

  // Use sendBeacon for reliable delivery during page unload
  // Falls back to fetch with keepalive if sendBeacon is unavailable
  if (navigator.sendBeacon) {
    const blob = new Blob([payload], { type: 'application/json' })
    const sent = navigator.sendBeacon('/api/tracking/abandoned', blob)
    console.log('[Abandoned] sendBeacon result:', sent, 'reason:', reason)
    return sent
  }

  // Fallback: fetch with keepalive (still reliable during unload)
  fetch('/api/tracking/abandoned', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(err => console.error('[Abandoned] Fetch fallback error:', err))

  console.log('[Abandoned] Sent via fetch keepalive, reason:', reason)
  return true
}
