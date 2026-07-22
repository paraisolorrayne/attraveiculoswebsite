import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticated } from '@/lib/admin-auth'
import { db } from '@/lib/db'

// Migrado de supabase-js → Kysely (ver docs/MIGRACAO_POSTGRES_PURO.md).

// GET - Export subscribers as CSV
export async function GET(request: NextRequest) {
  try {
    const authenticated = await isAuthenticated()
    if (!authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'active'

    let base = db.selectFrom('newsletter_subscribers')
      .select(['email', 'name', 'is_active', 'source', 'subscribed_at', 'unsubscribed_at'])
      .orderBy('subscribed_at', 'desc')

    if (status === 'active') base = base.where('is_active', '=', true)
    else if (status === 'inactive') base = base.where('is_active', '=', false)

    const data = await base.execute()

    // Build CSV
    const headers = ['Email', 'Nome', 'Ativo', 'Origem', 'Inscrito em', 'Desinscrito em']
    const rows = data.map(s => [
      s.email,
      s.name || '',
      s.is_active ? 'Sim' : 'Não',
      s.source,
      s.subscribed_at ? new Date(s.subscribed_at).toLocaleDateString('pt-BR') : '',
      s.unsubscribed_at ? new Date(s.unsubscribed_at).toLocaleDateString('pt-BR') : '',
    ])

    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="assinantes-newsletter-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error('Error in GET /api/admin/newsletter/subscribers/export:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

