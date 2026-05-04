import { NextRequest, NextResponse } from 'next/server'
import { runDailyBlogAi, type ForceOptions } from '@/lib/jobs/daily-blog-ai'

// Endpoint triggered by Supabase pg_cron (see migration 20260420_blog_ai_automation.sql).
// Also callable manually for testing via:
//   GET /api/cron/blog-ai?secret=<CRON_SECRET>
//   POST /api/cron/blog-ai   (with Authorization: Bearer <CRON_SECRET>)

// Generation can take a while (multiple Gemini calls). Give it room.
export const maxDuration = 300 // 5 minutes — long-form Gemini generation can take ~2min

const CRON_SECRET = process.env.CRON_SECRET || ''

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')

  if (!CRON_SECRET) {
    // Dev safety: if no secret configured at all, allow only in development
    return process.env.NODE_ENV === 'development'
  }

  if (authHeader === `Bearer ${CRON_SECRET}`) return true
  if (secret === CRON_SECRET) return true
  return false
}

async function handle(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Manual override params for testing: ?strategy=review|comparison&force=1
  const { searchParams } = new URL(request.url)
  const force: ForceOptions = {}
  const strategyParam = searchParams.get('strategy')
  if (strategyParam === 'review' || strategyParam === 'comparison') {
    force.strategy = strategyParam
  }
  if (searchParams.get('force') === '1') {
    force.skipIdempotency = true
  }

  console.log('[BlogAI API] trigger received', force)

  try {
    const result = await runDailyBlogAi(force)

    if (!result.success) {
      return NextResponse.json(
        {
          message: 'Blog AI run failed',
          strategy: result.strategy,
          error: result.error,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Blog AI run completed',
      strategy: result.strategy,
      blogPostId: result.blogPostId,
      blogPostSlug: result.blogPostSlug,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[BlogAI API] unhandled error:', msg)
    return NextResponse.json(
      { error: 'Internal server error', details: msg },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return handle(request)
}

export async function POST(request: NextRequest) {
  return handle(request)
}
