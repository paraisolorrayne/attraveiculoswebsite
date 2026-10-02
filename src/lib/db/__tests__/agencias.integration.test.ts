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

describe.skipIf(!TEST_DB)('migration 20261002_agencias', () => {
	let db: typeof import('../index').db

	beforeAll(async () => {
		process.env.DATABASE_URL = TEST_DB
		;({ db } = await import('../index'))
		await prepararBancoAgencias(db)
		// Idempotente: rodar de novo não pode quebrar nem duplicar a Media House.
		const m = readFileSync(resolve(__dirname, '../../../../supabase/migrations/20261002_agencias.sql'), 'utf8')
		await sql.raw(m).execute(db)
		await sql`delete from agencia_campanhas`.execute(db)
		await sql`insert into agencias (nome, slug) values ('EB', 'eb') on conflict (slug) do nothing`.execute(db)
	})

	const idDe = async (slug: string) =>
		(await db.selectFrom('agencias').select('id').where('slug', '=', slug).executeTakeFirstOrThrow()).id

	it('cria a Media House uma vez só', async () => {
		const r = await sql<{ n: string }>`select count(*) as n from agencias where slug = 'media-house'`.execute(db)
		expect(Number(r.rows[0].n)).toBe(1)
	})

	it('trava: o mesmo ID na mesma plataforma não vai para duas agências, nem com espaço', async () => {
		const mh = await idDe('media-house')
		const eb = await idDe('eb')
		await db.insertInto('agencia_campanhas').values({ agencia_id: mh, plataforma: 'google', nome: 'va-pmax', id_externo: '24295047322' }).execute()
		await expect(
			db.insertInto('agencia_campanhas').values({ agencia_id: eb, plataforma: 'google', nome: 'outra', id_externo: ' 24295047322 ' }).execute(),
		).rejects.toThrow(/unico|unique/i)
	})

	it('trava: o mesmo nome na mesma plataforma, ignorando caixa; em outra plataforma pode', async () => {
		const eb = await idDe('eb')
		await expect(
			db.insertInto('agencia_campanhas').values({ agencia_id: eb, plataforma: 'google', nome: 'VA-PMAX' }).execute(),
		).rejects.toThrow(/unico|unique/i)
		await db.insertInto('agencia_campanhas').values({ agencia_id: eb, plataforma: 'meta', nome: 'va-pmax' }).execute()
	})

	it('usuário pode ser ligado a uma agência', async () => {
		const mh = await idDe('media-house')
		await sql`delete from admin_users where email = 'teste-agencia@x'`.execute(db)
		await db.insertInto('admin_users').values({ id: crypto.randomUUID(), email: 'teste-agencia@x', name: 'T', agencia_id: mh } as never).execute()
		const u = await db.selectFrom('admin_users').select('agencia_id').where('email', '=', 'teste-agencia@x').executeTakeFirstOrThrow()
		expect(u.agencia_id).toBe(mh)
		await sql`delete from admin_users where email = 'teste-agencia@x'`.execute(db)
	})
})
