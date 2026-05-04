import { NextRequest, NextResponse } from 'next/server'
import { runWeeklyNewsIngestion } from '@/lib/jobs/weekly-news-ingestion'

// This endpoint can be called by:
// 1. Supabase pg_cron (preferred — see migrations/blog_ai_automation)
// 2. External scheduler (cron job no servidor, GitHub Actions, etc.)
// 3. Manual execution (GET /api/cron/news-ingestion?secret=xxx)

const CRON_SECRET = process.env.CRON_SECRET || ''

export async function GET(request: NextRequest) {
  // Verify authorization
  const authHeader = request.headers.get('authorization')
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')

  // Accept Authorization: Bearer <secret> or ?secret=<secret> query param
  const isAuthorizedCron = authHeader === `Bearer ${CRON_SECRET}`
  const hasValidSecret = secret === CRON_SECRET && CRON_SECRET !== ''

  if (!isAuthorizedCron && !hasValidSecret) {
    // Allow in development without secret
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
  }

  console.log('[NewsIngestion API] Starting news ingestion job...')

  try {
    const result = await runWeeklyNewsIngestion()

    if (result.success) {
      return NextResponse.json({
        message: 'News ingestion completed successfully',
        cycleId: result.cycleId,
        articlesInserted: result.articlesInserted,
        errors: result.errors,
      })
    } else {
      return NextResponse.json({
        message: 'News ingestion failed',
        articlesInserted: result.articlesInserted,
        errors: result.errors,
      }, { status: 500 })
    }
  } catch (error) {
    console.error('[NewsIngestion API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}

// Also support POST for more secure execution
export async function POST(request: NextRequest) {
  return GET(request)
}

