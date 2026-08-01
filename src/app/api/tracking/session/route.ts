import { NextRequest, NextResponse } from 'next/server'
import { sql } from 'kysely'
import { db } from '@/lib/db'
import type { Database } from '@/lib/db/types'
import type { Insertable } from 'kysely'
import { checkRateLimit, getClientIP } from '@/lib/rate-limit'
import { TRACKING_RATE_LIMIT } from '@/lib/visitor-tracking'

// Tracking roda com acesso total ao banco (rota server-side, sem auth de user).
// Migrado de supabase-js → Kysely (ver docs/MIGRACAO_POSTGRES_PURO.md).

// Insere a sessão, ou devolve o id da linha existente quando o session_id já
// existe (reload dentro do mesmo sessionStorage). ON CONFLICT DO NOTHING troca
// o antigo tratamento do erro 23505.
async function getOrCreateSession(
  row: Insertable<Database['visitor_sessions']>,
): Promise<string | null> {
  const inserted = await db
    .insertInto('visitor_sessions')
    .values(row)
    .onConflict((oc) => oc.column('session_id').doNothing())
    .returning('id')
    .executeTakeFirst()

  if (inserted?.id) return inserted.id

  const existing = await db
    .selectFrom('visitor_sessions')
    .select('id')
    .where('session_id', '=', row.session_id)
    .executeTakeFirst()
  return existing?.id ?? null
}

// =====================================================
// Fechamento derivado de sessões ociosas
// O beacon de saída do cliente não é garantido (app morto no mobile, crash,
// bateria), então ended_at não pode depender só dele. A cada sessão nova
// varremos as que estão paradas há mais de 30 min e as fechamos com o último
// heartbeat conhecido. Throttle em memória para não rodar a cada request.
//
// A varredura NÃO calcula duração. Quem mantém duration_seconds é o heartbeat
// (/api/tracking/page-time), que acumula o tempo real ping a ping. A versão
// anterior gravava aqui duration = last_activity_at - started_at, e isso
// fabricava zeros em massa: last_activity_at nasceu com DEFAULT NOW() na
// migration 20260226 e o heartbeat nunca chegou a rodar, então em toda linha
// criada desde fevereiro last_activity_at é IGUAL a started_at — a conta dava
// exatamente 0. Na primeira varredura depois do deploy, ~500 sessões (2 dias de
// tráfego) ganhariam duração 0, o painel trocaria o travessão honesto por uma
// média puxada por centenas de zeros inventados, e no período "Tudo" isso
// ficaria para sempre.
//
// Daí as duas travas: só fechamos sessão com heartbeat DE VERDADE
// (last_activity_at > started_at) e não escrevemos duração nenhuma.
// =====================================================
const IDLE_SESSION_MINUTES = 30
const SWEEP_THROTTLE_MS = 5 * 60_000
let lastSweepAt = 0

