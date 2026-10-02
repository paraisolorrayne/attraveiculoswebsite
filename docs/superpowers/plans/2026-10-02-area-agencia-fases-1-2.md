# Área da agência — Fases 1 e 2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a base (agências, papel `agencia`, escopo obrigatório nas consultas de Visitantes, ambiente local com dados sintéticos) e a área da agência (cadastro de campanhas, Resumo e Visitantes filtrados, em largura total sem rolagem lateral), rodando local para aprovação antes do deploy.

**Architecture:** As consultas das 11 rotas de `/api/admin/visitors/*` saem para `src/lib/visitors/consultas/*.ts` e recebem um `Escopo` obrigatório. O escopo entra pelo `noPeriodo` de `periodoDaUrl(url, escopo)`, então cada consulta fica restrita sem reescrever o SQL. As rotas atuais passam `ESCOPO_TUDO`; uma rota nova `/api/admin/agencia/[slug]/visitantes/[aba]` resolve o escopo pelo login e despacha para as mesmas funções. Os painéis atuais são reaproveitados por dois contextos React: `VisitantesApiContext` (para onde apontam as chamadas e os links) e `LarguraTotalContext` (tabelas e gráficos sem rolagem lateral).

**Tech Stack:** Next.js 16 (App Router, `params` como Promise), React 19, Kysely + `pg`, Postgres 14 local / 16 VPS, Auth.js v5 (JWT), Tailwind, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-02-area-agencia-design.md`

## Global Constraints

- Agência vem **do login** nas rotas da agência; parâmetro de agência é ignorado para usuário `agencia`.
- Escopo obrigatório: nenhuma função de `src/lib/visitors/consultas/` aceita chamada sem `Escopo`.
- Agência nunca recebe: IP da sessão, perfis identificados (`/api/admin/visitors` raiz), receita em R$, nome/telefone/e-mail de visitante.
- Trava: índice único `(plataforma, id_externo)` e `(plataforma, lower(nome))` em `agencia_campanhas`.
- Área da agência: sem `max-w`; margem 16 px (`px-4`), 24 px (`md:px-6`), 40 px (`2xl:px-10`); `document.documentElement.scrollWidth <= innerWidth` em 360, 768, 1280 e 1920 px.
- Telas atuais do admin não mudam de comportamento (testes de integração existentes seguem verdes com os mesmos números).
- Comentários e textos em português, no estilo do código vizinho; commits terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Git sempre como o dono do repo: `sudo -n -u lorrayneparaiso git …`; arquivos criados como root recebem `chown lorrayneparaiso:staff`.
- Testes de integração rodam **um arquivo por vez** (compartilham o banco): `TEST_DATABASE_URL=postgres://lorrayneparaiso@127.0.0.1:5432/attra_visitors_dev ./node_modules/.bin/vitest run <arquivo>`.
- Nenhum dado de produção é copiado para o ambiente local (só o esquema, com `pg_dump --schema-only`).

## Review Focus

1. **Sessão que casa por ID mas é de outra plataforma** (ex.: `utm_id` do Google igual ao de uma campanha Meta cadastrada) → não pode contar para a agência. Teste em Task 2.
2. **Usuário `agencia` trocando o slug na URL** (página e API) → página redireciona para a dele; API devolve 403. Teste em Task 4 e Task 6.
3. **Detalhe de uma sessão que não é da agência, aberto pela agência** (link copiado) → 404, nunca os dados. Teste em Task 3c.
4. **Cadastro com ID já de outra agência, inclusive com espaços e caixa diferente** → recusado com a mensagem neutra. Teste em Task 7.
5. **Campanha cadastrada sem ID e com nome que difere só em caixa/espaço do `utm_campaign`** → casa (nome comparado com `lower(btrim())`). Teste em Task 2.

---

## File Structure

**Fase 1 — base**
- `supabase/migrations/20261002_agencias.sql` — papel, tabelas, índices, Media House.
- `src/lib/db/types.ts` — `AgenciasTable`, `AgenciaCampanhasTable`, `admin_users.agencia_id`.
- `src/lib/visitors/escopo.ts` — `Escopo`, `ESCOPO_TUDO`, `naAgencia`, `sessaoNaAgencia`, `plataformaDaSessaoSql`, `casaCampanhaSql`.
- `src/lib/visitors/sql-atribuicao.ts` — `periodoDaUrl(url, escopo)`.
- `src/lib/visitors/consultas/{origens,entradas,campanha,campanhas,sessoes,jornadas,sessao-detalhe,metrics,comportamento,veiculos,termos}.ts` — corpo das rotas, com escopo.
- `src/app/api/admin/visitors/*/route.ts` — viram guard + `consultarX(url, ESCOPO_TUDO)`.
- `src/lib/auth/roles.ts`, `src/lib/admin-auth-supabase.ts`, `src/lib/auth/guard-agencia.ts` — papel e acesso.
- `src/app/admin/page.tsx`, `src/app/api/admin/users/route.ts`, `src/app/api/admin/users/[id]/route.ts`, `src/app/admin/usuarios/usuarios-admin.tsx` — papel na tela de Usuários.
- `scripts/local/montar-banco-local.sh`, `scripts/local/seed-agencia.ts`, `.env.local.example`, `docs/AMBIENTE_LOCAL.md` — ambiente local.

**Fase 2 — área da agência**
- `src/app/api/admin/agencia/[slug]/visitantes/[aba]/route.ts` — despacho escopado.
- `src/lib/visitors/consultas/resumo-agencia.ts` — números do Resumo.
- `src/app/api/admin/agencia/[slug]/campanhas/route.ts`, `.../campanhas/[id]/route.ts`, `.../campanhas/detectadas/route.ts`; `src/lib/agencias/campanhas.ts` — cadastro.
- `src/app/admin/visitors/visitantes-api.tsx` — `VisitantesApiContext`.
- `src/app/admin/visitors/largura-total.tsx` — `LarguraTotalContext` + `prioridadeDaColuna`.
- `src/app/admin/visitors/visitors-tabela.tsx` — modo largura total (prioridade, expansão, cartões).
- `src/app/admin/agencia/[slug]/{layout,page}.tsx`, `agencia-shell.tsx`, `filtros-agencia.tsx`, `resumo-agencia.tsx`, `visitantes/[aba]/page.tsx`, `campanha/[chave]/page.tsx`, `sessoes/[id]/page.tsx`, `campanhas/page.tsx`, `campanhas/campanhas-agencia.tsx`.
- `src/lib/admin-sections.tsx`, `src/app/admin/page.tsx` — card "Marketing Media House".

---

## FASE 1 — BASE

### Task 1: Migration e tipos

**Files:**
- Create: `supabase/migrations/20261002_agencias.sql`
- Modify: `src/lib/db/types.ts` (AdminUsersTable ~l.570, Database ~l.591)
- Test: `src/lib/db/__tests__/agencias.integration.test.ts`

**Interfaces:**
- Produces: tabelas `agencias(id, nome, slug, prefixos, utm_medium_marca, criado_em)` e `agencia_campanhas(id, agencia_id, plataforma, nome, id_externo, destino, mensagem_prefixo, inicio, fim, criado_por, criado_em, atualizado_por, atualizado_em)`; `admin_users.agencia_id`; tipos Kysely `AgenciasTable`, `AgenciaCampanhasTable`.

- [ ] **Step 1: Escrever a migration**

```sql
-- Área da agência (spec 2026-10-02-area-agencia-design.md).
--
-- Agências (Media House primeiro, EB depois) cadastram as próprias campanhas e
-- veem Visitantes e um mini CRM filtrados por elas. A trava entre agências é
-- de banco: o mesmo ID (ou o mesmo nome na mesma plataforma) não pertence a
-- duas — índice único, que vale mesmo com dois cadastros simultâneos.
--
-- Idempotente.

ALTER TYPE admin_role ADD VALUE IF NOT EXISTS 'agencia';

CREATE TABLE IF NOT EXISTS agencias (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome             text NOT NULL,
  slug             text NOT NULL UNIQUE,
  -- Só para SUGERIR campanhas ainda não cadastradas ("detectadas"). Não decide
  -- a qual agência uma visita pertence: quem decide é o cadastro.
  prefixos         text[] NOT NULL DEFAULT '{}',
  utm_medium_marca text[] NOT NULL DEFAULT '{}',
  criado_em        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agencia_campanhas (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agencia_id       uuid NOT NULL REFERENCES agencias(id),
  plataforma       text NOT NULL CHECK (plataforma IN ('google', 'meta', 'webmotors')),
  nome             text NOT NULL CHECK (btrim(nome) <> ''),
  id_externo       text CHECK (id_externo IS NULL OR btrim(id_externo) <> ''),
  destino          text NOT NULL DEFAULT 'site' CHECK (destino IN ('site', 'whatsapp')),
  mensagem_prefixo text,
  inicio           date NOT NULL DEFAULT current_date,
  fim              date,
  criado_por       uuid,
  criado_em        timestamptz NOT NULL DEFAULT now(),
  atualizado_por   uuid,
  atualizado_em    timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS agencia_campanhas_id_externo_unico
  ON agencia_campanhas (plataforma, btrim(id_externo)) WHERE id_externo IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS agencia_campanhas_nome_unico
  ON agencia_campanhas (plataforma, lower(btrim(nome)));
CREATE INDEX IF NOT EXISTS agencia_campanhas_agencia_idx ON agencia_campanhas (agencia_id);

ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS agencia_id uuid REFERENCES agencias(id);

INSERT INTO agencias (nome, slug, prefixos, utm_medium_marca)
VALUES ('Media House', 'media-house', '{va-,[va],%5bva%5d}', '{mediahouse}')
ON CONFLICT (slug) DO NOTHING;
```

