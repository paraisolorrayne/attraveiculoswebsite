/**
 * Registro dos carros publicados contra um Postgres real: o que a ficha de
 * vendido lê (src/lib/veiculos-publicados.ts).
 *
 * Opt-in: sem TEST_DATABASE_URL é pulado.
 */
import { describe, it, expect, beforeAll, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { sql } from 'kysely'
import type { Vehicle } from '@/types'

const TEST_DB = process.env.TEST_DATABASE_URL

const carro = (id: string, extra: Partial<Vehicle> = {}) =>
	({ id, slug: `porsche-911-2019-${id}`, brand: 'Porsche', model: '911', photos: ['a', 'b', 'c', 'd', 'e', 'f', 'g'], ...extra }) as Vehicle

describe.skipIf(!TEST_DB)('veiculos_publicados — SQL real', () => {
	let db: typeof import('../index').db
	let vp: typeof import('@/lib/veiculos-publicados')

	beforeAll(async () => {
		process.env.DATABASE_URL = TEST_DB
		;({ db } = await import('../index'))
		vp = await import('@/lib/veiculos-publicados')
		await sql.raw(readFileSync('supabase/migrations/20261102_veiculos_publicados.sql', 'utf8')).execute(db)
		await db.deleteFrom('veiculos_publicados').execute()
	})

	it('grava a listagem, atualiza na seguinte e guarda só 6 fotos', async () => {
		vi.useFakeTimers({ now: new Date('2026-11-01T10:00:00Z'), toFake: ['Date'] })
		await vp.registrarVeiculosPublicados([carro('950001'), carro('950002')])
		const linhas = await db.selectFrom('veiculos_publicados').selectAll().orderBy('autoconf_id').execute()
		expect(linhas.map(l => l.autoconf_id)).toEqual(['950001', '950002'])
		expect((linhas[0].dados as unknown as Vehicle).photos).toHaveLength(6)

		// Intervalo de 10 min: antes dele, nada muda.
		vi.setSystemTime(new Date('2026-11-01T10:05:00Z'))
		await vp.registrarVeiculosPublicados([carro('950001')])
		expect(await vp.situacaoNoRegistro('950002', new Date('2026-11-01T10:05:00Z'))).toEqual({ tipo: 'no_estoque' })

		// Na listagem seguinte, o 950002 não vem: saiu do estoque.
		vi.setSystemTime(new Date('2026-11-01T10:11:00Z'))
		await vp.registrarVeiculosPublicados([carro('950001', { color: 'Preto' })])
		vi.useRealTimers()

		const vendido = await vp.situacaoNoRegistro('950002', new Date('2026-11-01T10:12:00Z'))
		expect(vendido.tipo).toBe('vendido')
		if (vendido.tipo !== 'vendido') return
		expect(vendido.veiculo.slug).toBe('porsche-911-2019-950002')
		expect(vendido.saiuEm.toISOString()).toBe('2026-11-01T10:00:00.000Z')

		// Quem estava na última listagem não é vendido (falha passageira da AutoConf).
		expect(await vp.situacaoNoRegistro('950001', new Date('2026-11-01T10:12:00Z'))).toEqual({ tipo: 'no_estoque' })
		const atualizado = await db.selectFrom('veiculos_publicados').select('dados').where('autoconf_id', '=', '950001').executeTakeFirstOrThrow()
		expect((atualizado.dados as unknown as Vehicle).color).toBe('Preto')
	})

	it('id que o registro em dia não conhece: desconhecido; com o registro parado há mais de 1 h, não decide', async () => {
		expect(await vp.situacaoNoRegistro('123', new Date('2026-11-01T10:30:00Z'))).toEqual({ tipo: 'desconhecido' })
		expect(await vp.situacaoNoRegistro('abc', new Date('2026-11-01T10:30:00Z'))).toEqual({ tipo: 'desconhecido' })
		expect(await vp.situacaoNoRegistro('123', new Date('2026-11-01T12:00:00Z'))).toEqual({ tipo: 'sem_registro' })
	})

	it('tabela vazia: não decide nada', async () => {
		await db.deleteFrom('veiculos_publicados').execute()
		expect(await vp.situacaoNoRegistro('950002')).toEqual({ tipo: 'sem_registro' })
	})
})
