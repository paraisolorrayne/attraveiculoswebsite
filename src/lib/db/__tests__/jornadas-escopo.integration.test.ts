/**
 * Jornadas (primeira visita × conversão) vistas pela agência: a primeira
 * visita da pessoa pode ter vindo de OUTRA agência ou do orgânico da loja.
 * Nesse caso a agência vê só o canal — nunca a campanha, a fonte ou o id da
 * sessão de fora (achado da revisão final, 02/10/2026).
 *
 * Opt-in: sem TEST_DATABASE_URL é pulado.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { sql } from 'kysely'
import { prepararBancoAgencias } from './fixtures/agencias'

const TEST_DB = process.env.TEST_DATABASE_URL

describe.skipIf(!TEST_DB)('jornadas com escopo de agência', () => {
	let db: typeof import('../index').db
	let consultarJornadas: typeof import('@/lib/visitors/consultas/jornadas').consultarJornadas
	let mh: string

	beforeAll(async () => {
		process.env.DATABASE_URL = TEST_DB
		;({ db } = await import('../index'))
		;({ consultarJornadas } = await import('@/lib/visitors/consultas/jornadas'))
		await prepararBancoAgencias(db)
		await db.deleteFrom('visitor_fingerprints').execute()
		await sql`insert into agencias (nome, slug, prefixos) values ('EB', 'eb', '{[eb]}') on conflict (slug) do nothing`.execute(db)
		const id = async (slug: string) => (await db.selectFrom('agencias').select('id').where('slug', '=', slug).executeTakeFirstOrThrow()).id
		mh = await id('media-house')

		const pessoa = async (visitor: string, sessoes: Array<[string, number, Record<string, unknown>]>) => {
			const fp = (await db.insertInto('visitor_fingerprints').values({ visitor_id: visitor, confidence_score: 0.9 }).returning('id').executeTakeFirstOrThrow()).id
			for (const [session_id, horas, extra] of sessoes) {
				const t = new Date(Date.now() - horas * 3_600_000)
				await db.insertInto('visitor_sessions').values({ fingerprint_id: fp, session_id, started_at: t, last_activity_at: t, ...extra }).execute()
			}
		}
		// 1ª visita pela EB, conversão pela Media House.
		await pessoa('v-eb-mh', [
			['eb-primeira', 48, { utm_source: 'facebook', utm_campaign: '[EB] Segredo', fbclid: 'f' }],
			['mh-converteu', 2, { utm_source: 'facebook', utm_campaign: '[VA][Site]', fbclid: 'f', contacted_whatsapp: true }],
		])
		// 1ª visita orgânica (Google), conversão pela Media House.
		await pessoa('v-org-mh', [
			['org-primeira', 30, { referrer_domain: 'www.google.com' }],
			['mh-converteu-2', 1, { utm_source: 'google', utm_campaign: 'va-pmax', gclid: 'g', contacted_whatsapp: true }],
		])
		// 1ª e conversão pela Media House: tudo é dela, nada a esconder.
		await pessoa('v-mh-mh', [
			['mh-primeira', 20, { utm_source: 'google', utm_campaign: 'va-pmax', gclid: 'g' }],
			['mh-converteu-3', 1, { utm_source: 'facebook', utm_campaign: '[VA][Site]', fbclid: 'f', contacted_whatsapp: true }],
		])
	})

	it('não vaza a campanha, a fonte nem o id da 1ª visita de fora', async () => {
		const r = await consultarJornadas('http://x/?dias=30', { tipo: 'agencia', agenciaId: mh })
		const texto = JSON.stringify(r)
		for (const proibido of ['[EB] Segredo', 'eb-primeira', 'org-primeira', 'www.google.com']) {
			expect(texto).not.toContain(proibido)
		}
		const daEB = r.jornadas.find(j => j.conversao.session_id === 'mh-converteu')!
		expect(daEB.primeira).toMatchObject({ origem_de_fora: true, campanha: null, fonte: null, rotulo_fonte: null, session_id: null })
		expect(daEB.primeira.rotulo_canal).toBeTruthy() // o canal continua: "Social pago"
	})

	it('a 1ª visita que é da própria agência aparece inteira', async () => {
		const r = await consultarJornadas('http://x/?dias=30', { tipo: 'agencia', agenciaId: mh })
		const propria = r.jornadas.find(j => j.conversao.session_id === 'mh-converteu-3')!
		expect(propria.primeira).toMatchObject({ origem_de_fora: false, session_id: 'mh-primeira' })
	})

	it('com filtro de plataforma, a 1ª visita da própria agência em outra plataforma continua sendo dela', async () => {
		const r = await consultarJornadas('http://x/?dias=30', { tipo: 'agencia', agenciaId: mh, plataforma: 'meta' })
		const propria = r.jornadas.find(j => j.conversao.session_id === 'mh-converteu-3')!
		expect(propria.primeira).toMatchObject({ origem_de_fora: false, session_id: 'mh-primeira' })
	})

	it('Attra (tudo): vê todas as primeiras visitas', async () => {
		const r = await consultarJornadas('http://x/?dias=30', { tipo: 'tudo' })
		expect(JSON.stringify(r)).toContain('[EB] Segredo')
	})
})
