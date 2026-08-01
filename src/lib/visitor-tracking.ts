/**
 * Visitor Tracking & Fingerprinting Library
 * Captures visitor data for lead intelligence
 */

// Session storage keys
const VISITOR_ID_KEY = 'attra_visitor_id'
const SESSION_ID_KEY = 'attra_session_id'
const FINGERPRINT_DB_ID_KEY = 'attra_fingerprint_db_id'
const SESSION_DB_ID_KEY = 'attra_session_db_id'
const IDENTIFIED_CONTACT_KEY = 'attra_identified_contact'

// Contato identificado (nome/email/telefone) — preenchido quando o usuário
// submete qualquer formulário no site. Persistido para que fluxos posteriores
// (ex.: chat IA) possam enviar esses dados junto do payload.
export interface IdentifiedContact {
  name?: string
  email?: string
  phone?: string
}

export function setIdentifiedContact(data: IdentifiedContact): void {
  if (typeof window === 'undefined') return
  const existing = getIdentifiedContact() || {}
  const merged: IdentifiedContact = {
    name:  data.name  || existing.name,
    email: data.email || existing.email,
    phone: data.phone || existing.phone,
  }
  try {
    localStorage.setItem(IDENTIFIED_CONTACT_KEY, JSON.stringify(merged))
  } catch {
    // localStorage pode estar indisponível (quota/modo privado) — silencioso
  }
}

export function getIdentifiedContact(): IdentifiedContact | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(IDENTIFIED_CONTACT_KEY)
    return raw ? (JSON.parse(raw) as IdentifiedContact) : null
  } catch {
    return null
  }
}

// Generate unique IDs
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
}

// =====================================================
// Parâmetros do heartbeat de sessão
// Ficam aqui — e não espalhados entre provider e rota — porque cliente e
// servidor precisam concordar: o servidor tolera um intervalo entre pings de
// até MAX_HEARTBEAT_GAP_SECONDS, e quem produz esse intervalo é o cliente.
// =====================================================

/** Intervalo entre pings de heartbeat. */
export const HEARTBEAT_INTERVAL_MS = 30_000

/**
 * Sem NENHUMA interação real (scroll, clique, tecla, troca de página, voltar
 * para a aba) por esse tempo, o heartbeat para. É o que impede a aba esquecida
 * aberta a noite toda de virar "8 horas de permanência".
 */
export const HEARTBEAT_IDLE_TIMEOUT_MS = 5 * 60_000

/**
 * Máximo de segundos que UM ping pode somar à duração da sessão. O servidor
 * acumula o tempo entre pings; um intervalo maior que isso significa que o
 * visitante não estava ali (aba escondida, notebook fechado) e não pode ser
 * creditado como permanência. Vale ~3x o intervalo do heartbeat, para absorver
 * timers estrangulados pelo navegador em segundo plano.
 */
export const MAX_HEARTBEAT_GAP_SECONDS = 90

/** Teto absoluto de duração de uma sessão (4h), como rede de segurança. */
export const MAX_SESSION_DURATION_SECONDS = 4 * 60 * 60

/**
 * Bucket de rate limit exclusivo das rotas de tracking.
 *
 * Antes elas dividiam o bucket "api" (60 req/min por IP) com o resto da API.
 * Com o heartbeat funcionando, cada aba consome ~2 req/min; ~13 abas atrás do
 * mesmo IP (wi-fi da loja, CGNAT de operadora móvel) estouravam o limite e
 * derrubavam TODO o tracking daquele IP — inclusive a criação de sessão. São
 * escritas baratas e idempotentes, então ganham um bucket próprio e folgado:
 * 300/min ≈ 100 abas simultâneas por IP, mantendo o teto contra abuso.
 */
export const TRACKING_RATE_LIMIT = {
  limit: 300,
  windowMs: 60_000,
  prefix: 'tracking',
} as const

