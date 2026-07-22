import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/admin-auth'
import { getCurrentAdmin } from '@/lib/admin-auth-supabase'
import { guardSupervisedAction } from '@/lib/admin-supervision'
import { db } from '@/lib/db'

// Migrado de supabase-js → Kysely (ver docs/MIGRACAO_POSTGRES_PURO.md).

// GET - Get single campaign
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authenticated = await isAuthenticated()
    if (!authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const data = await db.selectFrom('newsletter_campaigns').selectAll()
      .where('id', '=', id).executeTakeFirst()

    if (!data) {
      return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 })
    }

    return NextResponse.json({ success: true, campaign: data })
  } catch (error) {
    console.error('Error in GET /api/admin/newsletter/campaigns/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update campaign
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
    const { title, subject, featured_image, sections, html_content, status, scheduled_at } = body

    let data
    try {
      data = await db.updateTable('newsletter_campaigns').set({
        title,
        subject: subject || null,
        featured_image: featured_image || null,
        sections: sections ?? [],
        html_content: html_content || null,
        status: status || 'draft',
        scheduled_at: scheduled_at || null,
      }).where('id', '=', id).returningAll().executeTakeFirst()
    } catch (error) {
      console.error('Error updating campaign:', error)
      return NextResponse.json({ error: error instanceof Error ? error.message : 'update failed' }, { status: 500 })
    }

    return NextResponse.json({ success: true, campaign: data })
  } catch (error) {
    console.error('Error in PUT /api/admin/newsletter/campaigns/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete campaign
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const blocked = await guardSupervisedAction(admin, 'Excluir campanha de newsletter')
    if (blocked) return blocked

    const { id } = await params

    // Only allow deleting draft or cancelled campaigns
    const campaign = await db.selectFrom('newsletter_campaigns').select('status')
      .where('id', '=', id).executeTakeFirst()

    if (campaign && campaign.status === 'sent') {
      return NextResponse.json({ error: 'Não é possível excluir uma campanha já enviada' }, { status: 400 })
    }

    try {
      await db.deleteFrom('newsletter_campaigns').where('id', '=', id).execute()
    } catch (error) {
      console.error('Error deleting campaign:', error)
      return NextResponse.json({ error: error instanceof Error ? error.message : 'delete failed' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/admin/newsletter/campaigns/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

