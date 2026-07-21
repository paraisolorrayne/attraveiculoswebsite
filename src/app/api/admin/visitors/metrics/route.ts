import { NextResponse } from 'next/server'
import { sql } from 'kysely'
import { db } from '@/lib/db'
import { getCurrentAdmin } from '@/lib/admin-auth'

// Migrado de supabase-js → Kysely (ver docs/MIGRACAO_POSTGRES_PURO.md).

export async function GET() {
  try {
    const admin = await getCurrentAdmin()
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const countExpr = sql<number>`count(*)::int`

    // Total de visitantes (fingerprints únicos)
    const totalVisitors = (await db.selectFrom('visitor_fingerprints')
      .select(countExpr.as('n')).executeTakeFirst())?.n ?? 0

    // Visitantes identificados
    const identifiedVisitors = (await db.selectFrom('visitor_profiles')
      .select(countExpr.as('n'))
      .where('status', 'in', ['identified', 'enriched', 'converted'])
      .executeTakeFirst())?.n ?? 0

    // Visitantes enriquecidos
    const enrichedVisitors = (await db.selectFrom('visitor_profiles')
      .select(countExpr.as('n')).where('status', '=', 'enriched').executeTakeFirst())?.n ?? 0

    // Total de sessões
    const totalSessions = (await db.selectFrom('visitor_sessions')
      .select(countExpr.as('n')).executeTakeFirst())?.n ?? 0

    // Total de page views
    const totalPageViews = (await db.selectFrom('visitor_page_views')
      .select(countExpr.as('n')).executeTakeFirst())?.n ?? 0

    // Duração média de sessão (amostra de até 1000)
    const sessionDurations = await db.selectFrom('visitor_sessions')
      .select('duration_seconds')
      .where('duration_seconds', 'is not', null)
      .limit(1000)
      .execute()

    const avgSessionDuration = sessionDurations.length
      ? sessionDurations.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / sessionDurations.length
      : 0

    // Cliques no WhatsApp
    const whatsappClicks = (await db.selectFrom('visitor_sessions')
      .select(countExpr.as('n')).where('contacted_whatsapp', '=', true).executeTakeFirst())?.n ?? 0

    // Top veículos (amostra de até 500 page views de veículo)
    const topVehicles = await db.selectFrom('visitor_page_views')
      .select(['vehicle_slug', 'vehicle_brand', 'vehicle_model'])
      .where('vehicle_slug', 'is not', null)
      .limit(500)
      .execute()

    const vehicleViews: Record<string, { slug: string; brand: string; model: string; views: number }> = {}
    for (const pv of topVehicles) {
      if (pv.vehicle_slug) {
        if (!vehicleViews[pv.vehicle_slug]) {
          vehicleViews[pv.vehicle_slug] = {
            slug: pv.vehicle_slug,
            brand: pv.vehicle_brand || '',
            model: pv.vehicle_model || '',
            views: 0,
          }
        }
        vehicleViews[pv.vehicle_slug].views++
      }
    }

    const sortedVehicles = Object.values(vehicleViews)
      .sort((a, b) => b.views - a.views)
      .slice(0, 10)

    return NextResponse.json({
      total_visitors: totalVisitors,
      identified_visitors: identifiedVisitors,
      enriched_visitors: enrichedVisitors,
      total_sessions: totalSessions,
      total_page_views: totalPageViews,
      avg_session_duration: Math.round(avgSessionDuration),
      whatsapp_clicks: whatsappClicks,
      top_vehicles: sortedVehicles,
    })

  } catch (error) {
    console.error('[Visitors Metrics API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