O `CHECK` "papel agencia exige agencia_id" fica na aplicação (Task 4): `ALTER TYPE … ADD VALUE` não pode ser usado na mesma transação que o cria, e uma constraint citando `'agencia'` no mesmo arquivo falharia.

- [ ] **Step 2: Tipos Kysely** — em `src/lib/db/types.ts`, adicionar antes de `export interface Database`:

```ts
export type PlataformaCampanha = 'google' | 'meta' | 'webmotors'

export interface AgenciasTable {
  id: Generated<string>
  nome: string
  slug: string
  prefixos: Generated<string[]>
  utm_medium_marca: Generated<string[]>
  criado_em: Generated<Timestamp>
}

export interface AgenciaCampanhasTable {
  id: Generated<string>
  agencia_id: string
  plataforma: PlataformaCampanha
  nome: string
  id_externo: string | null
  destino: Generated<'site' | 'whatsapp'>
  mensagem_prefixo: string | null
  inicio: Generated<string>
  fim: string | null
  criado_por: string | null
  criado_em: Generated<Timestamp>
  atualizado_por: string | null
  atualizado_em: Generated<Timestamp>
}
```

Em `AdminUsersTable`, depois de `secoes_extras`: `agencia_id: string | null`. Em `Database`: `agencias: AgenciasTable` e `agencia_campanhas: AgenciaCampanhasTable`.

- [ ] **Step 3: Teste de integração da migration** (`src/lib/db/__tests__/agencias.integration.test.ts`)

```ts
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect, beforeAll } from 'vitest'
import { sql } from 'kysely'

const TEST_DB = process.env.TEST_DATABASE_URL

describe.skipIf(!TEST_DB)('migration 20261002_agencias', () => {
	let db: typeof import('../index').db
	beforeAll(async () => {
		process.env.DATABASE_URL = TEST_DB
		;({ db } = await import('../index'))
		const m = readFileSync(resolve(__dirname, '../../../../supabase/migrations/20261002_agencias.sql'), 'utf8')
		await sql.raw(m).execute(db)
		await sql.raw(m).execute(db) // idempotente
		await sql`delete from agencia_campanhas`.execute(db)
		await sql`insert into agencias (nome, slug) values ('EB', 'eb') on conflict (slug) do nothing`.execute(db)
	})

	const idDe = async (slug: string) =>
		(await db.selectFrom('agencias').select('id').where('slug', '=', slug).executeTakeFirstOrThrow()).id

	it('cria a Media House uma vez só', async () => {
		const n = await db.selectFrom('agencias').select(db.fn.countAll<string>().as('n')).where('slug', '=', 'media-house').executeTakeFirstOrThrow()
		expect(Number(n.n)).toBe(1)
	})

	it('trava: o mesmo ID na mesma plataforma não vai para duas agências, nem com espaço', async () => {
		const mh = await idDe('media-house')
		const eb = await idDe('eb')
		await db.insertInto('agencia_campanhas').values({ agencia_id: mh, plataforma: 'google', nome: 'va-pmax', id_externo: '24295047322' }).execute()
		await expect(
			db.insertInto('agencia_campanhas').values({ agencia_id: eb, plataforma: 'google', nome: 'outra', id_externo: ' 24295047322 ' }).execute(),
		).rejects.toThrow(/unico|unique/i)
	})

	it('trava: o mesmo nome na mesma plataforma, ignorando caixa', async () => {
		const eb = await idDe('eb')
		await expect(
			db.insertInto('agencia_campanhas').values({ agencia_id: eb, plataforma: 'google', nome: 'VA-PMAX' }).execute(),
		).rejects.toThrow(/unico|unique/i)
		// Mesmo nome em OUTRA plataforma é outra campanha.
		await db.insertInto('agencia_campanhas').values({ agencia_id: eb, plataforma: 'meta', nome: 'va-pmax' }).execute()
	})
})
```

`db.fn.countAll` não funciona através do proxy do `db` (lição da Task 3 de 02/10): no primeiro `it`, usar `sql<{ n: string }>\`select count(*) n from agencias where slug = 'media-house'\`` em vez dele.

- [ ] **Step 4: Rodar e ver falhar** (tabela inexistente antes do Step 1 aplicado pelo próprio teste — rodar com a migration vazia confirma o vermelho). Depois rodar com a migration: `TEST_DATABASE_URL=… ./node_modules/.bin/vitest run src/lib/db/__tests__/agencias.integration.test.ts` → PASS (3).
- [ ] **Step 5: `npx tsc --noEmit -p .` sem erro novo; commit** `Agencias: tabelas, papel e trava de campanha unica`.

---

### Task 2: Escopo (`escopo.ts`) e `periodoDaUrl(url, escopo)`

**Files:**
- Create: `src/lib/visitors/escopo.ts`, `src/lib/visitors/saneado.ts`
- Modify: `src/lib/visitors/sql-atribuicao.ts` (move `saneado`; `periodoDaUrl` l.58-66)
- Test: `src/lib/db/__tests__/escopo-agencia.integration.test.ts`

**Interfaces:**
- Consumes: tabelas da Task 1.
- Produces:
  - `type Escopo = { tipo: 'tudo' } | { tipo: 'agencia'; agenciaId: string; plataforma?: PlataformaCampanha | null; campanhaIds?: string[] | null }`
  - `const ESCOPO_TUDO: Escopo`
  - `naAgencia(escopo: Escopo): RawBuilder<boolean>` — condição sobre o alias `s` (`visitor_sessions`); `sql\`true\`` para `tudo`.
  - `sessaoNaAgencia(escopo: Escopo, colunaSessao: RawBuilder<unknown>): RawBuilder<boolean>` — para consultas cujo alias principal não é `s`.
  - `plataformaDaSessaoSql: RawBuilder<string | null>` — sobre `s`.
  - `periodoDaUrl(url: string, escopo: Escopo = ESCOPO_TUDO): Periodo` — `noPeriodo` já inclui `naAgencia(escopo)`.

- [ ] **Step 1: Teste de integração (vermelho)** — semeia duas agências e sessões cobrindo: ID Google da MH; nome Meta da MH com caixa/espaço diferentes; ID igual ao da MH mas com `fbclid` (plataforma Meta, a campanha é Google) → **não** conta; sessão orgânica; sessão de campanha da EB; filtro de `plataforma` e de `campanhaIds`.