/**
 * O heartbeat pode continuar contando permanência agora?
 *
 * Aba visível não é suficiente: document.visibilityState continua 'visible'
 * com a janela atrás de outra e com a tela do desktop desligada. Sem nenhum
 * sinal de vida (scroll, clique, tecla, troca de página, volta para a aba)
 * dentro da janela de ociosidade, paramos de contar.
 */
export function shouldSendHeartbeat(params: {
  visible: boolean
  lastInteractionAt: number
  now: number
}): boolean {
  if (!params.visible) return false
  return params.now - params.lastInteractionAt <= HEARTBEAT_IDLE_TIMEOUT_MS
}

/**
 * Milissegundos do trecho ATUAL na página que contam como permanência: do
 * início do trecho até no máximo HEARTBEAT_IDLE_TIMEOUT_MS depois da última
 * interação real.
 */
export function activeSegmentMs(params: {
  now: number
  segmentStartedAt: number
  lastInteractionAt: number
}): number {
  const cutoff = Math.min(params.now, params.lastInteractionAt + HEARTBEAT_IDLE_TIMEOUT_MS)
  return Math.max(0, cutoff - params.segmentStartedAt)
}

/**
 * Permanência na página em segundos: o que já foi acumulado em trechos
 * anteriores (o visitante escondeu a aba e voltou) mais o trecho atual. O tempo
 * com a aba escondida não entra — e o que foi lido antes não se perde.
 */
export function activeDwellSeconds(params: {
  now: number
  segmentStartedAt: number
  accumulatedMs: number
  lastInteractionAt: number
}): number {
  return Math.round((params.accumulatedMs + activeSegmentMs(params)) / 1000)
}

// Get or create session ID (resets after 30 min inactivity)
export function getSessionId(): string {
  if (typeof window === 'undefined') return ''

  const existing = sessionStorage.getItem(SESSION_ID_KEY)
  if (existing) return existing

  const newSessionId = generateId()
  sessionStorage.setItem(SESSION_ID_KEY, newSessionId)
  return newSessionId
}

// Get stored DB IDs
export function getFingerprintDbId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(FINGERPRINT_DB_ID_KEY)
}

export function getSessionDbId(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(SESSION_DB_ID_KEY)
}

export function setFingerprintDbId(id: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(FINGERPRINT_DB_ID_KEY, id)
}

export function setSessionDbId(id: string): void {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(SESSION_DB_ID_KEY, id)
}

// Get stored visitor ID
export function getStoredVisitorId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(VISITOR_ID_KEY)
}

export function setStoredVisitorId(id: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(VISITOR_ID_KEY, id)
}

// Collect device data for fingerprinting
export function collectDeviceData() {
  if (typeof window === 'undefined') return null

  const nav = navigator
  const screen = window.screen

  return {
    // Browser info
    browser_name: getBrowserName(),
    browser_version: getBrowserVersion(),

    // OS info
    os_name: getOSName(),
    os_version: getOSVersion(),

    // Device info
    device_type: getDeviceType(),
    screen_resolution: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: nav.language,

    // Additional fingerprint components
    color_depth: screen.colorDepth,
    pixel_ratio: window.devicePixelRatio,
    touch_support: 'ontouchstart' in window,
    cookies_enabled: nav.cookieEnabled,
    do_not_track: nav.doNotTrack === '1',
    hardware_concurrency: nav.hardwareConcurrency || null,
    platform: nav.platform,
  }
}

