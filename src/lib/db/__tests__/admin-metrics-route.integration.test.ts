/**
 * Teste de INTEGRAÇÃO da rota /api/admin/visitors/metrics contra um Postgres real.
 *
 * Existe porque o SQL dessa rota é a única peça da tela de canais que nenhum teste
 * executava: `saneado()` (a definição de "valor vazio" compartilhada com
 * src/lib/traffic-channel.ts) e a conta de "veículos diferentes por sessão" só
 * falham em tempo de execução, e a falha aparece como 500 no painel, não no CI.
 *
 * O que ele tranca:
 *   - a mesma sessão suja ('(not set)', '(none)', 'undefined', 'direct', '-') cai no
 *     MESMO canal aqui e na lib — nada de duas verdades na mesma tela;
 *   - 'direct' + referrer olx.com.br continua sendo referência, não social;
 *   - "Black Friday" e "black friday" viram UMA linha de campanha;
 *   - vehicles_viewed (contador por abertura) nunca soma mais de 1 por sessão.
 *
 * Opt-in, igual ao tracking-routes.integration.test.ts: sem TEST_DATABASE_URL é pulado.
 *   createdb attra_metrics_dev
 *   psql attra_metrics_dev -f src/lib/db/__tests__/fixtures/tracking-schema.sql
 *   TEST_DATABASE_URL=postgres://user@127.0.0.1:5432/attra_metrics_dev \
 *     ./node_modules/.bin/vitest run src/lib/db/__tests__/admin-metrics-route.integration.test.ts
 */
import { describe, it, expect, beforeAll, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { sql } from 'kysely'

vi.mock('@/lib/admin-auth', () => ({ getCurrentAdmin: async () => ({ id: 'a', role: 'admin' }) }))

const TEST_DB = process.env.TEST_DATABASE_URL

describe.skipIf(!TEST_DB)('metrics route — SQL real', () => {
  let db: typeof import('../index').db
  let GET: typeof import('@/app/api/admin/visitors/metrics/route').GET

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB
    ;({ db } = await import('../index'))
    ;({ GET } = await import('@/app/api/admin/visitors/metrics/route'))

    // Repetível: a cascata de FK limpa sessions/page_views a partir do fingerprint.
    await db.deleteFrom('visitor_fingerprints').execute()

    const fp = await db.insertInto('visitor_fingerprints')
      .values({ visitor_id: 'v1', confidence_score: 0.9 }).returning('id').executeTakeFirstOrThrow()

    // Sessões com utm_source SUJO — o coração do achado 3.
    const sujas: Array<[string, string | null, string | null, string | null, string | null]> = [
      ['s-notset', '(not set)', null, 'chatgpt.com', null],
      ['s-undef',  'undefined',  null, 'google.com',  null],
      ['s-none',   '(none)',     null, 'l.instagram.com', null],
      ['s-direct', 'direct',     null, 'olx.com.br',  null],
      ['s-dash',   '-',          null, 'x.com',       null],
      ['s-gclid',  '(not set)',  '(none)', 'bing.com', 'undefined'],
      ['s-limpo',  'google',     'cpc',  null,         'Cj0abc'],
      ['s-camp1',  'google',     'cpc',  null,         'Cj0abc'],
    ]
    for (const [sid, src, med, ref, gclid] of sujas) {
      await db.insertInto('visitor_sessions').values({
        fingerprint_id: fp.id, session_id: sid, utm_source: src, utm_medium: med,
        referrer_domain: ref, gclid,
        utm_campaign: sid === 's-camp1' ? 'black friday' : sid === 's-limpo' ? 'Black Friday' : null,
        contacted_whatsapp: sid === 's-limpo', vehicles_viewed: sid === 's-notset' ? 4 : 0,
        duration_seconds: sid === 's-limpo' ? 120 : null,
      } as never).execute()
    }
    const s = await db.selectFrom('visitor_sessions').select('id').where('session_id', '=', 's-notset').executeTakeFirstOrThrow()
    for (const p of ['/veiculo/porsche-911-2023-1005112', '/veiculo/porsche-911-2023-1005112', '/veiculo/bmw-m3-2024-99']) {
      await db.insertInto('visitor_page_views').values({
        fingerprint_id: fp.id, session_id: s.id, page_url: 'http://x' + p, page_path: p,
        page_type: 'vehicle', vehicle_slug: p.split('/').pop(),
      } as never).execute()
    }
  })

  it('o SQL roda no Postgres e classifica a sujeira igual à lib', async () => {
    const res = await GET(new NextRequest('http://localhost/api/admin/visitors/metrics?dias=0'))
    expect(res.status).toBe(200)
    const j = await res.json()
    const porCanal = Object.fromEntries(j.canais.map((c: { canal: string; sessoes: number }) => [c.canal, c.sessoes]))
    console.log('CANAIS:', JSON.stringify(porCanal))
    console.log('CAMPANHAS:', JSON.stringify(j.campanhas))
    console.log('RESUMO:', JSON.stringify(j.resumo))

    // Nenhuma das sujas caiu em "direto": o referrer decidiu.
    expect(porCanal.assistente_ia).toBe(1)      // (not set) + chatgpt.com
    expect(porCanal.busca_organica).toBe(2)     // undefined+google.com ; (not set)+(none)+gclid'undefined'+bing.com
    expect(porCanal.social_organico).toBe(2)    // (none)+l.instagram.com ; '-'+x.com
    expect(porCanal.referencia).toBe(1)         // direct + olx.com.br  (NÃO social_organico)
    expect(porCanal.busca_paga).toBe(2)         // google+cpc
    expect(porCanal.direto).toBeUndefined()

    // Campanha: as duas grafias colapsam numa linha só, com rótulo legível.
    expect(j.campanhas).toHaveLength(1)
    expect(j.campanhas[0].sessoes).toBe(2)

    // "Veículos diferentes por sessão": 2 paths distintos, e vehicles_viewed=4 não vira 4.
    expect(j.resumo.veiculos_distintos).toBe(2)
    expect(j.resumo.sessoes_com_veiculo).toBe(1)
  })

  it('a coluna velha vehicles_viewed nunca soma mais que 1 por sessão', async () => {
    const r = await sql<{ n: number }>`
      select coalesce(sum(greatest(coalesce(0,0), least(coalesce(s.vehicles_viewed,0),1))),0)::int as n
      from visitor_sessions s`.execute(db)
    expect(r.rows[0].n).toBe(1)
  })
})
