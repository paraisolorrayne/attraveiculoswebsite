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

	beforeAll(async () => {
		process.env.DATABASE_URL = TEST_DB
		;({ db } = await import('../index'))
		;({ ligarCliqueAoCard } = await import('@/lib/whatsapp-correlacao-db'))
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

	const clicar = (sessao: string, segundosAtras: number, page_path: string, vehicle_id: string | null) =>
		sql`insert into whatsapp_clicks (session_db_id, clicked_at, page_path, vehicle_id)
		    values (${sessao}::uuid, ${antes(segundosAtras)}, ${page_path}, ${vehicle_id})`.execute(db)

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
})
