import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { sql, type Kysely } from 'kysely'
import type { Database } from '../../types'

/**
 * Deixa o banco de teste pronto para as tabelas de agência.
 *
 * O banco de teste local (fixture de tracking) não tem `admin_users` nem o
 * tipo `admin_role`, que em produção existem desde a migration 005. Cria o
 * mínimo que a migration de agências altera — sem mexer no resto — e aplica
 * a migration. Idempotente: pode rodar em todo `beforeAll`.
 */
export async function prepararBancoAgencias(db: Kysely<Database>): Promise<void> {
	await sql`do $$ begin
		if not exists (select 1 from pg_type where typname = 'admin_role') then
			create type admin_role as enum ('admin', 'gerente', 'owner', 'operador', 'marketing');
		end if;
	end $$`.execute(db)
	await sql`create table if not exists admin_users (
		id uuid primary key,
		email text not null unique,
		name text,
		role admin_role not null default 'gerente',
		is_active boolean not null default true,
		last_login_at timestamptz,
		password_hash text,
		secoes_extras jsonb not null default '{}',
		created_at timestamptz not null default now(),
		updated_at timestamptz not null default now()
	)`.execute(db)
	for (const arquivo of ['20261002_agencias.sql', '20261003_agencias_marcadores.sql']) {
		const migration = readFileSync(resolve(__dirname, '../../../../../supabase/migrations', arquivo), 'utf8')
		await sql.raw(migration).execute(db)
	}
}
