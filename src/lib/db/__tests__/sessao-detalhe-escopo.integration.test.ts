/**
 * Detalhe da sessão visto pela agência: só sessões dela, sem IP, sem dado de
 * identidade e sem a campanha das visitas que vieram de fora dela.
 *
 * Opt-in: sem TEST_DATABASE_URL é pulado.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { sql } from 'kysely'
import { prepararBancoAgencias } from './fixtures/agencias'

const TEST_DB = process.env.TEST_DATABASE_URL

type Detalhe = {
	data: {
		session_summary: Record<string, unknown>
		outras_sessoes: Array<Record<string, unknown>>
		events: Array<Record<string, unknown>>
	}
}

describe.skipIf(!TEST_DB)('detalhe da sessão com escopo de agência', () => {
	let db: typeof import('../index').db
	let consultarSessaoDetalhe: typeof import('@/lib/visitors/consultas/sessao-detalhe').consultarSessaoDetalhe
	let consultarSessoes: typeof import('@/lib/visitors/consultas/sessoes').consultarSessoes
	let ESCOPO_TUDO: import('@/lib/visitors/escopo').Escopo
	let mh: { tipo: 'agencia'; agenciaId: string }

	beforeAll(async () => {
		process.env.DATABASE_URL = TEST_DB
		;({ db } = await import('../index'))
		;({ consultarSessaoDetalhe } = await import('@/lib/visitors/consultas/sessao-detalhe'))
		;({ consultarSessoes } = await import('@/lib/visitors/consultas/sessoes'))
		;({ ESCOPO_TUDO } = await import('@/lib/visitors/escopo'))
		await prepararBancoAgencias(db)
		await sql`delete from agencia_campanhas`.execute(db)
		await db.deleteFrom('visitor_fingerprints').execute()
		await sql`insert into agencias (nome, slug) values ('EB', 'eb') on conflict (slug) do nothing`.execute(db)
		const id = async (slug: string) => (await db.selectFrom('agencias').select('id').where('slug', '=', slug).executeTakeFirstOrThrow()).id
		mh = { tipo: 'agencia', agenciaId: await id('media-house') }
		await db.insertInto('agencia_campanhas').values({ agencia_id: mh.agenciaId, plataforma: 'google', nome: 'va-pmax', id_externo: '111' }).execute()
		await db.insertInto('agencia_campanhas').values({ agencia_id: await id('eb'), plataforma: 'meta', nome: '[EB] Site', id_externo: '222' }).execute()

		const fp = (await db.insertInto('visitor_fingerprints').values({ visitor_id: 'v-det', confidence_score: 0.9 }).returning('id').executeTakeFirstOrThrow()).id
		const sessao = (session_id: string, horas: number, extra: Record<string, unknown>) =>
			db.insertInto('visitor_sessions').values({
				fingerprint_id: fp, session_id, started_at: new Date(Date.now() - horas * 3_600_000),
				last_activity_at: new Date(), ip_address: '203.0.113.7', ...extra,
			}).execute()
		// Mesma pessoa: primeiro veio pela EB, depois pela Media House.
		await sessao('eb-sessao-1', 48, { utm_source: 'facebook', utm_campaign: '[EB] Site', utm_id: '222', fbclid: 'f' })
		await sessao('mh-sessao-1', 1, { utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'va-pmax', utm_id: '111', gclid: 'g' })
		await db.insertInto('identity_events').values({
			fingerprint_id: fp, event_type: 'email_captured', source: 'form',
			event_data: sql`${JSON.stringify({ email: 'cliente@exemplo.com' })}::jsonb`,
		} as never).execute()
	})

	it('agência: sessão dela vem sem IP e sem dado de identidade', async () => {
		const r = (await consultarSessaoDetalhe('http://x/?session_id=mh-sessao-1', mh)) as Detalhe
		expect(r.data.session_summary).not.toHaveProperty('ip_address')
		expect(JSON.stringify(r)).not.toContain('203.0.113.7')
		expect(JSON.stringify(r)).not.toContain('cliente@exemplo.com')
		expect(r.data.events.every(e => !('event_data' in e))).toBe(true)
	})

	it('agência: a visita de fora aparece só com o canal, sem fonte nem campanha', async () => {
		const r = (await consultarSessaoDetalhe('http://x/?session_id=mh-sessao-1', mh)) as Detalhe
		const deFora = r.data.outras_sessoes.find(o => o.session_id === 'eb-sessao-1')!
		expect(deFora).toMatchObject({ origem_de_fora: true, campanha: null, rotulo_fonte: null })
		expect(deFora.rotulo_canal).toBeTruthy()
		expect(JSON.stringify(r)).not.toContain('[EB] Site')
		const propria = r.data.outras_sessoes.find(o => o.session_id === 'mh-sessao-1')!
		expect(propria).toMatchObject({ origem_de_fora: false, campanha: 'va-pmax' })
	})

	it('agência: sessão de outra origem é 404, mesmo com o link', async () => {
		expect(await consultarSessaoDetalhe('http://x/?session_id=eb-sessao-1', mh)).toMatchObject({ erro: 404 })
	})

	it('o filtro de plataforma não transforma a visita da própria agência em "de fora"', async () => {
		// mh-sessao-1 é Google; com a área filtrada em Meta, continua sendo da agência.
		const r = (await consultarSessaoDetalhe('http://x/?session_id=mh-sessao-1', { ...mh, plataforma: 'meta' })) as Detalhe
		expect(r).not.toHaveProperty('erro')
		expect(r.data.outras_sessoes.find(o => o.session_id === 'mh-sessao-1')).toMatchObject({ origem_de_fora: false })
	})

	it('Attra (tudo): continua vendo IP e as campanhas de todas as origens', async () => {
		const r = (await consultarSessaoDetalhe('http://x/?session_id=mh-sessao-1', ESCOPO_TUDO)) as Detalhe
		expect(r.data.session_summary.ip_address).toBe('203.0.113.7')
		expect(r.data.outras_sessoes.find(o => o.session_id === 'eb-sessao-1')).toMatchObject({ campanha: '[EB] Site' })
	})

	it('lista de sessões da agência só traz as dela', async () => {
		const r = (await consultarSessoes('http://x/?dias=30', mh)) as { total_periodo: number }
		expect(r.total_periodo).toBe(1)
	})
})
