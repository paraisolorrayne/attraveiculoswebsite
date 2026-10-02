/**
 * Escopo de agência contra um Postgres real: quais sessões cada agência vê.
 * A regra é o MARCADOR da agência (spec 2026-10-02-area-agencia-escopo-por-
 * marcador): prefixo no começo do utm_campaign ou do utm_content, utm_medium
 * ou utm_id da lista. É o que impede a Media House de ver a EB ou o tráfego
 * orgânico da loja.
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
	let mh: string, eb: string

	const MH = ['mh-campanha-va', 'mh-content', 'mh-id', 'mh-medium', 'mh-va-codificado', 'mh-va-colchete']

	beforeAll(async () => {
		process.env.DATABASE_URL = TEST_DB
		;({ db } = await import('../index'))
		esc = await import('@/lib/visitors/escopo')
		await prepararBancoAgencias(db)
		await db.deleteFrom('visitor_fingerprints').execute()
		await sql`insert into agencias (nome, slug, prefixos) values ('EB', 'eb', '{[eb]}') on conflict (slug) do nothing`.execute(db)
		const id = async (slug: string) => (await db.selectFrom('agencias').select('id').where('slug', '=', slug).executeTakeFirstOrThrow()).id
		mh = await id('media-house')
		eb = await id('eb')

		const fp = (await db.insertInto('visitor_fingerprints').values({ visitor_id: 'v-esc', confidence_score: 0.9 }).returning('id').executeTakeFirstOrThrow()).id
		const s = (session_id: string, extra: Record<string, unknown>) =>
			db.insertInto('visitor_sessions').values({ fingerprint_id: fp, session_id, started_at: new Date(), last_activity_at: new Date(), ...extra }).execute()
		await s('mh-campanha-va', { utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'va-pmax-nucleo', gclid: 'g' })
		await s('mh-va-codificado', { utm_source: 'facebook', utm_campaign: '%5BVA%5D%5BMediaHouse%5D%5BLeads%5D', fbclid: 'f' })
		await s('mh-va-colchete', { utm_source: 'instagram', utm_campaign: '  [VA][MediaHouse][Site] ' })
		// Marcador só no utm_content.
		await s('mh-content', { utm_campaign: 'outra-coisa', utm_content: 'VA-criativo-01' })
		// A PMax com nome sem prefixo, reconhecida pelo utm_medium (com caixa diferente).
		await s('mh-medium', { utm_source: 'google-ads', utm_medium: 'MediaHouse', utm_campaign: 'attraveiculos-google-ads-pmax-nucleo-setembro26' })
		// A mesma PMax desde 29/09: nome vazio, cpc, só o ID.
		await s('mh-id', { utm_source: 'google', utm_medium: 'cpc', utm_campaign: '', utm_id: ' 24295047322 ', gclid: 'g' })
		// "Começa com", nunca "contém".
		await s('nova-colecao', { utm_source: 'google', utm_campaign: 'nova-colecao', gclid: 'g' })
		await s('eb', { utm_source: 'facebook', utm_campaign: '[EB] [SITE] Visitas ao site', fbclid: 'f' })
		await s('organico', { referrer_domain: 'www.google.com' })
		await s('portal-wm', { referrer_domain: 'www.webmotors.com.br' })
		await s('google-sem-marcador', { utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'attra-institucional', gclid: 'g' })
	})

	const doEscopo = async (escopo: import('@/lib/visitors/escopo').Escopo) =>
		(await sql<{ session_id: string }>`select s.session_id from visitor_sessions s where ${esc.naAgencia(escopo)} order by 1`.execute(db)).rows.map(r => r.session_id)

	it('tudo: todas as sessões', async () => {
		expect(await doEscopo(esc.ESCOPO_TUDO)).toHaveLength(11)
	})

	it('agência: prefixo no utm_campaign ou no utm_content, utm_medium ou utm_id, sem diferenciar caixa', async () => {
		expect(await doEscopo({ tipo: 'agencia', agenciaId: mh })).toEqual(MH)
	})

	it('nunca vê a outra agência, o orgânico, o portal nem campanha sem marcador', async () => {
		expect(await doEscopo({ tipo: 'agencia', agenciaId: eb })).toEqual(['eb'])
	})

	it('marcador vazio na lista não abre tudo', async () => {
		await sql`insert into agencias (nome, slug, prefixos, utm_medium_marca, ids_campanha) values ('Vazia', 'vazia', '{"", " "}', '{""}', '{""}') on conflict (slug) do nothing`.execute(db)
		const vazia = (await db.selectFrom('agencias').select('id').where('slug', '=', 'vazia').executeTakeFirstOrThrow()).id
		try {
			expect(await doEscopo({ tipo: 'agencia', agenciaId: vazia })).toEqual([])
		} finally {
			await sql`delete from agencias where slug = 'vazia'`.execute(db)
		}
	})

	it('filtro de plataforma estreita pela plataforma da sessão', async () => {
		expect(await doEscopo({ tipo: 'agencia', agenciaId: mh, plataforma: 'meta' })).toEqual(['mh-va-codificado', 'mh-va-colchete'])
		expect(await doEscopo({ tipo: 'agencia', agenciaId: mh, plataforma: 'google' })).toEqual(['mh-campanha-va', 'mh-id', 'mh-medium'])
	})

	it('filtro de campanha casa o rótulo da tela, sem diferenciar caixa (inclusive "campanha #<id>")', async () => {
		expect(await doEscopo({ tipo: 'agencia', agenciaId: mh, campanhas: ['VA-PMAX-NUCLEO'] })).toEqual(['mh-campanha-va'])
		expect(await doEscopo({ tipo: 'agencia', agenciaId: mh, campanhas: ['campanha #24295047322'] })).toEqual(['mh-id'])
		// Filtro não alarga: campanha de outra agência não entra.
		expect(await doEscopo({ tipo: 'agencia', agenciaId: mh, campanhas: ['[EB] [SITE] Visitas ao site'] })).toEqual([])
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
			utm_source: 'facebook', utm_campaign: '[EB] antiga', fbclid: 'f',
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

	it('periodoDaUrl leva o escopo no noPeriodo', async () => {
		const { periodoDaUrl } = await import('@/lib/visitors/sql-atribuicao')
		const { noPeriodo } = periodoDaUrl('http://x/?dias=30', { tipo: 'agencia', agenciaId: eb })
		const r = await sql<{ n: string }>`select count(*) as n from visitor_sessions s where ${noPeriodo}`.execute(db)
		expect(Number(r.rows[0].n)).toBe(1)
	})
})
