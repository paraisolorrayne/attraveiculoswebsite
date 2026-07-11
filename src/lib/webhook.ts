import { GeoLocation } from '@/types'
import {
  collectBehavioralSignals,
  getFingerprintDbId,
  getSessionDbId,
  collectClickIds,
  collectUTMParams,
} from '@/lib/visitor-tracking'

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
 * Sends abandoned lead data to the server-side API route using sendBeacon.
 * This ensures the request completes even during page unload (exit intent / tab close).
 *
 * The server route validates identifiable data and logs the event.
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
