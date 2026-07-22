import { NextRequest, NextResponse } from 'next/server'
import { sql } from 'kysely'
import { isAuthenticated } from '@/lib/admin-auth'
import { db } from '@/lib/db'

// Migrado de supabase-js → Kysely (ver docs/MIGRACAO_POSTGRES_PURO.md).

// GET - List all subscribers with optional filtering
export async function GET(request: NextRequest) {
  try {
    const authenticated = await isAuthenticated()
    if (!authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'all' // all, active, inactive
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    let base = db.selectFrom('newsletter_subscribers')
    if (search) {
      base = base.where((eb) => eb.or([
        eb('email', 'ilike', `%${search}%`),
        eb('name', 'ilike', `%${search}%`),
      ]))
    }
    if (status === 'active') base = base.where('is_active', '=', true)
    else if (status === 'inactive') base = base.where('is_active', '=', false)

    const countRow = await base.select(sql<number>`count(*)::int`.as('n')).executeTakeFirst()
    const count = countRow?.n ?? 0

    const data = await base.selectAll()
      .orderBy('created_at', 'desc')
      .limit(limit).offset(offset)
      .execute()

    return NextResponse.json({ success: true, subscribers: data, total: count, page, limit })
  } catch (error) {
    console.error('Error in GET /api/admin/newsletter/subscribers:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Add subscriber(s) - supports single and batch import
export async function POST(request: NextRequest) {
  try {
    const authenticated = await isAuthenticated()
    if (!authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Batch import
    if (Array.isArray(body.subscribers)) {
      const subscribers = body.subscribers.map((s: { email: string; name?: string }) => ({
        email: s.email.toLowerCase().trim(),
        name: s.name || null,
        is_active: true,
        source: 'import',
        subscribed_at: new Date(),
      }))

      try {
        // ignoreDuplicates → ON CONFLICT DO NOTHING; retorna só os inseridos
        const data = await db.insertInto('newsletter_subscribers').values(subscribers)
          .onConflict((oc) => oc.column('email').doNothing())
          .returningAll().execute()
        return NextResponse.json({ success: true, imported: data.length })
      } catch (error) {
        console.error('Error importing subscribers:', error)
        return NextResponse.json({ error: error instanceof Error ? error.message : 'import failed' }, { status: 500 })
      }
    }

    // Single subscriber
    const { email, name } = body
    if (!email) {
      return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 })
    }

    try {
      const data = await db.insertInto('newsletter_subscribers').values({
        email: email.toLowerCase().trim(),
        name: name || null,
        is_active: true,
        source: body.source || 'admin',
        subscribed_at: new Date(),
      })
        .onConflict((oc) => oc.column('email').doUpdateSet({
          name: (eb) => eb.ref('excluded.name'),
          is_active: (eb) => eb.ref('excluded.is_active'),
          source: (eb) => eb.ref('excluded.source'),
          subscribed_at: (eb) => eb.ref('excluded.subscribed_at'),
        }))
        .returningAll().executeTakeFirst()

      return NextResponse.json({ success: true, subscriber: data })
    } catch (error) {
      console.error('Error adding subscriber:', error)
      return NextResponse.json({ error: error instanceof Error ? error.message : 'insert failed' }, { status: 500 })
    }
  } catch (error) {
    console.error('Error in POST /api/admin/newsletter/subscribers:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
