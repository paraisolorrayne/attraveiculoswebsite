/**
 * CLI Diagnostic: Cron Status
 *
 * Roda as mesmas queries do endpoint /api/admin/cron-status, mas direto via
 * service role — útil para inspecionar produção do terminal (SSH na VPS,
 * ou local apontando para o banco prod).
 *
 * Uso:
 *   npx tsx scripts/check-cron-status.ts
 *
 * Env vars exigidas (lê de .env.local ou shell):
 *   NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Opcionalmente: CRON_SECRET (apenas pra reportar se está populado).
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

// Tenta carregar .env.local primeiro, depois .env.production se existir
const envLocal = path.resolve(process.cwd(), '.env.local')
const envProd = path.resolve(process.cwd(), '.env.production')
if (fs.existsSync(envLocal)) dotenv.config({ path: envLocal })
if (fs.existsSync(envProd)) dotenv.config({ path: envProd, override: false })

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    '[check-cron-status] Faltando NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no env.'
  )
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
})

async function checkCronJobs() {
  console.log('\n=== 1. pg_cron jobs ===')
  // Tenta RPC primeiro (recomendado), cai pra mensagem manual se faltar.
  try {
    const { data, error } = await supabase.rpc('list_cron_jobs')
    if (error) {
      console.log(
        `RPC list_cron_jobs indisponível (${error.message}).\n` +
          `Rode no SQL Editor do Supabase:\n` +
          `   SELECT jobname, schedule, active FROM cron.job;`
      )
      return
    }
    if (!data || data.length === 0) {
      console.log('Nenhum job agendado encontrado em cron.job.')
      return
    }
    console.table(data)
  } catch (err) {
    console.log('Erro:', err instanceof Error ? err.message : String(err))
  }
}

async function checkBlogAiRuns() {
  console.log('\n=== 2. blog_ai_generations (últimas 5) ===')
  try {
    const { data, error } = await supabase
      .from('blog_ai_generations')
      .select('run_date, run_at, strategy, success, error_message, blog_post_id')
      .order('run_at', { ascending: false })
      .limit(5)
    if (error) {
      console.log('Erro na query:', error.message)
      return
    }
    if (!data || data.length === 0) {
      console.log('Nenhuma execução registrada em blog_ai_generations.')
      console.log('Possíveis causas:')
      console.log('  - Migration 20260420_blog_ai_automation.sql não aplicada')
      console.log('  - pg_cron nunca chamou o endpoint (secret errado, URL errada)')
      return
    }
    console.table(
      data.map((r) => ({
        run_date: r.run_date,
        run_at: r.run_at,
        strategy: r.strategy,
        success: r.success,
        error: r.error_message ? r.error_message.slice(0, 60) : '',
      }))
    )
  } catch (err) {
    console.log('Erro:', err instanceof Error ? err.message : String(err))
  }
}

async function checkNewsCycles() {
  console.log('\n=== 3. news_cycles (últimos 3) ===')
  try {
    const { data, error } = await supabase
      .from('news_cycles')
      .select('week_start, week_end, is_active')
      .order('week_start', { ascending: false })
      .limit(3)
    if (error) {
      console.log('Erro na query:', error.message)
      return
    }
    if (!data || data.length === 0) {
      console.log('Nenhum news_cycle encontrado.')
      return
    }
    console.table(data)
  } catch (err) {
    console.log('Erro:', err instanceof Error ? err.message : String(err))
  }
}

function checkEnv() {
  console.log('\n=== 4. Env config (sem expor valores) ===')
  const rows = [
    {
      var: 'CRON_SECRET',
      configured: Boolean(process.env.CRON_SECRET),
    },
    {
      var: 'NEXT_PUBLIC_SITE_URL',
      configured: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
      value: process.env.NEXT_PUBLIC_SITE_URL || '(vazio)',
    },
    {
      var: 'NEXT_PUBLIC_SUPABASE_URL',
      configured: Boolean(SUPABASE_URL),
    },
    {
      var: 'SUPABASE_SERVICE_ROLE_KEY',
      configured: Boolean(SUPABASE_SERVICE_KEY),
    },
    {
      var: 'GNEWS_API_KEY',
      configured: Boolean(process.env.GNEWS_API_KEY),
    },
  ]
  console.table(rows)
}

async function main() {
  console.log('=================================================')
  console.log('Attra — Cron Status Diagnostic')
  console.log(`Supabase URL: ${SUPABASE_URL}`)
  console.log(`Timestamp:    ${new Date().toISOString()}`)
  console.log('=================================================')

  await checkCronJobs()
  await checkBlogAiRuns()
  await checkNewsCycles()
  checkEnv()

  console.log('\nDone. Consulte docs/CRON_TROUBLESHOOTING.md para próximos passos.')
}

main().catch((err) => {
  console.error('[check-cron-status] erro fatal:', err)
  process.exit(1)
})
