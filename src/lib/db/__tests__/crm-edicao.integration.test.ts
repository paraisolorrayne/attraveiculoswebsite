import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { sql } from 'kysely'

// Usa schema isolado e apaga apenas esse schema ao terminar.
// CRM_TEST_DATABASE_URL=postgresql://... vitest run .../crm-edicao.integration.test.ts
const contexto = vi.hoisted(() => ({ role: 'owner' as string | null, schema: `crm_edicao_test_${process.pid}` }))
vi.mock('@/lib/admin-auth-supabase', () => ({ getCurrentAdmin: async () => contexto.role ? {
	id: 'cris-teste', name: 'Cris', email: 'cris@example.test', role: contexto.role,
} : null }))
vi.mock('@/lib/db', async () => {
	const { Kysely, PostgresDialect } = await import('kysely')
	const { Pool } = await import('pg')
	return { db: new Kysely({ dialect: new PostgresDialect({ pool: new Pool({
		connectionString: process.env.CRM_TEST_DATABASE_URL, options: `-c search_path=${contexto.schema}`,
	}) }) }) }
})

import { db } from '@/lib/db'
import { PATCH } from '@/app/api/admin/crm/cards/[id]/route'
import { POST as cron } from '@/app/api/cron/crm-retorno/route'
import { entregarRetornosCrm } from '@/lib/crm-retorno'

const versao = '2026-09-08T17:00:00.000Z'
function editar(body: Record<string, unknown>, id = 'cliente-1') {
	return PATCH(new NextRequest(`https://site.example/api/admin/crm/cards/${id}`, {
		method: 'PATCH', headers: { 'Content-Type': 'application/json', Origin: 'https://site.example' },
		body: JSON.stringify({ atualizado_em: versao, ...body }),
	}), { params: Promise.resolve({ id }) })
}

