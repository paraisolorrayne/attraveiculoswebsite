/**
 * Cadastro de campanhas da agência contra um Postgres real: trava entre
 * agências (mensagem neutra), edição só da própria, encerrar sem apagar,
 * visitas no período e "detectadas sem cadastro".
 *
 * Opt-in: sem TEST_DATABASE_URL é pulado.
 */
import { describe, it, expect, beforeAll, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { sql } from 'kysely'
import { prepararBancoAgencias } from './fixtures/agencias'

let acesso: { ok: true; admin: { id: string }; agencia: { id: string; slug: string; nome: string } }
vi.mock('@/lib/auth/guard-agencia', () => ({ acessoAgencia: async () => acesso }))

const TEST_DB = process.env.TEST_DATABASE_URL

describe.skipIf(!TEST_DB)('cadastro de campanhas da agência', () => {
	let db: typeof import('../index').db
	let rotas: typeof import('@/app/api/admin/agencia/[slug]/campanhas/route')
	let rotaId: typeof import('@/app/api/admin/agencia/[slug]/campanhas/[id]/route')
	let rotaDetectadas: typeof import('@/app/api/admin/agencia/[slug]/campanhas/detectadas/route')
	let mh: string
	let eb: string
	const comoMH = () => (acesso = { ok: true, admin: { id: '00000000-0000-0000-0000-000000000001' }, agencia: { id: mh, slug: 'media-house', nome: 'Media House' } })
	const comoEB = () => (acesso = { ok: true, admin: { id: '00000000-0000-0000-0000-000000000002' }, agencia: { id: eb, slug: 'eb', nome: 'EB' } })
	const params = { params: Promise.resolve({ slug: 'x' }) }
	const criar = (corpo: Record<string, unknown>) =>
		rotas.POST(new NextRequest('http://localhost/api/admin/agencia/x/campanhas', { method: 'POST', body: JSON.stringify(corpo) }), params)

	beforeAll(async () => {
		process.env.DATABASE_URL = TEST_DB
		;({ db } = await import('../index'))
		rotas = await import('@/app/api/admin/agencia/[slug]/campanhas/route')
		rotaId = await import('@/app/api/admin/agencia/[slug]/campanhas/[id]/route')
		rotaDetectadas = await import('@/app/api/admin/agencia/[slug]/campanhas/detectadas/route')
		await prepararBancoAgencias(db)
		await sql`delete from agencia_campanhas`.execute(db)
		await db.deleteFrom('visitor_fingerprints').execute()
		await sql`insert into agencias (nome, slug) values ('EB', 'eb') on conflict (slug) do nothing`.execute(db)
		await sql`update agencias set prefixos = '{va-,[va]}', utm_medium_marca = '{mediahouse}' where slug = 'media-house'`.execute(db)
		await sql`update agencias set prefixos = '{[eb]}' where slug = 'eb'`.execute(db)
		const id = async (slug: string) => (await db.selectFrom('agencias').select('id').where('slug', '=', slug).executeTakeFirstOrThrow()).id
		mh = await id('media-house')
		eb = await id('eb')

		const fp = (await db.insertInto('visitor_fingerprints').values({ visitor_id: 'v-camp', confidence_score: 0.9 }).returning('id').executeTakeFirstOrThrow()).id
		const s = (session_id: string, extra: Record<string, unknown>) =>
			db.insertInto('visitor_sessions').values({ fingerprint_id: fp, session_id, started_at: new Date(), last_activity_at: new Date(), ...extra }).execute()
		await s('pmax-1', { utm_source: 'google', utm_id: '24295047322', gclid: 'g' })
		await s('pmax-2', { utm_source: 'google', utm_id: '24295047322', utm_campaign: 'va-pmax', gclid: 'g' })
		await s('wm-1', { utm_source: 'webmotors', utm_campaign: 'va-webmotors-set26' })
		await s('wm-2', { utm_source: 'webmotors', utm_campaign: 'va-webmotors-set26' })
		await s('marca', { utm_source: 'google-ads', utm_medium: 'mediahouse', utm_campaign: 'sem-prefixo', gclid: 'g' })
		await s('eb-1', { utm_source: 'facebook', utm_campaign: '[EB] Site', fbclid: 'f' })
	})

	it('cria, lista com as visitas do período e a situação', async () => {
		comoMH()
		const r = await criar({ plataforma: 'google', nome: 'va-pmax', id_externo: '24295047322', inicio: '2026-09-01' })
		expect(r.status).toBe(201)
		const lista = await (await rotas.GET(new NextRequest('http://localhost/api/admin/agencia/x/campanhas?dias=30'), params)).json()
		expect(lista.campanhas).toHaveLength(1)
		expect(lista.campanhas[0]).toMatchObject({ nome: 'va-pmax', visitas_periodo: 2, situacao: 'ativa' })
	})

	it('duplicata na própria agência: "você já cadastrou"', async () => {
		comoMH()
		const r = await criar({ plataforma: 'google', nome: 'outro nome', id_externo: ' 24295047322 ', inicio: '2026-09-01' })
		expect(r.status).toBe(409)
		expect((await r.json()).error).toBe('Você já cadastrou esta campanha.')
	})

	it('ID de outra agência: recusa com mensagem neutra, sem dizer qual', async () => {
		comoEB()
		const r = await criar({ plataforma: 'google', nome: 'qualquer', id_externo: '24295047322', inicio: '2026-09-01' })
		expect(r.status).toBe(409)
		const erro = (await r.json()).error
		expect(erro).toBe('Esta campanha já está cadastrada em outra agência. Fale com a Attra.')
		expect(erro).not.toContain('Media House')
	})

	it('ID da WebMotors não diferencia maiúsculas: a mesma campanha não entra duas vezes', async () => {
		comoMH()
		expect((await criar({ plataforma: 'webmotors', nome: 'wm-caixa', id_externo: 'WM-AbC123', inicio: '2026-09-01' })).status).toBe(201)
		comoEB()
		const outra = await criar({ plataforma: 'webmotors', nome: 'wm-caixa-eb', id_externo: 'wm-abc123', inicio: '2026-09-01' })
		expect(outra.status).toBe(409)
		expect((await outra.json()).error).toBe('Esta campanha já está cadastrada em outra agência. Fale com a Attra.')
		comoMH()
		const propria = await criar({ plataforma: 'webmotors', nome: 'wm-caixa-2', id_externo: ' WM-ABC123 ', inicio: '2026-09-01' })
		expect(propria.status).toBe(409)
		expect((await propria.json()).error).toBe('Você já cadastrou esta campanha.')
	})

	it('validação devolve 400 com a mensagem', async () => {
		comoMH()
		const r = await criar({ plataforma: 'meta', nome: 'x', id_externo: 'abc', inicio: '2026-09-01' })
		expect(r.status).toBe(400)
	})

	it('edita e encerra a própria; a de outra agência é 404', async () => {
		comoMH()
		const c = await db.selectFrom('agencia_campanhas').select('id').where('nome', '=', 'va-pmax').executeTakeFirstOrThrow()
		const pid = { params: Promise.resolve({ slug: 'x', id: c.id }) }
		const editar = (corpo: Record<string, unknown>) =>
			rotaId.PATCH(new NextRequest('http://localhost/x', { method: 'PATCH', body: JSON.stringify(corpo) }), pid)

		expect((await editar({ nome: 'va-pmax-nucleo-set26' })).status).toBe(200)
		const editada = await db.selectFrom('agencia_campanhas').select(['nome', 'id_externo', 'atualizado_por']).where('id', '=', c.id).executeTakeFirstOrThrow()
		expect(editada).toMatchObject({ nome: 'va-pmax-nucleo-set26', id_externo: '24295047322', atualizado_por: '00000000-0000-0000-0000-000000000001' })

		expect((await editar({ encerrar: true })).status).toBe(200)
		const encerrada = await db.selectFrom('agencia_campanhas').select('fim').where('id', '=', c.id).executeTakeFirstOrThrow()
		expect(encerrada.fim).not.toBeNull()

		comoEB()
		expect((await editar({ nome: 'tomada' })).status).toBe(404)
	})

	it('detectadas: só o que tem a marca da agência e não está cadastrado em lugar nenhum', async () => {
		comoMH()
		const j = await (await rotaDetectadas.GET(new NextRequest('http://localhost/x'), params)).json()
		const nomes = j.detectadas.map((d: { utm_campaign: string | null }) => d.utm_campaign)
		expect(nomes).toContain('va-webmotors-set26') // prefixo va-
		expect(nomes).toContain('sem-prefixo') // utm_medium=mediahouse
		expect(nomes).not.toContain('va-pmax') // já cadastrada
		expect(nomes).not.toContain('[EB] Site') // marca de outra agência
		expect(j.detectadas.find((d: { utm_campaign: string }) => d.utm_campaign === 'va-webmotors-set26')).toMatchObject({ plataforma: 'webmotors', sessoes: 2 })
	})
})