```ts
import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { sql } from 'kysely'

const TEST_DB = process.env.TEST_DATABASE_URL

describe.skipIf(!TEST_DB)('escopo de agência — SQL real', () => {
	let db: typeof import('../index').db
	let esc: typeof import('@/lib/visitors/escopo')
	let mh: string, eb: string, cPmax: string, cMeta: string

	beforeAll(async () => {
		process.env.DATABASE_URL = TEST_DB
		;({ db } = await import('../index'))
		esc = await import('@/lib/visitors/escopo')
		const m = readFileSync(resolve(__dirname, '../../../../supabase/migrations/20261002_agencias.sql'), 'utf8')
		await sql.raw(m).execute(db)
		await sql`delete from agencia_campanhas`.execute(db)
		await db.deleteFrom('visitor_fingerprints').execute()
		await sql`insert into agencias (nome, slug) values ('EB', 'eb') on conflict (slug) do nothing`.execute(db)
		const id = async (slug: string) => (await db.selectFrom('agencias').select('id').where('slug', '=', slug).executeTakeFirstOrThrow()).id
		mh = await id('media-house'); eb = await id('eb')
		const camp = async (agencia_id: string, plataforma: 'google' | 'meta', nome: string, id_externo: string | null) =>
			(await db.insertInto('agencia_campanhas').values({ agencia_id, plataforma, nome, id_externo }).returning('id').executeTakeFirstOrThrow()).id
		cPmax = await camp(mh, 'google', 'va-pmax-nucleo', '24295047322')
		cMeta = await camp(mh, 'meta', '[VA][MediaHouse][Leads]', null)
		await camp(eb, 'meta', '[EB] [SITE] Visitas ao site', '120240538111140043')

		const fp = (await db.insertInto('visitor_fingerprints').values({ visitor_id: 'v-esc', confidence_score: 0.9 }).returning('id').executeTakeFirstOrThrow()).id
		const s = (session_id: string, extra: Record<string, unknown>) =>
			db.insertInto('visitor_sessions').values({ fingerprint_id: fp, session_id, started_at: new Date(), last_activity_at: new Date(), ...extra }).execute()
		await s('mh-google-id', { utm_source: 'google', utm_medium: 'cpc', utm_id: '24295047322', gclid: 'g' })
		await s('mh-meta-nome', { utm_source: 'facebook', utm_campaign: '  [va][mediahouse][LEADS] ', fbclid: 'f' })
		await s('id-mh-mas-meta', { utm_source: 'facebook', utm_id: '24295047322', fbclid: 'f' })
		await s('organico', { referrer_domain: 'www.google.com' })
		await s('eb', { utm_source: 'facebook', utm_id: '120240538111140043', fbclid: 'f' })
	})

	const doEscopo = async (escopo: import('@/lib/visitors/escopo').Escopo) =>
		(await sql<{ session_id: string }>`select s.session_id from visitor_sessions s where ${esc.naAgencia(escopo)} order by 1`.execute(db)).rows.map(r => r.session_id)

	it('tudo: todas as sessões', async () => {
		expect(await doEscopo(esc.ESCOPO_TUDO)).toHaveLength(5)
	})

	it('agência: casa por ID e por nome (caixa/espaço), respeitando a plataforma', async () => {
		expect(await doEscopo({ tipo: 'agencia', agenciaId: mh })).toEqual(['mh-google-id', 'mh-meta-nome'])
	})

	it('nunca vê a outra agência nem o orgânico', async () => {
		expect(await doEscopo({ tipo: 'agencia', agenciaId: eb })).toEqual(['eb'])
	})

	it('filtros de plataforma e de campanha', async () => {
		expect(await doEscopo({ tipo: 'agencia', agenciaId: mh, plataforma: 'meta' })).toEqual(['mh-meta-nome'])
		expect(await doEscopo({ tipo: 'agencia', agenciaId: mh, campanhaIds: [cPmax] })).toEqual(['mh-google-id'])
		expect(await doEscopo({ tipo: 'agencia', agenciaId: mh, campanhaIds: [cMeta] })).toEqual(['mh-meta-nome'])
	})

	it('periodoDaUrl leva o escopo no noPeriodo', async () => {
		const { periodoDaUrl } = await import('@/lib/visitors/sql-atribuicao')
		const { noPeriodo } = periodoDaUrl('http://x/?dias=30', { tipo: 'agencia', agenciaId: eb })
		const r = await sql<{ n: string }>`select count(*) n from visitor_sessions s where ${noPeriodo}`.execute(db)
		expect(Number(r.rows[0].n)).toBe(1)
	})
})
```

- [ ] **Step 2: Rodar → FAIL** (módulo `escopo` inexistente).
- [ ] **Step 3: Implementar `src/lib/visitors/escopo.ts`**

```ts
/**
 * Escopo das consultas de Visitantes: "tudo" (time da Attra) ou "agência X".
 *
 * Nasceu com a área da agência (spec 2026-10-02): a Media House vê Visitantes
 * filtrado para as campanhas DELA. O escopo é parâmetro OBRIGATÓRIO das
 * funções de `consultas/` — esquecer vira erro de compilação, não vazamento de
 * dado da EB ou do tráfego orgânico da loja. `s` é sempre `visitor_sessions`.
 */
import { sql, type RawBuilder } from 'kysely'
import type { PlataformaCampanha } from '@/lib/db/types'
import { saneado } from './saneado'

export type Escopo =
	| { tipo: 'tudo' }
	| { tipo: 'agencia'; agenciaId: string; plataforma?: PlataformaCampanha | null; campanhaIds?: string[] | null }

export const ESCOPO_TUDO: Escopo = { tipo: 'tudo' }

/**
 * Plataforma da sessão pelos sinais que ela já traz. Sem sinal → null, e aí a
 * sessão casa só por ID ou nome. Existe para que um `utm_id` igual em duas
 * plataformas (IDs de Google e Meta são números soltos) não some a visita de
 * uma na campanha da outra.
 */
export const plataformaDaSessaoSql = sql<PlataformaCampanha | null>`(case
	when lower(coalesce(s.utm_source, '')) like '%webmotors%' then 'webmotors'
	when ${saneado(sql`s.gclid`)} is not null or ${saneado(sql`s.wbraid`)} is not null or ${saneado(sql`s.gbraid`)} is not null
	  or lower(coalesce(s.utm_source, '')) in ('google', 'google-ads', 'googleads', 'adwords', 'youtube') then 'google'
	when ${saneado(sql`s.fbclid`)} is not null
	  or lower(coalesce(s.utm_source, '')) in ('facebook', 'instagram', 'meta', 'fb', 'ig') then 'meta'
	else null
end)`

/** A sessão `s` é da campanha cadastrada `ac`? (ID, ou nome sem caixa/espaço, na mesma plataforma.) */
export const casaCampanhaSql = sql<boolean>`(
	(${plataformaDaSessaoSql} is null or ac.plataforma = ${plataformaDaSessaoSql})
	and (
		(ac.id_externo is not null and btrim(s.utm_id) = btrim(ac.id_externo))
		or lower(btrim(${saneado(sql`s.utm_campaign`)})) = lower(btrim(ac.nome))
	)
)`

export function naAgencia(escopo: Escopo): RawBuilder<boolean> {
	if (escopo.tipo === 'tudo') return sql<boolean>`true`
	const plataforma = escopo.plataforma ?? null
	const campanhas = escopo.campanhaIds && escopo.campanhaIds.length > 0 ? escopo.campanhaIds : null
	return sql<boolean>`exists (
		select 1 from agencia_campanhas ac
		where ac.agencia_id = ${escopo.agenciaId}::uuid
		  and (${plataforma}::text is null or ac.plataforma = ${plataforma}::text)
		  and (${campanhas}::uuid[] is null or ac.id = any(${campanhas}::uuid[]))
		  and ${casaCampanhaSql}
	)`
}

/** Para consultas que partem de page views (`v.session_id`) ou cliques. */
export function sessaoNaAgencia(escopo: Escopo, colunaSessao: RawBuilder<unknown>): RawBuilder<boolean> {
	if (escopo.tipo === 'tudo') return sql<boolean>`true`
	return sql<boolean>`${colunaSessao} in (select s.id from visitor_sessions s where ${naAgencia(escopo)})`
}
```

Antes, mover `saneado` (e a constante `VAZIOS_SQL` que ele usa) de `sql-atribuicao.ts` para `src/lib/visitors/saneado.ts`, e reexportar em `sql-atribuicao.ts` (`export { saneado } from './saneado'`). Motivo: `escopo.ts` chama `saneado(...)` no topo do módulo (em `plataformaDaSessaoSql`) e `sql-atribuicao.ts` passa a importar `escopo.ts`; com `saneado` dentro de `sql-atribuicao.ts`, a ordem de carga dos dois módulos decide se ele já existe ou não ("saneado is not defined"). `escopo.ts` importa de `./saneado`, nunca de `./sql-atribuicao`.

Então `periodoDaUrl` passa a aceitar o escopo:

```ts
export function periodoDaUrl(url: string, escopo: Escopo = ESCOPO_TUDO): Periodo {
	const diasBruto = Number(new URL(url).searchParams.get('dias'))
	const dias =
		Number.isFinite(diasBruto) && diasBruto >= 0 && diasBruto <= DIAS_MAX
			? Math.floor(diasBruto)
			: DIAS_PADRAO
	const desde = dias > 0 ? new Date(Date.now() - dias * 24 * 60 * 60 * 1000) : null
	const periodo = desde ? sql`s.started_at >= ${desde}` : sql`true`
	// O escopo vai junto do período: toda consulta que já filtrava o período
	// fica restrita à agência sem reescrever o SQL dela.
	const noPeriodo = sql`(${periodo} and ${naAgencia(escopo)})`
	return { dias, desde, noPeriodo }
}
```

- [ ] **Step 4: Rodar o teste → PASS (5)**; rodar também `visitors-origens-routes.integration.test.ts` (números iguais) → PASS.
- [ ] **Step 5: Commit** `Visitantes: escopo de agencia nas consultas (periodoDaUrl leva o escopo)`.

---

### Task 3a: Consultas de Origens, Entradas, Campanha e Campanhas saem das rotas

**Files:**
- Create: `src/lib/visitors/consultas/origens.ts`, `entradas.ts`, `campanha.ts`, `campanhas.ts`
- Modify: `src/app/api/admin/visitors/{origens,entradas,campanha,campanhas}/route.ts`, `src/lib/visitors/campanhas-score-db.ts`
- Test: os existentes em `visitors-origens-routes.integration.test.ts` + 1 novo de escopo

