import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Migrado de supabase-js → Kysely (ver docs/MIGRACAO_POSTGRES_PURO.md).
// news_articles não tem coluna slug — o lookup é por id (o param chama-se slug).
export const revalidate = 3600

interface RouteParams {
  params: Promise<{ slug: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params

    // Tenta por slug; fallback por id (URLs antigas)
    let article = await db.selectFrom('news_articles').selectAll()
      .where('slug', '=', slug).executeTakeFirst()

    if (!article) {
      try {
        article = await db.selectFrom('news_articles').selectAll()
          .where('id', '=', slug).executeTakeFirst()
      } catch {
        article = undefined // id inválido (não-uuid)
      }
    }

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }

    return NextResponse.json(article)
  } catch (error) {
    console.error('Error in /api/news/[slug]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

