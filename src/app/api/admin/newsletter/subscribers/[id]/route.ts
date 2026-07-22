import { NextRequest, NextResponse } from 'next/server'
import type { Updateable } from 'kysely'
import { isAuthenticated } from '@/lib/admin-auth'
import { getCurrentAdmin } from '@/lib/admin-auth-supabase'
import { guardSupervisedAction } from '@/lib/admin-supervision'
import { db } from '@/lib/db'
import type { Database } from '@/lib/db/types'

// Migrado de supabase-js → Kysely (ver docs/MIGRACAO_POSTGRES_PURO.md).

// PUT - Update subscriber
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authenticated = await isAuthenticated()
    if (!authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, is_active } = body

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (is_active !== undefined) {
      updateData.is_active = is_active
      updateData.unsubscribed_at = is_active ? null : new Date()
    }

    let data
    try {
      data = await db.updateTable('newsletter_subscribers')
        .set(updateData as Updateable<Database['newsletter_subscribers']>)
        .where('id', '=', id).returningAll().executeTakeFirst()
    } catch (error) {
      console.error('Error updating subscriber:', error)
      return NextResponse.json({ error: error instanceof Error ? error.message : 'update failed' }, { status: 500 })
    }

    return NextResponse.json({ success: true, subscriber: data })
  } catch (error) {
    console.error('Error in PUT /api/admin/newsletter/subscribers/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete subscriber
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const blocked = await guardSupervisedAction(admin, 'Excluir assinante da newsletter')
    if (blocked) return blocked

    const { id } = await params
    try {
      await db.deleteFrom('newsletter_subscribers').where('id', '=', id).execute()
    } catch (error) {
      console.error('Error deleting subscriber:', error)
      return NextResponse.json({ error: error instanceof Error ? error.message : 'delete failed' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/admin/newsletter/subscribers/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

