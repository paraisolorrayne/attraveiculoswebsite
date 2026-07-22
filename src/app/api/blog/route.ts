import { NextRequest, NextResponse } from 'next/server'
import { sql } from 'kysely'
import { db } from '@/lib/db'

// Migrado de supabase-js → Kysely (ver docs/MIGRACAO_POSTGRES_PURO.md).
// blog_posts é a tabela LEGADA (o blog atual usa dual_blog_posts).

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '9')
    const category = searchParams.get('category')
    const tag = searchParams.get('tag')

    // Base com os mesmos filtros; reusada pra count e pra página
    let base = db.selectFrom('blog_posts')
      .where('published_at', 'is not', null)
      .where('published_at', '<=', new Date())

    if (category) {
      // 'category' é coluna legada (mantém comportamento antigo)
      base = base.where(sql`category`, '=', category)
    }
    if (tag) {
      base = base.where(sql<boolean>`tags @> ARRAY[${tag}]::text[]`)
    }

    const from = (page - 1) * limit

    const countRow = await base.select(sql<number>`count(*)::int`.as('n')).executeTakeFirst()
    const count = countRow?.n ?? 0

    const posts = await base.selectAll()
      .orderBy('published_at', 'desc')
      .limit(limit)
      .offset(from)
      .execute()

    return NextResponse.json({
      success: true,
      data: posts,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error('Blog API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

