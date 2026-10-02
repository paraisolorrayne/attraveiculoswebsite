/**
 * API de Visitantes da agência: em TODAS as abas, a Media House não vê nada da
 * EB nem do tráfego orgânico da loja; slug alheio é 403; aba fora do mapa
 * (ex.: perfis identificados, receita) é 404.
 *
 * Opt-in: sem TEST_DATABASE_URL é pulado.
 */
import { describe, it, expect, beforeAll, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { sql } from 'kysely'
import { prepararBancoAgencias } from './fixtures/agencias'

let acesso: { ok: true; admin: unknown; agencia: { id: string; slug: string; nome: string } } | { ok: false; status: 401 | 403 | 404 }
vi.mock('@/lib/auth/guard-agencia', () => ({ acessoAgencia: async () => acesso }))

const TEST_DB = process.env.TEST_DATABASE_URL

describe.skipIf(!TEST_DB)('API de visitantes da agência', () => {
	let db: typeof import('../index').db
	let GET: typeof import('@/app/api/admin/agencia/[slug]/visitantes/[aba]/route').GET
	let mh: string

	const chamar = (aba: string, query = 'dias=30') =>
		GET(new NextRequest(`http://localhost/api/admin/agencia/media-house/visitantes/${aba}?${query}`), {
			params: Promise.resolve({ slug: 'media-house', aba }),
		})

	beforeAll(async () => {
		process.env.DATABASE_URL = TEST_DB
		;({ db } = await import('../index'))
		;({ GET } = await import('@/app/api/admin/agencia/[slug]/visitantes/[aba]/route'))
		await prepararBancoAgencias(db)
		await db.deleteFrom('visitor_fingerprints').execute()
		await sql`insert into agencias (nome, slug, prefixos) values ('EB', 'eb', '{[eb]}') on conflict (slug) do nothing`.execute(db)
		const id = async (slug: string) => (await db.selectFrom('agencias').select('id').where('slug', '=', slug).executeTakeFirstOrThrow()).id
		mh = await id('media-house')
		acesso = { ok: true, admin: {}, agencia: { id: mh, slug: 'media-house', nome: 'Media House' } }

		const fp = (await db.insertInto('visitor_fingerprints').values({ visitor_id: 'v-api', confidence_score: 0.9 }).returning('id').executeTakeFirstOrThrow()).id
		const sessao = async (session_id: string, extra: Record<string, unknown>, clicouEm: number | null) => {
			const inicio = new Date(Date.now() - 3_600_000)
			const s = await db.insertInto('visitor_sessions').values({
				fingerprint_id: fp, session_id, started_at: inicio, last_activity_at: inicio,
				contacted_whatsapp: clicouEm !== null, utm_term: 'termo-' + session_id, ...extra,
			}).returning('id').executeTakeFirstOrThrow()
			await db.insertInto('visitor_page_views').values({
				session_id: s.id, fingerprint_id: fp, page_url: `https://x/veiculo/carro-${session_id}-1`,
				page_path: `/veiculo/carro-${session_id}-1`, page_type: 'vehicle', vehicle_slug: `carro-${session_id}-1`,
				vehicle_brand: 'Marca', vehicle_model: `modelo-${session_id}`, viewed_at: inicio,
			}).execute()
			if (clicouEm !== null) {
				await sql`insert into whatsapp_clicks (session_db_id, clicked_at, page_path) values (${s.id}::uuid, ${new Date(inicio.getTime() + clicouEm * 1000)}, '/')`.execute(db)
			}
		}
		await sessao('mhgoogle', { utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'va-pmax', gclid: 'g' }, 1) // acidental
		await sessao('mhmeta', { utm_source: 'facebook', utm_campaign: '[VA][Site]', fbclid: 'f' }, 90)
		await sessao('ebmeta', { utm_source: 'facebook', utm_campaign: '[EB] Site', utm_id: '222', fbclid: 'f' }, 40)
		await sessao('organico', { referrer_domain: 'www.google.com' }, 20)
	})

	const ABAS = ['resumo', 'metrics', 'origens', 'entradas', 'sessoes', 'jornadas', 'comportamento', 'veiculos', 'termos', 'campanhas', 'campanhas-opcoes', 'leads']

	it.each(ABAS)('aba %s: nada da EB nem do orgânico', async aba => {
		const r = await chamar(aba)
		expect(r.status).toBe(200)
		const texto = JSON.stringify(await r.json())
		for (const proibido of ['ebmeta', 'organico', '[EB] Site', 'www.google.com']) {
			expect(texto).not.toContain(proibido)
		}
	})

	it('resumo: números da agência, com o clique acidental separado', async () => {
		const j = await (await chamar('resumo')).json()
		expect(j.total).toEqual({ sessoes: 2, whatsapp: 1, acidentais: 1 })
		const porPlat = Object.fromEntries(j.porPlataforma.map((p: { plataforma: string }) => [p.plataforma, p]))
		expect(porPlat.google).toMatchObject({ sessoes: 1, whatsapp: 0, acidentais: 1 })
		expect(porPlat.meta).toMatchObject({ sessoes: 1, whatsapp: 1, acidentais: 0 })
	})

	it('filtro de plataforma estreita dentro da agência', async () => {
		const j = await (await chamar('resumo', 'dias=30&plataforma=meta')).json()
		expect(j.total.sessoes).toBe(1)
		const ignorado = await (await chamar('resumo', 'dias=30&plataforma=tiktok')).json()
		expect(ignorado.total.sessoes).toBe(2)
	})

	it('campanhas-opcoes: as campanhas da agência no período, pela plataforma, sem a EB', async () => {
		const j = await (await chamar('campanhas-opcoes', 'dias=30')).json()
		expect(j.campanhas).toEqual([
			{ nome: '[VA][Site]', plataforma: 'meta', sessoes: 1 },
			{ nome: 'va-pmax', plataforma: 'google', sessoes: 1 },
		])
		// A própria campanha escolhida não some da lista de opções.
		const comFiltro = await (await chamar('campanhas-opcoes', 'dias=30&campanha=va-pmax')).json()
		expect(comFiltro.campanhas).toHaveLength(2)
		const soMeta = await (await chamar('campanhas-opcoes', 'dias=30&plataforma=meta')).json()
		expect(soMeta.campanhas.map((c: { nome: string }) => c.nome)).toEqual(['[VA][Site]'])
	})

	it('filtro de campanha pelo nome estreita o resumo', async () => {
		const j = await (await chamar('resumo', 'dias=30&campanha=VA-PMAX')).json()
		expect(j.total.sessoes).toBe(1)
	})

	it('detalhe de sessão: da agência abre, de fora é 404', async () => {
		expect((await chamar('sessao', 'session_id=mhmeta')).status).toBe(200)
		expect((await chamar('sessao', 'session_id=ebmeta')).status).toBe(404)
	})

	it('slug alheio é 403 e aba fora do mapa é 404', async () => {
		const antes = acesso
		acesso = { ok: false, status: 403 }
		expect((await chamar('origens')).status).toBe(403)
		acesso = antes
		expect((await chamar('perfis')).status).toBe(404)
		expect((await chamar('atribuicao-receita')).status).toBe(404)
	})
})
