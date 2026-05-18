import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getCurrentAdmin } from '@/lib/admin-auth-supabase'

/**
 * GET /api/admin/cron-status
 *
 * Diagnóstico das rotinas automáticas (Blog AI diário + News Ingestion semanal).
 *
 * Protegido por getCurrentAdmin() — apenas admins autenticados.
 *
 * Retorna:
 *   - cron_jobs:              SELECT jobname, schedule, active FROM cron.job
 *   - cron_secret_configured: boolean (NÃO retorna o valor do secret)
 *   - blog_ai_last_runs:      últimas 5 linhas de blog_ai_generations
 *   - news_cycles_recent:     últimos 3 news_cycles
 *   - app_url_configured:     NEXT_PUBLIC_SITE_URL
 *
 * Cada query roda em try/catch isolado — uma falha não derruba a rota.
 */
export const dynamic = 'force-dynamic'

interface CronJobRow {
  jobname: string
  schedule: string
  active: boolean
}

interface BlogAiRunRow {
  id: string
  run_date: string
  run_at: string
  strategy: string
  success: boolean
  error_message: string | null
  blog_post_id: string | null
}

interface NewsCycleRow {
  id: string
  week_start: string
  week_end: string
  is_active: boolean
}

type Result<T> = T | { error: string }

interface CronStatusResponse {
  cron_jobs: Result<CronJobRow[]>
  cron_secret_configured: boolean
  blog_ai_last_runs: Result<BlogAiRunRow[]>
  news_cycles_recent: Result<NewsCycleRow[]>
  app_url_configured: string | null
  checked_at: string
}

export async function GET() {
  // Autenticação admin
  const admin = await getCurrentAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const response: CronStatusResponse = {
    cron_jobs: { error: 'not_attempted' },
    cron_secret_configured: Boolean(process.env.CRON_SECRET),
    blog_ai_last_runs: { error: 'not_attempted' },
    news_cycles_recent: { error: 'not_attempted' },
    app_url_configured: process.env.NEXT_PUBLIC_SITE_URL || null,
    checked_at: new Date().toISOString(),
  }

  // 1. Cron jobs (schema cron) — exige RPC ou query raw, então tentamos via RPC.
  //    Se não houver função RPC `list_cron_jobs`, retornamos erro descritivo.
  try {
    const { data, error } = await supabase.rpc('list_cron_jobs')
    if (error) {
      response.cron_jobs = {
        error: `RPC list_cron_jobs indisponível: ${error.message}. ` +
          `Rode em SQL: SELECT jobname, schedule, active FROM cron.job;`,
      }
    } else {
      response.cron_jobs = (data || []) as CronJobRow[]
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    response.cron_jobs = { error: msg }
  }

  // 2. Últimas 5 runs do Blog AI
  try {
    const { data, error } = await supabase
      .from('blog_ai_generations')
      .select('id, run_date, run_at, strategy, success, error_message, blog_post_id')
      .order('run_at', { ascending: false })
      .limit(5)
    if (error) {
      response.blog_ai_last_runs = { error: error.message }
    } else {
      response.blog_ai_last_runs = (data || []) as BlogAiRunRow[]
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    response.blog_ai_last_runs = { error: msg }
  }

  // 3. Últimos 3 news_cycles
  try {
    const { data, error } = await supabase
      .from('news_cycles')
      .select('id, week_start, week_end, is_active')
      .order('week_start', { ascending: false })
      .limit(3)
    if (error) {
      response.news_cycles_recent = { error: error.message }
    } else {
      response.news_cycles_recent = (data || []) as NewsCycleRow[]
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    response.news_cycles_recent = { error: msg }
  }

  return NextResponse.json(response)
}
