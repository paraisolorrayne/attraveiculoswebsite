'use client'

import { useCallback } from 'react'

/**
 * Custom Analytics Events for Attra Veículos
 *
 * These events are designed for automotive e-commerce and align with
 * Google Analytics 4 recommended events where applicable.
 *
 * Integration with Visitor Tracking:
 * - All events can be enriched with visitor context (geolocation, device, session)
 * - User identification is synced with GA4 User Properties and Clarity
 * - LGPD compliant: personal data only sent when explicitly provided
 */

// Type definitions for dataLayer
declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[]
    gtag?: (...args: unknown[]) => void
    clarity?: (...args: unknown[]) => void
  }
}

// Vehicle data for tracking
interface VehicleData {
  id: string
  name: string
  brand: string
  model: string
  year: number
  price: number
  category?: string
  slug?: string
}

// Form submission data
interface FormData {
  formName: string
  formLocation: string
  vehicleId?: string
  vehicleName?: string
}

// Financing calculator data
interface FinancingData {
  vehiclePrice: number
  downPayment: number
  installments: number
  monthlyPayment: number
  vehicleId?: string
}

/**
 * Visitor context data from visitor tracking system
 * Used to enrich analytics events with contextual information
 */
export interface VisitorContext {
  // Session identifiers (anonymous)
  visitorId?: string
  sessionId?: string
  fingerprintDbId?: string

  // Geolocation (from /api/geolocation)
  geolocation?: {
    city?: string
    region?: string
    country?: string
  }

  // Device data
  device?: {
    type?: string // 'desktop' | 'mobile' | 'tablet'
    browser?: string
    os?: string
    screenResolution?: string
  }

  // Traffic source
  traffic?: {
    utmSource?: string
    utmMedium?: string
    utmCampaign?: string
    utmContent?: string
    utmTerm?: string
    utmId?: string       // GA4 Campaign ID (utm_id)
    adsetId?: string     // Meta adset_id / Google adgroup_id
    adId?: string        // Meta ad_id / Google creative_id
    matchType?: string   // Google matchtype: e | p | b
    adsDevice?: string   // Google device: m | c | t (o que a plataforma informa)
    adsNetwork?: string  // Google network: g | s | d | u
    gclid?: string
    fbclid?: string
    ttclid?: string
    referrer?: string
    landingPage?: string
  }

  // User identification (LGPD: only when explicitly provided)
  user?: {
    email?: string // hashed for privacy
    phone?: string // hashed for privacy
    name?: string
    identifiedAt?: string
    identificationSource?: string // 'form' | 'url_param'
  }
}

/**
 * Push event to dataLayer (GTM) and GA4
 * Optionally enriches event with visitor context
 */
function pushEvent(
  eventName: string,
  eventParams: Record<string, unknown> = {},
  visitorContext?: VisitorContext
): void {
  if (typeof window === 'undefined') return

  // Build enriched parameters with visitor context
  const enrichedParams: Record<string, unknown> = { ...eventParams }

  if (visitorContext) {
    // Add session identifiers (anonymous)
    if (visitorContext.visitorId) {
      enrichedParams.visitor_id = visitorContext.visitorId
    }
    if (visitorContext.sessionId) {
      enrichedParams.session_id = visitorContext.sessionId
    }

    // Add geolocation for lead events
    if (visitorContext.geolocation) {
      enrichedParams.user_city = visitorContext.geolocation.city
      enrichedParams.user_region = visitorContext.geolocation.region
      enrichedParams.user_country = visitorContext.geolocation.country
    }

    // Add device info
    if (visitorContext.device) {
      enrichedParams.device_type = visitorContext.device.type
      enrichedParams.device_browser = visitorContext.device.browser
      enrichedParams.device_os = visitorContext.device.os
    }

    // Add traffic source
    if (visitorContext.traffic) {
      if (visitorContext.traffic.utmSource) enrichedParams.utm_source = visitorContext.traffic.utmSource
      if (visitorContext.traffic.utmMedium) enrichedParams.utm_medium = visitorContext.traffic.utmMedium
      if (visitorContext.traffic.utmCampaign) enrichedParams.utm_campaign = visitorContext.traffic.utmCampaign
      if (visitorContext.traffic.referrer) enrichedParams.referrer = visitorContext.traffic.referrer
    }

    // Add user identification status (not the actual data for privacy)
    if (visitorContext.user?.email) {
      enrichedParams.user_identified = true
      enrichedParams.identification_source = visitorContext.user.identificationSource
    }
  }

  // Push to dataLayer for GTM
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push({
    event: eventName,
    ...enrichedParams,
  })

  // Also send directly to GA4 if available
  if (window.gtag) {
    window.gtag('event', eventName, enrichedParams)
  }
}

