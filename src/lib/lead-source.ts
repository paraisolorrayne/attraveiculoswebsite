/**
 * Classificação da fonte de tráfego do lead a partir dos campos de atribuição
 * (utm_*, gclid, fbclid, referrer). Rodada no servidor ou no cliente.
 */

export type FonteLead =
  | 'google_ads'
  | 'meta_ads'
  | 'tiktok_ads'
  | 'organico_busca'
  | 'organico_social'
  | 'direto'
  | 'referral'
  | 'outro'

export interface AttributionInput {
  utm_source?: string | null
  utm_medium?: string | null
  gclid?: string | null
  fbclid?: string | null
  ttclid?: string | null
  referrer?: string | null
}

const PAID_MEDIUMS = new Set([
  'cpc', 'ppc', 'paid', 'paidsocial', 'paid-social', 'paid_social',
  'display', 'retargeting', 'remarketing', 'ads'
])

const SEARCH_REFERRERS = /(^|\.)(google|bing|duckduckgo|yahoo|yandex|ecosia)\./i
const SOCIAL_REFERRERS = /(^|\.)(facebook|instagram|l\.instagram|m\.facebook|lm\.facebook|t\.co|x|twitter|linkedin|tiktok|youtube|pinterest)\./i

function lower(v: string | null | undefined): string {
  return (v ?? '').trim().toLowerCase()
}

function hostFromReferrer(referrer: string | null | undefined): string {
  if (!referrer) return ''
  try {
    return new URL(referrer).hostname.toLowerCase()
  } catch {
    return referrer.toLowerCase()
  }
}

export function classifyLeadSource(input: AttributionInput): FonteLead {
  const utmSource = lower(input.utm_source)
  const utmMedium = lower(input.utm_medium)
  const host = hostFromReferrer(input.referrer)

  // 1) Click IDs — sinal mais forte de pago
  if (input.gclid) return 'google_ads'
  if (input.fbclid) return 'meta_ads'
  if (input.ttclid) return 'tiktok_ads'

  // 2) UTM medium pago + source
  if (PAID_MEDIUMS.has(utmMedium)) {
    if (utmSource.includes('google')) return 'google_ads'
    if (utmSource.includes('facebook') || utmSource.includes('meta') || utmSource.includes('instagram')) return 'meta_ads'
    if (utmSource.includes('tiktok')) return 'tiktok_ads'
    return 'outro'
  }

  // 3) UTM source sem medium pago — tratar como orgânico da plataforma
  if (utmSource) {
    if (utmSource.includes('google')) return 'organico_busca'
    if (utmSource.includes('facebook') || utmSource.includes('instagram') || utmSource.includes('meta')) return 'organico_social'
    if (utmSource.includes('tiktok')) return 'organico_social'
  }

  // 4) Referrer
  if (host) {
    if (SEARCH_REFERRERS.test(host)) return 'organico_busca'
    if (SOCIAL_REFERRERS.test(host)) return 'organico_social'
    return 'referral'
  }

  // 5) Sem nada
  return 'direto'
}

export const fonteLabels: Record<FonteLead, string> = {
  google_ads:       'Google Ads',
  meta_ads:         'Meta Ads',
  tiktok_ads:       'TikTok Ads',
  organico_busca:   'Orgânico · Busca',
  organico_social:  'Orgânico · Social',
  referral:         'Referral',
  direto:           'Direto',
  outro:            'Outro',
}

export const fonteColors: Record<FonteLead, string> = {
  google_ads:       'bg-blue-100    text-blue-700    dark:bg-blue-900/30    dark:text-blue-400',
  meta_ads:         'bg-indigo-100  text-indigo-700  dark:bg-indigo-900/30  dark:text-indigo-400',
  tiktok_ads:       'bg-pink-100    text-pink-700    dark:bg-pink-900/30    dark:text-pink-400',
  organico_busca:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  organico_social:  'bg-teal-100    text-teal-700    dark:bg-teal-900/30    dark:text-teal-400',
  referral:         'bg-purple-100  text-purple-700  dark:bg-purple-900/30  dark:text-purple-400',
  direto:           'bg-gray-100    text-gray-700    dark:bg-gray-900/30    dark:text-gray-400',
  outro:            'bg-yellow-100  text-yellow-700  dark:bg-yellow-900/30  dark:text-yellow-400',
}

export const fonteOrdem: FonteLead[] = [
  'google_ads',
  'meta_ads',
  'tiktok_ads',
  'organico_busca',
  'organico_social',
  'referral',
  'direto',
  'outro',
]
