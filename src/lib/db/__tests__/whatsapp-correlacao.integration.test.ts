/**
 * Integração da ligação lead→clique (`ligarCliqueAoCard`) e da migration que
 * descarta os vínculos antigos, contra um Postgres real.
 *
 * O que só o banco prova: o `left join lateral` que descobre o CARRO de cada
 * clique (pelo slug da ficha ou pelo id do anúncio num card de listagem), e o
 * SQL da migration 20261002.
 *
 * Opt-in: sem TEST_DATABASE_URL é pulado.
 *   TEST_DATABASE_URL=postgres://user@127.0.0.1:5432/attra_visitors_dev \
 *     ./node_modules/.bin/vitest run src/lib/db/__tests__/whatsapp-correlacao.integration.test.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { sql } from 'kysely'

const TEST_DB = process.env.TEST_DATABASE_URL

describe.skipIf(!TEST_DB)('ligação lead→clique — SQL real', () => {
	let db: typeof import('../index').db
	let ligarCliqueAoCard: typeof import('@/lib/whatsapp-correlacao-db').ligarCliqueAoCard
	let ligarPorCodigo: typeof import('@/lib/whatsapp-correlacao-db').ligarPorCodigo
	let webhook: typeof import('@/app/api/webhook/fykos-crm/route').POST

	beforeAll(async () => {
		process.env.DATABASE_URL = TEST_DB
		;({ db } = await import('../index'))
		;({ ligarCliqueAoCard, ligarPorCodigo } = await import('@/lib/whatsapp-correlacao-db'))
		;({ POST: webhook } = await import('@/app/api/webhook/fykos-crm/route'))
		process.env.FYKOS_CRM_SECRET = 'segredo-teste'
		// A fixture não traz crm_cards, e o banco de teste local pode ter só
		// id/etapa/dados. Garante as colunas que este teste usa, sem mexer no resto.
		await sql`create table if not exists crm_cards (id text primary key, etapa text, dados jsonb)`.execute(db)
		await sql`alter table crm_cards
			add column if not exists veiculo text,
			add column if not exists criado_em timestamptz not null default now(),
			add column if not exists atualizado_em timestamptz not null default now()`.execute(db)
	})

	const agora = new Date()
	const antes = (s: number) => new Date(agora.getTime() - s * 1000)
	let sessaoFicha: string
	let sessaoHome: string

	beforeEach(async () => {
		await db.deleteFrom('visitor_fingerprints').execute()
		await db.deleteFrom('whatsapp_clicks').execute()
		await db.deleteFrom('crm_cards').where('id', 'like', 'teste-corr-%').execute()

		const fp = (
			await db.insertInto('visitor_fingerprints').values({ visitor_id: 'v-corr', confidence_score: 0.9 }).returning('id').executeTakeFirstOrThrow()
		).id
		const sessao = async (token: string) =>
			(
				await db
					.insertInto('visitor_sessions')
					.values({ fingerprint_id: fp, session_id: token, started_at: antes(600), last_activity_at: antes(60) })
					.returning('id')
					.executeTakeFirstOrThrow()
			).id
		sessaoFicha = await sessao('s-ficha')
		sessaoHome = await sessao('s-home')

		// A ficha da Ferrari foi aberta por alguém (é dela que sai marca/modelo).
		await db
			.insertInto('visitor_page_views')
			.values({
				session_id: sessaoFicha,
				fingerprint_id: fp,
				page_url: 'https://attraveiculos.com.br/veiculo/ferrari-296-2025-1099157',
				page_path: '/veiculo/ferrari-296-2025-1099157',
				page_type: 'vehicle',
				vehicle_slug: 'ferrari-296-2025-1099157',
				vehicle_brand: 'Ferrari',
				vehicle_model: '296 GTB',
				viewed_at: antes(400),
			})
			.execute()
	})

	const clicar = (sessao: string, segundosAtras: number, page_path: string, vehicle_id: string | null, codigo: number | null = null) =>
		sql`insert into whatsapp_clicks (session_db_id, clicked_at, page_path, vehicle_id, codigo_whatsapp)
		    values (${sessao}::uuid, ${antes(segundosAtras)}, ${page_path}, ${vehicle_id}, ${codigo})`.execute(db)

	const dadosDo = async (id: string) =>
		(await db.selectFrom('crm_cards').select('dados').where('id', '=', id).executeTakeFirstOrThrow()).dados as Record<string, unknown>

	const cliques = async () =>
		(await sql<{ session_db_id: string; card_id: string | null; consumido: boolean }>`
			select session_db_id, card_id, consumido_em is not null as consumido from whatsapp_clicks order by clicked_at
		`.execute(db)).rows

	/** Manda o card como a Fykos manda, pelo receptor de verdade (autenticação v1, a mais simples). */
	const enviar = (card: Record<string, unknown>) =>
		webhook(new Request('http://x/api/webhook/fykos-crm', {
			method: 'POST',
			headers: { 'content-type': 'application/json', 'x-webhook-secret': 'segredo-teste' },
			body: JSON.stringify(card),
		}) as never)

	async function ligar(id: string, veiculo: string) {
		await db.insertInto('crm_cards').values({ id, etapa: 'novo', veiculo, criado_em: agora, atualizado_em: agora }).execute()
		return db.transaction().execute(trx =>
			ligarCliqueAoCard(trx, id, { id, veiculo_interesse: veiculo, atribuido_em: agora.toISOString() }),
		)
	}

	it('liga ao clique do card de listagem do MESMO carro (veículo achado pelo id do anúncio)', async () => {
		await clicar(sessaoFicha, 120, '/veiculos', '1099157')
		// Outro clique sozinho na janela, sem veículo: antes da regra nova, era ele que "ganhava".
		await clicar(sessaoHome, 60, '/', null)

		const r = await ligar('teste-corr-1', 'Ferrari 296 GTB')
		expect(r).toMatchObject({ tipo: 'ligado', sessionId: sessaoFicha })

		const card = await db.selectFrom('crm_cards').select('dados').where('id', '=', 'teste-corr-1').executeTakeFirstOrThrow()
		expect(card.dados).toMatchObject({ site_session_origem: 'correlacao_clique_veiculo' })
	})

	it('a correlação acrescenta a sessão sem apagar os extras que o card já tinha', async () => {
		await clicar(sessaoFicha, 60, '/veiculo/ferrari-296-2025-1099157', null)
		await db.insertInto('crm_cards').values({
			id: 'teste-corr-extras', etapa: 'novo', veiculo: 'Ferrari 296 GTB', criado_em: agora, atualizado_em: agora,
			dados: JSON.stringify({ canal_entrada: 'whatsapp' }) as never,
		}).execute()
		const r = await db.transaction().execute(trx =>
			ligarCliqueAoCard(trx, 'teste-corr-extras', { id: 'teste-corr-extras', veiculo_interesse: 'Ferrari 296 GTB', atribuido_em: agora.toISOString() }),
		)
		expect(r).toMatchObject({ tipo: 'ligado' })
		expect(await dadosDo('teste-corr-extras')).toEqual({
			canal_entrada: 'whatsapp', site_session_id: sessaoFicha, site_session_origem: 'correlacao_clique_veiculo',
		})
	})

	it('NÃO liga quando o único clique da janela é de outro carro ou sem carro', async () => {
		await clicar(sessaoHome, 60, '/', null)
		expect(await ligar('teste-corr-2', 'Audi RS6 Avant')).toEqual({ tipo: 'sem_candidato' })

		await clicar(sessaoFicha, 30, '/veiculo/ferrari-296-2025-1099157', null)
		expect(await ligar('teste-corr-3', 'Porsche 911 Carrera')).toEqual({ tipo: 'sem_candidato' })
	})

	it('card sem carro não liga', async () => {
		await clicar(sessaoFicha, 30, '/veiculo/ferrari-296-2025-1099157', null)
		expect(await ligar('teste-corr-4', '')).toEqual({ tipo: 'sem_veiculo' })
	})

	it('migration 20261002: descarta o vínculo antigo sem apagar e libera o clique', async () => {
		await clicar(sessaoHome, 60, '/', null)
		await db
			.insertInto('crm_cards')
			.values({
				id: 'teste-corr-5',
				etapa: 'novo',
				criado_em: agora,
				atualizado_em: agora,
				dados: JSON.stringify({ outro: 1, site_session_id: 's-home', site_session_origem: 'correlacao_clique_whatsapp' }) as never,
			})
			.execute()
		await sql`update whatsapp_clicks set consumido_em = now(), card_id = 'teste-corr-5'`.execute(db)

		const migration = readFileSync(resolve(__dirname, '../../../../supabase/migrations/20261002_descarta_correlacao_por_horario.sql'), 'utf8')
		await sql.raw(migration).execute(db)
		await sql.raw(migration).execute(db) // idempotente

		const card = await db.selectFrom('crm_cards').select('dados').where('id', '=', 'teste-corr-5').executeTakeFirstOrThrow()
		expect(card.dados).toEqual({
			outro: 1,
			site_session_id_descartado: 's-home',
			site_session_origem: 'correlacao_horario_descartada',
		})
		const c = await db.selectFrom('whatsapp_clicks').select(['consumido_em', 'card_id']).executeTakeFirstOrThrow()
		expect(c).toEqual({ consumido_em: null, card_id: null })
	})

	describe('pelo código invisível (29/10/2026)', () => {
		it('card novo com código liga ao clique do código, mesmo com outro clique do mesmo carro na janela', async () => {
			// Dois cliques na ficha da Ferrari: pela correlação, ambígua (não ligaria).
			await clicar(sessaoFicha, 120, '/veiculo/ferrari-296-2025-1099157', null, 1630495827)
			await clicar(sessaoHome, 60, '/veiculo/ferrari-296-2025-1099157', null, 3917058264)

			const r = await enviar({
				id: 'teste-corr-cod-1', etapa: 'novo', veiculo_interesse: 'Ferrari 296 GTB',
				atualizado_em: agora.toISOString(), codigo_whatsapp: 1630495827, canal_entrada: 'whatsapp',
			})
			expect(r.status).toBe(200)

			expect(await dadosDo('teste-corr-cod-1')).toEqual({
				codigo_whatsapp: 1630495827, canal_entrada: 'whatsapp',
				site_session_id: sessaoFicha, site_session_origem: 'codigo_whatsapp',
			})
			expect(await cliques()).toEqual([
				{ session_db_id: sessaoFicha, card_id: 'teste-corr-cod-1', consumido: true },
				{ session_db_id: sessaoHome, card_id: null, consumido: false },
			])
		})

		it('o código pode vir como texto, e um carro diferente não importa', async () => {
			await clicar(sessaoHome, 60, '/', null, 902741563)
			await enviar({ id: 'teste-corr-cod-2', etapa: 'novo', veiculo_interesse: 'Audi RS6', atualizado_em: agora.toISOString(), codigo_whatsapp: '902741563' })
			expect(await dadosDo('teste-corr-cod-2')).toMatchObject({ site_session_id: sessaoHome, site_session_origem: 'codigo_whatsapp' })
		})

		it('código sem clique gravado cai na correlação, como antes', async () => {
			await clicar(sessaoFicha, 60, '/veiculo/ferrari-296-2025-1099157', null)
			await enviar({ id: 'teste-corr-cod-3', etapa: 'novo', veiculo_interesse: 'Ferrari 296 GTB', atualizado_em: agora.toISOString(), codigo_whatsapp: 12345 })
			expect(await dadosDo('teste-corr-cod-3')).toMatchObject({ site_session_id: sessaoFicha, site_session_origem: 'correlacao_clique_veiculo' })
		})

		it('código que chega numa atualização substitui a correlação e devolve o clique dela', async () => {
			await clicar(sessaoFicha, 120, '/veiculo/ferrari-296-2025-1099157', null, 1630495827)
			await clicar(sessaoHome, 600, '/', null, 3917058264)
			const t0 = agora.toISOString()
			await enviar({ id: 'teste-corr-cod-4', etapa: 'novo', veiculo_interesse: 'Ferrari 296 GTB', atualizado_em: t0 })
			expect(await dadosDo('teste-corr-cod-4')).toMatchObject({ site_session_id: sessaoFicha, site_session_origem: 'correlacao_clique_veiculo' })

			// A Fykos leu o código da OUTRA sessão: o horário tinha errado.
			const t1 = new Date(agora.getTime() + 1000).toISOString()
			await enviar({ id: 'teste-corr-cod-4', etapa: 'em_atendimento', atualizado_em: t1, codigo_whatsapp: 3917058264 })
			expect(await dadosDo('teste-corr-cod-4')).toMatchObject({ site_session_id: sessaoHome, site_session_origem: 'codigo_whatsapp' })
			expect(await cliques()).toEqual([
				{ session_db_id: sessaoHome, card_id: 'teste-corr-cod-4', consumido: true },
				{ session_db_id: sessaoFicha, card_id: null, consumido: false },
			])

			// Atualização seguinte, já ligada pelo código: nada muda.
			const t2 = new Date(agora.getTime() + 2000).toISOString()
			await enviar({ id: 'teste-corr-cod-4', etapa: 'em_negociacao', atualizado_em: t2, codigo_whatsapp: 3917058264 })
			expect(await dadosDo('teste-corr-cod-4')).toMatchObject({ site_session_id: sessaoHome, site_session_origem: 'codigo_whatsapp' })
		})

		it('clique já tomado por outro card: liga do mesmo jeito, sem tirar o registro de quem chegou antes', async () => {
			await clicar(sessaoFicha, 60, '/veiculo/ferrari-296-2025-1099157', null, 1630495827)
			await sql`update whatsapp_clicks set consumido_em = now(), card_id = 'outro-card'`.execute(db)
			await db.insertInto('crm_cards').values({ id: 'teste-corr-cod-5', etapa: 'novo', criado_em: agora, atualizado_em: agora }).execute()
			const r = await db.transaction().execute(trx =>
				ligarPorCodigo(trx, 'teste-corr-cod-5', { id: 'teste-corr-cod-5', codigo_whatsapp: 1630495827 }),
			)
			expect(r).toMatchObject({ tipo: 'ligado', sessionId: sessaoFicha })
			expect((await cliques())[0]).toMatchObject({ card_id: 'outro-card' })
		})

		it('clique do código fora dos 7 dias não liga', async () => {
			await clicar(sessaoFicha, 8 * 24 * 3600, '/', null, 1630495827)
			await db.insertInto('crm_cards').values({ id: 'teste-corr-cod-6', etapa: 'novo', criado_em: agora, atualizado_em: agora }).execute()
			const r = await db.transaction().execute(trx =>
				ligarPorCodigo(trx, 'teste-corr-cod-6', { id: 'teste-corr-cod-6', codigo_whatsapp: 1630495827, atribuido_em: agora.toISOString() }),
			)
			expect(r).toEqual({ tipo: 'codigo_sem_clique', codigo: 1630495827 })
		})
	})
})