**Interfaces:**
- Consumes: `Escopo`, `periodoDaUrl(url, escopo)`.
- Produces: `consultarOrigens(url: string, escopo: Escopo)` (tipo de retorno inferido; os painéis já têm a interface da resposta), `consultarEntradas(url, escopo)`, `consultarCampanha(url, escopo): Promise<RespostaCampanha | { erro: 400 }>`, `consultarCampanhas(url, escopo)`; `carregarCampanhasComScore(noPeriodo)` inalterado (o escopo já vem dentro do `noPeriodo`).

**Receita de extração (vale para todas as Tasks 3a–3c):**
1. Criar `src/lib/visitors/consultas/<nome>.ts` com `export async function consultar<Nome>(url: string, escopo: Escopo)` contendo **o corpo do `try` do GET atual, verbatim**, exceto:
   - `periodoDaUrl(request.url)` → `periodoDaUrl(url, escopo)`;
   - `new URL(request.url)` → `new URL(url)`;
   - `return NextResponse.json(X)` → `return X`; respostas de erro de validação viram `return { erro: 400 as const, mensagem: '…' }`.
   - imports do arquivo de rota que a consulta usa vão junto.
2. A rota vira:

```ts
export async function GET(request: NextRequest) {
	try {
		const admin = await adminComAcessoA('/admin/visitors')
		if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
		const r = await consultarEntradas(request.url, ESCOPO_TUDO)
		return NextResponse.json(r)
	} catch (error) {
		console.error('[Visitors Entradas API] Error:', error)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}
```

   (com `'erro' in r` → `NextResponse.json({ error: r.mensagem }, { status: r.erro })` onde houver validação).
3. Origens: o gráfico de tendência usa `s.started_at >= ${desdeTendencia}` (não o `noPeriodo`): trocar por `s.started_at >= ${desdeTendencia} and ${naAgencia(escopo)}`.
4. Campanha: as consultas usam `onde = ${noPeriodo} and ${daCampanha}` — já escopadas pelo `noPeriodo`; a subconsulta `pc` (cliques) não precisa de escopo porque é juntada a `s`.

- [ ] **Step 1: Teste novo (vermelho)** em `visitors-origens-routes.integration.test.ts`: importar `consultarOrigens`/`consultarEntradas`/`consultarCampanhas` e, com uma agência sem nenhuma campanha cadastrada, esperar `total_sessoes === 0` e `campanhas === []`; com a campanha `porsche 911` (Meta) cadastrada para ela, esperar `total_sessoes === 2`.

```ts
it('consultas com escopo de agência só veem as campanhas cadastradas dela', async () => {
	const { consultarOrigens } = await import('@/lib/visitors/consultas/origens')
	const { consultarCampanhas } = await import('@/lib/visitors/consultas/campanhas')
	const m = readFileSync(resolve(__dirname, '../../../../supabase/migrations/20261002_agencias.sql'), 'utf8')
	await sql.raw(m).execute(db)
	await sql`delete from agencia_campanhas`.execute(db)
	const ag = (await db.selectFrom('agencias').select('id').where('slug', '=', 'media-house').executeTakeFirstOrThrow()).id
	const escopo = { tipo: 'agencia' as const, agenciaId: ag }
	expect((await consultarOrigens('http://x/?dias=30', escopo)).total_sessoes).toBe(0)
	await db.insertInto('agencia_campanhas').values({ agencia_id: ag, plataforma: 'meta', nome: 'Porsche 911' }).execute()
	expect((await consultarOrigens('http://x/?dias=30', escopo)).total_sessoes).toBe(2)
	const c = await consultarCampanhas('http://x/?dias=30', escopo)
	expect(c.campanhas.map((l: { chave: string }) => l.chave)).toEqual(['porsche 911'])
	await sql`delete from agencia_campanhas`.execute(db)
})
```

(Adicionar `import { readFileSync } from 'node:fs'` e `import { resolve } from 'node:path'` no topo do arquivo de teste.)

- [ ] **Step 2: Rodar → FAIL** (módulos inexistentes).
- [ ] **Step 3: Extrair as quatro consultas** pela receita; rotas viram o modelo acima.
- [ ] **Step 4: Rodar `visitors-origens-routes.integration.test.ts` → PASS (8)**; `npx tsc` sem erro novo.
- [ ] **Step 5: Commit** `Visitantes: consultas de origens, entradas e campanha com escopo`.

---

### Task 3b: Sessões, Jornadas e detalhe da sessão

**Files:**
- Create: `src/lib/visitors/consultas/sessoes.ts`, `jornadas.ts`, `sessao-detalhe.ts`
- Modify: `src/app/api/admin/visitors/{sessoes,jornadas,session-explore}/route.ts`
- Test: `visitors-origens-routes.integration.test.ts` (sessões/jornadas existentes) + novo `sessao-detalhe-escopo.integration.test.ts`

**Interfaces:**
- Produces: `consultarSessoes(url, escopo)`, `consultarJornadas(url, escopo)`, `consultarSessaoDetalhe(url, escopo): Promise<RespostaSessao | { erro: 400 | 404 }>`.

Sessões e Jornadas: receita da Task 3a (usam `noPeriodo`).

Detalhe (`session-explore`) recebe três regras **só quando `escopo.tipo === 'agencia'`**:
1. A sessão pedida precisa satisfazer `naAgencia(escopo)`; senão `{ erro: 404 }`.
2. `ip_address` não sai (remover a chave do objeto de resposta, l.244 da rota atual).
3. Nas "outras visitas desta pessoa", sessões que **não** satisfazem `naAgencia(escopo)` saem com os campos de campanha (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `utm_id`, `gclid`, `fbclid`, `referrer_domain`, `landing_page`) nulos e `origem_anonima: rotuloCanal(classificarCanal(...))` calculado ANTES de anular.

Implementação: depois de montar a lista de outras sessões, consultar quais ids estão no escopo:

```ts
const naAg = escopo.tipo === 'agencia'
	? new Set((await sql<{ id: string }>`select s.id from visitor_sessions s where s.id = any(${ids}::uuid[]) and ${naAgencia(escopo)}`.execute(db)).rows.map(r => r.id))
	: null
```

- [ ] **Step 1: Teste (vermelho)** `src/lib/db/__tests__/sessao-detalhe-escopo.integration.test.ts`: uma pessoa com duas sessões (uma da campanha da MH, outra de uma campanha da EB); como MH: detalhe da sessão MH sem `ip_address`, e a outra sessão com `utm_campaign === null` e `origem_anonima` preenchido; detalhe da sessão EB → `{ erro: 404 }`; como `ESCOPO_TUDO`: tudo intacto, inclusive `ip_address`.
- [ ] **Step 2: Rodar → FAIL.**
- [ ] **Step 3: Extrair as três consultas e aplicar as regras.** Ao implementar, ler a forma exata da resposta em `session-explore/route.ts` (l.180-270) para anular as chaves certas.
- [ ] **Step 4: Rodar os dois arquivos de teste → PASS.**
- [ ] **Step 5: Commit** `Visitantes: sessoes e detalhe com escopo; agencia nao ve IP nem campanha alheia`.

---

### Task 3c: Visão geral (metrics), Comportamento, Veículos e Termos

**Files:**
- Create: `src/lib/visitors/consultas/{metrics,comportamento,veiculos,termos}.ts`
- Modify: as quatro rotas
- Test: `admin-metrics-route.integration.test.ts` (existente) + caso de escopo nele

**Interfaces:**
- Produces: `consultarMetrics(url, escopo)`, `consultarComportamento(url, escopo)`, `consultarVeiculos(url, escopo)`, `consultarTermos(url, escopo)`.

Diferenças em relação à receita:
- **Comportamento** e **Veículos** montam o próprio período sobre page views (`v.viewed_at >= …`): o `noPeriodo` local vira `sql\`${desde ? sql\`v.viewed_at >= ${desde}\` : sql\`true\`} and ${sessaoNaAgencia(escopo, sql\`v.session_id\`)}\``. Em Veículos, a consulta de cliques (`w.clicked_at >= …`, l.150) ganha `and ${sessaoNaAgencia(escopo, sql\`w.session_db_id\`)}`.
- **Termos** usa `started_at >= now() - …` direto em `visitor_sessions` sem alias: acrescentar o alias `s` à tabela nessa consulta (`from visitor_sessions s`) e `and ${naAgencia(escopo)}`.
- **Metrics:** todas as consultas já usam `noPeriodo` com alias `s` — receita pura.

- [ ] **Step 1: Teste (vermelho)** em `admin-metrics-route.integration.test.ts`: `consultarMetrics('http://x/?dias=30', { tipo: 'agencia', agenciaId: <agência sem campanha> })` → total de sessões 0.
- [ ] **Step 2: Rodar → FAIL.**
- [ ] **Step 3: Extrair as quatro consultas.**
- [ ] **Step 4: Rodar `admin-metrics-route.integration.test.ts` e `tracking-routes.integration.test.ts` → PASS; suíte inteira `npx vitest run` → PASS.**
- [ ] **Step 5: Commit** `Visitantes: metrics, comportamento, veiculos e termos com escopo`.

