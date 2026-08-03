import { NextRequest, NextResponse } from 'next/server'
import { sql } from 'kysely'
import { db } from '@/lib/db'
import { resumirMes, type LinhaCruaMes } from '@/lib/metricas-mensais'
// Migrado de supabase-js → Kysely (ver docs/MIGRACAO_POSTGRES_PURO.md).

// Retenção de dados: RESUME o mês e só então apaga tracking/caches além da
// janela, chamando a função SQL cleanup_old_tracking_data (migration 20260506).
// O pg_cron do Supabase managed não dispara, então este endpoint é executado
// pelo cron nativo da VPS (deploy/cron).
//
// A ORDEM importa e é garantida aqui: o resumo mensal é gravado ANTES do DELETE
// e, se ele falhar, a exclusão não acontece. Antes desta mudança a janela era de
// 60 dias e nada resumia o que ia embora — de 02/06/2026 para trás não sobrou
// registro nenhum, nem bruto nem agregado.
//
// Uso manual: GET /api/cron/cleanup-tracking?secret=xxx[&days=180][&somenteResumo=1]

export const dynamic = 'force-dynamic'

const CRON_SECRET = process.env.CRON_SECRET || ''

/** 6 meses. Era 60 dias — janela curta demais para comparar temporada com temporada. */
const RETENCAO_PADRAO_DIAS = 180

interface CleanupRow {
  table_name: string
  rows_deleted: number
}

/**
 * Grava o resumo de cada mês que ainda tem dado bruto.
 *
 * Reprocessa TODOS os meses presentes, não só os que estão para vencer: é barato
 * (poucas linhas), mantém o mês corrente sempre atualizado e conserta sozinho um
 * resumo que tenha ficado parcial por falha anterior.
 */
