/**
 * Login: o usuário vem do e-mail que acabou de ser validado, não da sessão.
 *
 * Em HTTP local, o `auth()` chamado na MESMA requisição do `signIn` ainda não
 * enxerga o cookie recém-gravado e devolve null — o login era aceito, a sessão
 * era criada, mas a rota respondia 401 e a tela não deixava entrar.
 *
 * Opt-in: sem TEST_DATABASE_URL é pulado.
 */
import { describe, it, expect, beforeAll, vi } from 'vitest'
import { sql } from 'kysely'
import { prepararBancoAgencias } from './fixtures/agencias'

// signIn aceita; auth() ainda não vê a sessão (o caso real do ambiente local).
vi.mock('@/auth', () => ({
	signIn: async () => undefined,
	signOut: async () => undefined,
	auth: async () => null,
}))

const TEST_DB = process.env.TEST_DATABASE_URL

describe.skipIf(!TEST_DB)('signInWithEmail', () => {
	let db: typeof import('../index').db
	let signInWithEmail: typeof import('@/lib/admin-auth-supabase').signInWithEmail

	beforeAll(async () => {
		process.env.DATABASE_URL = TEST_DB
		;({ db } = await import('../index'))
		;({ signInWithEmail } = await import('@/lib/admin-auth-supabase'))
		await prepararBancoAgencias(db)
		await sql`delete from admin_users where email in ('login-teste@x', 'login-inativo@x')`.execute(db)
		const mh = (await db.selectFrom('agencias').select('id').where('slug', '=', 'media-house').executeTakeFirstOrThrow()).id
		await sql`insert into admin_users (id, email, name, role, is_active, agencia_id)
			values (gen_random_uuid(), 'login-teste@x', 'Teste', 'agencia', true, ${mh}::uuid),
			       (gen_random_uuid(), 'login-inativo@x', 'Inativo', 'admin', false, null)`.execute(db)
	})

	it('login aceito devolve o usuário, mesmo com a sessão ainda invisível', async () => {
		const r = await signInWithEmail('Login-Teste@X ', 'qualquer')
		expect(r.success).toBe(true)
		expect(r.user).toMatchObject({ email: 'login-teste@x', role: 'agencia', agencia: { slug: 'media-house' } })
	})

	it('usuário inativo não entra, mesmo com o signIn aceito', async () => {
		const r = await signInWithEmail('login-inativo@x', 'qualquer')
		expect(r.success).toBe(false)
	})
})