describe.skipIf(!process.env.CRM_TEST_DATABASE_URL)('edição CRM — PostgreSQL real', () => {
	beforeAll(async () => {
		await sql`create schema ${sql.id(contexto.schema)}`.execute(db)
		for (const migration of ['20260722_crm_cards_postgres_puro.sql', '20260727_crm_v2.sql', '20260908_crm_eventos_saida.sql']) {
			await sql.raw(readFileSync(`supabase/migrations/${migration}`, 'utf8').replaceAll('public.', '')).execute(db)
		}
	})
	beforeEach(async () => {
		vi.unstubAllGlobals()
		contexto.role = 'owner'
		vi.stubEnv('CRM_RETURN_WEBHOOK_URL', 'https://crm.example/retorno')
		vi.stubEnv('CRM_RETURN_WEBHOOK_SECRET', 'segredo-teste')
		vi.stubEnv('CRON_SECRET', 'cron-teste')
		vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://site.example')
		vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => new Response(null, { status: 204 })))
		await sql`truncate crm_cards, crm_eventos_saida`.execute(db)
		await db.insertInto('crm_cards').values({ id: 'cliente-1', etapa: 'novo', vendedor: 'Ana', atualizado_em: versao }).execute()
	})
	afterAll(async () => {
		await sql`drop schema if exists ${sql.id(contexto.schema)} cascade`.execute(db)
		await db.destroy()
		vi.unstubAllGlobals()
		vi.unstubAllEnvs()
	})

	it('Owner salva coluna e vendedor com autor e entrega registrada', async () => {
		const response = await editar({ coluna: 'movimentando', vendedor: 'João' })
		expect(response.status).toBe(200)
		expect((await response.json()).sincronizacao).toBe('enviado')
		const card = await db.selectFrom('crm_cards').selectAll().executeTakeFirstOrThrow()
		expect(card).toMatchObject({ etapa: 'em_negociacao', fonte_evento: 'movimentacao_manual', vendedor: 'João' })
		const evento = await db.selectFrom('crm_eventos_saida').selectAll().executeTakeFirstOrThrow()
		expect(evento.entregue_em).not.toBeNull()
		expect(JSON.parse(evento.corpo)).toMatchObject({ card_id: 'cliente-1', autor: { papel: 'owner' }, anterior: { vendedor: 'Ana' }, alteracoes: { vendedor: 'João' } })
	})
	it('recusa conta sem sessão, operador e configuração ausente sem alterar card', async () => {
		contexto.role = null
		expect((await editar({ vendedor: 'João' })).status).toBe(401)
		contexto.role = 'operador'
		expect((await editar({ vendedor: 'João' })).status).toBe(403)
		contexto.role = 'owner'
		vi.stubEnv('CRM_RETURN_WEBHOOK_URL', '')
		expect((await editar({ vendedor: 'João' })).status).toBe(503)
		expect(await db.selectFrom('crm_eventos_saida').selectAll().execute()).toHaveLength(0)
	})
	it('recusa payload inválido, card inexistente e edição desatualizada', async () => {
		expect((await editar({ coluna: 'inventada' })).status).toBe(400)
		expect((await editar({ coluna: 'ganho' }, 'inexistente')).status).toBe(404)
		expect((await editar({ atualizado_em: '2026-09-07T17:00:00Z', coluna: 'ganho' })).status).toBe(409)
		expect(await db.selectFrom('crm_eventos_saida').selectAll().execute()).toHaveLength(0)
	})
	it('aceita origem pública atrás do proxy e recusa origem externa', async () => {
		const request = (origin: string) => new NextRequest('http://localhost:3000/api/admin/crm/cards/cliente-1', {
			method: 'PATCH', headers: { Origin: origin, 'Content-Type': 'application/json' },
			body: JSON.stringify({ atualizado_em: versao, vendedor: 'João' }),
		})
		expect((await PATCH(request('https://externo.example'), { params: Promise.resolve({ id: 'cliente-1' }) })).status).toBe(403)
		expect((await PATCH(request('https://site.example'), { params: Promise.resolve({ id: 'cliente-1' }) })).status).toBe(200)
	})
	it('não duplica uma alteração sem mudanças', async () => {
		expect((await (await editar({ vendedor: 'Ana' })).json()).sincronizacao).toBe('sem_alteracao')
		expect(fetch).not.toHaveBeenCalled()
		expect(await db.selectFrom('crm_eventos_saida').selectAll().execute()).toHaveLength(0)
	})
	it('serializa duas edições da mesma versão e recusa a segunda', async () => {
		const responses = await Promise.all([editar({ vendedor: 'João' }), editar({ vendedor: 'Maria' })])
		expect(responses.map(r => r.status).sort()).toEqual([200, 409])
		expect(await db.selectFrom('crm_eventos_saida').selectAll().execute()).toHaveLength(1)
	})
	it('falha de entrega persiste para retry com mesmo corpo e id', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(null, { status: 503 })).mockResolvedValueOnce(new Response(null, { status: 204 })))
		expect((await (await editar({ vendedor: 'João' })).json()).sincronizacao).toBe('pendente')
		let evento = await db.selectFrom('crm_eventos_saida').selectAll().executeTakeFirstOrThrow()
		expect(evento).toMatchObject({ entregue_em: null, tentativas: 1, ultimo_erro: 'HTTP 503' })
		expect(await entregarRetornosCrm()).toBe(0) // respeita backoff
		await db.updateTable('crm_eventos_saida').set({ proxima_tentativa_em: new Date(0) }).execute()
		expect(await entregarRetornosCrm()).toBe(1)
		evento = await db.selectFrom('crm_eventos_saida').selectAll().executeTakeFirstOrThrow()
		expect(evento.tentativas).toBe(2)
		const calls = vi.mocked(fetch).mock.calls
		expect(calls[0][1]?.body).toBe(calls[1][1]?.body)
		expect(calls[0][1]?.headers).toEqual(calls[1][1]?.headers)
	})
	it('preserva ordem por card com fila pendente e workers concorrentes', async () => {
		vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => new Response(null, { status: 503 })))
		const primeiro = await (await editar({ vendedor: 'João' })).json()
		await editar({ atualizado_em: primeiro.card.atualizado_em, vendedor: 'Maria' })
		expect(fetch).toHaveBeenCalledTimes(1) // segundo não ultrapassa o primeiro
		await db.updateTable('crm_eventos_saida').set({ proxima_tentativa_em: new Date(0) }).execute()
		vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => new Response(null, { status: 204 })))
		await Promise.all([entregarRetornosCrm(), entregarRetornosCrm()])
		const nomes = vi.mocked(fetch).mock.calls.map(([, options]) => JSON.parse(options!.body as string).alteracoes.vendedor)
		expect(nomes).toEqual(['João', 'Maria'])
	})
	it('reverte o card se a inserção do evento falhar', async () => {
		await sql`alter table crm_eventos_saida add constraint falha_teste check (card_id <> 'cliente-1')`.execute(db)
		try {
			expect((await editar({ vendedor: 'João' })).status).toBe(500)
			expect((await db.selectFrom('crm_cards').select('vendedor').executeTakeFirstOrThrow()).vendedor).toBe('Ana')
			expect(fetch).not.toHaveBeenCalled()
		} finally { await sql`alter table crm_eventos_saida drop constraint falha_teste`.execute(db) }
	})
	it('cron exige segredo e processa retorno pendente', async () => {
		expect((await cron(new NextRequest('https://site.example/api/cron/crm-retorno', { method: 'POST' }))).status).toBe(401)
		expect((await cron(new NextRequest('https://site.example/api/cron/crm-retorno', { method: 'POST', headers: { Authorization: 'Bearer cron-teste' } }))).status).toBe(200)
	})
})