// Cookie helper functions
function setCookie(name: string, value: string, days: number): void {
  if (typeof document === 'undefined') return
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax; Secure`
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? decodeURIComponent(match[2]) : null
}

// Click ID types for platform attribution
export interface ClickIds {
  gclid: string | null   // Google Click ID
  fbclid: string | null  // Facebook/Meta Click ID
  ttclid: string | null  // TikTok Click ID
}

const CLICK_ID_COOKIE_DAYS = 90

// Collect and persist click IDs from URL (stored in cookies for 90 days)
export function collectClickIds(): ClickIds {
  if (typeof window === 'undefined') return { gclid: null, fbclid: null, ttclid: null }

  const params = new URLSearchParams(window.location.search)

  const clickIdParams: Array<{ param: string; cookie: string; key: keyof ClickIds }> = [
    { param: 'gclid', cookie: 'attra_gclid', key: 'gclid' },
    { param: 'fbclid', cookie: 'attra_fbclid', key: 'fbclid' },
    { param: 'ttclid', cookie: 'attra_ttclid', key: 'ttclid' },
  ]

  const result: ClickIds = { gclid: null, fbclid: null, ttclid: null }

  for (const { param, cookie, key } of clickIdParams) {
    // Prefer fresh value from URL, fallback to stored cookie
    const fromUrl = params.get(param)
    if (fromUrl) {
      setCookie(cookie, fromUrl, CLICK_ID_COOKIE_DAYS)
      result[key] = fromUrl
    } else {
      result[key] = getCookie(cookie)
    }
  }

  return result
}

const UTM_COOKIE_DAYS = 30

// Aliases para o ID de campanha de cada plataforma. GA4 padrão é utm_id;
// Google Ads URL template usa {campaignid} → geralmente plumbado como
// campaignid/campaign_id; Meta usa campaign_id.
const CAMPAIGN_ID_ALIASES = ['utm_id', 'campaign_id', 'campaignid'] as const
const ADSET_ID_ALIASES = ['adset_id', 'adsetid', 'ad_group_id', 'adgroupid'] as const
const AD_ID_ALIASES = ['ad_id', 'adid', 'creative_id'] as const

function firstParam(params: URLSearchParams, keys: readonly string[]): string | null {
  for (const k of keys) {
    const v = params.get(k)
    if (v) return v
  }
  return null
}

// Collect UTM parameters from URL and persist in cookies for SPA propagation
// First visit: captures from URL query params and stores in cookies
// Subsequent navigations: reads from cookies (URL params are gone in SPA)
export function collectUTMParams(): Record<string, string | null> {
  if (typeof window === 'undefined') return {}

  const params = new URLSearchParams(window.location.search)

  const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const
  const result: Record<string, string | null> = {}

  for (const key of utmKeys) {
    const cookieName = `attra_${key}`
    const fromUrl = params.get(key)
    if (fromUrl) {
      // Fresh value from URL — persist in cookie
      setCookie(cookieName, fromUrl, UTM_COOKIE_DAYS)
      result[key] = fromUrl
    } else {
      // Fallback to stored cookie
      result[key] = getCookie(cookieName)
    }
  }

  // ID de campanha (utm_id GA4 / campaign_id Meta / campaignid Google Ads)
  // Guardamos sob a chave canônica utm_id; campaign_id/adset/ad ficam à parte.
  const utmIdFromUrl = firstParam(params, CAMPAIGN_ID_ALIASES)
  if (utmIdFromUrl) {
    setCookie('attra_utm_id', utmIdFromUrl, UTM_COOKIE_DAYS)
    result.utm_id = utmIdFromUrl
  } else {
    result.utm_id = getCookie('attra_utm_id')
  }

  const adsetFromUrl = firstParam(params, ADSET_ID_ALIASES)
  if (adsetFromUrl) {
    setCookie('attra_adset_id', adsetFromUrl, UTM_COOKIE_DAYS)
    result.adset_id = adsetFromUrl
  } else {
    result.adset_id = getCookie('attra_adset_id')
  }

  const adFromUrl = firstParam(params, AD_ID_ALIASES)
  if (adFromUrl) {
    setCookie('attra_ad_id', adFromUrl, UTM_COOKIE_DAYS)
    result.ad_id = adFromUrl
  } else {
    result.ad_id = getCookie('attra_ad_id')
  }

  return result
}

// Generate SHA-256 hash of a string (for LGPD-compliant PII hashing)
export async function hashSHA256(value: string): Promise<string> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) return ''
  const encoder = new TextEncoder()
  const data = encoder.encode(value.trim().toLowerCase())
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Check for identity params in URL (email, phone, etc.)
export function collectIdentityFromURL(): { email?: string; phone?: string } | null {
  if (typeof window === 'undefined') return null

  const params = new URLSearchParams(window.location.search)
  const result: { email?: string; phone?: string } = {}

  // Common email parameter names
  const emailParams = ['email', 'e', 'mail', 'em']
  for (const param of emailParams) {
    const value = params.get(param)
    if (value && value.includes('@')) {
      result.email = decodeURIComponent(value)
      break
    }
  }

  // Common phone parameter names
  const phoneParams = ['phone', 'tel', 'telefone', 'celular', 'p']
  for (const param of phoneParams) {
    const value = params.get(param)
    if (value && /[\d\s\-\(\)]+/.test(value)) {
      result.phone = decodeURIComponent(value).replace(/\D/g, '')
      break
    }
  }

  return Object.keys(result).length > 0 ? result : null
}

// Slug da página de DETALHE de veículo. A rota real é /veiculo/<slug>
// (SINGULAR — src/app/(main)/veiculo/[slug]/page.tsx); /veiculos (plural) é a
// LISTAGEM. Retorna null quando o path não é uma página de detalhe.
export function getVehicleSlugFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/veiculo\/([^/?#]+)/)
  if (!match) return null
  const slug = match[1].trim()
  return slug.length > 0 ? slug : null
}

// O slug do AutoConf é "marca-modelo-ano-ID" e termina no ID numérico do
// veículo (ex.: ferrari-296-2025-1005112 → 1005112). Extrair daqui deixa o
// pageview independente do contexto React do veículo, que pode ainda não estar
// montado quando a troca de rota dispara o evento.
export function getVehicleIdFromSlug(slug: string): string | null {
  const match = slug.match(/-(\d+)$/)
  return match ? match[1] : null
}

// Ano de modelo plausível (o slug canônico traz o ano logo antes do ID).
function isPlausibleModelYear(value: string): boolean {
  if (!/^\d{4}$/.test(value)) return false
  const year = Number(value)
  return year >= 1900 && year <= 2100
}

/**
 * ID do veículo em que dá para CONFIAR — o único que pode ser gravado no banco
 * ou usado para consultar a AutoConf.
 *
 * getVehicleIdFromSlug acima é um extrator cru: ele devolve o último número do
 * slug, seja ele o que for. Em slugs legados ou malformados como
 * "gol-1-6-2020" isso devolve "2020", que é o ANO — e um ano é um id
 * perfeitamente válido na AutoConf. O resultado era marca/modelo/preço de
 * OUTRO carro entrando silenciosamente no page view.
 *
 * O slug canônico é "marca-modelo-ANO-ID", então só confiamos no número final
 * quando ele vem precedido de um ano de 4 dígitos ("...-2025-1005112"), ou
 * quando o próprio número não poderia ser um ano.
 */
export function getTrustedVehicleIdFromSlug(slug: string): string | null {
  const raw = getVehicleIdFromSlug(slug)
  if (!raw) return null
  // Nenhum id da AutoConf tem esse tamanho — número absurdo não é id.
  if (raw.length > 10) return null

  const withYear = /-(\d{4})-(\d+)$/.exec(slug)
  if (withYear && isPlausibleModelYear(withYear[1])) return withYear[2]

  // Sem ano antes do número: só aceitamos se ele não puder ser um ano.
  return isPlausibleModelYear(raw) ? null : raw
}

// Determine page type from URL
export function getPageType(pathname: string): string {
  // Barra final normalizada para que /veiculos/ caia no mesmo ramo de /veiculos
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname

  if (path === '/') return 'home'
  // Detalhe do veículo antes da listagem: o teste antigo era '/veiculos/'
  // (plural), rota que não existe, e por isso NENHUM page view era classificado
  // como 'vehicle' — vehicles_viewed ficava zerado em todas as sessões.
  if (getVehicleSlugFromPath(path)) return 'vehicle'
  if (path === '/veiculo' || path === '/veiculos' || path.startsWith('/veiculos/')) return 'vehicles'
  if (path.startsWith('/blog')) return 'blog'
  if (path.startsWith('/contato')) return 'contact'
  if (path.startsWith('/sobre') || path.startsWith('/quem-somos')) return 'about'
  return 'other'
}

// Helper functions for device detection
function getBrowserName(): string {
  const ua = navigator.userAgent
  if (ua.includes('Firefox')) return 'Firefox'
  if (ua.includes('SamsungBrowser')) return 'Samsung Browser'
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera'
  if (ua.includes('Edg')) return 'Edge'
  if (ua.includes('Chrome')) return 'Chrome'
  if (ua.includes('Safari')) return 'Safari'
  return 'Unknown'
}

function getBrowserVersion(): string {
  const ua = navigator.userAgent
  const match = ua.match(/(Firefox|SamsungBrowser|Opera|OPR|Edg|Chrome|Safari|Version)\/(\d+(\.\d+)?)/)
  return match ? match[2] : 'Unknown'
}

function getOSName(): string {
  const ua = navigator.userAgent
  if (ua.includes('Windows')) return 'Windows'
  if (ua.includes('Mac OS X') || ua.includes('Macintosh')) return 'macOS'
  if (ua.includes('Linux')) return 'Linux'
  if (ua.includes('Android')) return 'Android'
  if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS'
  return 'Unknown'
}

function getOSVersion(): string {
  const ua = navigator.userAgent

  // Windows
  const winMatch = ua.match(/Windows NT (\d+\.\d+)/)
  if (winMatch) {
    const versions: Record<string, string> = {
      '10.0': '10/11',
      '6.3': '8.1',
      '6.2': '8',
      '6.1': '7',
    }
    return versions[winMatch[1]] || winMatch[1]
  }

  // macOS
  const macMatch = ua.match(/Mac OS X (\d+[._]\d+([._]\d+)?)/)
  if (macMatch) return macMatch[1].replace(/_/g, '.')

  // iOS
  const iosMatch = ua.match(/OS (\d+_\d+(_\d+)?)/)
  if (iosMatch) return iosMatch[1].replace(/_/g, '.')

  // Android
  const androidMatch = ua.match(/Android (\d+(\.\d+)?)/)
  if (androidMatch) return androidMatch[1]

  return 'Unknown'
}

function getDeviceType(): string {
  const ua = navigator.userAgent

  if (/Tablet|iPad/i.test(ua)) return 'tablet'
  if (/Mobile|Android|iPhone/i.test(ua)) return 'mobile'
  return 'desktop'
}

/**
 * Marcador do esquema que gerou o `visitor_id`. Vai junto na criação da sessão
 * para o servidor saber se pode confiar naquele id ao ligar uma pessoa às suas
 * visitas. Ids antigos (derivados do aparelho) não mandam nada e são tratados
 * como não confiáveis.
 */
export const ORIGEM_ID_ALEATORIO = 'aleatorio'

/**
 * Identificador do visitante — ALEATÓRIO, persistido no localStorage.
 *
 * Antes era o hash das características do aparelho (navegador, sistema,
 * resolução, fuso, idioma, densidade de pixels, núcleos…). Sem nenhum
 * componente aleatório, dois aparelhos iguais com mesmo idioma e fuso geravam o
 * MESMO id — e como o banco faz upsert por `visitor_id`, pessoas distintas
 * viravam a mesma linha. Medido na produção em 01/08/2026: um único
 * "dispositivo" com 1.705 sessões, outros com 1.106 e 1.079.
 *
 * Isso inviabilizava a pergunta "de onde veio ESTA pessoa": ao puxar as sessões
 * de um lead vinham centenas de sessões de estranhos, e a campanha atribuída
 * era a de qualquer um deles.
 *
 * O id não precisa vir do aparelho — ele já é guardado no navegador da própria
 * pessoa. Aleatório elimina a colisão sem perder nada: os dados de aparelho
 * continuam sendo enviados à parte, para os campos informativos.
 */
/**
 * Reconhece o id no formato ANTIGO (SHA-256 do aparelho: 64 dígitos hex) para
 * trocá-lo por um aleatório. Sem isso, quem já visitou o site continuaria
 * carregando para sempre o id compartilhado com estranhos.
 */
export function ehIdDerivadoDoAparelho(id: string): boolean {
  return /^[0-9a-f]{64}$/i.test(id.trim())
}

export function createVisitorFingerprint(): string {
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
    return window.crypto.randomUUID()
  }
  // Sem randomUUID: tempo + aleatório, mesmo esquema do id de sessão — que tem
  // zero colisões em 16.283 registros reais de produção.
  return `${generateId()}-${Math.random().toString(36).slice(2, 10)}`
}

// Track page view
export interface PageViewData {
  page_url: string
  page_path: string
  page_title: string
  page_type: string
  vehicle_id?: string
  vehicle_slug?: string
  vehicle_brand?: string
  vehicle_model?: string
  vehicle_price?: number
}

// Track interaction events
export type InteractionType =
  | 'whatsapp_click'
  | 'phone_click'
  | 'form_click'
  | 'form_submit'
  | 'engine_sound_play'
  | 'calculator_use'
  | 'video_play'
  | 'gallery_view'

export interface InteractionData {
  type: InteractionType
  page_path: string
  vehicle_id?: string
  metadata?: Record<string, unknown>
}


// =====================================================
// BEHAVIORAL SIGNALS COLLECTION (for Enrichment Method 1)
// =====================================================

const PAGE_HISTORY_KEY = 'attra_page_history'
const VISIT_COUNT_KEY = 'attra_visit_count'
const TOTAL_DWELL_KEY = 'attra_total_dwell'

export interface PageHistoryEntry {
  path: string
  type: string
  timestamp: number
  dwellMs: number
}

export interface BehavioralSignals {
  pageHistory: PageHistoryEntry[]
  totalDwellTimeMs: number
  visitCount: number
  productPagesViewed: number
  currentSessionPages: number
}

// Track a page visit in local session history
export function recordPageVisit(path: string, pageType: string): void {
  if (typeof window === 'undefined') return

  const history = getPageHistory()
  history.push({
    path,
    type: pageType,
    timestamp: Date.now(),
    dwellMs: 0, // Updated when leaving the page
  })

  // Keep last 50 pages per session
  const trimmed = history.slice(-50)
  sessionStorage.setItem(PAGE_HISTORY_KEY, JSON.stringify(trimmed))
}

// Update dwell time on the last page visited
export function updateLastPageDwell(dwellMs: number): void {
  if (typeof window === 'undefined') return

  const history = getPageHistory()
  if (history.length > 0) {
    history[history.length - 1].dwellMs = dwellMs
    sessionStorage.setItem(PAGE_HISTORY_KEY, JSON.stringify(history))
  }

  // Accumulate total dwell time
  const totalDwell = parseInt(localStorage.getItem(TOTAL_DWELL_KEY) || '0', 10)
  localStorage.setItem(TOTAL_DWELL_KEY, String(totalDwell + dwellMs))
}

// Get page visit history for current session
export function getPageHistory(): PageHistoryEntry[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(sessionStorage.getItem(PAGE_HISTORY_KEY) || '[]')
  } catch {
    return []
  }
}

// Get and increment visit count (persists across sessions)
export function getAndIncrementVisitCount(): number {
  if (typeof window === 'undefined') return 0
  const count = parseInt(localStorage.getItem(VISIT_COUNT_KEY) || '0', 10) + 1
  localStorage.setItem(VISIT_COUNT_KEY, String(count))
  return count
}

// Collect all behavioral signals for enrichment
export function collectBehavioralSignals(): BehavioralSignals {
  const history = getPageHistory()
  const totalDwell = typeof window !== 'undefined'
    ? parseInt(localStorage.getItem(TOTAL_DWELL_KEY) || '0', 10)
    : 0
  const visitCount = typeof window !== 'undefined'
    ? parseInt(localStorage.getItem(VISIT_COUNT_KEY) || '0', 10)
    : 0

  return {
    pageHistory: history,
    totalDwellTimeMs: totalDwell,
    visitCount,
    productPagesViewed: history.filter(p => p.type === 'vehicle').length,
    currentSessionPages: history.length,
  }
}