/**
 * O código promete tabelas que o banco realmente tem?
 *
 * Opt-in, como os outros testes de integração: só roda com TEST_DATABASE_URL.
 * Contra o banco de produção (leitura pura, um SELECT em pg_tables):
 *   TEST_DATABASE_URL="$DATABASE_URL" npx vitest run src/lib/db/__tests__/schema-drift.integration.test.ts
 *
 * POR QUE ESTE TESTE EXISTE
 *
 * Em 11/08/2026, quatro tabelas estavam declaradas em `Database` e não existiam
 * em produção. `site_settings` desde 06/02, as duas de newsletter desde 27/02:
 * migrations que entraram no repositório e nunca rodaram em banco nenhum. Nada
 * acusou por seis meses, porque as rotas capturavam o erro e devolviam valores
 * padrão — os interruptores do painel simplesmente não funcionavam, e a
 * inscrição na newsletter falharia se alguém tentasse.
 *
 * `db-smoke.test.ts` não pegaria: ele compila SQL contra os TIPOS, sem conexão,
 * e passa perfeitamente descrevendo uma tabela inexistente. Só comparar com o
 * banco real fecha esse buraco.
 */
import { describe, it, expect } from 'vitest'
import { Kysely, PostgresDialect, sql } from 'kysely'
import { Pool } from 'pg'
import { TABELAS_DO_CODIGO, type Database } from '../types'

const TEST_DB = process.env.TEST_DATABASE_URL

describe.skipIf(!TEST_DB)('schema x código — integração', () => {
	async function tabelasDoBanco(): Promise<Set<string>> {
		const db = new Kysely<Database>({
			dialect: new PostgresDialect({ pool: new Pool({ connectionString: TEST_DB, max: 1 }) }),
		})
		try {
			const r = await sql<{ tablename: string }>`
				select tablename from pg_tables where schemaname = 'public'
			`.execute(db)
			return new Set(r.rows.map(l => l.tablename))
		} finally {
			await db.destroy()
		}
	}

	it('toda tabela declarada em Database existe no banco', async () => {
		const noBanco = await tabelasDoBanco()
		const ausentes = TABELAS_DO_CODIGO.filter(t => !noBanco.has(t))

		// A mensagem precisa NOMEAR o que falta: o valor deste teste é encurtar a
		// distância entre "algo não funciona" e "falta rodar esta migration".
		expect(ausentes, `declaradas no código e ausentes do banco: ${ausentes.join(', ') || 'nenhuma'}`)
			.toEqual([])
	})

	it('a lista cobre o que o Database declara', () => {
		// Guarda de sanidade da própria lista. A completude é garantida em tempo
		// de compilação (o bloco `Faltando` em types.ts); aqui só se confere que
		// ninguém a esvaziou — um array vazio faria o teste acima passar sempre.
		expect(TABELAS_DO_CODIGO.length).toBeGreaterThan(25)
		expect(new Set(TABELAS_DO_CODIGO).size).toBe(TABELAS_DO_CODIGO.length) // sem repetidos
	})
})
