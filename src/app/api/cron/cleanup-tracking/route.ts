import { NextRequest, NextResponse } from 'next/server'
import { sql } from 'kysely'
import { db } from '@/lib/db'
// Migrado de supabase-js → Kysely (ver docs/MIGRACAO_POSTGRES_PURO.md).

// Retenção de dados: apaga tracking/caches com mais de N dias (default 60)
// chamando a função SQL cleanup_old_tracking_data (migration 20260506).
// O pg_cron do Supabase managed não dispara, então este endpoint é executado
// pelo cron nativo da VPS (deploy/cron) — mesmo modelo de blog-ai/news-ingestion.
//
// Uso manual: GET /api/cron/cleanup-tracking?secret=xxx[&days=60]

export const dynamic = 'force-dynamic'

const CRON_SECRET = process.env.CRON_SECRET || ''

interface CleanupRow {
  table_name: string
  rows_deleted: number
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')

  const isAuthorizedCron = authHeader === `Bearer ${CRON_SECRET}`
  const hasValidSecret = secret === CRON_SECRET && CRON_SECRET !== ''

  if (!isAuthorizedCron && !hasValidSecret) {
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const daysParam = Number(searchParams.get('days'))
  // Nunca aceitar janela menor que 30 dias — proteção contra typo apagar dado recente
  const retentionDays = Number.isFinite(daysParam) && daysParam >= 30 ? daysParam : 60

  console.log(`[CleanupTracking API] Running cleanup (retention: ${retentionDays} days)...`)

  try {
    // Chama a função SQL cleanup_old_tracking_data(retention_days) → tabela.
    const { rows } = await sql<CleanupRow>`
      SELECT * FROM cleanup_old_tracking_data(${retentionDays})
    `.execute(db)
    const totalDeleted = rows.reduce((sum, r) => sum + Number(r.rows_deleted || 0), 0)
    console.log(`[CleanupTracking API] Done: ${totalDeleted} rows deleted`, rows)

    return NextResponse.json({
      message: 'Cleanup completed successfully',
      retention_days: retentionDays,
      total_rows_deleted: totalDeleted,
      by_table: rows,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[CleanupTracking API] Error:', msg)
    return NextResponse.json({ message: 'Cleanup failed', error: msg }, { status: 500 })
  }
}
