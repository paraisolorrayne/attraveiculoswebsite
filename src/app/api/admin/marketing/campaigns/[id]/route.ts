import { NextRequest, NextResponse } from 'next/server'
import type { Updateable } from 'kysely'
import { jsonArrayFrom } from 'kysely/helpers/postgres'
import { getCurrentAdmin } from '@/lib/admin-auth-supabase'
import { canAccessRoute } from '@/lib/auth/roles'
import { db } from '@/lib/db'
import type { Database } from '@/lib/db/types'

// Migrado de supabase-js → Kysely (ver docs/MIGRACAO_POSTGRES_PURO.md).
export const dynamic = 'force-dynamic'

function campaignWithVehicles(id: string) {
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
    .where('marketing_campaigns.id', '=', id)
}

// GET - Get single campaign with vehicles
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const campaign = await campaignWithVehicles(id).executeTakeFirst()

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    return NextResponse.json({ campaign })
  } catch (error) {
    console.error('Error in campaign GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update campaign (status, name, description, vehicles)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Quem acessa o painel de Marketing (admin/owner/marketing/gerente) gerencia campanhas.
    if (!canAccessRoute(admin.role, '/admin/marketing')) {
      return NextResponse.json({ error: 'Sem permissão para gerenciar campanhas' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    // Build update object for campaign fields
    const updateData: Record<string, unknown> = {}
    const allowedFields = ['name', 'description', 'status']
    for (const field of allowedFields) {
      if (body[field] !== undefined) updateData[field] = body[field]
    }

    if (Object.keys(updateData).length > 0) {
      try {
        await db.updateTable('marketing_campaigns')
          .set(updateData as Updateable<Database['marketing_campaigns']>)
          .where('id', '=', id).execute()
      } catch (updateError) {
        console.error('Error updating campaign:', updateError)
        return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 })
      }
    }

    // If vehicles array is provided, replace all vehicles
    if (body.vehicles !== undefined) {
      await db.deleteFrom('campaign_vehicles').where('campaign_id', '=', id).execute()

      if (body.vehicles && body.vehicles.length > 0) {
        const vehicleRows = body.vehicles.map((v: { vehicle_name: string; added_date?: string; notes?: string; ended_date?: string; end_reason?: string }, i: number) => ({
          campaign_id: id,
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
          console.error('Error inserting vehicles:', vehiclesError)
        }
      }
    }

    const campaign = await campaignWithVehicles(id).executeTakeFirst()

    return NextResponse.json({ campaign })
  } catch (error) {
    console.error('Error in campaign PATCH:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
