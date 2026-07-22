import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/admin-auth'
import { db } from '@/lib/db'

// Migrado de supabase-js → Kysely (ver docs/MIGRACAO_POSTGRES_PURO.md).

// Helper: extract query params from URL string
function extractUrlParams(url: string): Record<string, string> {
  try {
    const parsed = new URL(url)
    const params: Record<string, string> = {}
    for (const [key, value] of parsed.searchParams.entries()) {
      if (['fbclid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'ttclid'].includes(key)) {
        params[key] = value
      }
    }
    return params
  } catch {
    return {}
  }
}

// Helper: determine likely origin
function determineLikelyOrigin(session: Record<string, unknown>, extractedParams: Record<string, string>): { origin: string; confidence: string } {
  const fbclid = session.fbclid || extractedParams.fbclid
  const gclid = session.gclid || extractedParams.gclid
  const utmSource = (session.utm_source as string) || extractedParams.utm_source || ''
  const referrer = (session.referrer_domain as string) || ''

  if (gclid) return { origin: 'Paid - Google Ads', confidence: 'alta' }
  if (fbclid || utmSource.toLowerCase().includes('facebook') || utmSource.toLowerCase().includes('fb') || utmSource.toLowerCase().includes('ig')) {
    return { origin: 'Paid - Facebook/Instagram', confidence: 'alta' }
  }
  if (session.ttclid || extractedParams.ttclid) return { origin: 'Paid - TikTok Ads', confidence: 'alta' }
  if (utmSource) return { origin: `Campaign - ${utmSource}`, confidence: 'media' }
  if (referrer.includes('google')) return { origin: 'Organic - Google', confidence: 'media' }
  if (referrer.includes('facebook') || referrer.includes('instagram')) return { origin: 'Social - Facebook/Instagram', confidence: 'media' }
  if (referrer) return { origin: `Referral - ${referrer}`, confidence: 'baixa' }
  return { origin: 'Direct / Unknown', confidence: 'baixa' }
}

// Helper: generate recommendations
function generateRecommendations(
  pageViews: Record<string, unknown>[],
  leads: Record<string, unknown>[],
  conversionEvents: Record<string, unknown>[],
  likelyOrigin: { origin: string; confidence: string }
): string[] {
  const recommendations: string[] = []
  const hasConversion = leads.length > 0 || conversionEvents.length > 0
  const isPaid = likelyOrigin.origin.startsWith('Paid')
  const avgTimeOnPage = pageViews.length > 0
    ? pageViews.reduce((sum, pv) => sum + ((pv.time_on_page_seconds as number) || 0), 0) / pageViews.length
    : 0
  const hasWhatsappClick = pageViews.some(pv => pv.clicked_whatsapp)
  const hasPhoneClick = pageViews.some(pv => pv.clicked_phone)
  const hasFormClick = pageViews.some(pv => pv.clicked_form)

  if (isPaid && !hasConversion) {
    recommendations.push('Origem paga sem conversão: revisar landing page, verificar parâmetros UTM e testar CTA mais visível (ex.: botão de WhatsApp com tracking event).')
  }
  if (pageViews.length > 3 && !hasWhatsappClick && !hasPhoneClick && !hasFormClick) {
    recommendations.push('Muitas page_views sem interação (clique WhatsApp/telefone/formulário): adicionar teste A/B de CTA, otimizar posicionamento e visibilidade do botão de contato.')
  }
  if (avgTimeOnPage < 15 && pageViews.length > 1) {
    recommendations.push(`Tempo médio por página baixo (${avgTimeOnPage.toFixed(0)}s): otimizar velocidade de carregamento, melhorar UX e revisar relevância do conteúdo da página.`)
  }
  if (leads.length > 0 && leads.every(l => (l as Record<string, unknown>).match_type !== 'exact_session')) {
    recommendations.push('Lead encontrado por correspondência alternativa (IP/fbclid/período): consolidar regras de atribuição session→lead para rastreamento mais preciso.')
  }
  if (isPaid && hasConversion) {
    recommendations.push('Conversão de campanha paga confirmada. Considerar escalar orçamento neste público/criativo e monitorar ROAS.')
  }
  if (pageViews.length === 1 && !hasConversion) {
    recommendations.push('Sessão com bounce (apenas 1 page_view sem conversão): avaliar relevância da landing page em relação ao anúncio/público.')
  }
  if (recommendations.length === 0) {
    recommendations.push('Sessão aparenta comportamento normal. Monitorar padrões similares em lote para identificar tendências.')
  }
  return recommendations.slice(0, 5)
}

export async function GET(request: NextRequest) {
  try {
    const authenticated = await isAuthenticated()
    if (!authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('session_id')

    if (!sessionId) {
      return NextResponse.json({ error: 'session_id query parameter is required' }, { status: 400 })
    }

    // Sanidade do session_id: é a string gerada no client (`${ts}-${base36}`),
    // NÃO um UUID (era o bug — a validação de UUID rejeitava ids válidos).
    if (!/^[\w-]{6,80}$/.test(sessionId)) {
      return NextResponse.json({ error: 'Invalid session_id format.' }, { status: 400 })
    }

    // ── Step 1: Get session data ──
    const session = await db.selectFrom('visitor_sessions').selectAll()
      .where('session_id', '=', sessionId).executeTakeFirst()

    if (!session) {
      return NextResponse.json({ error: 'Session not found', session_id: sessionId }, { status: 404 })
    }

    const sessionDbId = session.id // UUID primary key

    // ── Step 2: Get all page views for this session ──
    const pageViews = await db.selectFrom('visitor_page_views').selectAll()
      .where('session_id', '=', sessionDbId)
      .orderBy('viewed_at', 'asc').limit(500).execute()

    // Extract params from first page URL
    const firstPageUrl = pageViews[0]?.page_url || ''
    const extractedParams = extractUrlParams(firstPageUrl)

    // ── Step 3: (removido) correlação com leads do CRM ──
    // O CRM saiu do site (migrou para o Fykos); mantemos o campo
    // leads_found vazio para compatibilidade com a UI de visitantes.
    const matchedLeads: Array<Record<string, unknown> & { match_type: string }> = []

    // ── Step 4: Get identity events for this session's fingerprint ──
    const identityEvents = await db.selectFrom('identity_events').selectAll()
      .where('fingerprint_id', '=', session.fingerprint_id)
      .orderBy('created_at', 'asc').limit(200).execute()

    // ── Step 5: Get conversion events for this session ──
    const conversionEvents = await db.selectFrom('conversion_events').selectAll()
      .where('session_id', '=', sessionDbId)
      .orderBy('created_at', 'asc').limit(200).execute()

    // ── Step 6: Build summary ──
    const likelyOrigin = determineLikelyOrigin(session as unknown as Record<string, unknown>, extractedParams)

    const navigationTimeline = pageViews.map(pv => ({
      page_path: pv.page_path,
      page_title: pv.page_title,
      page_type: pv.page_type,
      viewed_at: pv.viewed_at,
      time_on_page_seconds: pv.time_on_page_seconds,
      scroll_depth_percent: pv.scroll_depth_percent,
      clicked_whatsapp: pv.clicked_whatsapp,
      clicked_phone: pv.clicked_phone,
      clicked_form: pv.clicked_form,
      played_engine_sound: pv.played_engine_sound,
      vehicle_brand: pv.vehicle_brand,
      vehicle_model: pv.vehicle_model,
      vehicle_price: pv.vehicle_price,
    }))

    const leadsFound: Record<string, unknown>[] = []

    const events = [
      ...identityEvents.map(e => ({
        type: 'identity',
        event_type: e.event_type,
        event_data: e.event_data,
        source: e.source,
        created_at: e.created_at,
      })),
      ...conversionEvents.map(e => ({
        type: 'conversion',
        event_name: e.event_name,
        event_value: e.event_value,
        page_path: e.page_path,
        created_at: e.created_at,
      })),
    ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

    const recommendations = generateRecommendations(
      pageViews as unknown as Record<string, unknown>[],
      matchedLeads,
      conversionEvents as unknown as Record<string, unknown>[],
      likelyOrigin
    )

    return NextResponse.json({
      success: true,
      data: {
        session_summary: {
          session_id: session.session_id,
          session_db_id: sessionDbId,
          session_start: session.started_at || session.created_at,
          session_end: session.ended_at,
          duration_seconds: session.duration_seconds,
          ip_address: session.ip_address,
          country_code: session.country_code,
          region: session.region,
          city: session.city,
          first_page_url: firstPageUrl,
          referrer_url: session.referrer_url,
          referrer_domain: session.referrer_domain,
          utm_source: session.utm_source,
          utm_medium: session.utm_medium,
          utm_campaign: session.utm_campaign,
          utm_content: session.utm_content,
          utm_term: session.utm_term,
          fbclid: session.fbclid,
          gclid: session.gclid,
          ttclid: session.ttclid,
          extracted_params: extractedParams,
          page_views_count: session.page_views_count,
          vehicles_viewed: session.vehicles_viewed,
          contacted_whatsapp: session.contacted_whatsapp,
          submitted_form: session.submitted_form,
          used_calculator: session.used_calculator,
        },
        navigation_timeline: navigationTimeline,
        leads_found: leadsFound,
        leads_count: leadsFound.length,
        events,
        events_count: events.length,
        likely_origin: likelyOrigin,
        recommendations,
      },
    })
  } catch (error) {
    console.error('[Session Explore] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