/**
 * Set GA4 User Properties for identified visitors
 * LGPD: Only call this when user has explicitly provided their data
 */
export function setGA4UserProperties(properties: Record<string, unknown>): void {
  if (typeof window === 'undefined') return

  if (window.gtag) {
    window.gtag('set', 'user_properties', properties)
  }

  // Also push to dataLayer for GTM
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push({
    event: 'user_properties_set',
    user_properties: properties,
  })
}

/**
 * Push visitor identification event to dataLayer
 * Called when a visitor is identified via form or URL params
 */
export function pushVisitorIdentifiedEvent(
  source: 'form' | 'url_param',
  hasEmail: boolean,
  hasPhone: boolean,
  hasName: boolean,
  visitorContext?: Partial<VisitorContext>
): void {
  if (typeof window === 'undefined') return

  const eventParams: Record<string, unknown> = {
    identification_source: source,
    has_email: hasEmail,
    has_phone: hasPhone,
    has_name: hasName,
    timestamp: new Date().toISOString(),
  }

  // Add visitor context if available
  if (visitorContext?.visitorId) eventParams.visitor_id = visitorContext.visitorId
  if (visitorContext?.sessionId) eventParams.session_id = visitorContext.sessionId
  if (visitorContext?.geolocation) {
    eventParams.user_city = visitorContext.geolocation.city
    eventParams.user_region = visitorContext.geolocation.region
  }

  pushEvent('visitor_identified', eventParams)
}

/**
 * Push session start event with visitor data to dataLayer
 */
export function pushSessionStartEvent(
  visitorId: string,
  sessionId: string,
  deviceData?: Record<string, unknown>,
  utmParams?: Record<string, string | null>,
  geolocation?: { city?: string; region?: string; country?: string }
): void {
  if (typeof window === 'undefined') return

  const eventParams: Record<string, unknown> = {
    visitor_id: visitorId,
    session_id: sessionId,
    is_new_visitor: !localStorage.getItem('attra_returning_visitor'),
    timestamp: new Date().toISOString(),
  }

  // Mark as returning visitor for future sessions
  localStorage.setItem('attra_returning_visitor', 'true')

  // Add device data
  if (deviceData) {
    eventParams.device_type = deviceData.device_type
    eventParams.browser_name = deviceData.browser_name
    eventParams.os_name = deviceData.os_name
    eventParams.screen_resolution = deviceData.screen_resolution
  }

  // Add UTM params
  if (utmParams) {
    if (utmParams.utm_source) eventParams.utm_source = utmParams.utm_source
    if (utmParams.utm_medium) eventParams.utm_medium = utmParams.utm_medium
    if (utmParams.utm_campaign) eventParams.utm_campaign = utmParams.utm_campaign
  }

  // Add geolocation
  if (geolocation) {
    eventParams.user_city = geolocation.city
    eventParams.user_region = geolocation.region
    eventParams.user_country = geolocation.country
  }

  pushEvent('session_start', eventParams)
}

/**
 * useAnalytics hook
 * Provides methods to track custom events for the automotive business
 * All lead generation events accept optional VisitorContext for enrichment
 */