---

### Task 4: Papel `agencia`, acesso e tela de Usuários

**Files:**
- Modify: `src/lib/auth/roles.ts`, `src/lib/admin-auth-supabase.ts`, `src/app/admin/page.tsx`, `src/app/api/admin/users/route.ts`, `src/app/api/admin/users/[id]/route.ts`, `src/app/admin/usuarios/usuarios-admin.tsx`
- Create: `src/lib/auth/guard-agencia.ts`
- Test: `src/lib/__tests__/roles-permissoes.test.ts` (existente, casos novos), `src/lib/__tests__/guard-agencia.test.ts`

**Interfaces:**
- Produces:
  - `AdminRole` inclui `'agencia'`; `ROLE_LABELS.agencia = 'Agência'`; `ROUTE_ACCESS.agencia = ['/admin/agencia']`; `ROUTE_ACCESS.operador` ganha `'/admin/agencia'`.
  - `AdminUser.agencia: { id: string; slug: string; nome: string } | null`.
  - `podeVerAgencia(admin: { role: AdminRole; agencia: { id: string } | null; secoes: SecoesExtras }, agenciaId: string): boolean` (pura).
  - `acessoAgencia(slug: string): Promise<{ ok: true; admin: AdminUser; agencia: { id: string; slug: string; nome: string } } | { ok: false; status: 401 | 403 | 404 }>`.

- [ ] **Step 1: Testes (vermelho)**

`roles-permissoes.test.ts` — acrescentar:

```ts
it('agência só acessa a própria área', () => {
	expect(canAccessRoute('agencia', '/admin/agencia/media-house')).toBe(true)
	expect(canAccessRoute('agencia', '/admin/visitors')).toBe(false)
	expect(canAccessRoute('agencia', '/admin/crm')).toBe(false)
	expect(canAccessRoute('marketing', '/admin/agencia/media-house')).toBe(false)
	expect(canAccessRoute('operador', '/admin/agencia/media-house')).toBe(true)
	expect(canAccessRoute('owner', '/admin/agencia/media-house')).toBe(true)
})
```

`guard-agencia.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { podeVerAgencia } from '@/lib/auth/guard-agencia'

const MH = 'id-mh'
describe('podeVerAgencia', () => {
	it('usuário de agência vê só a dele', () => {
		expect(podeVerAgencia({ role: 'agencia', agencia: { id: MH }, secoes: {} }, MH)).toBe(true)
		expect(podeVerAgencia({ role: 'agencia', agencia: { id: MH }, secoes: {} }, 'id-eb')).toBe(false)
		expect(podeVerAgencia({ role: 'agencia', agencia: null, secoes: {} }, MH)).toBe(false)
	})
	it('exceção de seção não vale para o papel agência', () => {
		expect(podeVerAgencia({ role: 'agencia', agencia: { id: MH }, secoes: { '/admin/agencia': true } }, 'id-eb')).toBe(false)
	})
	it('time da Attra vê qualquer agência; marketing não', () => {
		expect(podeVerAgencia({ role: 'admin', agencia: null, secoes: {} }, 'id-eb')).toBe(true)
		expect(podeVerAgencia({ role: 'operador', agencia: null, secoes: {} }, MH)).toBe(true)
		expect(podeVerAgencia({ role: 'marketing', agencia: null, secoes: {} }, MH)).toBe(false)
	})
})
```

- [ ] **Step 2: Rodar → FAIL.**
- [ ] **Step 3: Implementar**

`roles.ts`: `ADMIN_ROLES = ['admin', 'owner', 'operador', 'marketing', 'gerente', 'agencia'] as const`; `ROLE_LABELS.agencia = 'Agência'`; `ROUTE_ACCESS.agencia = ['/admin/agencia']`; `'/admin/agencia'` na lista do `operador`. Em `canAccessRoute`, logo após o `ehAreaSoAdmin`: `if (role === 'agencia') return pathname.startsWith('/admin/agencia')` (exceções de seção não valem para agência).

`guard-agencia.ts`:

```ts
import { db } from '@/lib/db'
import { getCurrentAdmin, type AdminUser } from '@/lib/admin-auth-supabase'
import { canAccessRoute, isAdminRole, type AdminRole, type SecoesExtras } from './roles'

/**
 * Quem pode ver a área de uma agência. Usuário `agencia` vê SÓ a dele — o
 * slug da URL nunca decide por ele; time da Attra segue a matriz de papéis.
 */
export function podeVerAgencia(
	admin: { role: AdminRole; agencia: { id: string } | null; secoes: SecoesExtras },
	agenciaId: string,
): boolean {
	if (admin.role === 'agencia') return admin.agencia?.id === agenciaId
	return canAccessRoute(admin.role, '/admin/agencia', admin.secoes)
}

export async function acessoAgencia(
	slug: string,
): Promise<
	| { ok: true; admin: AdminUser; agencia: { id: string; slug: string; nome: string } }
	| { ok: false; status: 401 | 403 | 404 }
> {
	const admin = await getCurrentAdmin()
	if (!admin) return { ok: false, status: 401 }
	const agencia = await db.selectFrom('agencias').select(['id', 'slug', 'nome']).where('slug', '=', slug).executeTakeFirst()
	if (!agencia) return { ok: false, status: 404 }
	const role: AdminRole = isAdminRole(admin.role) ? admin.role : 'gerente'
	if (!podeVerAgencia({ role, agencia: admin.agencia, secoes: admin.secoes }, agencia.id)) return { ok: false, status: 403 }
	return { ok: true, admin, agencia }
}
```

`admin-auth-supabase.ts`: `AdminUser` ganha `agencia: { id: string; slug: string; nome: string } | null`; em `getCurrentAdmin`, depois de ler `row`: `const agencia = row.agencia_id ? (await db.selectFrom('agencias').select(['id','slug','nome']).where('id','=',row.agencia_id).executeTakeFirst()) ?? null : null`; no bypass de dev, `agencia: null`.

`admin/page.tsx`: logo após `getCurrentAdmin`: `if (admin.role === 'agencia') redirect(admin.agencia ? \`/admin/agencia/${admin.agencia.slug}\` : '/admin/login')`.

Usuários (API `POST` e `PATCH [id]`): aceitar `agencia_id`; se `role === 'agencia'` e `agencia_id` ausente ou inexistente → 400 `'Escolha a agência'`; se `role !== 'agencia'` → gravar `agencia_id: null`. `GET` devolve `agencia_id` e uma lista `agencias: [{ id, nome }]`. UI: no formulário de criação, quando o papel é "Agência", aparece um `<select>` de agência (obrigatório); na lista, o papel mostra "Agência · Media House". Ler a forma atual do `PATCH [id]` antes de editar (hoje trata `is_active`, papel e senha).

- [ ] **Step 4: Rodar os dois testes → PASS; suíte inteira → PASS; `npx tsc` sem erro novo.**
- [ ] **Step 5: Commit** `Admin: papel agencia, acesso por agencia e campo na tela de Usuarios`.

---

### Task 5: Ambiente local com dados sintéticos

**Files:**
- Create: `scripts/local/montar-banco-local.sh`, `scripts/local/seed-agencia.ts`, `.env.local.example`, `docs/AMBIENTE_LOCAL.md`

**Interfaces:**
- Consumes: migrations das Tasks 1 (e as de 29/09 e 02/10 já existentes).
- Produces: banco `attra_local` com o esquema de produção + dados sintéticos; usuários `admin@attra.local` (admin), `mediahouse@webmotors.com.br` e `nayume.sousa@webmotors.com.br` (agência Media House), senha de teste `teste-local-123` (escrita só no script e no doc local).

- [ ] **Step 1: `montar-banco-local.sh`**

```bash
#!/usr/bin/env bash
# Banco local para ver a área da agência rodando antes do deploy.
# Traz SÓ o esquema de produção (sem nenhum dado) e aplica as migrations novas.
# Rodar no Mac, como a usuária: bash scripts/local/montar-banco-local.sh
set -euo pipefail
BANCO="${BANCO_LOCAL:-attra_local}"
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ESQUEMA="$(mktemp -t attra-esquema).sql"

ssh attra-vps 'sudo -u postgres pg_dump --schema-only --no-owner --no-privileges attra' > "$ESQUEMA"
dropdb --if-exists "$BANCO"
createdb "$BANCO"
# Extensões que o Postgres local talvez não tenha (pgvector): a tabela que
# depende dela é criada sem a coluna e o resto segue.
psql -X -q -d "$BANCO" -v ON_ERROR_STOP=0 -f "$ESQUEMA" 2>&1 | grep -iE 'error' || true
for m in 20260929_admin_users_ultimo_acesso 20261002_descarta_correlacao_por_horario 20261002_agencias; do
  psql -X -q -d "$BANCO" -v ON_ERROR_STOP=1 -f "$RAIZ/supabase/migrations/$m.sql"
done
echo "ok: banco $BANCO pronto (só esquema). Agora: npx tsx scripts/local/seed-agencia.ts"
```

