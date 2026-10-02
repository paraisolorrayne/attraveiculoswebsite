/**
 * Leads da área da agência contra um Postgres real. Um card é da agência
 * quando está ligado a uma visita do site (mesma regra da receita) e QUALQUER
 * visita da pessoa nos 90 dias antes do card tem o marcador da agência
 * (decisão da usuária em 02/10). Nada de nome, telefone, vendedor ou valor.
 *
 * Opt-in: sem TEST_DATABASE_URL é pulado.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { sql } from 'kysely'
import { prepararBancoAgencias } from './fixtures/agencias'

const TEST_DB = process.env.TEST_DATABASE_URL
const DIA = 86_400_000

describe.skipIf(!TEST_DB)('leads da agência — SQL real', () => {
	let db: typeof import('../index').db
	let consultarLeadsAgencia: typeof import('@/lib/visitors/consultas/leads-agencia').consultarLeadsAgencia
	let mh: string

	beforeAll(async () => {
		process.env.DATABASE_URL = TEST_DB
		;({ db } = await import('../index'))
		;({ consultarLeadsAgencia } = await import('@/lib/visitors/consultas/leads-agencia'))
		await prepararBancoAgencias(db)
		// O crm_cards do banco de teste é o mínimo de outro teste; aqui entram as
		// colunas que provam que nome, telefone, vendedor e valor não saem.
		await sql`alter table crm_cards
			add column if not exists nome text, add column if not exists telefone text,
			add column if not exists valor numeric, add column if not exists vendedor text`.execute(db)
		await db.deleteFrom('visitor_fingerprints').execute()
		await sql`delete from crm_cards where id like 'teste-lead-%'`.execute(db)
		await sql`insert into agencias (nome, slug, prefixos) values ('EB', 'eb', '{[eb]}') on conflict (slug) do nothing`.execute(db)
		mh = (await db.selectFrom('agencias').select('id').where('slug', '=', 'media-house').executeTakeFirstOrThrow()).id

		const agora = Date.now()
		const pessoa = async (nome: string) =>
			(await db.insertInto('visitor_fingerprints').values({ visitor_id: nome, confidence_score: 0.9 }).returning('id').executeTakeFirstOrThrow()).id
		const sessao = async (fp: string, session_id: string, diasAtras: number, extra: Record<string, unknown>) => {
			const em = new Date(agora - diasAtras * DIA)
			await db.insertInto('visitor_sessions').values({ fingerprint_id: fp, session_id, started_at: em, last_activity_at: em, ...extra }).execute()
		}
		const card = async (id: string, etapa: string, diasAtras: number, sessionId: string | null, extra: Record<string, unknown> = {}) => {
			const em = new Date(agora - diasAtras * DIA)
			const dados = sessionId ? { site_session_id: sessionId, site_session_origem: 'correlacao_clique_veiculo', ...extra } : extra
			await sql`
				insert into crm_cards (id, etapa, nome, telefone, veiculo, valor, vendedor, dados, criado_em, atualizado_em)
				values (${id}, ${etapa}, 'Fulano Secreto', '11988887777', 'Ferrari 296 GTB (R$ 3.490.000)', 3490000, 'Vendedor Secreto',
				        ${JSON.stringify(dados)}::jsonb, ${em}, ${em})
			`.execute(db)
		}

		// 1. Clique numa visita da campanha da MH (Google).
		const p1 = await pessoa('p1')
		await sessao(p1, 'sessao1-mh', 2, { utm_source: 'google', utm_campaign: 'va-pmax', gclid: 'g' })
		await card('teste-lead-1', 'novo', 2, 'sessao1-mh')
		// 2. Veio pela Meta da MH, voltou direto 3 dias depois e chamou: visita anterior.
		const p2 = await pessoa('p2')
		await sessao(p2, 'sessao2-mh', 6, { utm_source: 'facebook', utm_campaign: '[VA][Site]', fbclid: 'f' })
		await sessao(p2, 'sessao2-volta', 3, {})
		await card('teste-lead-2', 'encerrado_ganho', 3, 'sessao2-volta', {
			veiculo_interesse_detalhe: { tipo: 'comprar', marca: 'Porsche', modelo: '911', versao: 'Carrera S', ano: 2023 },
		})
		// 3. Da EB: não aparece.
		const p3 = await pessoa('p3')
		await sessao(p3, 'sessao3-eb', 2, { utm_source: 'facebook', utm_campaign: '[EB] Site', fbclid: 'f' })
		await card('teste-lead-3', 'novo', 2, 'sessao3-eb')
		// 4. Orgânico, sem passagem pela MH: não aparece.
		const p4 = await pessoa('p4')
		await sessao(p4, 'sessao4-org', 2, { referrer_domain: 'www.google.com' })
		await card('teste-lead-4', 'em_atendimento', 2, 'sessao4-org')
		// 5. Passagem pela MH há 100 dias, fora da janela de 90: não aparece.
		const p5 = await pessoa('p5')
		await sessao(p5, 'sessao5-mh-velha', 102, { utm_source: 'google', utm_campaign: 'va-pmax', gclid: 'g' })
		await sessao(p5, 'sessao5-volta', 2, {})
		await card('teste-lead-5', 'novo', 2, 'sessao5-volta')
		// 6. MH, perdido.
		const p6 = await pessoa('p6')
		await sessao(p6, 'sessao6-mh', 5, { utm_source: 'google', utm_campaign: 'va-pmax', gclid: 'g' })
		await card('teste-lead-6', 'encerrado_perdido', 5, 'sessao6-mh')
		// 7. Sem ligação nenhuma com o site: não aparece.
		await card('teste-lead-7', 'novo', 2, null)
		// 8. MH, mas o card entrou há 40 dias: fora do período de 30.
		const p8 = await pessoa('p8')
		await sessao(p8, 'sessao8-mh', 40, { utm_source: 'google', utm_campaign: 'va-pmax', gclid: 'g' })
		await card('teste-lead-8', 'em_negociacao', 40, 'sessao8-mh')
	})

	const mhEscopo = () => ({ tipo: 'agencia' as const, agenciaId: mh })

	it('conta entraram, com vendedor, vendidos e perdidos só dos leads da agência', async () => {
		const r = await consultarLeadsAgencia('http://x/?dias=30', mhEscopo())
		expect(r.total).toEqual({ entraram: 3, com_vendedor: 1, vendidos: 1, perdidos: 1 })
	})

	it('por campanha, com a campanha da visita da agência mais próxima do lead', async () => {
		const r = await consultarLeadsAgencia('http://x/?dias=30', mhEscopo())
		expect(r.porCampanha).toEqual([
			{ campanha: 'va-pmax', plataforma: 'google', entraram: 2, com_vendedor: 1, vendidos: 0, perdidos: 1 },
			{ campanha: '[VA][Site]', plataforma: 'meta', entraram: 1, com_vendedor: 0, vendidos: 1, perdidos: 0 },
		])
	})

	it('lista sem dado do cliente nem do vendedor, com veículo normalizado e como foi ligado', async () => {
		const r = await consultarLeadsAgencia('http://x/?dias=30', mhEscopo())
		const texto = JSON.stringify(r)
		for (const proibido of ['Fulano', 'Secreto', '11988887777', '3490000', '3.490.000', 'teste-lead-', 'sessao1-mh', 'sessao2-volta']) {
			expect(texto).not.toContain(proibido)
		}
		const volta = r.lista.find(l => l.campanha === '[VA][Site]')
		expect(volta).toMatchObject({ status: 'vendido', veiculo: 'Porsche 911 Carrera S 2023', ligacao: 'visita_anterior', plataforma: 'meta' })
		expect(r.lista.filter(l => l.ligacao === 'clique')).toHaveLength(2)
		expect(r.lista.every(l => l.veiculo === 'Ferrari 296 GTB' || l.veiculo === 'Porsche 911 Carrera S 2023')).toBe(true)
	})

	it('filtros de plataforma e campanha estreitam', async () => {
		const meta = await consultarLeadsAgencia('http://x/?dias=30', { ...mhEscopo(), plataforma: 'meta' })
		expect(meta.total.entraram).toBe(1)
		const pmax = await consultarLeadsAgencia('http://x/?dias=30', { ...mhEscopo(), campanhas: ['va-pmax'] })
		expect(pmax.total).toEqual({ entraram: 2, com_vendedor: 1, vendidos: 0, perdidos: 1 })
	})

	it('período maior traz o lead de 40 dias atrás', async () => {
		const r = await consultarLeadsAgencia('http://x/?dias=90', mhEscopo())
		expect(r.total.entraram).toBe(4)
	})
})
