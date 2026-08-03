'use client'

import { createContext, useContext, useEffect, useRef, useCallback, ReactNode, useState, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  createVisitorFingerprint,
  ehIdDerivadoDoAparelho,
  ORIGEM_ID_ALEATORIO,
  collectDeviceData,
  collectUTMParams,
  collectClickIds,
  collectIdentityFromURL,
  getPageType,
  getVehicleSlugFromPath,
  getTrustedVehicleIdFromSlug,
  getSessionId,
  getStoredVisitorId,
  setStoredVisitorId,
  getFingerprintDbId,
  setFingerprintDbId,
  getSessionDbId,
  setSessionDbId,
  recordPageVisit,
  updateLastPageDwell,
  getAndIncrementVisitCount,
  setIdentifiedContact,
  shouldSendHeartbeat,
  activeSegmentMs,
  activeDwellSeconds,
  HEARTBEAT_INTERVAL_MS,
  type InteractionType,
  type ClickIds,
} from '@/lib/visitor-tracking'
import {
  pushSessionStartEvent,
  pushVisitorIdentifiedEvent,
  setGA4UserProperties,
  type VisitorContext,
} from '@/hooks/use-analytics'
import { identifyClarityUser, setClarityTag } from '@/components/analytics/microsoft-clarity'
import { sendAbandonedLeadWebhook } from '@/lib/webhook'

// Geolocation data type
interface GeolocationData {
  city: string
  region: string
  country: string
}

interface VisitorTrackingContextType {
  visitorId: string | null
  sessionId: string | null
  geolocation: GeolocationData | null
  deviceData: ReturnType<typeof collectDeviceData> | null
  utmParams: Record<string, string | null> | null
  clickIds: ClickIds | null
  getVisitorContext: () => VisitorContext
  trackInteraction: (type: InteractionType, metadata?: Record<string, unknown>) => void
  identifyVisitor: (data: { email?: string; phone?: string; name?: string }) => void
}

const VisitorTrackingContext = createContext<VisitorTrackingContextType>({
  visitorId: null,
  sessionId: null,
  geolocation: null,
  deviceData: null,
  utmParams: null,
  clickIds: null,
  getVisitorContext: () => ({}),
  trackInteraction: () => {},
  identifyVisitor: () => {},
})

export const useVisitorTracking = () => useContext(VisitorTrackingContext)

interface Props {
  children: ReactNode
}

/**
 * Observa a query string e avisa o provider quando ela muda.
 *
 * Existe para conter o `useSearchParams` num canto minúsculo. Esse hook faz o
 * subtree do Suspense mais próximo ABANDONAR a renderização estática: o HTML
 * prerenderizado sai com o fallback no lugar do conteúdo. Como o Suspense
 * ficava no layout raiz envolvendo `{children}`, as 204 rotas estáticas do
 * site iam ao ar sem NENHUMA tag renderizada — sem h1, sem h2, sem texto —,
 * com todo o conteúdo só dentro do payload RSC, invisível para crawler que não
 * executa JavaScript. Aqui o prejuízo se limita a este componente, que não
 * renderiza nada.
 *
 * O valor da query nunca foi lido: `searchParams` era apenas dependência do
 * efeito de pageview, para ele reexecutar quando a URL mudasse. É esse gatilho,
 * e só ele, que este observador preserva.
 */
function ObservadorDeQuery({ aoMudar }: { aoMudar: (query: string) => void }) {
  const searchParams = useSearchParams()
  const query = searchParams.toString()
  useEffect(() => { aoMudar(query) }, [query, aoMudar])
  return null
}

