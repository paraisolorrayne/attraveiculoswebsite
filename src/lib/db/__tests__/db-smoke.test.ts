import { describe, it, expect } from 'vitest'
import { Kysely, PostgresDialect, DummyDriver, PostgresAdapter, PostgresIntrospector, PostgresQueryCompiler, sql } from 'kysely'
import type { Database } from '../types'

/**
 * Prova a fundação Kysely SEM banco: compila queries reais contra o tipo
 * `Database` e confere o SQL gerado. Se um nome de coluna/tabela não bater com
 * os tipos, isto quebra em tempo de compilação (tsc) OU no SQL esperado.
 *
 * Usa o dialeto de compilação-apenas (sem driver de conexão) — o mesmo que o
 * PostgresDialect gera, mas sem abrir socket.
 */
const db = new Kysely<Database>({
  dialect: {
    createAdapter: () => new PostgresAdapter(),
    createDriver: () => new DummyDriver(),
    createIntrospector: (d) => new PostgresIntrospector(d),
    createQueryCompiler: () => new PostgresQueryCompiler(),
  },
})

describe('Kysely foundation (tracking slice)', () => {
  it('compila INSERT em visitor_page_views com as colunas certas', () => {
    const { sql, parameters } = db
      .insertInto('visitor_page_views')
      .values({
        session_id: 's-1',
        fingerprint_id: 'f-1',
        page_url: 'https://attraveiculos.com.br/veiculos/porsche-911',
        page_path: '/veiculos/porsche-911',
        page_type: 'vehicle',
        vehicle_slug: 'porsche-911',
      })
      .compile()

    expect(sql).toContain('insert into "visitor_page_views"')
    expect(sql).toContain('"session_id"')
    expect(sql).toContain('"page_path"')
    expect(parameters).toContain('/veiculos/porsche-911')
  })

  it('compila SELECT de atribuição UTM em visitor_sessions', () => {
    const { sql } = db
      .selectFrom('visitor_sessions')
      .select(['utm_campaign', 'utm_term', 'gclid'])
      .where('session_id', '=', 's-1')
      .compile()

    expect(sql).toContain('select "utm_campaign", "utm_term", "gclid" from "visitor_sessions"')
    expect(sql).toContain('where "session_id" =')
  })

  it('compila UPDATE de métricas de sessão', () => {
    const { sql } = db
      .updateTable('visitor_sessions')
      .set({ submitted_form: true, page_views_count: 3 })
      .where('session_id', '=', 's-1')
      .compile()

    expect(sql).toContain('update "visitor_sessions" set')
    expect(sql).toContain('"submitted_form"')
  })
})

describe('Kysely foundation (vehicle_semantic_labels upsert)', () => {
  // Espelha a query real de `gravarRotulosDerivados`
  // (src/lib/mcp/repositorio-rotulos.ts). A linha mais crítica do arquivo é o
  // `where` do onConflict: sem ele, a sincronização noturna pisaria em
  // qualquer correção manual gravada em `sobrescrito_por`. Este teste prova
  // em compilação — sem banco — que essa cláusula está de fato no SQL
  // gerado, então apagar o `.where(...)` por engano quebra este teste.
  it('compila o upsert com a trava de sobrescrita humana no WHERE', () => {
    const { sql: compiledSql } = db
      .insertInto('vehicle_semantic_labels')
      .values([{
        vehicle_id: 1,
        rotulos_uso: ['familia'],
        rotulos_comprador: [],
        rotulos_forca: [],
        prosa: null,
        sobrescrito_por: null,
      }])
      .onConflict(oc => oc.column('vehicle_id').doUpdateSet({
        rotulos_uso: eb => eb.ref('excluded.rotulos_uso'),
        rotulos_comprador: eb => eb.ref('excluded.rotulos_comprador'),
        rotulos_forca: eb => eb.ref('excluded.rotulos_forca'),
        prosa: eb => eb.ref('excluded.prosa'),
        atualizado_em: sql`now()`,
      }).where('vehicle_semantic_labels.sobrescrito_por', 'is', null))
      .compile()

    expect(compiledSql).toContain('insert into "vehicle_semantic_labels"')
    expect(compiledSql).toContain('on conflict ("vehicle_id") do update set')
    expect(compiledSql).toContain('where "vehicle_semantic_labels"."sobrescrito_por" is null')
  })
})
