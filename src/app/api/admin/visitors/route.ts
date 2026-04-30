import { NextRequest, NextResponse } from 'next/server'
import { supabase } from "@/lib/supabase/tracking-client"
import { getCurrentAdmin } from '@/lib/admin-auth'


export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'all'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    let query = supabase
      .from('visitor_profiles')
      .select(`
        *,
        fingerprints:visitor_fingerprints(
          id,
          visitor_id,
          total_visits,
          last_seen_at,
          sessions:visitor_sessions(
            id,
            page_views_count,
            vehicles_viewed,
            contacted_whatsapp,
            submitted_form
          )
        )
      `)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply status filter
    if (status === 'identified') {
      query = query.in('status', ['identified', 'enriched', 'converted'])
    } else if (status === 'enriched') {
      query = query.eq('status', 'enriched')
    }

    const { data: profiles, error } = await query

    if (error) {
      console.error('[Visitors API] Error:', error)
      return NextResponse.json({ error: 'Failed to fetch visitors' }, { status: 500 })
    }

    // Transform data to include aggregated metrics
    const transformedProfiles = profiles?.map(profile => {
      const fingerprints = profile.fingerprints || []
      let totalSessions = 0
      let totalVehiclesViewed = 0

      fingerprints.forEach((fp: { sessions?: Array<{ vehicles_viewed?: number }> }) => {
        const sessions = fp.sessions || []
        totalSessions += sessions.length
        sessions.forEach((s: { vehicles_viewed?: number }) => {
          totalVehiclesViewed += s.vehicles_viewed || 0
        })
      })

      return {
        ...profile,
        total_sessions: totalSessions,
        total_vehicles_viewed: totalVehiclesViewed,
        fingerprints: undefined, // Remove nested data
      }
    })

    return NextResponse.json(transformedProfiles)

  } catch (error) {
    console.error('[Visitors API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

