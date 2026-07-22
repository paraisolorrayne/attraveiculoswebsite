/**
 * Conexão Kysely com o Postgres da VPS — núcleo da migração Supabase → Postgres
 * puro (ver docs/MIGRACAO_POSTGRES_PURO.md).
 *
 * Uso:
 *   import { db } from '@/lib/db'
 *   const rows = await db.selectFrom('visitor_sessions').selectAll().execute()
 *
 * - Pool ÚNICO por processo (cacheado em globalThis pra sobreviver ao hot-reload
 *   do Next em dev, senão cada recompilação vaza conexões).
 * - Inicialização PREGUIÇOSA: nada conecta até a primeira query. Assim o módulo
 *   pode ser importado durante o período de migração mesmo sem DATABASE_URL
 *   configurada ainda (só quebra se alguém realmente rodar uma query sem env).
 * - `DATABASE_URL` aponta pro Postgres local da VPS (ex.:
 *   postgres://attra:...@127.0.0.1:5432/attra). Nunca exposto publicamente.
 */
import { Kysely, PostgresDialect } from 'kysely'
import { Pool } from 'pg'
import type { Database } from './types'

const globalForDb = globalThis as unknown as {
  __attraPool?: Pool
  __attraDb?: Kysely<Database>
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error(
      '[db] DATABASE_URL não configurada — o Postgres da VPS precisa estar no .env antes de rodar queries.',
    )
  }
  // Diagnóstico: loga o HOST que o pool vai usar (sem senha). Ajuda a caçar o
  // ENOIDENTIFIER — se aparecer um host *.supabase.* aqui, a env está errada.
  try {
    const u = new URL(connectionString)
    console.log(`[db] pool -> ${u.hostname}:${u.port || '5432'} (user=${u.username}, db=${u.pathname.slice(1)})`)
    if (u.hostname.includes('supabase') || u.hostname.includes('pooler')) {
      console.error(`[db] ALERTA: DATABASE_URL aponta pra ${u.hostname} (Supabase), não pro Postgres local — corrija o .env.production!`)
    }
  } catch {
    console.warn('[db] DATABASE_URL não é uma URL válida?')
  }
  return new Pool({
    connectionString,
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  })
}

function getDb(): Kysely<Database> {
  if (globalForDb.__attraDb) return globalForDb.__attraDb
  const pool = globalForDb.__attraPool ?? createPool()
  const instance = new Kysely<Database>({ dialect: new PostgresDialect({ pool }) })
  if (process.env.NODE_ENV !== 'production') {
    globalForDb.__attraPool = pool
    globalForDb.__attraDb = instance
  } else {
    // Em produção também guardamos pra reusar o pool entre invocações.
    globalForDb.__attraPool = pool
    globalForDb.__attraDb = instance
  }
  return instance
}

/**
 * Proxy preguiçoso: encaminha qualquer acesso pro Kysely, criado na 1ª vez.
 * Permite `import { db }` sem conectar no import.
 */
export const db = new Proxy({} as Kysely<Database>, {
  get(_target, prop) {
    const real = getDb()
    // receiver = real (não o proxy) pra getters do Kysely (fn, dynamic, …)
    // resolverem com `this` correto.
    const value = Reflect.get(real, prop, real)
    return typeof value === 'function' ? value.bind(real) : value
  },
})