export function useAnalytics() {
  // Track vehicle view (similar to view_item in GA4 e-commerce)
  const trackVehicleView = useCallback((vehicle: VehicleData, visitorContext?: VisitorContext) => {
    pushEvent('view_vehicle', {
      vehicle_id: vehicle.id,
      vehicle_name: vehicle.name,
      vehicle_brand: vehicle.brand,
      vehicle_model: vehicle.model,
      vehicle_year: vehicle.year,
      vehicle_price: vehicle.price,
      vehicle_category: vehicle.category || 'premium',
      currency: 'BRL',
      value: vehicle.price,
      // GA4 e-commerce compatible
      items: [{
        item_id: vehicle.id,
        item_name: vehicle.name,
        item_brand: vehicle.brand,
        item_category: vehicle.category || 'premium',
        price: vehicle.price,
      }],
    }, visitorContext)
  }, [])

  // Track WhatsApp click (lead generation) - enriched with geolocation
  const trackWhatsAppClick = useCallback((
    source: string,
    vehicleData?: Partial<VehicleData>,
    visitorContext?: VisitorContext
  ) => {
    pushEvent('whatsapp_click', {
      click_source: source,
      vehicle_id: vehicleData?.id,
      vehicle_name: vehicleData?.name,
      vehicle_brand: vehicleData?.brand,
      vehicle_price: vehicleData?.price,
      // GA4 generate_lead compatible
      currency: 'BRL',
      value: vehicleData?.price || 0,
    }, visitorContext)
  }, [])

  // Track form submission - enriched with geolocation and visitor data
  const trackFormSubmission = useCallback((formData: FormData, visitorContext?: VisitorContext) => {
    pushEvent('form_submission', {
      form_name: formData.formName,
      form_location: formData.formLocation,
      vehicle_id: formData.vehicleId,
      vehicle_name: formData.vehicleName,
      // GA4 generate_lead compatible
      currency: 'BRL',
    }, visitorContext)
  }, [])

  // Track financing calculator interaction
  const trackFinancingCalculation = useCallback((data: FinancingData, visitorContext?: VisitorContext) => {
    pushEvent('financing_calculation', {
      vehicle_price: data.vehiclePrice,
      down_payment: data.downPayment,
      installments: data.installments,
      monthly_payment: data.monthlyPayment,
      vehicle_id: data.vehicleId,
      currency: 'BRL',
    }, visitorContext)
  }, [])

  // Track guide download - enriched with visitor data
  const trackGuideDownload = useCallback((guideName: string, userEmail?: string, visitorContext?: VisitorContext) => {
    pushEvent('guide_download', {
      guide_name: guideName,
      user_email: userEmail ? 'provided' : 'not_provided',
      // GA4 file_download compatible
      file_name: guideName,
      file_extension: 'pdf',
    }, visitorContext)
  }, [])

  // Track vehicle gallery interaction
  const trackGalleryInteraction = useCallback((vehicleId: string, action: 'open' | 'next' | 'prev' | 'close') => {
    pushEvent('gallery_interaction', {
      vehicle_id: vehicleId,
      gallery_action: action,
    })
  }, [])

  // Track search
  const trackSearch = useCallback((searchTerm: string, resultsCount: number, filters?: Record<string, unknown>) => {
    pushEvent('search', {
      search_term: searchTerm,
      results_count: resultsCount,
      filters: filters,
    })
  }, [])

  // Track page scroll depth
  const trackScrollDepth = useCallback((depth: 25 | 50 | 75 | 100, pagePath: string) => {
    pushEvent('scroll_depth', {
      scroll_depth: depth,
      page_path: pagePath,
    })
  }, [])

  // Track CTA click
  const trackCTAClick = useCallback((ctaName: string, ctaLocation: string, destination?: string) => {
    pushEvent('cta_click', {
      cta_name: ctaName,
      cta_location: ctaLocation,
      cta_destination: destination,
    })
  }, [])

  // Track video play (for YouTube embeds)
  const trackVideoPlay = useCallback((videoTitle: string, videoId: string, source: string) => {
    pushEvent('video_play', {
      video_title: videoTitle,
      video_id: videoId,
      video_source: source,
    })
  }, [])

  return {
    trackVehicleView,
    trackWhatsAppClick,
    trackFormSubmission,
    trackFinancingCalculation,
    trackGuideDownload,
    trackGalleryInteraction,
    trackSearch,
    trackScrollDepth,
    trackCTAClick,
    trackVideoPlay,
  }
}

