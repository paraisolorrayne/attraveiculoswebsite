import { NextRequest, NextResponse } from 'next/server'
import { sql } from 'kysely'
import { db } from '@/lib/db'
import { getCurrentAdmin } from '@/lib/admin-auth'

// Migrado de supabase-js → Kysely (ver docs/MIGRACAO_POSTGRES_PURO.md).
// O embedding do PostgREST (profiles→fingerprints→sessions) virou LEFT JOIN +
// agregação: só precisamos de total_sessions e total_vehicles_viewed por perfil.

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

    let query = db
      .selectFrom('visitor_profiles as p')
      .leftJoin('visitor_fingerprints as fp', 'fp.resolved_profile_id', 'p.id')
      .leftJoin('visitor_sessions as s', 's.fingerprint_id', 'fp.id')
      .selectAll('p')
      .select([
        sql<number>`count(distinct s.id)::int`.as('total_sessions'),
        sql<number>`coalesce(sum(s.vehicles_viewed), 0)::int`.as('total_vehicles_viewed'),
      ])
      .groupBy('p.id')
      .orderBy('p.updated_at', 'desc')
      .limit(limit)
      .offset(offset)

    // Filtro de status
    if (status === 'identified') {
      query = query.where('p.status', 'in', ['identified', 'enriched', 'converted'])
    } else if (status === 'enriched') {
      query = query.where('p.status', '=', 'enriched')
    }

    const profiles = await query.execute()

    return NextResponse.json(profiles)

  } catch (error) {
    console.error('[Visitors API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
