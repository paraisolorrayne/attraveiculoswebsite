import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Migrado de supabase-js → Kysely (ver docs/MIGRACAO_POSTGRES_PURO.md).
// Cache for 1 hour since data changes only weekly
export const revalidate = 3600

interface NewsArticle {
  id: string
  title: string
  description: string | null
  content: string | null
  image_url: string | null
  source_name: string
  original_url: string
  published_at: string
  is_featured: boolean
  featured_order: number | null
  category_id: number
}

interface NewsCycle {
  id: string
  week_start: string
  week_end: string
  is_active: boolean
}

export async function GET() {
  try {
    // Get active cycle
    const cycle = await db.selectFrom('news_cycles').selectAll()
      .where('is_active', '=', true).executeTakeFirst()

    if (!cycle) {
      return NextResponse.json(
        {
          error: 'No active news cycle found',
          cycle: null,
          featured: [],
          formula1: [],
          premiumMarket: []
        },
        { status: 200 }
      )
    }

    // Get featured articles (is_featured = true)
    const featured = await db.selectFrom('news_articles').selectAll()
      .where('news_cycle_id', '=', cycle.id)
      .where('is_featured', '=', true)
      .orderBy('featured_order', 'asc')
      .limit(3).execute()

    // Get Formula 1 articles (category_id = 2)
    const formula1 = await db.selectFrom('news_articles').selectAll()
      .where('news_cycle_id', '=', cycle.id)
      .where('category_id', '=', 2)
      .orderBy('published_at', 'desc')
      .limit(9).execute()

    // Get Premium Market articles (category_id = 3)
    const premiumMarket = await db.selectFrom('news_articles').selectAll()
      .where('news_cycle_id', '=', cycle.id)
      .where('category_id', '=', 3)
      .orderBy('published_at', 'desc')
      .limit(9).execute()

    return NextResponse.json({
      cycle: {
        id: cycle.id,
        week_start: cycle.week_start,
        week_end: cycle.week_end
      },
      featured: featured || [],
      formula1: formula1 || [],
      premiumMarket: premiumMarket || []
    })
  } catch (error) {
    console.error('Error in /api/news:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

