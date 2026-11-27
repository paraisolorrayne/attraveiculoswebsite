/**
 * Detalhe da sessão com clique do Google feito no iPhone (gbraid/wbraid no
 * lugar do gclid): a origem é Google Ads, os campos vão para a tela e as outras
 * visitas da mesma pessoa recebem o mesmo canal de um clique com gclid.
 *
 * Opt-in: sem TEST_DATABASE_URL é pulado.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { prepararBancoAgencias } from './fixtures/agencias'

const TEST_DB = process.env.TEST_DATABASE_URL

type Detalhe = {
	data: {
		session_summary: Record<string, unknown> & { extracted_params: Record<string, string> }
		outras_sessoes: Array<{ session_id: string; canal: string }>
		likely_origin: { origin: string; confidence: string }
	}
}

describe.skipIf(!TEST_DB)('detalhe da sessão com clique do Google no iPhone', () => {
	let consultarSessaoDetalhe: typeof import('@/lib/visitors/consultas/sessao-detalhe').consultarSessaoDetalhe
	let ESCOPO_TUDO: import('@/lib/visitors/escopo').Escopo

	beforeAll(async () => {
		process.env.DATABASE_URL = TEST_DB
		const { db } = await import('../index')
		;({ consultarSessaoDetalhe } = await import('@/lib/visitors/consultas/sessao-detalhe'))
		;({ ESCOPO_TUDO } = await import('@/lib/visitors/escopo'))
		await prepararBancoAgencias(db)
		await db.deleteFrom('visitor_fingerprints').execute()

		const fp = (await db.insertInto('visitor_fingerprints').values({ visitor_id: 'v-ios', confidence_score: 0.9 }).returning('id').executeTakeFirstOrThrow()).id
		const sessao = async (session_id: string, horas: number, extra: Record<string, unknown>, primeiraUrl?: string) => {
			const inicio = new Date(Date.now() - horas * 3_600_000)
			const s = await db.insertInto('visitor_sessions').values({
				fingerprint_id: fp, session_id, started_at: inicio, last_activity_at: inicio,
				referrer_domain: 'www.google.com', ...extra,
			} as never).returning('id').executeTakeFirstOrThrow()
			if (primeiraUrl) {
				await db.insertInto('visitor_page_views').values({
					session_id: s.id, fingerprint_id: fp, page_url: primeiraUrl, page_path: '/', viewed_at: inicio,
				} as never).execute()
			}
		}
		await sessao('google-organico', 72, {})
		await sessao('google-gclid', 48, { gclid: 'g-teste' })
		await sessao('ios-wbraid', 24, { wbraid: 'wb-teste' })
		await sessao('ios-gbraid', 1, { gbraid: 'gb-teste' }, 'https://attraveiculos.com.br/?gbraid=gb-teste')
	})

	const detalhe = async (id: string) =>
		(await consultarSessaoDetalhe(`http://x/?session_id=${id}`, ESCOPO_TUDO)) as Detalhe

	it('gbraid: origem Google Ads, campo na tela e lido da primeira URL', async () => {
		const r = await detalhe('ios-gbraid')
		expect(r.data.likely_origin.origin).toBe('Paid - Google Ads')
		expect(r.data.session_summary.gbraid).toBe('gb-teste')
		expect(r.data.session_summary.wbraid).toBeNull()
		expect(r.data.session_summary.extracted_params.gbraid).toBe('gb-teste')
	})

	it('wbraid: origem Google Ads', async () => {
		const r = await detalhe('ios-wbraid')
		expect(r.data.likely_origin.origin).toBe('Paid - Google Ads')
		expect(r.data.session_summary.wbraid).toBe('wb-teste')
	})

	it('outras visitas: clique do iPhone tem o canal do clique com gclid, não o do orgânico', async () => {
		const canal = Object.fromEntries((await detalhe('ios-gbraid')).data.outras_sessoes.map(o => [o.session_id, o.canal]))
		expect(canal['ios-wbraid']).toBe(canal['google-gclid'])
		expect(canal['ios-gbraid']).toBe(canal['google-gclid'])
		expect(canal['google-organico']).not.toBe(canal['google-gclid'])
	})

	it('sem clique pago, o Google como referrer continua orgânico', async () => {
		expect((await detalhe('google-organico')).data.likely_origin.origin).toBe('Organic - Google')
	})
})
