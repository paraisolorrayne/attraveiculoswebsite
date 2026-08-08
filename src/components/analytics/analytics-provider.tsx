'use client'

import { GoogleTagManager, GoogleTagManagerNoScript } from './google-tag-manager'
import { MicrosoftClarity } from './microsoft-clarity'
import { GoogleAnalytics } from './google-analytics'
import { OpenAIPixel } from './openai-pixel'

/**
 * Analytics Provider Component
 * Centralizes all analytics scripts for the application
 * 
 * Environment Variables Required:
 * - NEXT_PUBLIC_GTM_ID: Google Tag Manager container ID (GTM-XXXXXXX)
 * - NEXT_PUBLIC_GA_MEASUREMENT_ID: Google Analytics 4 measurement ID (G-XXXXXXXXXX)
 * - NEXT_PUBLIC_CLARITY_ID: Microsoft Clarity project ID
 * 
 * Recommended Setup:
 * 1. Use GTM as the primary tag manager
 * 2. Configure GA4 inside GTM (not directly)
 * 3. Use Clarity for heatmaps and session recordings
 * 
 * If using GTM, you don't need to set GA_MEASUREMENT_ID here
 * as GA4 should be configured inside GTM container
 */
export function AnalyticsProvider() {
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID
  const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
  const clarityId = process.env.NEXT_PUBLIC_CLARITY_ID

  // If GTM is configured, use it (GA4 and Clarity should be inside GTM)
  // If only GA4 is configured, use direct implementation
  const useGTM = !!gtmId
  const useDirectGA = !gtmId && !!gaMeasurementId
  // Only load Clarity directly if GTM is NOT active (Clarity is already configured inside GTM)
  const useDirectClarity = !gtmId && !!clarityId

  return (
    <>
      {/* Pixel do OpenAI Ads — independente do GTM: é medição do canal, não
          uma tag dentro do contêiner. Só carrega com NEXT_PUBLIC_OPENAI_PIXEL_ID. */}
      <OpenAIPixel />

      {/* Google Tag Manager (recommended - includes GA4, Clarity, and Google Ads) */}
      {useGTM && <GoogleTagManager gtmId={gtmId} />}

      {/* Direct GA4 (fallback if no GTM) */}
      {useDirectGA && <GoogleAnalytics measurementId={gaMeasurementId} />}

      {/* Microsoft Clarity - only when GTM is not active (avoids double loading) */}
      {useDirectClarity && <MicrosoftClarity clarityId={clarityId!} />}
    </>
  )
}

/**
 * Analytics NoScript component
 * Place this immediately after <body> tag for GTM fallback
 */
export function AnalyticsNoScript() {
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID

  if (!gtmId) return null

  return <GoogleTagManagerNoScript gtmId={gtmId} />
}

