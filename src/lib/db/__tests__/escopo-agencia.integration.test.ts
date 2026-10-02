/**
 * Escopo de agência contra um Postgres real: quais sessões cada agência vê.
 * É o que impede a Media House de ver a EB ou o tráfego orgânico da loja.
 *
 * Opt-in: sem TEST_DATABASE_URL é pulado.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { sql } from 'kysely'
import { prepararBancoAgencias } from './fixtures/agencias'

const TEST_DB = process.env.TEST_DATABASE_URL

describe.skipIf(!TEST_DB)('escopo de agência — SQL real', () => {
	let db: typeof import('../index').db
	let esc: typeof import('@/lib/visitors/escopo')
	let mh: string, eb: string, cPmax: string, cMeta: string

	beforeAll(async () => {
		process.env.DATABASE_URL = TEST_DB
		;({ db } = await import('../index'))
		esc = await import('@/lib/visitors/escopo')
		await prepararBancoAgencias(db)
		await sql`delete from agencia_campanhas`.execute(db)
		await db.deleteFrom('visitor_fingerprints').execute()
		await sql`insert into agencias (nome, slug) values ('EB', 'eb') on conflict (slug) do nothing`.execute(db)
		const id = async (slug: string) => (await db.selectFrom('agencias').select('id').where('slug', '=', slug).executeTakeFirstOrThrow()).id
		mh = await id('media-house')
		eb = await id('eb')
		const camp = async (agencia_id: string, plataforma: 'google' | 'meta', nome: string, id_externo: string | null) =>
			(await db.insertInto('agencia_campanhas').values({ agencia_id, plataforma, nome, id_externo }).returning('id').executeTakeFirstOrThrow()).id
		cPmax = await camp(mh, 'google', 'va-pmax-nucleo', '24295047322')
		cMeta = await camp(mh, 'meta', '[VA][MediaHouse][Leads]', null)
		await camp(eb, 'meta', '[EB] [SITE] Visitas ao site', '120240538111140043')

		const fp = (await db.insertInto('visitor_fingerprints').values({ visitor_id: 'v-esc', confidence_score: 0.9 }).returning('id').executeTakeFirstOrThrow()).id
		const s = (session_id: string, extra: Record<string, unknown>) =>
			db.insertInto('visitor_sessions').values({ fingerprint_id: fp, session_id, started_at: new Date(), last_activity_at: new Date(), ...extra }).execute()
		await s('mh-google-id', { utm_source: 'google', utm_medium: 'cpc', utm_id: '24295047322', gclid: 'g' })
		await s('mh-meta-nome', { utm_source: 'facebook', utm_campaign: '  [va][mediahouse][LEADS] ', fbclid: 'f' })
		// Mesmo utm_id da PMax da MH, mas a visita é da Meta: não é daquela campanha.
		await s('id-mh-mas-meta', { utm_source: 'facebook', utm_id: '24295047322', fbclid: 'f' })
		await s('organico', { referrer_domain: 'www.google.com' })
		await s('eb', { utm_source: 'facebook', utm_id: '120240538111140043', fbclid: 'f' })
	})

	const doEscopo = async (escopo: import('@/lib/visitors/escopo').Escopo) =>
		(await sql<{ session_id: string }>`select s.session_id from visitor_sessions s where ${esc.naAgencia(escopo)} order by 1`.execute(db)).rows.map(r => r.session_id)

	it('tudo: todas as sessões', async () => {
		expect(await doEscopo(esc.ESCOPO_TUDO)).toHaveLength(5)
	})

	it('agência: casa por ID e por nome (caixa/espaço), respeitando a plataforma', async () => {
		expect(await doEscopo({ tipo: 'agencia', agenciaId: mh })).toEqual(['mh-google-id', 'mh-meta-nome'])
	})

	it('nunca vê a outra agência nem o orgânico', async () => {
		expect(await doEscopo({ tipo: 'agencia', agenciaId: eb })).toEqual(['eb'])
	})

	it('filtros de plataforma e de campanha estreitam dentro da agência', async () => {
		expect(await doEscopo({ tipo: 'agencia', agenciaId: mh, plataforma: 'meta' })).toEqual(['mh-meta-nome'])
		expect(await doEscopo({ tipo: 'agencia', agenciaId: mh, campanhaIds: [cPmax] })).toEqual(['mh-google-id'])
		expect(await doEscopo({ tipo: 'agencia', agenciaId: mh, campanhaIds: [cMeta] })).toEqual(['mh-meta-nome'])
	})

	it('sessaoNaAgencia filtra por id de sessão (consultas que partem de page views)', async () => {
		const r = await sql<{ session_id: string }>`select s2.session_id from visitor_sessions s2 where ${esc.sessaoNaAgencia({ tipo: 'agencia', agenciaId: eb }, sql`s2.id`, null)}`.execute(db)
		expect(r.rows.map(x => x.session_id)).toEqual(['eb'])
	})

	it('sessaoNaAgencia com período só procura sessões iniciadas a partir da véspera do início', async () => {
		const fp = (await db.selectFrom('visitor_fingerprints').select('id').where('visitor_id', '=', 'v-esc').executeTakeFirstOrThrow()).id
		const dezDiasAtras = new Date(Date.now() - 10 * 86_400_000)
		await db.insertInto('visitor_sessions').values({
			fingerprint_id: fp, session_id: 'eb-antiga', started_at: dezDiasAtras, last_activity_at: dezDiasAtras,
			utm_source: 'facebook', utm_id: '120240538111140043', fbclid: 'f',
		}).execute()
		try {
			const daEb = async (desde: Date | null) =>
				(await sql<{ session_id: string }>`select s2.session_id from visitor_sessions s2 where ${esc.sessaoNaAgencia({ tipo: 'agencia', agenciaId: eb }, sql`s2.id`, desde)} order by 1`.execute(db)).rows.map(x => x.session_id)
			expect(await daEb(null)).toEqual(['eb', 'eb-antiga'])
			expect(await daEb(new Date(Date.now() - 7 * 86_400_000))).toEqual(['eb'])
			// Margem de um dia: a sessão que começou na véspera do período ainda conta.
			expect(await daEb(new Date(Date.now() - 10.5 * 86_400_000 + 86_400_000))).toEqual(['eb', 'eb-antiga'])
		} finally {
			await db.deleteFrom('visitor_sessions').where('session_id', '=', 'eb-antiga').execute()
		}
	})

	it('ID da WebMotors casa sem diferenciar maiúsculas', async () => {
		const fp = (await db.selectFrom('visitor_fingerprints').select('id').where('visitor_id', '=', 'v-esc').executeTakeFirstOrThrow()).id
		const c = await db.insertInto('agencia_campanhas').values({ agencia_id: mh, plataforma: 'webmotors', nome: 'wm-caixa', id_externo: 'WM-AbC123' }).returning('id').executeTakeFirstOrThrow()
		await db.insertInto('visitor_sessions').values({
			fingerprint_id: fp, session_id: 'wm-caixa', started_at: new Date(), last_activity_at: new Date(),
			utm_source: 'webmotors', utm_id: 'wm-abc123',
		}).execute()
		try {
			expect(await doEscopo({ tipo: 'agencia', agenciaId: mh, campanhaIds: [c.id] })).toEqual(['wm-caixa'])
		} finally {
			await db.deleteFrom('visitor_sessions').where('session_id', '=', 'wm-caixa').execute()
			await db.deleteFrom('agencia_campanhas').where('id', '=', c.id).execute()
		}
	})

	it('periodoDaUrl leva o escopo no noPeriodo', async () => {
		const { periodoDaUrl } = await import('@/lib/visitors/sql-atribuicao')
		const { noPeriodo } = periodoDaUrl('http://x/?dias=30', { tipo: 'agencia', agenciaId: eb })
		const r = await sql<{ n: string }>`select count(*) as n from visitor_sessions s where ${noPeriodo}`.execute(db)
		expect(Number(r.rows[0].n)).toBe(1)
	})
})
