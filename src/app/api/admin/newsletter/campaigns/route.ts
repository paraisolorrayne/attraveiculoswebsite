import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated, getCurrentAdmin } from '@/lib/admin-auth'
import { db } from '@/lib/db'

// Migrado de supabase-js → Kysely (ver docs/MIGRACAO_POSTGRES_PURO.md).

// GET - List all campaigns
export async function GET() {
  try {
    const authenticated = await isAuthenticated()
    if (!authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await db.selectFrom('newsletter_campaigns').selectAll()
      .orderBy('created_at', 'desc').execute()

    return NextResponse.json({ success: true, campaigns: data })
  } catch (error) {
    console.error('Error in GET /api/admin/newsletter/campaigns:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new campaign
export async function POST(request: NextRequest) {
  try {
    const authenticated = await isAuthenticated()
    if (!authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = await getCurrentAdmin()
    const body = await request.json()
    const { title, subject, featured_image, sections, html_content, status, scheduled_at } = body

    if (!title) {
      return NextResponse.json({ error: 'Título é obrigatório' }, { status: 400 })
    }

    let data
    try {
      data = await db.insertInto('newsletter_campaigns').values({
        title,
        subject: subject || null,
        featured_image: featured_image || null,
        sections: sections || [],
        html_content: html_content || null,
        status: status || 'draft',
        scheduled_at: scheduled_at || null,
        sent_at: null,
        recipient_count: 0,
        created_by: admin?.id || null,
      }).returningAll().executeTakeFirst()
    } catch (error) {
      console.error('Error creating campaign:', error)
      return NextResponse.json({ error: error instanceof Error ? error.message : 'insert failed' }, { status: 500 })
    }

    return NextResponse.json({ success: true, campaign: data })
  } catch (error) {
    console.error('Error in POST /api/admin/newsletter/campaigns:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

