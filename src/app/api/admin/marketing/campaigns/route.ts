import { NextRequest, NextResponse } from 'next/server'
import { jsonArrayFrom } from 'kysely/helpers/postgres'
import { getCurrentAdmin } from '@/lib/admin-auth-supabase'
import { canAccessRoute } from '@/lib/auth/roles'
import { db } from '@/lib/db'

// Migrado de supabase-js → Kysely (ver docs/MIGRACAO_POSTGRES_PURO.md).
// O embed PostgREST `vehicles:campaign_vehicles(*)` virou jsonArrayFrom.
export const dynamic = 'force-dynamic'

/** Campanhas + veículos aninhados (ordenados por display_order). */
function campaignsWithVehicles() {
  return db.selectFrom('marketing_campaigns')
    .selectAll('marketing_campaigns')
    .select((eb) => [
      jsonArrayFrom(
        eb.selectFrom('campaign_vehicles')
          .selectAll('campaign_vehicles')
          .whereRef('campaign_vehicles.campaign_id', '=', 'marketing_campaigns.id')
          .orderBy('display_order', 'asc'),
      ).as('vehicles'),
    ])
}

// GET - List all campaigns with vehicles
export async function GET() {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const campaigns = await campaignsWithVehicles()
      .orderBy('created_at', 'desc').execute()

    return NextResponse.json({ campaigns })
  } catch (error) {
    console.error('Error in campaigns GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create new campaign with vehicles (admin only)
export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Quem acessa o painel de Marketing (admin/owner/marketing/gerente) gerencia campanhas.
    if (!canAccessRoute(admin.role, '/admin/marketing')) {
      return NextResponse.json({ error: 'Sem permissão para gerenciar campanhas' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, vehicles } = body as {
      name: string
      description?: string
      vehicles?: { vehicle_name: string; added_date?: string; notes?: string; ended_date?: string; end_reason?: string }[]
    }

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    let campaign
    try {
      campaign = await db.insertInto('marketing_campaigns').values({
        name,
        description: description || null,
        status: 'publicada',
        created_by: admin.id,
      }).returning('id').executeTakeFirst()
    } catch (campaignError) {
      console.error('Error creating campaign:', campaignError)
      return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 })
    }
    if (!campaign) {
      return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 })
    }

    // Insert vehicles if provided
    if (vehicles && vehicles.length > 0) {
      const vehicleRows = vehicles.map((v, i) => ({
        campaign_id: campaign!.id,
        vehicle_name: v.vehicle_name,
        added_date: v.added_date || null,
        notes: v.notes || null,
        display_order: i,
        ended_date: v.ended_date || null,
        end_reason: v.end_reason || null,
      }))
      try {
        await db.insertInto('campaign_vehicles').values(vehicleRows).execute()
      } catch (vehiclesError) {
        console.error('Error inserting campaign vehicles:', vehiclesError)
      }
    }

    const fullCampaign = await campaignsWithVehicles()
      .where('marketing_campaigns.id', '=', campaign.id).executeTakeFirst()

    return NextResponse.json({ campaign: fullCampaign }, { status: 201 })
  } catch (error) {
    console.error('Error in campaigns POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