async function closeIdleSessions(): Promise<void> {
  if (Date.now() - lastSweepAt < SWEEP_THROTTLE_MS) return
  lastSweepAt = Date.now()

  try {
    await db
      .updateTable('visitor_sessions')
      .set({ ended_at: sql<Date>`last_activity_at` })
      .where('ended_at', 'is', null)
      // Só sessões que realmente bateram heartbeat. Onde last_activity_at é
      // igual a started_at, ninguém pingou: não sabemos quando a visita
      // terminou e inventar um fim (com duração 0) é pior do que deixar aberta.
      .where(sql<boolean>`last_activity_at > started_at`)
      .where(sql<boolean>`last_activity_at < NOW() - INTERVAL '${sql.raw(String(IDLE_SESSION_MINUTES))} minutes'`)
      // Janela curta de propósito: sessões antigas (anteriores ao heartbeat)
      // têm last_activity_at preenchido pelo DEFAULT NOW() da migration, não
      // por atividade real — fechá-las inventaria durações absurdas. Backfill
      // histórico, se um dia for feito, é decisão à parte.
      .where(sql<boolean>`started_at > NOW() - INTERVAL '2 days'`)
      .execute()
  } catch (error) {
    // Manutenção não pode derrubar a criação da sessão
    console.error('[Tracking] Idle session sweep error:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting — bucket próprio das rotas de tracking (ver
    // TRACKING_RATE_LIMIT). Dividindo o bucket geral da API com o heartbeat, a
    // criação de sessão era a primeira vítima do 429: o visitante ficava sem
    // NENHUM tracking naquele carregamento.
    const clientIP = getClientIP(request)
    const rateLimitResult = checkRateLimit(clientIP, TRACKING_RATE_LIMIT)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { 'Retry-After': String(rateLimitResult.retryAfter) } }
      )
    }

    const body = await request.json()
    const {
      visitor_id,
      origem_id,
      session_id,
      device_data,
      utm_params,
      click_ids,
      referrer_url,
    } = body

    if (!visitor_id || !session_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get client IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]
      || request.headers.get('x-real-ip')
      || null

    // Extract referrer domain
    let referrer_domain = null
    if (referrer_url) {
      try {
        referrer_domain = new URL(referrer_url).hostname
      } catch {}
    }

    // Upsert do fingerprint: cria na 1ª visita; nas seguintes, atualiza os
    // dados do dispositivo/last_seen e INCREMENTA total_visits (antes o
    // supabase-js resetava pra 1 no upsert — aqui fica correto).
    const now = new Date()
    const fingerprint = await db
      .insertInto('visitor_fingerprints')
      .values({
        visitor_id,
        // 'aleatorio' = id que identifica UMA pessoa; 'aparelho' = esquema
        // antigo, compartilhado entre aparelhos iguais (ver migration
        // 20260801_fingerprint_origem_id.sql).
        origem_id: origem_id === 'aleatorio' ? 'aleatorio' : 'aparelho',
        browser_name: device_data?.browser_name || null,
        browser_version: device_data?.browser_version || null,
        os_name: device_data?.os_name || null,
        os_version: device_data?.os_version || null,
        device_type: device_data?.device_type || null,
        screen_resolution: device_data?.screen_resolution || null,
        timezone: device_data?.timezone || null,
        language: device_data?.language || null,
        confidence_score: 0.9,
        last_seen_at: now,
        total_visits: 1,
      })
      .onConflict((oc) =>
        oc.column('visitor_id').doUpdateSet({
          browser_name: (eb) => eb.ref('excluded.browser_name'),
          browser_version: (eb) => eb.ref('excluded.browser_version'),
          os_name: (eb) => eb.ref('excluded.os_name'),
          os_version: (eb) => eb.ref('excluded.os_version'),
          device_type: (eb) => eb.ref('excluded.device_type'),
          screen_resolution: (eb) => eb.ref('excluded.screen_resolution'),
          timezone: (eb) => eb.ref('excluded.timezone'),
          language: (eb) => eb.ref('excluded.language'),
          // Um id antigo nunca vira confiável; um novo, uma vez aleatório, não
          // regride se um cliente em cache mandar o formato velho.
          origem_id: sql`case when excluded.origem_id = 'aleatorio' then 'aleatorio' else visitor_fingerprints.origem_id end`,
          last_seen_at: now,
          total_visits: sql`visitor_fingerprints.total_visits + 1`,
          updated_at: now,
        }),
      )
      .returning(['id', 'resolved_profile_id'])
      .executeTakeFirst()

    if (!fingerprint?.id) {
      return NextResponse.json({ error: 'Failed to create fingerprint' }, { status: 500 })
    }

    // Cria a sessão (devolve a existente em caso de conflito)
    const sessionId = await getOrCreateSession({
      fingerprint_id: fingerprint.id,
      session_id,
      referrer_url,
      referrer_domain,
      utm_source: utm_params?.utm_source || null,
      utm_medium: utm_params?.utm_medium || null,
      utm_campaign: utm_params?.utm_campaign || null,
      utm_content: utm_params?.utm_content || null,
      utm_term: utm_params?.utm_term || null,
      utm_id: utm_params?.utm_id || null,
      adset_id: utm_params?.adset_id || null,
      ad_id: utm_params?.ad_id || null,
      gclid: click_ids?.gclid || null,
      fbclid: click_ids?.fbclid || null,
      ttclid: click_ids?.ttclid || null,
      ip_address: ip,
    })

    // Fecha sessões ociosas sem segurar a resposta do cliente
    void closeIdleSessions()

    return NextResponse.json({
      success: true,
      fingerprint_db_id: fingerprint.id,
      session_db_id: sessionId,
    })

  } catch (error) {
    console.error('[Tracking] Session error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
