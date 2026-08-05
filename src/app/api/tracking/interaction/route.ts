import { NextRequest, NextResponse } from 'next/server'
import { sql } from 'kysely'
import { db } from '@/lib/db'
import { checkRateLimit, getClientIP, RATE_LIMIT_PRESETS } from '@/lib/rate-limit'

// Migrado de supabase-js → Kysely (ver docs/MIGRACAO_POSTGRES_PURO.md).
// É aqui que o whatsapp_click é gravado — a ponte de atribuição do WhatsApp
// (src/lib/whatsapp-ref.ts) liga a conversa a esta sessão.

// Colunas booleanas tipadas (união) pra o Kysely aceitar as chaves dinâmicas.
type SessionFlag = 'contacted_whatsapp' | 'submitted_form' | 'used_calculator'
type PageViewFlag = 'clicked_whatsapp' | 'clicked_phone' | 'clicked_form' | 'played_engine_sound'

const INTERACTION_CONFIG: Record<string, {
  sessionFlag?: SessionFlag
  identityEvent?: string
  updatePageView?: { field: PageViewFlag; value: boolean }
}> = {
  whatsapp_click: {
    sessionFlag: 'contacted_whatsapp',
    identityEvent: 'whatsapp_clicked',
    updatePageView: { field: 'clicked_whatsapp', value: true },
  },
  phone_click: {
    updatePageView: { field: 'clicked_phone', value: true },
  },
  form_click: {
    updatePageView: { field: 'clicked_form', value: true },
  },
  form_submit: {
    sessionFlag: 'submitted_form',
    identityEvent: 'form_submitted',
  },
  engine_sound_play: {
    updatePageView: { field: 'played_engine_sound', value: true },
  },
  calculator_use: {
    sessionFlag: 'used_calculator',
  },
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request)
    const rateLimitResult = checkRateLimit(clientIP, RATE_LIMIT_PRESETS.api)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { 'Retry-After': String(rateLimitResult.retryAfter) } }
      )
    }

    const body = await request.json()
    const {
      fingerprint_db_id,
      session_db_id,
      type,
      page_path,
      metadata,
    } = body

    if (!fingerprint_db_id || !session_db_id || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const config = INTERACTION_CONFIG[type]

    if (!config) {
      return NextResponse.json({ error: 'Unknown interaction type' }, { status: 400 })
    }

    // Registro do clique de WhatsApp — é o que substitui o marcador [ref: ...]
    // que antes viajava dentro da mensagem do cliente.
    //
    // A mensagem do wa.me é o único canal entre o site e a loja, então a origem
    // ia embutida no texto que o COMPRADOR envia. Tirando o marcador de lá, a
    // referência passa a viver aqui: quem clicou (a sessão, que carrega
    // utm/campanha/termo) e quando. A conversa é correlacionada depois, quando
    // o CRM a entrega pelo webhook.
    if (type === 'whatsapp_click') {
      await db
        .insertInto('whatsapp_clicks')
        .values({
          session_db_id,
          page_path: page_path ?? null,
          vehicle_id: typeof metadata?.vehicle_id === 'string' ? metadata.vehicle_id : null,
        })
        .execute()
        // Falha aqui não pode derrubar a marcação da sessão, que é o sinal
        // principal de conversão: a correlação é enriquecimento.
        .catch((e: unknown) => console.warn('[Tracking] clique de WhatsApp não gravado:', e))
    }

    // Marca o flag na sessão, se houver
    if (config.sessionFlag) {
      await db
        .updateTable('visitor_sessions')
        .set(config.sessionFlag, true)
        .where('id', '=', session_db_id)
        .execute()
    }

    // Atualiza o page view mais recente da sessão+página, se houver
    if (config.updatePageView) {
      const latest = await db
        .selectFrom('visitor_page_views')
        .select('id')
        .where('session_id', '=', session_db_id)
        .where('page_path', '=', page_path)
        .orderBy('viewed_at', 'desc')
        .limit(1)
        .executeTakeFirst()

      if (latest) {
        await db
          .updateTable('visitor_page_views')
          .set(config.updatePageView.field, config.updatePageView.value)
          .where('id', '=', latest.id)
          .execute()
      }
    }

    // Cria o identity_event, se houver
    if (config.identityEvent) {
      const fingerprint = await db
        .selectFrom('visitor_fingerprints')
        .select('resolved_profile_id')
        .where('id', '=', fingerprint_db_id)
        .executeTakeFirst()

      await db
        .insertInto('identity_events')
        .values({
          fingerprint_id: fingerprint_db_id,
          profile_id: fingerprint?.resolved_profile_id ?? null,
          event_type: config.identityEvent,
          event_data: sql`${JSON.stringify({ page_path, ...metadata })}::jsonb`,
          source: 'interaction',
        })
        .execute()
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('[Tracking] Interaction error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