async function gravarResumoMensal(): Promise<{ meses: number; linhas: number; veiculos: number }> {
  // Agregação por mês + campos crus de origem. O canal é decidido em TypeScript
  // (src/lib/traffic-channel.ts), então o banco agrupa pelo cru e a dobra final
  // acontece no Node — mesmo desenho da rota de métricas do painel, para as duas
  // leituras nunca divergirem.
  const cruas = await sql<LinhaCruaMes>`
    with pv as (
      select session_id, count(*)::int as page_views,
             count(*) filter (where page_type = 'vehicle')::int as veiculos
      from visitor_page_views
      group by session_id
    )
    select
      -- O mês tem que fechar no fuso de BRASÍLIA. O Postgres da VPS roda em
      -- Europe/Berlin, e date_trunc sem fuso corta o mês pelo relógio de lá:
      -- uma sessão do dia 31 às 21h de Brasília já é dia 1º em Berlim e caía
      -- no mês seguinte do resumo.
      to_char(date_trunc('month', s.started_at AT TIME ZONE 'America/Sao_Paulo'), 'YYYY-MM-DD') as mes,
      s.utm_source, s.utm_medium, s.utm_campaign,
      s.gclid, s.fbclid, s.ttclid, s.referrer_domain,
      count(*)::int as sessoes,
      count(distinct s.fingerprint_id)::int as visitantes,
      coalesce(sum(pv.page_views), 0)::int as page_views,
      coalesce(sum(pv.veiculos), 0)::int as veiculos_vistos,
      count(*) filter (where s.contacted_whatsapp)::int as whatsapp_cliques,
      count(*) filter (where s.submitted_form)::int as formularios,
      coalesce(sum(s.duration_seconds), 0)::bigint as duracao_total_segundos,
      count(s.duration_seconds)::int as sessoes_com_duracao
    from visitor_sessions s
    left join pv on pv.session_id = s.id
    group by 1, 2, 3, 4, 5, 6, 7, 8
  `.execute(db)

  const resumo = resumirMes(cruas.rows)
  const meses = new Set(resumo.map(r => r.mes))

  for (const linha of resumo) {
    await sql`
      insert into metricas_mensais (
        mes, canal, campanha, sessoes, visitantes, page_views, veiculos_vistos,
        whatsapp_cliques, formularios, duracao_total_segundos, sessoes_com_duracao, atualizado_em
      ) values (
        ${linha.mes}::date, ${linha.canal}, ${linha.campanha}, ${linha.sessoes}, ${linha.visitantes},
        ${linha.page_views}, ${linha.veiculos_vistos}, ${linha.whatsapp_cliques}, ${linha.formularios},
        ${linha.duracao_total_segundos}, ${linha.sessoes_com_duracao}, now()
      )
      on conflict (mes, canal, campanha) do update set
        sessoes = excluded.sessoes,
        visitantes = excluded.visitantes,
        page_views = excluded.page_views,
        veiculos_vistos = excluded.veiculos_vistos,
        whatsapp_cliques = excluded.whatsapp_cliques,
        formularios = excluded.formularios,
        duracao_total_segundos = excluded.duracao_total_segundos,
        sessoes_com_duracao = excluded.sessoes_com_duracao,
        atualizado_em = now()
    `.execute(db)
  }

  // Veículos mais abertos por mês — grão diferente, tabela própria.
  const veiculos = await sql<{ linhas: number }>`
    with base as (
      select
        date_trunc('month', pv.viewed_at AT TIME ZONE 'America/Sao_Paulo')::date as mes,
        pv.vehicle_slug,
        count(*)::int as aberturas,
        count(distinct pv.session_id)::int as sessoes
      from visitor_page_views pv
      where pv.vehicle_slug is not null
      group by 1, 2
    ), gravado as (
      insert into metricas_mensais_veiculos (mes, vehicle_slug, aberturas, sessoes, atualizado_em)
      select mes, vehicle_slug, aberturas, sessoes, now() from base
      on conflict (mes, vehicle_slug) do update set
        aberturas = excluded.aberturas,
        sessoes = excluded.sessoes,
        atualizado_em = now()
      returning 1
    )
    select count(*)::int as linhas from gravado
  `.execute(db)

  return {
    meses: meses.size,
    linhas: resumo.length,
    veiculos: Number(veiculos.rows[0]?.linhas ?? 0),
  }
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
  const retentionDays = Number.isFinite(daysParam) && daysParam >= 30 ? daysParam : RETENCAO_PADRAO_DIAS
  const somenteResumo = searchParams.get('somenteResumo') === '1'

  // ETAPA 1 — resumir. Se falhar, NÃO apaga nada: perder o bruto sem ter o
  // resumo é exatamente o que aconteceu com todo o histórico anterior a junho.
  let resumo: { meses: number; linhas: number; veiculos: number }
  try {
    resumo = await gravarResumoMensal()
    console.log(
      `[CleanupTracking] Resumo mensal: ${resumo.linhas} linhas em ${resumo.meses} meses, ${resumo.veiculos} veículos`,
    )
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[CleanupTracking] Resumo mensal FALHOU — exclusão abortada:', msg)
    return NextResponse.json(
      { message: 'Resumo mensal falhou; nada foi apagado', error: msg },
      { status: 500 },
    )
  }

  if (somenteResumo) {
    return NextResponse.json({ message: 'Resumo mensal gravado; exclusão não solicitada', resumo })
  }

  // ETAPA 2 — apagar o que passou da janela.
  console.log(`[CleanupTracking API] Running cleanup (retention: ${retentionDays} days)...`)
  try {
    const { rows } = await sql<CleanupRow>`
      SELECT * FROM cleanup_old_tracking_data(${retentionDays})
    `.execute(db)
    const totalDeleted = rows.reduce((sum, r) => sum + Number(r.rows_deleted || 0), 0)
    console.log(`[CleanupTracking API] Done: ${totalDeleted} rows deleted`, rows)

    return NextResponse.json({
      message: 'Cleanup completed successfully',
      retention_days: retentionDays,
      resumo,
      total_rows_deleted: totalDeleted,
      by_table: rows,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[CleanupTracking API] Error:', msg)
    return NextResponse.json({ message: 'Cleanup failed', error: msg, resumo }, { status: 500 })
  }
}