export function VisitorTrackingProvider({ children }: Props) {
  const pathname = usePathname()
  const [queryAtual, setQueryAtual] = useState('')
  const visitorIdRef = useRef<string | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const fingerprintDbIdRef = useRef<string | null>(null)
  const sessionDbIdRef = useRef<string | null>(null)
  const lastPathRef = useRef<string>('')
  // Preenchido no primeiro efeito (Date.now() durante o render é impuro). Só é
  // lido depois que um page view define lastPathRef, então o 0 nunca vaza.
  const pageStartTimeRef = useRef<number>(0)
  // Tempo já acumulado nesta página em trechos ANTERIORES (o visitante escondeu
  // a aba e voltou). pageStartTimeRef marca só o trecho atual, para que o tempo
  // fora não seja contado como permanência — e nem perdido.
  const pageActiveMsRef = useRef<number>(0)
  const initialized = useRef(false)
  const scrollDepthRef = useRef<number>(0)
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Última interação REAL do visitante (scroll, clique, tecla, troca de página,
  // volta para a aba). É o que separa "está lendo" de "aba esquecida aberta".
  const lastInteractionAtRef = useRef<number>(0)

  // Abandoned lead detection refs
  const hasFilledFormRef = useRef(false)
  const hasClickedWhatsAppRef = useRef(false)
  const abandonedLeadSentRef = useRef(false)
  const geolocationRef = useRef<GeolocationData | null>(null)

  // State for enriched data (exposed via context)
  // sessionDbId precisa ser ESTADO (não só ref): os efeitos de pageview e de
  // heartbeat dependem dele e refs não disparam re-render, então antes eles
  // rodavam uma única vez com o valor null da montagem e nunca mais.
  const [sessionDbId, setSessionDbIdState] = useState<string | null>(null)
  // fingerprintDbId também é estado, e pela mesma razão: o efeito de page view
  // depende dos DOIS ids. Se só um deles disparasse re-render, o efeito podia
  // rodar num momento em que o outro ainda era null e nunca mais voltar.
  const [fingerprintDbId, setFingerprintDbIdState] = useState<string | null>(null)
  const [visitorId, setVisitorIdState] = useState<string | null>(null)
  const [sessionId, setSessionIdState] = useState<string | null>(null)
  const [geolocation, setGeolocation] = useState<GeolocationData | null>(null)
  const [deviceData, setDeviceData] = useState<ReturnType<typeof collectDeviceData> | null>(null)
  const [utmParams, setUtmParams] = useState<Record<string, string | null> | null>(null)
  const [clickIds, setClickIds] = useState<ClickIds | null>(null)
  const referrerRef = useRef<string | null>(null)
  const landingPageRef = useRef<string | null>(null)

  // Fila para interações disparadas antes da sessão estar pronta (corrida
  // entre init /api/tracking/session e o primeiro clique do usuário).
  // Drena quando session_db_id fica disponível.
  const pendingInteractionsRef = useRef<Array<{ type: InteractionType; metadata?: Record<string, unknown>; page_path: string }>>([])

  const flushPendingInteractions = useCallback(() => {
    if (!fingerprintDbIdRef.current || !sessionDbIdRef.current) return
    const queued = pendingInteractionsRef.current
    if (queued.length === 0) return
    pendingInteractionsRef.current = []
    for (const ev of queued) {
      fetch('/api/tracking/interaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fingerprint_db_id: fingerprintDbIdRef.current,
          session_db_id: sessionDbIdRef.current,
          type: ev.type,
          page_path: ev.page_path,
          metadata: ev.metadata,
        }),
      }).catch(() => {})
    }
  }, [])

  // Initialize fingerprint and session
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    // Relógio da primeira página (não pode ser inicializado no render)
    pageStartTimeRef.current = Date.now()
    // Abrir a página já conta como presença; o ócio começa a contar daqui.
    lastInteractionAtRef.current = Date.now()

    const init = async () => {
      // Get or create visitor ID (fingerprint)
      // Id no formato antigo (hash do aparelho) é TROCADO: ele é compartilhado
      // com todos os aparelhos iguais, e mantê-lo perpetuaria a colisão.
      let visitorId = getStoredVisitorId()
      if (!visitorId || ehIdDerivadoDoAparelho(visitorId)) {
        visitorId = createVisitorFingerprint()
        setStoredVisitorId(visitorId)
      }
      visitorIdRef.current = visitorId
      setVisitorIdState(visitorId)

      // Get session ID
      const sessionId = getSessionId()
      sessionIdRef.current = sessionId
      setSessionIdState(sessionId)

      // Ids já conhecidos (localStorage/sessionStorage) HIDRATAM o estado, não
      // só os refs. Os efeitos de page view e de heartbeat dependem do estado;
      // se ele só fosse preenchido dentro do `if (response.ok)` abaixo, um 429
      // ou um 500 na criação da sessão deixaria sessionDbId null para sempre
      // naquele carregamento — nenhum page view em nenhuma navegação e nenhum
      // heartbeat — mesmo com um id perfeitamente válido guardado aqui.
      const storedFingerprintDbId = getFingerprintDbId()
      const storedSessionDbId = getSessionDbId()
      fingerprintDbIdRef.current = storedFingerprintDbId
      sessionDbIdRef.current = storedSessionDbId
      if (storedFingerprintDbId) setFingerprintDbIdState(storedFingerprintDbId)
      if (storedSessionDbId) setSessionDbIdState(storedSessionDbId)
      console.log('[VisitorTracking] Initial fingerprintDbId from localStorage:', fingerprintDbIdRef.current)

      // Collect device data, UTM params, and click IDs
      const collectedDeviceData = collectDeviceData()
      const collectedUtmParams = collectUTMParams()
      const collectedClickIds = collectClickIds()
      setDeviceData(collectedDeviceData)
      setUtmParams(collectedUtmParams)
      setClickIds(collectedClickIds)
      referrerRef.current = document.referrer || null
      landingPageRef.current = window.location.pathname

      // Track visit count (persists across sessions for behavioral scoring)
      const visitCount = getAndIncrementVisitCount()
      console.log('[VisitorTracking] Visit count:', visitCount)

      // Initialize session with API first (to get session_db_id for geo update)
      let geoData: GeolocationData | null = null

      try {
        const response = await fetch('/api/tracking/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            visitor_id: visitorId,
            // Diz ao servidor que este id é aleatório (confiável para ligar uma
            // pessoa às visitas dela). Cliente antigo não manda nada.
            origem_id: ORIGEM_ID_ALEATORIO,
            session_id: sessionId,
            device_data: collectedDeviceData,
            utm_params: collectedUtmParams,
            click_ids: collectedClickIds,
            referrer_url: document.referrer || null,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          console.log('[VisitorTracking] Session API response:', data)
          if (data.fingerprint_db_id) {
            setFingerprintDbId(data.fingerprint_db_id)
            fingerprintDbIdRef.current = data.fingerprint_db_id
            setFingerprintDbIdState(data.fingerprint_db_id)
            console.log('[VisitorTracking] fingerprintDbId set:', data.fingerprint_db_id)
          }
          if (data.session_db_id) {
            setSessionDbId(data.session_db_id)
            sessionDbIdRef.current = data.session_db_id
            // Destrava os efeitos que dependem da sessão (pageview da landing
            // page e heartbeat), que só rodam de novo com um re-render.
            setSessionDbIdState(data.session_db_id)
            // Drena interações enfileiradas antes da sessão existir
            flushPendingInteractions()
          }
        } else {
          const errorData = await response.json().catch(() => ({}))
          console.error('[VisitorTracking] Session API error:', response.status, errorData)
        }

        // Fetch geolocation (passes session_db_id so backend updates visitor_sessions)
        try {
          const geoUrl = sessionDbIdRef.current
            ? `/api/geolocation?session_db_id=${sessionDbIdRef.current}`
            : '/api/geolocation'
          const geoResponse = await fetch(geoUrl)
          if (geoResponse.ok) {
            geoData = await geoResponse.json()
            setGeolocation(geoData)
            geolocationRef.current = geoData
          }
        } catch (e) {
          console.error('[VisitorTracking] Geolocation fetch error:', e)
        }

        // Push session_start event to dataLayer with all collected data
        pushSessionStartEvent(
          visitorId,
          sessionId,
          collectedDeviceData ? {
            device_type: collectedDeviceData.device_type,
            browser_name: collectedDeviceData.browser_name,
            os_name: collectedDeviceData.os_name,
            screen_resolution: collectedDeviceData.screen_resolution,
          } : undefined,
          collectedUtmParams,
          geoData ? {
            city: geoData.city,
            region: geoData.region,
            country: geoData.country,
          } : undefined
        )

        // Set Clarity tags for segmentation
        if (collectedDeviceData?.device_type) {
          setClarityTag('device_type', collectedDeviceData.device_type)
        }
        if (geoData?.city) {
          setClarityTag('user_city', geoData.city)
        }
        if (collectedUtmParams?.utm_source) {
          setClarityTag('utm_source', collectedUtmParams.utm_source)
        }

        // Identify visitor in Clarity with anonymous ID
        identifyClarityUser(visitorId, sessionId)

        // Check for identity in URL params
        const identityFromURL = collectIdentityFromURL()
        if (identityFromURL) {
          await fetch('/api/tracking/identify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fingerprint_db_id: fingerprintDbIdRef.current,
              source: 'url_param',
              ...identityFromURL,
            }),
          })

          // Push visitor_identified event to dataLayer
          pushVisitorIdentifiedEvent(
            'url_param',
            !!identityFromURL.email,
            !!identityFromURL.phone,
            false,
            {
              visitorId,
              sessionId,
              geolocation: geoData ? {
                city: geoData.city,
                region: geoData.region,
                country: geoData.country,
              } : undefined,
            }
          )

          // Set GA4 user properties (hashed for privacy)
          setGA4UserProperties({
            user_identified: true,
            identification_source: 'url_param',
            user_city: geoData?.city || 'unknown',
            user_region: geoData?.region || 'unknown',
          })
        }
      } catch (error) {
        console.error('[VisitorTracking] Init error:', error)
      }
    }

    init()
  }, [flushPendingInteractions])

  // Tempo de permanência que dá para defender: soma dos trechos em que a aba
  // esteve à frente, e cada trecho conta no máximo até HEARTBEAT_IDLE_TIMEOUT_MS
  // depois da última interação real. Sem esses dois cortes, uma aba aberta e
  // esquecida a noite toda voltaria como "8 horas na página" no evento de saída.
  const elapsedActiveSeconds = useCallback((): number => {
    return activeDwellSeconds({
      now: Date.now(),
      segmentStartedAt: pageStartTimeRef.current,
      accumulatedMs: pageActiveMsRef.current,
      lastInteractionAt: lastInteractionAtRef.current,
    })
  }, [])

  // Track page views on navigation
  useEffect(() => {
    // A rota /api/tracking/pageview exige fingerprint_db_id + session_db_id;
    // sem eles o evento seria descartado com 400. Depender dos ESTADOS
    // sessionDbId/fingerprintDbId faz o efeito rodar de novo assim que eles
    // ficam disponíveis — seja porque a sessão acabou de nascer, seja porque
    // vieram hidratados do sessionStorage/localStorage.
    if (!sessionDbId || !fingerprintDbId) return
    if (!visitorIdRef.current || !sessionIdRef.current) return
    if (pathname === lastPathRef.current) return

    // Calculate time on previous page — ANTES de marcar a navegação como
    // interação, senão o corte por ociosidade seria empurrado para agora e a
    // página anterior herdaria todo o tempo em que ninguém estava ali.
    const timeOnPrevPage = lastPathRef.current ? elapsedActiveSeconds() : 0

    // Navegar é interação real: o visitante está ali.
    lastInteractionAtRef.current = Date.now()

    // Update previous page dwell time in behavioral signals
    if (lastPathRef.current && timeOnPrevPage > 0) {
      updateLastPageDwell(timeOnPrevPage * 1000)

      fetch('/api/tracking/page-time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_db_id: sessionDbId,
          page_path: lastPathRef.current,
          time_on_page_seconds: timeOnPrevPage,
        }),
      }).catch(() => {})
    }

    // Track new page view
    const pageType = getPageType(pathname)

    // Record page visit in behavioral signal history
    recordPageVisit(pathname, pageType)

    // Slug e ID do veículo saem do PRÓPRIO pathname (/veiculo/<slug>, e o slug
    // do AutoConf termina no ID). Isso elimina a corrida com o contexto do
    // veículo — que é montado por um componente filho e pode não estar
    // preenchido no instante da troca de rota. Marca/modelo/preço são
    // completados no servidor a partir do slug.
    const vehicleSlug = getVehicleSlugFromPath(pathname)

    fetch('/api/tracking/pageview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // Os valores do ESTADO, os mesmos que a guarda acima já validou —
        // assim não há como enviar um id que a guarda não aprovou.
        fingerprint_db_id: fingerprintDbId,
        session_db_id: sessionDbId,
        page_url: window.location.href,
        page_path: pathname,
        page_title: document.title,
        page_type: pageType,
        // ID confiável apenas: em slug legado/malformado ("gol-1-6-2020") o
        // último número é o ANO, e mandá-lo como vehicle_id colocava dados de
        // outro carro no evento.
        ...(vehicleSlug
          ? { vehicle_slug: vehicleSlug, vehicle_id: getTrustedVehicleIdFromSlug(vehicleSlug) }
          : {}),
      }),
    }).catch(() => {})

    lastPathRef.current = pathname
    pageStartTimeRef.current = Date.now()
    pageActiveMsRef.current = 0
    scrollDepthRef.current = 0
  }, [pathname, queryAtual, sessionDbId, fingerprintDbId, elapsedActiveSeconds])

  // --- Heartbeat + visibilitychange + pagehide ---
  // Garante time_on_page da ÚLTIMA página e, principalmente, o encerramento da
  // sessão: cada ping atualiza last_activity_at e o servidor SOMA o intervalo
  // desde o ping anterior em duration_seconds. Assim, mesmo que o cliente suma
  // sem avisar (app morto no mobile, crash, bateria), a duração fica coerente
  // até o último heartbeat em vez de NULL.
  useEffect(() => {
    if (!sessionDbId) return

    const sendPageTime = (isExit = false) => {
      const elapsed = elapsedActiveSeconds()
      if (!sessionDbIdRef.current || !lastPathRef.current) return
      // No heartbeat não vale a pena gastar request com menos de 1s; na saída
      // mandamos sempre, senão um bounce rápido nunca fecharia a sessão.
      if (!isExit && elapsed < 1) return

      const payload = JSON.stringify({
        session_db_id: sessionDbIdRef.current,
        page_path: lastPathRef.current,
        time_on_page_seconds: elapsed,
        scroll_depth_percent: scrollDepthRef.current,
        is_exit: isExit,
      })

      // Use sendBeacon for exit events (survives page unload)
      if (isExit && navigator.sendBeacon) {
        // Blob com content-type explícito: sem isso o beacon vai como
        // text/plain e o request.json() da rota ainda funciona, mas o Content-Type
        // correto evita surpresa em proxies/CDN.
        navigator.sendBeacon(
          '/api/tracking/page-time',
          new Blob([payload], { type: 'application/json' }),
        )
      } else {
        fetch('/api/tracking/page-time', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(() => {})
      }
    }

    // Heartbeat — exige aba visível E interação recente.
    //
    // Só "visível" não bastava: document.visibilityState continua 'visible'
    // com a janela atrás de outra janela e com a tela do desktop desligada.
    // A aba do carro deixada aberta a noite toda batia heartbeat a noite
    // inteira e a sessão aparecia no painel com horas de permanência,
    // contaminando a média do dia inteiro. Sem scroll, clique, tecla ou troca
    // de página por HEARTBEAT_IDLE_TIMEOUT_MS, paramos de pingar; a duração
    // congela no último sinal de vida real e volta sozinha quando o visitante
    // volta.
    heartbeatIntervalRef.current = setInterval(() => {
      const podeContar = shouldSendHeartbeat({
        visible: document.visibilityState === 'visible',
        lastInteractionAt: lastInteractionAtRef.current,
        now: Date.now(),
      })
      if (podeContar) sendPageTime(false)
    }, HEARTBEAT_INTERVAL_MS)

    // Tab hidden → flush current dwell time.
    // Voltar para a aba é interação real (o visitante escolheu voltar), e o
    // relógio da página recomeça: o tempo em que ele esteve fora não é
    // permanência.
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        sendPageTime(true)
        // Fecha o trecho atual: o que vier depois só conta quando a aba voltar.
        pageActiveMsRef.current += activeSegmentMs({
          now: Date.now(),
          segmentStartedAt: pageStartTimeRef.current,
          lastInteractionAt: lastInteractionAtRef.current,
        })
        pageStartTimeRef.current = Date.now()
        return
      }
      lastInteractionAtRef.current = Date.now()
      pageStartTimeRef.current = Date.now()
    }

    // pagehide (e não beforeunload) é o sinal confiável em mobile: iOS Safari
    // frequentemente não dispara beforeunload, e beforeunload ainda atrapalha o
    // bfcache. visibilitychange + pagehide cobrem troca de app, lock de tela e
    // fechamento de aba.
    const onPageHide = () => sendPageTime(true)

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pagehide', onPageHide)

    return () => {
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('pagehide', onPageHide)
    }
  }, [sessionDbId, elapsedActiveSeconds])

  // --- Sinais de presença real ---
  // Alimenta lastInteractionAtRef, que é quem autoriza o heartbeat a continuar
  // contando permanência. Só ouvimos e anotamos o horário — nada é enviado.
  useEffect(() => {
    const markInteraction = () => {
      lastInteractionAtRef.current = Date.now()
    }

    const options = { passive: true, capture: true } as const
    document.addEventListener('pointerdown', markInteraction, options)
    document.addEventListener('keydown', markInteraction, options)
    document.addEventListener('touchstart', markInteraction, options)

    return () => {
      document.removeEventListener('pointerdown', markInteraction, options)
      document.removeEventListener('keydown', markInteraction, options)
      document.removeEventListener('touchstart', markInteraction, options)
    }
  }, [])

  // --- Scroll depth tracking (25/50/75/100%) ---
  useEffect(() => {
    const onScroll = () => {
      // Rolar a página é presença real — conta mesmo em página sem barra de
      // rolagem útil (o early return abaixo).
      lastInteractionAtRef.current = Date.now()

      const scrollTop = window.scrollY || document.documentElement.scrollTop
      const docHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight
      ) - window.innerHeight
      if (docHeight <= 0) return

      const pct = Math.min(100, Math.round((scrollTop / docHeight) * 100))
      // Snap to milestones
      const milestone = pct >= 100 ? 100 : pct >= 75 ? 75 : pct >= 50 ? 50 : pct >= 25 ? 25 : 0
      if (milestone > scrollDepthRef.current) {
        scrollDepthRef.current = milestone
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [pathname])

  // Get current visitor context for enriching analytics events
  const getVisitorContext = useCallback((): VisitorContext => {
    return {
      visitorId: visitorIdRef.current || undefined,
      sessionId: sessionIdRef.current || undefined,
      fingerprintDbId: fingerprintDbIdRef.current || undefined,
      geolocation: geolocation ? {
        city: geolocation.city,
        region: geolocation.region,
        country: geolocation.country,
      } : undefined,
      device: deviceData ? {
        type: deviceData.device_type,
        browser: deviceData.browser_name,
        os: deviceData.os_name,
        screenResolution: deviceData.screen_resolution,
      } : undefined,
      traffic: {
        utmSource: utmParams?.utm_source || undefined,
        utmMedium: utmParams?.utm_medium || undefined,
        utmCampaign: utmParams?.utm_campaign || undefined,
        utmContent: utmParams?.utm_content || undefined,
        utmTerm: utmParams?.utm_term || undefined,
        utmId: utmParams?.utm_id || undefined,
        adsetId: utmParams?.adset_id || undefined,
        adId: utmParams?.ad_id || undefined,
        gclid: clickIds?.gclid || undefined,
        fbclid: clickIds?.fbclid || undefined,
        ttclid: clickIds?.ttclid || undefined,
        referrer: referrerRef.current || undefined,
        landingPage: landingPageRef.current || undefined,
      },
    }
  }, [geolocation, deviceData, utmParams, clickIds])

  // Track interactions (WhatsApp clicks, form submits, etc.)
  // Also pushes to dataLayer for analytics sync
  const trackInteraction = useCallback((type: InteractionType, metadata?: Record<string, unknown>) => {
    // Mark conversions to suppress abandoned lead webhook — independente da
    // sessão estar pronta
    if (type === 'form_submit' || type === 'form_click') {
      hasFilledFormRef.current = true
    }
    if (type === 'whatsapp_click' || type === 'phone_click') {
      hasClickedWhatsAppRef.current = true
    }

    // Se a sessão ainda não foi inicializada, enfileira pra enviar depois
    if (!fingerprintDbIdRef.current || !sessionDbIdRef.current) {
      pendingInteractionsRef.current.push({ type, metadata, page_path: pathname })
      console.warn('[VisitorTracking] Interaction queued (session not ready):', type)
      // Cai no dataLayer mesmo assim para GA4 não perder
    } else {
      // Send to internal tracking API
      fetch('/api/tracking/interaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fingerprint_db_id: fingerprintDbIdRef.current,
          session_db_id: sessionDbIdRef.current,
          type,
          page_path: pathname,
          metadata,
        }),
      }).catch(() => {})
    }

    // Map interaction type to analytics event and push to dataLayer
    // This syncs visitor tracking with GTM/GA4
    const analyticsEventMap: Record<InteractionType, string> = {
      'whatsapp_click': 'interaction_whatsapp',
      'phone_click': 'interaction_phone',
      'form_click': 'interaction_form_click',
      'form_submit': 'interaction_form_submit',
      'engine_sound_play': 'interaction_engine_sound',
      'calculator_use': 'interaction_calculator',
      'video_play': 'interaction_video',
      'gallery_view': 'interaction_gallery',
    }

    const analyticsEvent = analyticsEventMap[type]
    if (analyticsEvent && typeof window !== 'undefined') {
      window.dataLayer = window.dataLayer || []
      window.dataLayer.push({
        event: analyticsEvent,
        interaction_type: type,
        page_path: pathname,
        visitor_id: visitorIdRef.current,
        session_id: sessionIdRef.current,
        // Include geolocation for lead events
        ...(geolocation && {
          user_city: geolocation.city,
          user_region: geolocation.region,
          user_country: geolocation.country,
        }),
        // Include metadata
        ...metadata,
      })
    }
  }, [pathname, geolocation])

  // Captura global de cliques em CTAs de contato (WhatsApp/Tel/Email).
  // Em vez de instrumentar cada <a>, escutamos no document e detectamos o
  // tipo pelo href. Isso cobre links existentes e futuros sem mudanças locais.
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      if (!target) return
      const anchor = target.closest('a') as HTMLAnchorElement | null
      if (!anchor) return
      const href = anchor.getAttribute('href') || ''
      if (!href) return

      let interactionType: InteractionType | null = null
      if (/^https?:\/\/(?:api\.)?wa\.me\//i.test(href) || /^https?:\/\/(?:www\.)?whatsapp\.com/i.test(href)) {
        interactionType = 'whatsapp_click'
      } else if (href.startsWith('tel:')) {
        interactionType = 'phone_click'
      } else if (href.startsWith('mailto:')) {
        // Não há tipo dedicado para email; reaproveitamos form_click como "contato"
        interactionType = 'form_click'
      }

      if (!interactionType) return

      // Rastreia sem bloquear a navegação (track é fire-and-forget)
      trackInteraction(interactionType, {
        href,
        anchor_text: (anchor.textContent || '').trim().slice(0, 80),
        page_path: typeof window !== 'undefined' ? window.location.pathname : undefined,
      })
    }

    document.addEventListener('click', handleGlobalClick, { capture: true })
    return () => document.removeEventListener('click', handleGlobalClick, { capture: true })
  }, [trackInteraction])

  // Identify visitor with email/phone - integrates with GA4 and Clarity
  const identifyVisitor = useCallback((data: { email?: string; phone?: string; name?: string }) => {
    console.log('[VisitorTracking] identifyVisitor called', {
      fingerprintDbId: fingerprintDbIdRef.current,
      hasEmail: !!data.email,
      hasPhone: !!data.phone,
      hasName: !!data.name,
    })

    // Persiste em localStorage para que fluxos subsequentes (ex.: chat IA)
    // possam enriquecer o payload com nome/email/telefone já conhecidos.
    setIdentifiedContact({ name: data.name, email: data.email, phone: data.phone })

    // Mark as converted (form identification = conversion)
    hasFilledFormRef.current = true

    if (!fingerprintDbIdRef.current) {
      console.warn('[VisitorTracking] Cannot identify: fingerprintDbId is null. Session may not be initialized yet.')
      return
    }

    // Send to internal tracking API
    fetch('/api/tracking/identify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fingerprint_db_id: fingerprintDbIdRef.current,
        source: 'form',
        ...data,
      }),
    })
      .then(async (res) => {
        const responseData = await res.json()
        if (res.ok) {
          console.log('[VisitorTracking] Identify success:', responseData)
        } else {
          console.error('[VisitorTracking] Identify API error:', responseData)
        }
      })
      .catch((err) => {
        console.error('[VisitorTracking] Identify fetch error:', err)
      })

    // Push visitor_identified event to dataLayer
    pushVisitorIdentifiedEvent(
      'form',
      !!data.email,
      !!data.phone,
      !!data.name,
      {
        visitorId: visitorIdRef.current || undefined,
        sessionId: sessionIdRef.current || undefined,
        geolocation: geolocation ? {
          city: geolocation.city,
          region: geolocation.region,
          country: geolocation.country,
        } : undefined,
      }
    )

    // Set GA4 user properties (LGPD: only status, not actual data)
    setGA4UserProperties({
      user_identified: true,
      identification_source: 'form',
      has_email: !!data.email,
      has_phone: !!data.phone,
      has_name: !!data.name,
      user_city: geolocation?.city || 'unknown',
      user_region: geolocation?.region || 'unknown',
    })

    // Set Clarity tags for identified user
    setClarityTag('user_identified', 'true')
    if (data.name) {
      // Only first name initial for privacy
      setClarityTag('user_initial', data.name.charAt(0).toUpperCase())
    }
  }, [geolocation])

  // =====================================================
  // ABANDONED LEAD DETECTION
  // Exit intent (mouseleave) + beforeunload
  // =====================================================
  useEffect(() => {
    // Check sessionStorage flag on mount (prevents re-fires within same session)
    if (typeof window !== 'undefined' && sessionStorage.getItem('abandoned_lead_sent') === 'true') {
      abandonedLeadSentRef.current = true
    }

    /**
     * Checks conditions and sends the abandoned lead webhook if applicable:
     * 1. Not already sent this session
     * 2. Visitor has NOT filled a form
     * 3. Visitor has NOT clicked WhatsApp/phone
     * 4. Visitor has a fingerprint (tracking initialized)
     */
    const checkAndSendAbandonedLead = (reason: 'exit_intent' | 'beforeunload') => {
      // Already sent this session
      if (abandonedLeadSentRef.current) return

      // Visitor converted — no need to capture as abandoned
      if (hasFilledFormRef.current || hasClickedWhatsAppRef.current) {
        console.log('[Abandoned] Visitor converted, skipping. form:', hasFilledFormRef.current, 'whatsapp:', hasClickedWhatsAppRef.current)
        return
      }

      // Must have tracking data
      if (!fingerprintDbIdRef.current) {
        console.log('[Abandoned] No fingerprint, skipping')
        return
      }

      // Send the beacon
      const sent = sendAbandonedLeadWebhook(reason, geolocationRef.current)
      if (sent) {
        abandonedLeadSentRef.current = true
        sessionStorage.setItem('abandoned_lead_sent', 'true')
        console.log('[Abandoned] Webhook sent successfully, reason:', reason)
      }
    }

    // Desktop exit intent: mouse leaves viewport from the top
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) {
        checkAndSendAbandonedLead('exit_intent')
      }
    }

    // Universal fallback: page is about to unload (tab close, navigation away)
    const handleBeforeUnload = () => {
      checkAndSendAbandonedLead('beforeunload')
    }

    document.addEventListener('mouseleave', handleMouseLeave)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  return (
    <VisitorTrackingContext.Provider
      value={{
        // Estado, não ref: lendo o ref durante o render os consumidores
        // recebiam null para sempre (o ref é preenchido depois, sem re-render).
        visitorId,
        sessionId,
        geolocation,
        deviceData,
        utmParams,
        clickIds,
        getVisitorContext,
        trackInteraction,
        identifyVisitor,
      }}
    >
      <Suspense fallback={null}>
        <ObservadorDeQuery aoMudar={setQueryAtual} />
      </Suspense>
      {children}
    </VisitorTrackingContext.Provider>
  )
}
