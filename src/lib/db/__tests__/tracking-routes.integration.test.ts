/**
 * Teste de INTEGRAÇÃO das rotas de tracking portadas pra Kysely, contra um
 * Postgres real. Opt-in: só roda com TEST_DATABASE_URL apontando pra um banco
 * com o schema de tracking (4 tabelas). Sem a env, é pulado (não quebra o CI).
 *
 * Setup local:
 *   createdb attra_migracao_dev
 *   psql attra_migracao_dev -f src/lib/db/__tests__/fixtures/tracking-schema.sql
 *   TEST_DATABASE_URL=postgres://user@127.0.0.1:5432/attra_migracao_dev \
 *     ./node_modules/.bin/vitest run src/lib/db/__tests__/tracking-routes.integration.test.ts
 */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { sql } from 'kysely'

const TEST_DB = process.env.TEST_DATABASE_URL

function req(url: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost${url}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.7' },
    body: JSON.stringify(body),
  })
}

describe.skipIf(!TEST_DB)('tracking routes (Kysely) — integração', () => {
  // Módulos carregados dinamicamente DEPOIS de setar DATABASE_URL
  let db: typeof import('../index').db
  let sessionPOST: typeof import('@/app/api/tracking/session/route').POST
  let pageviewPOST: typeof import('@/app/api/tracking/pageview/route').POST
  let interactionPOST: typeof import('@/app/api/tracking/interaction/route').POST
  let pageTimePOST: typeof import('@/app/api/tracking/page-time/route').POST
  let identifyPOST: typeof import('@/app/api/tracking/identify/route').POST
  let abandonedPOST: typeof import('@/app/api/tracking/abandoned/route').POST
  let conversionPOST: typeof import('@/app/api/tracking/conversion/route').POST
  let getSiteSettings: typeof import('@/lib/site-settings').getSiteSettings
  let getCachedVehicleSections: typeof import('@/lib/vehicle-sections').getCachedVehicleSections

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB
    ;({ db } = await import('../index'))
    ;({ POST: sessionPOST } = await import('@/app/api/tracking/session/route'))
    ;({ POST: pageviewPOST } = await import('@/app/api/tracking/pageview/route'))
    ;({ POST: interactionPOST } = await import('@/app/api/tracking/interaction/route'))
    ;({ POST: pageTimePOST } = await import('@/app/api/tracking/page-time/route'))
    ;({ POST: identifyPOST } = await import('@/app/api/tracking/identify/route'))
    ;({ POST: abandonedPOST } = await import('@/app/api/tracking/abandoned/route'))
    ;({ POST: conversionPOST } = await import('@/app/api/tracking/conversion/route'))
    ;({ getSiteSettings } = await import('@/lib/site-settings'))
    ;({ getCachedVehicleSections } = await import('@/lib/vehicle-sections'))
  })

  beforeEach(async () => {
    // cascata limpa sessions/page_views/identity_events via FK
    await db.deleteFrom('visitor_fingerprints').execute()
    // sem FK de entrada — limpa à parte
    await db.deleteFrom('visitor_profiles').execute()
    await db.deleteFrom('site_settings').execute()
    await db.deleteFrom('vehicle_section_content').execute()
  })

  async function newSession() {
    const res = await sessionPOST(req('/api/tracking/session', {
      visitor_id: 'vis-' + Math.random().toString(36).slice(2),
      session_id: 'sess-' + Math.random().toString(36).slice(2),
      device_data: { browser_name: 'Chrome', os_name: 'macOS', device_type: 'desktop' },
      utm_params: { utm_source: 'google', utm_campaign: 'black-friday', utm_term: 'carro usado' },
      click_ids: { gclid: 'GCL-abc123' },
      referrer_url: 'https://www.google.com/',
    }))
    return res.json() as Promise<{ success: boolean; fingerprint_db_id: string; session_db_id: string }>
  }

  it('session: cria fingerprint + sessão e grava utm/gclid/referrer', async () => {
    const out = await newSession()
    expect(out.success).toBe(true)
    expect(out.fingerprint_db_id).toBeTruthy()
    expect(out.session_db_id).toBeTruthy()

    const s = await db.selectFrom('visitor_sessions').selectAll()
      .where('id', '=', out.session_db_id).executeTakeFirstOrThrow()
    expect(s.utm_campaign).toBe('black-friday')
    expect(s.utm_term).toBe('carro usado')
    expect(s.gclid).toBe('GCL-abc123')
    expect(s.referrer_domain).toBe('www.google.com')
  })

  it('session: revisita do mesmo visitor incrementa total_visits', async () => {
    const visitor_id = 'vis-fixed'
    await sessionPOST(req('/api/tracking/session', { visitor_id, session_id: 's1', device_data: {} }))
    await sessionPOST(req('/api/tracking/session', { visitor_id, session_id: 's2', device_data: {} }))
    const fp = await db.selectFrom('visitor_fingerprints').select(['total_visits'])
      .where('visitor_id', '=', visitor_id).executeTakeFirstOrThrow()
    expect(fp.total_visits).toBe(2)
  })

  it('session: mesmo session_id não duplica (get-or-create)', async () => {
    const visitor_id = 'vis-dup'
    const a = await sessionPOST(req('/api/tracking/session', { visitor_id, session_id: 'same', device_data: {} })).then(r => r.json())
    const b = await sessionPOST(req('/api/tracking/session', { visitor_id, session_id: 'same', device_data: {} })).then(r => r.json())
    expect(b.session_db_id).toBe(a.session_db_id)
  })

  it('pageview: insere e incrementa page_views_count / vehicles_viewed', async () => {
    const { fingerprint_db_id, session_db_id } = await newSession()
    await pageviewPOST(req('/api/tracking/pageview', {
      fingerprint_db_id, session_db_id, page_url: 'https://x/veiculos/porsche', page_path: '/veiculos/porsche',
      page_type: 'vehicle', vehicle_slug: 'porsche', vehicle_price: 929000,
    }))
    await pageviewPOST(req('/api/tracking/pageview', {
      fingerprint_db_id, session_db_id, page_url: 'https://x/', page_path: '/', page_type: 'home',
    }))
    const s = await db.selectFrom('visitor_sessions').select(['page_views_count', 'vehicles_viewed'])
      .where('id', '=', session_db_id).executeTakeFirstOrThrow()
    expect(s.page_views_count).toBe(2)
    expect(s.vehicles_viewed).toBe(1)
  })

  it('interaction whatsapp_click: marca flags e grava identity_event', async () => {
    const { fingerprint_db_id, session_db_id } = await newSession()
    await pageviewPOST(req('/api/tracking/pageview', {
      fingerprint_db_id, session_db_id, page_url: 'https://x/veiculos/porsche', page_path: '/veiculos/porsche', page_type: 'vehicle',
    }))
    await interactionPOST(req('/api/tracking/interaction', {
      fingerprint_db_id, session_db_id, type: 'whatsapp_click', page_path: '/veiculos/porsche', metadata: { vehicle_brand: 'Porsche' },
    }))

    const s = await db.selectFrom('visitor_sessions').select('contacted_whatsapp')
      .where('id', '=', session_db_id).executeTakeFirstOrThrow()
    expect(s.contacted_whatsapp).toBe(true)

    const pv = await db.selectFrom('visitor_page_views').select('clicked_whatsapp')
      .where('session_id', '=', session_db_id).executeTakeFirstOrThrow()
    expect(pv.clicked_whatsapp).toBe(true)

    const ev = await db.selectFrom('identity_events').selectAll()
      .where('event_type', '=', 'whatsapp_clicked').executeTakeFirstOrThrow()
    expect(ev.fingerprint_id).toBe(fingerprint_db_id)
    expect((ev.event_data as Record<string, unknown>).vehicle_brand).toBe('Porsche')
  })

  it('page-time: atualiza tempo/scroll e heartbeat (ended_at no exit)', async () => {
    const { fingerprint_db_id, session_db_id } = await newSession()
    await pageviewPOST(req('/api/tracking/pageview', {
      fingerprint_db_id, session_db_id, page_url: 'https://x/', page_path: '/', page_type: 'home',
    }))
    await pageTimePOST(req('/api/tracking/page-time', {
      session_db_id, page_path: '/', time_on_page_seconds: 42, scroll_depth_percent: 80, is_exit: true,
    }))
    const pv = await db.selectFrom('visitor_page_views').select(['time_on_page_seconds', 'scroll_depth_percent'])
      .where('session_id', '=', session_db_id).executeTakeFirstOrThrow()
    expect(pv.time_on_page_seconds).toBe(42)
    expect(pv.scroll_depth_percent).toBe(80)
    const s = await db.selectFrom('visitor_sessions').select('ended_at')
      .where('id', '=', session_db_id).executeTakeFirstOrThrow()
    expect(s.ended_at).not.toBeNull()
  })

  it('identify: cria perfil, liga fingerprint e loga email_captured', async () => {
    const { fingerprint_db_id } = await newSession()
    const out = await identifyPOST(req('/api/tracking/identify', {
      fingerprint_db_id, source: 'form', email: 'Cliente@Attra.com', name: 'João Silva', consent_given: true,
    })).then(r => r.json())
    expect(out.success).toBe(true)
    expect(out.was_merged).toBe(false)

    const p = await db.selectFrom('visitor_profiles').selectAll()
      .where('id', '=', out.profile_id).executeTakeFirstOrThrow()
    expect(p.email).toBe('cliente@attra.com') // normalizado lowercase
    expect(p.first_name).toBe('João')
    expect(p.consent_given).toBe(true)
    expect(p.status).toBe('identified')

    const fp = await db.selectFrom('visitor_fingerprints').select('resolved_profile_id')
      .where('id', '=', fingerprint_db_id).executeTakeFirstOrThrow()
    expect(fp.resolved_profile_id).toBe(out.profile_id)

    const ev = await db.selectFrom('identity_events').select('event_type')
      .where('event_type', '=', 'email_captured').executeTakeFirst()
    expect(ev).toBeTruthy()
  })

  it('identify: mesmo email → faz merge (was_merged) sem duplicar perfil', async () => {
    const a = await newSession()
    const b = await newSession()
    const r1 = await identifyPOST(req('/api/tracking/identify', {
      fingerprint_db_id: a.fingerprint_db_id, source: 'form', email: 'dup@attra.com', name: 'Ana',
    })).then(r => r.json())
    const r2 = await identifyPOST(req('/api/tracking/identify', {
      fingerprint_db_id: b.fingerprint_db_id, source: 'form', email: 'dup@attra.com', phone: '34999998888',
    })).then(r => r.json())
    expect(r2.was_merged).toBe(true)
    expect(r2.profile_id).toBe(r1.profile_id)

    const rows = await db.selectFrom('visitor_profiles').select('id')
      .where('email', '=', 'dup@attra.com').execute()
    expect(rows.length).toBe(1)
  })

  it('abandoned: fingerprint sem perfil → no_profile', async () => {
    const { fingerprint_db_id } = await newSession()
    const out = await abandonedPOST(req('/api/tracking/abandoned', {
      fingerprint_db_id, reason: 'exit_intent',
    })).then(r => r.json())
    expect(out.success).toBe(false)
    expect(out.reason).toBe('no_profile')
  })

  it('abandoned: perfil identificável → loga session_abandoned', async () => {
    const { fingerprint_db_id } = await newSession()
    await identifyPOST(req('/api/tracking/identify', {
      fingerprint_db_id, source: 'form', email: 'lead@attra.com', name: 'Lead',
    }))
    const out = await abandonedPOST(req('/api/tracking/abandoned', {
      fingerprint_db_id, reason: 'exit_intent',
      behavioral_signals: { currentSessionPages: 4, totalDwellTimeMs: 90000, productPagesViewed: 2 },
    })).then(r => r.json())
    expect(out.success).toBe(true)

    const ev = await db.selectFrom('identity_events').selectAll()
      .where('event_type', '=', 'session_abandoned').executeTakeFirstOrThrow()
    expect((ev.event_data as Record<string, unknown>).pages_viewed).toBe(4)
  })

  it('conversion: grava conversion_event ligado à sessão (gclid herdado)', async () => {
    const { fingerprint_db_id, session_db_id } = await newSession()
    const out = await conversionPOST(req('/api/tracking/conversion', {
      fingerprint_db_id, session_db_id, event_name: 'whatsapp_click',
      event_value: 5500000, page_path: '/veiculos/x', metadata: { source: 'test' },
    })).then(r => r.json())
    expect(out.success).toBe(true)

    const ev = await db.selectFrom('conversion_events').selectAll()
      .where('id', '=', out.conversion_id).executeTakeFirstOrThrow()
    expect(ev.event_name).toBe('whatsapp_click')
    expect(ev.gclid).toBe('GCL-abc123') // herdado da sessão
    expect((ev.metadata as Record<string, unknown>).source).toBe('test')
  })

  it('admin/visitors: agregação (join) conta sessões e soma veículos por perfil', async () => {
    const prof = await db.insertInto('visitor_profiles')
      .values({ email: 'agg@attra.com', status: 'identified' })
      .returning('id').executeTakeFirstOrThrow()
    const fp = await db.insertInto('visitor_fingerprints')
      .values({ visitor_id: 'agg-vis', resolved_profile_id: prof.id })
      .returning('id').executeTakeFirstOrThrow()
    await db.insertInto('visitor_sessions').values([
      { fingerprint_id: fp.id, session_id: 'agg-s1', vehicles_viewed: 3 },
      { fingerprint_id: fp.id, session_id: 'agg-s2', vehicles_viewed: 2 },
    ]).execute()

    const rows = await db.selectFrom('visitor_profiles as p')
      .leftJoin('visitor_fingerprints as fp', 'fp.resolved_profile_id', 'p.id')
      .leftJoin('visitor_sessions as s', 's.fingerprint_id', 'fp.id')
      .select('p.id')
      .select([
        sql<number>`count(distinct s.id)::int`.as('total_sessions'),
        sql<number>`coalesce(sum(s.vehicles_viewed), 0)::int`.as('total_vehicles_viewed'),
      ])
      .groupBy('p.id').where('p.id', '=', prof.id).execute()

    expect(rows[0].total_sessions).toBe(2)
    expect(rows[0].total_vehicles_viewed).toBe(5)
  })

  it('site-settings: lê flags do banco (jsonb) com defaults', async () => {
    await db.insertInto('site_settings').values([
      { key: 'listen_to_content_enabled', value: sql`'false'::jsonb` },
      { key: 'engine_sound_section_enabled', value: sql`'true'::jsonb` },
    ]).execute()
    const s = await getSiteSettings()
    expect(s.listen_to_content_enabled).toBe(false)
    expect(s.engine_sound_section_enabled).toBe(true)
  })

  it('vehicle-sections: cache hit + invalida quando muda a contagem de fotos', async () => {
    await db.insertInto('vehicle_section_content').values({
      vehicle_id: 989248, vehicle_slug: 'ferrari-sf90', photo_count: 20,
      overview_photo_url: 'a.jpg', exterior_photo_url: 'b.jpg', interior_photo_url: 'c.jpg',
      overview_copy: 'copy o', exterior_copy: null, interior_copy: null,
    }).execute()

    const hit = await getCachedVehicleSections('989248', 20)
    expect(hit?.source).toBe('cache')
    expect(hit?.overview.photo_url).toBe('a.jpg')
    expect(hit?.overview.copy).toBe('copy o')

    // contagem de fotos diferente → invalida (retorna null)
    const miss = await getCachedVehicleSections('989248', 12)
    expect(miss).toBeNull()
  })
})