- [ ] **Step 2: `seed-agencia.ts`** — gera, com `DATABASE_URL` do `.env.local`, de forma determinística (semente fixa):
  - agências Media House (já criada pela migration) e EB;
  - campanhas MH: Google PMax (`24295047322`, nome `va-pmax-nucleo-set26`), Google Search (`24283864992`), Meta site (`[VA][MediaHouse][Leads][Site]`, destino `site`) e Meta WhatsApp direto (`[VA][MediaHouse][Leads][Whatsapp]`, destino `whatsapp`, `mensagem_prefixo` "Vi no Instagram o"), WebMotors (`va-webmotors-set26`); EB: Meta `[EB] [SITE] Visitas ao site` (`120240538111140043`);
  - ~2.500 sessões em 30 dias: 45% orgânico/direto, 25% PMax MH (metade só com `utm_id`, sem nome — o caso real de 29/09), 10% Search MH, 8% Meta MH, 2% WebMotors MH, 10% EB; cidades e aparelhos variados; IPs da faixa de documentação (`203.0.113.0/24`);
  - page views (home, `/veiculos`, fichas com slugs `marca-modelo-ano-id`), com marca/modelo;
  - cliques no WhatsApp em ~9% das sessões, com o tempo até o clique seguindo a distribuição medida (23% < 3 s, 22% 3–10 s, 13% 10–30 s, 17% 30–60 s, 17% 1–3 min, 8% > 3 min);
  - 3 usuários (bcrypt da senha de teste).
- [ ] **Step 3: `.env.local.example`** com `DATABASE_URL=postgres://<seu-usuario>@localhost:5432/attra_local`, `AUTH_SECRET=` (gerar com `npx auth secret`), e as demais variáveis que o `npm run dev` exigir para abrir `/admin` (descobrir rodando; documentar cada uma com valor de teste ou vazio).
- [ ] **Step 4: Rodar tudo** — `bash scripts/local/montar-banco-local.sh && npx tsx scripts/local/seed-agencia.ts && npm run dev`; abrir `http://localhost:3000/admin/login`, entrar como admin e ver Visitantes com números; entrar como `mediahouse@…` e cair em `/admin/agencia/media-house` (404 até a Fase 2 — esperado).
- [ ] **Step 5: `docs/AMBIENTE_LOCAL.md`** com os comandos acima e os logins de teste; commit `Ambiente local: banco so com esquema de producao e dados sinteticos`.

---

## FASE 2 — ÁREA DA AGÊNCIA

### Task 6: API escopada de Visitantes e Resumo

**Files:**
- Create: `src/app/api/admin/agencia/[slug]/visitantes/[aba]/route.ts`, `src/lib/visitors/consultas/resumo-agencia.ts`, `src/lib/visitors/escopo-da-url.ts`
- Test: `src/lib/db/__tests__/agencia-api.integration.test.ts`

**Interfaces:**
- Consumes: `acessoAgencia`, todas as `consultarX`.
- Produces:
  - `escopoDaUrl(url: string, agenciaId: string): Escopo` — lê `?plataforma=` (só `google|meta|webmotors`) e `?campanhas=<uuid,uuid>` (só uuids válidos).
  - `GET /api/admin/agencia/[slug]/visitantes/[aba]` com `aba ∈ { resumo, metrics, origens, entradas, sessoes, jornadas, sessao, comportamento, veiculos, termos, campanha, campanhas }`; 401/403/404 do guard; aba desconhecida → 404.
  - `consultarResumoAgencia(url, escopo): Promise<{ periodo; total: Numeros; porPlataforma: Array<{ plataforma: PlataformaCampanha | 'outra'; } & Numeros> }>` com `Numeros = { sessoes: number; whatsapp: number; acidentais: number }` (`whatsapp` já sem acidentais).

```ts
// route.ts
import { NextRequest, NextResponse } from 'next/server'
import { acessoAgencia } from '@/lib/auth/guard-agencia'
import { escopoDaUrl } from '@/lib/visitors/escopo-da-url'
import type { Escopo } from '@/lib/visitors/escopo'
import { consultarResumoAgencia } from '@/lib/visitors/consultas/resumo-agencia'
import { consultarMetrics } from '@/lib/visitors/consultas/metrics'
import { consultarOrigens } from '@/lib/visitors/consultas/origens'
import { consultarEntradas } from '@/lib/visitors/consultas/entradas'
import { consultarSessoes } from '@/lib/visitors/consultas/sessoes'
import { consultarJornadas } from '@/lib/visitors/consultas/jornadas'
import { consultarSessaoDetalhe } from '@/lib/visitors/consultas/sessao-detalhe'
import { consultarComportamento } from '@/lib/visitors/consultas/comportamento'
import { consultarVeiculos } from '@/lib/visitors/consultas/veiculos'
import { consultarTermos } from '@/lib/visitors/consultas/termos'
import { consultarCampanha } from '@/lib/visitors/consultas/campanha'
import { consultarCampanhas } from '@/lib/visitors/consultas/campanhas'

/**
 * Visitantes da agência. A agência vem do LOGIN (via acessoAgencia): para
 * usuário `agencia`, um slug que não é o dele é 403. Os filtros de
 * plataforma/campanha só estreitam dentro das campanhas dela.
 *
 * Fora daqui de propósito: perfis identificados (nome/e-mail/telefone) e
 * receita em R$ — não há aba para eles.
 */
const ABAS: Record<string, (url: string, escopo: Escopo) => Promise<unknown>> = {
	resumo: consultarResumoAgencia,
	metrics: consultarMetrics,
	origens: consultarOrigens,
	entradas: consultarEntradas,
	sessoes: consultarSessoes,
	jornadas: consultarJornadas,
	sessao: consultarSessaoDetalhe,
	comportamento: consultarComportamento,
	veiculos: consultarVeiculos,
	termos: consultarTermos,
	campanha: consultarCampanha,
	campanhas: consultarCampanhas,
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string; aba: string }> }) {
	const { slug, aba } = await params
	const consultar = ABAS[aba]
	if (!consultar) return NextResponse.json({ error: 'Not found' }, { status: 404 })
	const acesso = await acessoAgencia(slug)
	if (!acesso.ok) return NextResponse.json({ error: 'Forbidden' }, { status: acesso.status })
	try {
		const r = await consultar(request.url, escopoDaUrl(request.url, acesso.agencia.id))
		if (r && typeof r === 'object' && 'erro' in r) {
			const e = r as { erro: number; mensagem?: string }
			return NextResponse.json({ error: e.mensagem ?? 'Erro' }, { status: e.erro })
		}
		return NextResponse.json(r)
	} catch (error) {
		console.error(`[Agencia Visitantes API] ${aba}:`, error)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}
```

`metrics` dentro da agência ainda devolveria `cidades`, `midia_paga` etc. — tudo agregado e escopado, sem PII. A receita é outra rota (`atribuicao-receita`), que não entra no mapa.

- [ ] **Step 1: Teste (vermelho)** `agencia-api.integration.test.ts`: mocka `@/lib/auth/guard-agencia` para devolver ora a MH, ora `{ ok: false, status: 403 }`; semeia como na Task 2; para **cada aba** do mapa (exceto `sessao` e `campanha`, que exigem parâmetro), chamar com a MH e checar que nenhuma `session_id`/`chave` da EB ou orgânica aparece no JSON (`JSON.stringify(r)` não contém `'eb'`/`'organico'`); `resumo` com `total.sessoes === 2`; 403 repassado; aba `perfis` → 404.
- [ ] **Step 2: Rodar → FAIL.**
- [ ] **Step 3: Implementar `escopo-da-url.ts`, `resumo-agencia.ts` e a rota.** `resumo-agencia` usa `periodoDaUrl(url, escopo)`, `plataformaDaSessaoSql` e `primeiroCliquePorSessao` (de `score-clique.ts`): `whatsapp = count(*) filter (where s.contacted_whatsapp and not coalesce(pc.so_acidental, false))`, `acidentais = count(*) filter (where pc.so_acidental)`, agrupado por `coalesce(plataforma, 'outra')`.
- [ ] **Step 4: Rodar → PASS.**
- [ ] **Step 5: Commit** `Agencia: API de visitantes escopada pelo login`.

---

### Task 7: Cadastro de campanhas (API)

**Files:**
- Create: `src/lib/agencias/campanhas.ts`, `src/app/api/admin/agencia/[slug]/campanhas/route.ts`, `.../campanhas/[id]/route.ts`, `.../campanhas/detectadas/route.ts`
- Test: `src/lib/__tests__/agencias-campanhas.test.ts` (validação pura), `src/lib/db/__tests__/agencia-campanhas.integration.test.ts`

