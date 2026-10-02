/**
 * Integração da migration 20261002_agencias contra um Postgres real: a trava
 * de campanha única entre agências é um índice — só o banco prova.
 *
 * Opt-in: sem TEST_DATABASE_URL é pulado.
 *   TEST_DATABASE_URL=postgres://user@127.0.0.1:5432/attra_visitors_dev \
 *     ./node_modules/.bin/vitest run src/lib/db/__tests__/agencias.integration.test.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect, beforeAll } from 'vitest'
import { sql } from 'kysely'
import { prepararBancoAgencias } from './fixtures/agencias'

const TEST_DB = process.env.TEST_DATABASE_URL

const MIGRATIONS = ['20261002_agencias.sql', '20261003_agencias_marcadores.sql']
const ler = (arquivo: string) => readFileSync(resolve(__dirname, '../../../../supabase/migrations', arquivo), 'utf8')

describe.skipIf(!TEST_DB)('migrations de agências (20261002 + 20261003)', () => {
	let db: typeof import('../index').db

	const aplicarAsDuas = async () => {
		for (const m of MIGRATIONS) await sql.raw(ler(m)).execute(db)
	}

	beforeAll(async () => {
		process.env.DATABASE_URL = TEST_DB
		;({ db } = await import('../index'))
		await prepararBancoAgencias(db)
		// Idempotentes: rodar de novo não pode quebrar nem duplicar a Media House.
		await aplicarAsDuas()
	})

	const idDe = async (slug: string) =>
		(await db.selectFrom('agencias').select('id').where('slug', '=', slug).executeTakeFirstOrThrow()).id

	it('cria a Media House uma vez só', async () => {
		const r = await sql<{ n: string }>`select count(*) as n from agencias where slug = 'media-house'`.execute(db)
		expect(Number(r.rows[0].n)).toBe(1)
	})

	it('a Media House nasce com os marcadores da spec', async () => {
		const mh = await db.selectFrom('agencias').select(['prefixos', 'utm_medium_marca', 'ids_campanha']).where('slug', '=', 'media-house').executeTakeFirstOrThrow()
		expect(mh.prefixos).toEqual(expect.arrayContaining(['va-', '[va]', '%5bva%5d']))
		expect(mh.utm_medium_marca).toEqual(expect.arrayContaining(['mediahouse']))
		expect(mh.ids_campanha).toEqual(expect.arrayContaining(['24295047322', '24283864992']))
	})

	it('reaplicar não desfaz marcador incluído depois', async () => {
		await sql`update agencias set prefixos = prefixos || '{teste-}'::text[] where slug = 'media-house'`.execute(db)
		await aplicarAsDuas()
		const mh = await db.selectFrom('agencias').select('prefixos').where('slug', '=', 'media-house').executeTakeFirstOrThrow()
		expect(mh.prefixos).toContain('teste-')
		await sql`update agencias set prefixos = array_remove(prefixos, 'teste-') where slug = 'media-house'`.execute(db)
	})

	it('o cadastro de campanhas não existe mais', async () => {
		const r = await sql<{ t: string | null }>`select to_regclass('agencia_campanhas')::text as t`.execute(db)
		expect(r.rows[0].t).toBeNull()
		expect(await idDe('media-house')).toBeTruthy()
	})

	it('usuário pode ser ligado a uma agência', async () => {
		const mh = await idDe('media-house')
		await sql`delete from admin_users where email = 'teste-agencia@x'`.execute(db)
		await db.insertInto('admin_users').values({ id: crypto.randomUUID(), email: 'teste-agencia@x', name: 'T', agencia_id: mh } as never).execute()
		const u = await db.selectFrom('admin_users').select('agencia_id').where('email', '=', 'teste-agencia@x').executeTakeFirstOrThrow()
		expect(u.agencia_id).toBe(mh)
		await sql`delete from admin_users where email = 'teste-agencia@x'`.execute(db)
	})
	it('na VPS (papel attra existe), a tabela de agências fica com o usuário do app', async () => {
		// Em produção a migration roda como postgres e o app conecta como attra.
		await sql`do $$ begin if not exists (select 1 from pg_roles where rolname = 'attra') then create role attra nologin; end if; end $$`.execute(db)
		await aplicarAsDuas()
		const r = await sql<{ tablename: string; tableowner: string }>`
			select tablename, tableowner from pg_tables where tablename in ('agencias', 'agencia_campanhas') order by 1
		`.execute(db)
		expect(r.rows).toEqual([{ tablename: 'agencias', tableowner: 'attra' }])
	})
})
