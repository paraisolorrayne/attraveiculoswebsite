import { NextResponse } from 'next/server'
import { supabase } from "@/lib/supabase/tracking-client"
import { getCurrentAdmin } from '@/lib/admin-auth'


export async function GET() {
  try {
    const admin = await getCurrentAdmin()
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get total visitors (unique fingerprints)
    const { count: totalVisitors } = await supabase
      .from('visitor_fingerprints')
      .select('*', { count: 'exact', head: true })

    // Get identified visitors
    const { count: identifiedVisitors } = await supabase
      .from('visitor_profiles')
      .select('*', { count: 'exact', head: true })
      .in('status', ['identified', 'enriched', 'converted'])

    // Get enriched visitors
    const { count: enrichedVisitors } = await supabase
      .from('visitor_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'enriched')

    // Get total sessions
    const { count: totalSessions } = await supabase
      .from('visitor_sessions')
      .select('*', { count: 'exact', head: true })

    // Get total page views
    const { count: totalPageViews } = await supabase
      .from('visitor_page_views')
      .select('*', { count: 'exact', head: true })

    // Get average session duration
    const { data: sessionDurations } = await supabase
      .from('visitor_sessions')
      .select('duration_seconds')
      .not('duration_seconds', 'is', null)
      .limit(1000)

    const avgSessionDuration = sessionDurations?.length
      ? sessionDurations.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / sessionDurations.length
      : 0

    // Get WhatsApp clicks
    const { count: whatsappClicks } = await supabase
      .from('visitor_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('contacted_whatsapp', true)

    // Get top vehicles
    const { data: topVehicles } = await supabase
      .from('visitor_page_views')
      .select('vehicle_slug, vehicle_brand, vehicle_model')
      .not('vehicle_slug', 'is', null)
      .limit(500)

    // Aggregate vehicle views
    const vehicleViews: Record<string, { slug: string; brand: string; model: string; views: number }> = {}
    topVehicles?.forEach(pv => {
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
    })

    const sortedVehicles = Object.values(vehicleViews)
      .sort((a, b) => b.views - a.views)
      .slice(0, 10)

    return NextResponse.json({
      total_visitors: totalVisitors || 0,
      identified_visitors: identifiedVisitors || 0,
      enriched_visitors: enrichedVisitors || 0,
      total_sessions: totalSessions || 0,
      total_page_views: totalPageViews || 0,
      avg_session_duration: Math.round(avgSessionDuration),
      whatsapp_clicks: whatsappClicks || 0,
      top_vehicles: sortedVehicles,
    })

  } catch (error) {
    console.error('[Visitors Metrics API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