**Interfaces:**
- Produces:
  - `validarCampanha(entrada: unknown): { ok: true; valor: CampanhaEntrada } | { ok: false; erro: string }` com `CampanhaEntrada = { plataforma; nome; id_externo: string | null; destino: 'site' | 'whatsapp'; mensagem_prefixo: string | null; inicio: string; fim: string | null }` — apara espaços, `id_externo` só dígitos para google/meta, `fim >= inicio`, `mensagem_prefixo` só com `destino = 'whatsapp'`.
  - `listarCampanhas(agenciaId, url)` → campanhas + `visitas_periodo` (contagem com `casaCampanhaSql` para aquela campanha).
  - `GET/POST /campanhas`, `PATCH /campanhas/[id]` (editar ou `{ encerrar: true }` → `fim = current_date`), `GET /campanhas/detectadas` → `[{ plataforma, utm_campaign, utm_id, sessoes }]` dos últimos 30 dias com prefixo da agência (`lower(utm_campaign) like any(prefixos || '%')`) ou `lower(utm_medium) = any(utm_medium_marca)`, e que **não** casam com nenhuma campanha cadastrada de **nenhuma** agência.
  - Violação do índice único → 409 `{ error: 'Esta campanha já está cadastrada em outra agência. Fale com a Attra.' }` quando a campanha existente é de outra agência; `'Você já cadastrou esta campanha.'` quando é da mesma.
  - PATCH só altera campanha da própria agência (`where agencia_id = acesso.agencia.id`), senão 404.
  - `criado_por`/`atualizado_por` = `acesso.admin.id`.

- [ ] **Step 1: Testes (vermelho)** — validação pura (nome vazio, ID com letras no Google, fim antes do início, prefixo com destino site) e integração (cria; cria repetida na mesma agência → mensagem "você já"; mesmo ID com espaços por outra agência → 409 neutro sem citar a agência; PATCH de campanha alheia → 404; `detectadas` não lista o que já foi cadastrado nem o que é da EB).
- [ ] **Step 2: Rodar → FAIL.**
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar → PASS.**
- [ ] **Step 5: Commit** `Agencia: cadastro de campanhas com trava e campanhas detectadas`.

---

### Task 8: Modo largura total (tabelas e gráficos sem rolagem lateral)

**Files:**
- Create: `src/app/admin/visitors/largura-total.tsx`
- Modify: `src/app/admin/visitors/visitors-tabela.tsx`, `src/app/admin/visitors/visitors-ui.tsx:50`, `origens/origens-painel.tsx:329-330`, `campanha/[chave]/campanha-painel.tsx:282-283`, `sessoes/sessoes-painel.tsx:495`, `visitors-nav.tsx`
- Test: `src/lib/__tests__/largura-total.test.ts`

**Interfaces:**
- Produces:
  - `LarguraTotalProvider` / `useLarguraTotal(): boolean` (padrão `false` — telas atuais intactas).
  - `prioridadeDaColuna(indice: number, explicita?: 1 | 2 | 3): 1 | 2 | 3` — explícita vence; senão índice 0–2 → 1, 3–4 → 2, ≥5 → 3.
  - `classeDaPrioridade(p): string` → `''` | `'hidden md:table-cell'` | `'hidden xl:table-cell'`.
  - `semLarguraMinima(classe?: string): string` remove `min-w-[…]` e `whitespace-nowrap`.
  - `ColunaTabela.prioridade?: 1 | 2 | 3`.

```ts
// largura-total.tsx
'use client'
import { createContext, useContext, type ReactNode } from 'react'

/**
 * Modo "largura total": a área da agência ocupa a tela inteira e NUNCA rola
 * para o lado (spec 2026-10-02). As telas atuais seguem como estão — o modo
 * só liga dentro do provider.
 */
const Ctx = createContext(false)
export function LarguraTotalProvider({ children }: { children: ReactNode }) {
	return <Ctx.Provider value={true}>{children}</Ctx.Provider>
}
export const useLarguraTotal = () => useContext(Ctx)

export function prioridadeDaColuna(indice: number, explicita?: 1 | 2 | 3): 1 | 2 | 3 {
	if (explicita) return explicita
	return indice <= 2 ? 1 : indice <= 4 ? 2 : 3
}
export function classeDaPrioridade(p: 1 | 2 | 3): string {
	return p === 1 ? '' : p === 2 ? 'hidden md:table-cell' : 'hidden xl:table-cell'
}
export function semLarguraMinima(classe?: string): string {
	return (classe ?? '').replace(/\bmin-w-\[[^\]]+\]/g, '').replace(/\bwhitespace-nowrap\b/g, '').trim()
}
```

Na `TabelaOrdenavel`, quando `useLarguraTotal()`:
- wrapper sem `overflow-x-auto`; `<table className="w-full table-fixed hidden md:table">`;
- `th`/`td` com `classeDaPrioridade(prioridadeDaColuna(i, c.prioridade))`, `semLarguraMinima(...)` e `whitespace-normal break-words` no lugar do `whitespace-nowrap` de `TH`/`TD`;
- cada linha com colunas escondidas ganha um botão "▸" que alterna uma `<tr>` logo abaixo (`colSpan`) com os pares título/valor das colunas de prioridade 2 e 3, visível `xl:hidden`;
- abaixo de `md`: `<ul className="md:hidden divide-y">` com um cartão por linha: título = render da coluna 0; corpo = grade `grid-cols-2 gap-x-3 gap-y-1` com `titulo` em `text-[11px] uppercase` e `render(linha)` de todas as outras colunas.

Gráficos: `min-w-[640px]` e `overflow-x-auto` condicionados a `!largura`; com `largura`, rótulo do eixo a cada `Math.ceil(pontos.length / 6)`. `visitors-ui.tsx:50` (`min-w-[140px]` do `ConteudoVolume` em `td`) segue a mesma condição. `visitors-nav.tsx`: `overflow-x-auto` só fora do modo; no modo, abaixo de `md` vira `<select>` (Task 10 usa).

- [ ] **Step 1: Teste (vermelho)** de `prioridadeDaColuna`, `classeDaPrioridade` e `semLarguraMinima` (`'min-w-[140px] tabular-nums whitespace-nowrap'` → `'tabular-nums'`).
- [ ] **Step 2: Rodar → FAIL.**
- [ ] **Step 3: Implementar.**
- [ ] **Step 4: Rodar → PASS; suíte inteira → PASS.**
- [ ] **Step 5: Commit** `Visitantes: modo largura total (prioridade de coluna, cartoes no celular)`.

---

### Task 9: Painéis apontáveis (`VisitantesApiContext`)

**Files:**
- Create: `src/app/admin/visitors/visitantes-api.tsx`
- Modify: `visitors-dashboard.tsx`, `visitors-termos.tsx`, `campanhas-score.tsx`, `visitors-tabelas.tsx:271`, `origens/origens-painel.tsx`, `entradas/entradas-painel.tsx`, `sessoes/sessoes-painel.tsx`, `sessoes/[id]/sessao-detalhe.tsx`, `comportamento/comportamento-painel.tsx`, `veiculos/veiculos-painel.tsx`, `campanha/[chave]/campanha-painel.tsx`

**Interfaces:**
- Produces:

```ts
// visitantes-api.tsx
'use client'
import { createContext, useContext, type ReactNode } from 'react'

/**
 * Para onde os painéis de Visitantes apontam. Padrão = o painel da Attra
 * (`/api/admin/visitors/<aba>` e links em `/admin/visitors`). A área da
 * agência troca as duas bases e acrescenta os filtros (plataforma, campanhas)
 * a toda chamada. `modo: 'agencia'` esconde as seções que a agência não pode
 * ver (receita em R$, perfis identificados).
 */
export interface VisitantesApi {
	api: (aba: string, params?: Record<string, string | number | undefined>) => string
	link: (caminho: string) => string
	modo: 'attra' | 'agencia'
}

const doAdmin: VisitantesApi = {
	api: (aba, params) => comParams(`/api/admin/visitors/${aba}`, params),
	link: caminho => `/admin/visitors${caminho}`,
	modo: 'attra',
}

const Ctx = createContext<VisitantesApi>(doAdmin)
export const useVisitantesApi = () => useContext(Ctx)
export function VisitantesApiProvider({ valor, children }: { valor: VisitantesApi; children: ReactNode }) {
	return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

export function comParams(base: string, params?: Record<string, string | number | undefined>): string {
	const q = new URLSearchParams()
	for (const [k, v] of Object.entries(params ?? {})) if (v !== undefined && v !== '') q.set(k, String(v))
	const s = q.toString()
	return s ? `${base}?${s}` : base
}
```

