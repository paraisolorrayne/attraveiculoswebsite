import { NextRequest, NextResponse } from 'next/server'
import { sql } from 'kysely'
import { db } from '@/lib/db'
import { checkRateLimit, getClientIP } from '@/lib/rate-limit'
import {
  MAX_HEARTBEAT_GAP_SECONDS,
  MAX_SESSION_DURATION_SECONDS,
  TRACKING_RATE_LIMIT,
} from '@/lib/visitor-tracking'

/** Teto do tempo em UMA página (1h). Defesa contra payload adulterado. */
const MAX_TIME_ON_PAGE_SECONDS = 60 * 60

/** Segundos válidos vindos do cliente (que não é confiável), ou null. */
function sanitizeSeconds(value: unknown, max: number): number | null {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.min(Math.round(n), max)
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting — bucket próprio das rotas de tracking (ver
    // TRACKING_RATE_LIMIT): o heartbeat de várias abas atrás do mesmo IP
    // estourava o bucket geral da API e derrubava o tracking inteiro.
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
      session_db_id,
      page_path,
      time_on_page_seconds,
      scroll_depth_percent,
      is_exit,
    } = body

    if (!session_db_id || !page_path || time_on_page_seconds === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const timeOnPage = sanitizeSeconds(time_on_page_seconds, MAX_TIME_ON_PAGE_SECONDS)
    if (timeOnPage === null) {
      return NextResponse.json({ error: 'Invalid time_on_page_seconds' }, { status: 400 })
    }

    // Atualiza o page view mais recente da sessão+página
    const latest = await db
      .selectFrom('visitor_page_views')
      .select('id')
      .where('session_id', '=', session_db_id)
      .where('page_path', '=', page_path)
      .orderBy('viewed_at', 'desc')
      .limit(1)
      .executeTakeFirst()

    if (latest) {
      const scroll =
        typeof scroll_depth_percent === 'number' && scroll_depth_percent > 0
          ? { scroll_depth_percent: Math.min(100, Math.round(scroll_depth_percent)) }
          : {}
      await db
        .updateTable('visitor_page_views')
        .set({ time_on_page_seconds: timeOnPage, ...scroll })
        .where('id', '=', latest.id)
        .execute()
    }

    // =====================================================
    // Heartbeat da sessão
    //
    // duration_seconds é ACUMULADO ping a ping (relógio do banco, o mesmo de
    // started_at) somando apenas o intervalo desde o último heartbeat, limitado
    // a MAX_HEARTBEAT_GAP_SECONDS. Antes era NOW() - started_at, que é tempo de
    // parede e inflava sem teto: o session_id vive enquanto a ABA viver, e
    // document.visibilityState continua 'visible' com a janela atrás de outra
    // ou com a tela desligada. Uma aba deixada aberta a noite toda virava uma
    // sessão de 8h; um visitante que voltava 4h depois via o primeiro ping
    // creditar as 4h de ausência de uma vez.
    //
    // Somando só o intervalo entre pings, ausência não vira permanência: se
    // ninguém pinga, nada é somado; se o ping volta depois de horas, entra no
    // máximo MAX_HEARTBEAT_GAP_SECONDS. O teto absoluto fecha o caso extremo.
    //
    // Em UPDATE do Postgres as expressões do SET enxergam os valores ANTIGOS da
    // linha, então last_activity_at abaixo ainda é o do ping anterior mesmo com
    // a coluna sendo atualizada na mesma instrução.
    // =====================================================
    await db
      .updateTable('visitor_sessions')
      .set({
        last_activity_at: sql<Date>`NOW()`,
        duration_seconds: sql<number>`LEAST(
          ${MAX_SESSION_DURATION_SECONDS},
          COALESCE(duration_seconds, 0) + LEAST(
            ${MAX_HEARTBEAT_GAP_SECONDS},
            GREATEST(0, EXTRACT(EPOCH FROM (NOW() - COALESCE(last_activity_at, started_at)))::int)
          )
        )`,
        // ended_at só se move na SAÍDA. Antes, qualquer heartbeat de uma sessão
        // já encerrada empurrava ended_at para agora — um retorno tardio
        // desfazia até o congelamento feito pela varredura de ociosas.
        ...(is_exit ? { ended_at: sql<Date>`NOW()` } : {}),
      })
      .where('id', '=', session_db_id)
      .execute()

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('[Tracking] Page time error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
