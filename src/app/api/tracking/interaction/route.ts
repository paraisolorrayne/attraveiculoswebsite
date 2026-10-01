import { NextRequest, NextResponse } from 'next/server'
import { sql } from 'kysely'
import { db } from '@/lib/db'
import { checkRateLimit, getClientIP, RATE_LIMIT_PRESETS } from '@/lib/rate-limit'
import { atribuicaoPorSessaoDbId } from '@/lib/atribuicao-sessao-db'
import { enviarAvisoDeClique, montarAvisoDeClique } from '@/lib/aviso-clique-fykos'

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
      const veiculoId = typeof metadata?.vehicle_id === 'string' ? metadata.vehicle_id : null
      // Só grava se a mesma sessão não clicou nos últimos 3 s. Toque duplo (ou
      // qualquer envio repetido do mesmo clique) virava duas linhas — que
      // inflavam o painel, mandavam dois avisos à Fykos e deixavam a correlação
      // repartir UM clique entre DOIS leads (aconteceu em 08/09 e 24/09). Sem
      // linha nova, não há aviso: o `if (clique)` abaixo cobre isso.
      const clique = await sql<{ id: string; clicked_at: Date }>`
        insert into whatsapp_clicks (session_db_id, page_path, vehicle_id)
        select ${session_db_id}::uuid, ${page_path ?? null}, ${veiculoId}
        where not exists (
          select 1 from whatsapp_clicks
          where session_db_id = ${session_db_id}::uuid
            and clicked_at > now() - interval '3 seconds'
        )
        returning id, clicked_at
      `
        .execute(db)
        .then(r => r.rows[0])
        // Falha aqui não pode derrubar a marcação da sessão, que é o sinal
        // principal de conversão: a correlação é enriquecimento.
        .catch((e: unknown) => {
          console.warn('[Tracking] clique de WhatsApp não gravado:', e)
          return undefined
        })

      // AVISO AO CRM, no mesmo instante do clique.
      //
      // Sem isto a origem só chega ao CRM se o lead virar card — e primeiro
      // contato e descarte nunca viram card, que é justamente a maior parte do
      // que o relatório de campanha deles conta. Avisando aqui, a nota chega
      // ANTES da conversa e vale para todo lead.
      //
      // Best-effort e depois do insert: o registro do clique é o que sustenta a
      // correlação local, e continua valendo sozinho se o CRM estiver fora do ar.
      if (clique) {
        try {
          const atribuicao = await atribuicaoPorSessaoDbId(session_db_id)
          await enviarAvisoDeClique(
            montarAvisoDeClique(
              String(clique.id),
              clique.clicked_at as unknown as Date,
              atribuicao,
              page_path ?? null,
              veiculoId,
            ),
          )
        } catch (e) {
          console.warn('[Tracking] aviso de clique não enviado:', e)
        }
      }
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