Troca mecânica nos painéis (cada `fetch` e cada `href` fixo):
- `fetch(\`/api/admin/visitors/origens?dias=${dias}\`)` → `fetch(api('origens', { dias }))` com `const { api, link } = useVisitantesApi()`;
- a aba `session-explore` vira `api('sessao', { session_id })` na agência — por isso o mapa do contexto do admin traduz: no `doAdmin`, `api('sessao', p)` → `/api/admin/visitors/session-explore`. Implementar com um `const ROTA_ADMIN: Record<string, string> = { sessao: 'session-explore' }`;
- `href={\`/admin/visitors/campanha/${x}\`}` → `href={link(\`/campanha/${x}\`)}`; idem `/sessoes/…` e `/origens`;
- `visitors-dashboard.tsx`: com `modo === 'agencia'`, **não renderiza** `<SecaoReceitaPorCanal>` nem a seção de perfis (e não faz o `fetch` de `/api/admin/visitors?status=`).
- Rotas da Attra: `api('metrics')` → `/api/admin/visitors/metrics` (o arquivo de rota continua com esse nome).

- [ ] **Step 1: Teste (vermelho)** `src/lib/__tests__/visitantes-api.test.ts` para `comParams` (ignora vazios) e para o mapa `sessao → session-explore` do contexto padrão.
- [ ] **Step 2: Rodar → FAIL.**
- [ ] **Step 3: Implementar e fazer a troca nos 11 arquivos.** Conferir com `grep -rn "/api/admin/visitors\|/admin/visitors" src/app/admin/visitors` que só sobram: o contexto, `visitors-nav.tsx` e as `page.tsx`.
- [ ] **Step 4: `npx tsc`, suíte inteira → PASS; `npm run dev` e abrir as 6 abas do admin: tudo igual a antes.**
- [ ] **Step 5: Commit** `Visitantes: paineis apontaveis por contexto (base da API e dos links)`.

---

### Task 10: Estrutura da área, Resumo e Visitantes

**Files:**
- Create: `src/app/admin/agencia/[slug]/layout.tsx`, `agencia-shell.tsx`, `filtros-agencia.tsx`, `page.tsx`, `resumo-agencia.tsx`, `visitantes/[aba]/page.tsx`, `campanha/[chave]/page.tsx`, `sessoes/[id]/page.tsx`
- Modify: `src/lib/admin-sections.tsx`, `src/app/admin/page.tsx`

**Interfaces:**
- Consumes: Tasks 4, 6, 8, 9.
- Produces: rotas `/admin/agencia/[slug]` (Resumo), `/visitantes/[aba]` com `aba ∈ visao-geral|origens|entradas|sessoes|comportamento|veiculos`, `/campanha/[chave]`, `/sessoes/[id]`.

`layout.tsx` (servidor): `acessoAgencia(slug)`; 401 → `redirect('/admin/login')`; 403 com usuário `agencia` → `redirect(\`/admin/agencia/${admin.agencia.slug}\`)`; 403 de outro papel → `redirect('/admin')`; 404 → `notFound()`. Renderiza `<AgenciaShell agencia={…} ehAttra={admin.role !== 'agencia'} agencias={…}>{children}</AgenciaShell>`.

`agencia-shell.tsx` (cliente): `<div className="w-full px-4 md:px-6 2xl:px-10 py-4">` sem `max-w`; cabeçalho fixo (`sticky top-0 z-30 bg-background/95 backdrop-blur`) com nome da agência, seletor de agência (só time da Attra), `<FiltrosAgencia>`; abas `Resumo · Visitantes · Campanhas` (Leads entra na Fase 3); envolve os filhos em `<LarguraTotalProvider>` e `<VisitantesApiProvider valor={…}>` com `api = (aba, p) => comParams(\`/api/admin/agencia/${slug}/visitantes/${aba}\`, { ...p, plataforma, campanhas })` e `link = c => \`/admin/agencia/${slug}${c.startsWith('/campanha') || c.startsWith('/sessoes') ? c : '/visitantes' + c}\``, `modo: 'agencia'`.

`filtros-agencia.tsx`: período reaproveita `SeletorPeriodo`; plataforma como 4 botões (`Todas · Google · Meta · WebMotors`, `flex-wrap`); campanha como `<select multiple>` compacto alimentado por `GET /campanhas`; tudo lido e escrito na URL com `useSearchParams` + `router.replace` (filtros sobrevivem à troca de aba e o link copiado abre igual).

`resumo-agencia.tsx`: faixa de números `grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6` (Sessões · Clicaram no WhatsApp com "+N acidentais"); funil por plataforma (barras horizontais em `div`s com largura %, nada de SVG com largura mínima); e `<TabelaCampanhasScore>` (já existente) dentro do provider — ela já usa `api('campanhas')` depois da Task 9.

`visitantes/[aba]/page.tsx`: sub-abas (links acima de `md`, `<select>` abaixo) e o painel correspondente (`VisitorsDashboard`, `OrigensPainel`, …), sem nenhuma alteração neles além das Tasks 8–9.

`admin-sections.tsx`/`admin/page.tsx`: para o time da Attra, um card por agência — "Marketing Media House" → `/admin/agencia/media-house`, grupo `aquisicao`, ícone `Megaphone` — montado a partir de `db.selectFrom('agencias')` na página e passado para `AdminHome` junto das seções.

- [ ] **Step 1: Teste de servidor (vermelho)** `src/lib/__tests__/agencia-link.test.ts` para a função `linkDaAgencia(slug, caminho)` extraída do shell (`/origens` → `/admin/agencia/mh/visitantes/origens`; `/campanha/x` → `/admin/agencia/mh/campanha/x`; `/sessoes/1` → `/admin/agencia/mh/sessoes/1`).
- [ ] **Step 2: Rodar → FAIL.**
- [ ] **Step 3: Implementar as páginas.**
- [ ] **Step 4: `npm run dev`** com o banco local: como admin, card "Marketing Media House" → Resumo com números; como `mediahouse@…`, login cai no Resumo; trocar o slug na URL para `eb` → volta para `media-house`; abrir as 6 sub-abas e o detalhe de uma sessão.
- [ ] **Step 5: Commit** `Agencia: area em largura total com Resumo e Visitantes filtrados`.

---

### Task 11: Tela de Campanhas

**Files:**
- Create: `src/app/admin/agencia/[slug]/campanhas/page.tsx`, `campanhas-agencia.tsx`

**Interfaces:**
- Consumes: API da Task 7.

Tela: tabela (`TabelaOrdenavel` no modo largura total, prioridades explícitas: plataforma 1, nome 1, situação 1, visitas no período 1, ID 2, destino 2, período 3) com ações "editar" e "encerrar"; botão "Nova campanha" abre painel lateral (`fixed inset-y-0 right-0 w-full md:w-[28rem]`) com o formulário: plataforma (3 botões), nome, ID (com ajuda "o número que aparece em utm_id / no gerenciador da plataforma"), destino (site / WhatsApp direto), mensagem do anúncio (só com WhatsApp direto), início, fim. Erros da API aparecem no topo do painel. Bloco "Detectadas sem cadastro" abaixo da tabela, com botão "cadastrar" que abre o painel preenchido. Campanha ativa com 0 visitas no período mostra o aviso "nenhuma visita — confira o ID e o nome".

- [ ] **Step 1: Teste (vermelho)** da função pura `situacaoDaCampanha({ inicio, fim }, hoje)` → `'ativa' | 'agendada' | 'encerrada'` em `src/lib/agencias/campanhas.ts`.
- [ ] **Step 2: Rodar → FAIL.**
- [ ] **Step 3: Implementar a função e a tela.**
- [ ] **Step 4: `npm run dev`**: cadastrar uma campanha detectada; editar; encerrar; tentar cadastrar o ID da EB → mensagem neutra.
- [ ] **Step 5: Commit** `Agencia: tela de cadastro de campanhas`.

---

### Task 12: Verificação de largura e entrega local

**Files:**
- Create: `docs/superpowers/medicoes/2026-10-02-area-agencia-larguras/` (prints)

- [ ] **Step 1:** Com `npm run dev` e o banco local, para cada tela (Resumo; 6 sub-abas de Visitantes; detalhe de campanha; detalhe de sessão; Campanhas com o painel aberto) e para cada largura (360, 768, 1280, 1920), medir no Chrome: `document.documentElement.scrollWidth <= window.innerWidth` (via um `<iframe>` da largura certa, como na validação de 02/10) e salvar o print.
- [ ] **Step 2:** Corrigir qualquer tela que falhar (a causa costuma ser `whitespace-nowrap`, `min-w-[…]` ou SVG com largura mínima) e repetir.
- [ ] **Step 3:** Suíte inteira, `npx tsc`, `npx eslint` dos arquivos tocados.
- [ ] **Step 4:** Entregar à usuária: como subir o ambiente local, os dois logins de teste e o roteiro do que olhar. **Sem deploy até ela aprovar.**
- [ ] **Step 5: Commit** `Agencia: verificacao de largura nas 4 resolucoes`.
