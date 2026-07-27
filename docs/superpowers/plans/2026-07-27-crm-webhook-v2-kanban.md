# CRM Webhook v2 + Redesign do Kanban — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar o receptor do webhook do CRM (Fykos) do contrato v1 para o v2 (HMAC, ordenação por `atualizado_em`, semântica ausente/null, campos de 1ª classe) e redesenhar o kanban do admin com 5 colunas, KPIs, filtros de período (dia/semana/quinzena/mês) e tooltips (i) explicativos.

**Architecture:** A lógica de merge do webhook vira funções puras em `src/lib/crm-webhook.ts` (testáveis sem banco); o route `fykos-crm` passa a ler o corpo bruto (HMAC), autenticar por assinatura **ou** pelo header legado (transição), e aplicar upsert por card respeitando ordenação e semântica ausente/null. Colunas novas entram por migration SQL idempotente com remapeamento das etapas v1. A UI é reescrita em torno de `crm-constants.ts` (vocabulário/estilos) + componente `InfoDica` (tooltips) + KPI strip.

**Tech Stack:** Next.js 16 (App Router), Kysely/pg, Vitest 4, node:crypto (HMAC), Tailwind.

## Global Constraints

- Contrato v2 (verbatim do sistema emissor): upsert por `id`; **IGNORAR webhook com `atualizado_em` ≤ o do card salvo**; **campo ausente = mantém; campo `null` = limpa**; auth `X-CRM-Signature` = HMAC-SHA256 do corpo bruto com `CRM_SITE_WEBHOOK_SECRET` (rejeitar com 401); campos extras desconhecidos vão para o JSONB `dados`.
- Etapas v2 (colunas do kanban, nesta ordem): `novo | em_atendimento | em_negociacao | encerrado_ganho | encerrado_perdido`.
- Situações v2 (badge, conjunto aberto): `sem_contato, em_conversa, aguardando_cliente, proposta_enviada, negociando, avaliando_troca, sem_estoque, sem_perfil, comprou_outro, nao_responde, desistiu, …`
- Fontes de evento: `alerta|aceite|reporte|cobranca|venda|perda|correcao_manual`.
- Migração de dados v1→v2: `aguardando_vendedor`→`novo`; `encerrado_sucesso`→`encerrado_ganho`; `sem_atualizacao` deixa de ser coluna → etapa `em_atendimento` com `situacao='sem_atualizacao'`.
- Compatibilidade de transição: o header legado `X-Webhook-Secret` = `FYKOS_CRM_SECRET` continua aceito, e etapas v1 recebidas são normalizadas para v2 no ingest. `CRM_SITE_WEBHOOK_SECRET` com fallback para `FYKOS_CRM_SECRET` se não definida.
- UI: filtros de período **Hoje / 7 dias (semana) / 15 dias (quinzena) / 30 dias (mês) / Tudo**, base = `atualizado_em` (movimentação), explicado no (i). Painel continua somente leitura.
- Migrations em `supabase/migrations/`, idempotentes, aplicadas via `psql` na VPS. Testes em `src/lib/__tests__/`. Commits em português (`feat(crm): ...`).
- Branch: `feat/crm-webhook-v2` a partir de `origin/master`.

## Fatos do código atual (não re-derivar)

- Receptor v1: `src/app/api/webhook/fykos-crm/route.ts` — auth por igualdade de `x-webhook-secret`, upsert sobrescreve tudo, `atualizado_em` = hora do servidor, suporta `{ "remover": [ids] }` e lote em `cards[]`.
- Tabela: `crm_cards` (`supabase/migrations/20260722_crm_cards_postgres_puro.sql`) — colunas id, etapa, nome, telefone, email, veiculo, valor, origem, vendedor, dados JSONB, criado_em, atualizado_em. Tipos Kysely em `src/lib/db/types.ts:484` (`CrmCardsTable`).
- UI: `src/app/admin/crm/crm-admin.tsx` (client, polling 60s, GET `/api/admin/crm/cards` que faz `selectAll` limit 500 — não muda).
- O campo v2 `veiculo_interesse` mapeia para a coluna existente `veiculo` (sem rename).

---

### Task 1: Migration SQL + tipos Kysely

**Files:**
- Create: `supabase/migrations/20260727_crm_v2.sql`
- Modify: `src/lib/db/types.ts:484-497` (CrmCardsTable)

**Interfaces:**
- Produces: colunas novas em `crm_cards`: `fonte_evento, situacao, andamento, impedimento, proxima_acao, motivo_encerramento, veiculo_troca` (TEXT) e `proxima_acao_em, atribuido_em, primeiro_contato_em, encerrado_em` (TIMESTAMPTZ). Tipos correspondentes em `CrmCardsTable` (todos `| null`).

- [ ] **Step 1: Escrever a migration**

```sql
-- supabase/migrations/20260727_crm_v2.sql
-- Contrato v2 do webhook do CRM (Fykos → site): campos de 1ª classe +
-- remapeamento das etapas v1. Idempotente. Aplicar na VPS:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/20260727_crm_v2.sql

ALTER TABLE public.crm_cards
  ADD COLUMN IF NOT EXISTS fonte_evento        TEXT,
  ADD COLUMN IF NOT EXISTS situacao            TEXT,
  ADD COLUMN IF NOT EXISTS andamento           TEXT,
  ADD COLUMN IF NOT EXISTS impedimento         TEXT,
  ADD COLUMN IF NOT EXISTS proxima_acao        TEXT,
  ADD COLUMN IF NOT EXISTS proxima_acao_em     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS motivo_encerramento TEXT,
  ADD COLUMN IF NOT EXISTS veiculo_troca       TEXT,
  ADD COLUMN IF NOT EXISTS atribuido_em        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS primeiro_contato_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS encerrado_em        TIMESTAMPTZ;

-- Remapeamento v1 → v2 (idempotente: os WHERE só pegam valores v1)
UPDATE public.crm_cards SET etapa = 'novo'             WHERE etapa = 'aguardando_vendedor';
UPDATE public.crm_cards SET etapa = 'encerrado_ganho'  WHERE etapa = 'encerrado_sucesso';
UPDATE public.crm_cards
   SET etapa = 'em_atendimento',
       situacao = COALESCE(situacao, 'sem_atualizacao')
 WHERE etapa = 'sem_atualizacao';

SELECT 'ok: crm_cards v2' AS resultado;
```

- [ ] **Step 2: Atualizar `CrmCardsTable` em `src/lib/db/types.ts`** — adicionar após `vendedor: string | null`:

```ts
  fonte_evento: string | null
  situacao: string | null
  andamento: string | null
  impedimento: string | null
  proxima_acao: string | null
  proxima_acao_em: Timestamp | null
  motivo_encerramento: string | null
  veiculo_troca: string | null
  atribuido_em: Timestamp | null
  primeiro_contato_em: Timestamp | null
  encerrado_em: Timestamp | null
```

- [ ] **Step 3: Verificar** — `npx tsc --noEmit` (mesmos 36 erros pré-existentes, nenhum novo).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260727_crm_v2.sql src/lib/db/types.ts
git commit -m "feat(crm): schema v2 do webhook (campos de 1ª classe + remapeamento de etapas)"
```

---

### Task 2: Lógica pura do webhook v2 (`crm-webhook.ts`) — TDD

**Files:**
- Create: `src/lib/crm-webhook.ts`
- Test: `src/lib/__tests__/crm-webhook-v2.test.ts`

**Interfaces:**
- Produces:
  - `ETAPAS_V2: readonly string[]` — `['novo','em_atendimento','em_negociacao','encerrado_ganho','encerrado_perdido']`
  - `verifyCrmSignature(rawBody: string, signatureHex: string | null, secret: string): boolean` — HMAC-SHA256 hex, comparação timing-safe.
  - `normalizeEtapa(etapa: string): { etapa: string; situacaoImplicita?: string }` — mapeia v1→v2 (`aguardando_vendedor`→`novo`; `encerrado_sucesso`→`encerrado_ganho`; `sem_atualizacao`→`em_atendimento` + `situacaoImplicita: 'sem_atualizacao'`); v2 e desconhecidas passam intactas.
  - `type CrmCardRowV2 = { id: string; atualizado_em: Date } & Partial<Record<'etapa'|'situacao'|'fonte_evento'|'nome'|'telefone'|'email'|'veiculo'|'veiculo_troca'|'valor'|'origem'|'vendedor'|'andamento'|'impedimento'|'proxima_acao'|'motivo_encerramento', string | number | null>> & Partial<Record<'proxima_acao_em'|'atribuido_em'|'primeiro_contato_em'|'encerrado_em', Date | null>> & { dados?: Record<string, unknown> | null }`
  - `mergeCardV2(existing: { atualizado_em: Date | string; dados: Record<string, unknown> | null } | null, payload: Record<string, unknown>): { action: 'skip' } | { action: 'insert' | 'update'; row: CrmCardRowV2 }`

- [ ] **Step 1: Escrever os testes**

```ts
// src/lib/__tests__/crm-webhook-v2.test.ts
import { describe, it, expect } from 'vitest'
import { createHmac } from 'node:crypto'
import { verifyCrmSignature, normalizeEtapa, mergeCardV2 } from '@/lib/crm-webhook'

const SECRET = 'segredo-teste'
const sign = (body: string) => createHmac('sha256', SECRET).update(body).digest('hex')

describe('verifyCrmSignature', () => {
	it('aceita assinatura correta', () => {
		const body = '{"id":"1"}'
		expect(verifyCrmSignature(body, sign(body), SECRET)).toBe(true)
	})
	it('rejeita assinatura errada, ausente ou de outro corpo', () => {
		expect(verifyCrmSignature('{"id":"1"}', sign('{"id":"2"}'), SECRET)).toBe(false)
		expect(verifyCrmSignature('{"id":"1"}', null, SECRET)).toBe(false)
		expect(verifyCrmSignature('{"id":"1"}', 'zz-not-hex', SECRET)).toBe(false)
	})
})

describe('normalizeEtapa', () => {
	it('mapeia etapas v1 para v2', () => {
		expect(normalizeEtapa('aguardando_vendedor')).toEqual({ etapa: 'novo' })
		expect(normalizeEtapa('encerrado_sucesso')).toEqual({ etapa: 'encerrado_ganho' })
		expect(normalizeEtapa('sem_atualizacao')).toEqual({ etapa: 'em_atendimento', situacaoImplicita: 'sem_atualizacao' })
	})
	it('etapas v2 e desconhecidas passam intactas', () => {
		expect(normalizeEtapa('em_negociacao')).toEqual({ etapa: 'em_negociacao' })
		expect(normalizeEtapa('etapa_exotica')).toEqual({ etapa: 'etapa_exotica' })
	})
})

describe('mergeCardV2', () => {
	const T1 = '2026-07-27T10:00:00Z'
	const T2 = '2026-07-27T11:00:00Z'

	it('insere card novo com defaults', () => {
		const r = mergeCardV2(null, { id: 42, etapa: 'novo', nome: 'Ana', atualizado_em: T1 })
		expect(r.action).toBe('insert')
		if (r.action === 'skip') throw new Error('unreachable')
		expect(r.row.id).toBe('42')
		expect(r.row.nome).toBe('Ana')
		expect(r.row.atualizado_em.toISOString()).toBe('2026-07-27T10:00:00.000Z')
	})

	it('IGNORA evento com atualizado_em <= o salvo (fora de ordem)', () => {
		const existing = { atualizado_em: new Date(T2), dados: null }
		expect(mergeCardV2(existing, { id: '1', atualizado_em: T1, nome: 'Atrasado' }).action).toBe('skip')
		expect(mergeCardV2(existing, { id: '1', atualizado_em: T2, nome: 'Empate' }).action).toBe('skip')
	})

	it('campo ausente mantém (não entra no row); null limpa', () => {
		const existing = { atualizado_em: new Date(T1), dados: null }
		const r = mergeCardV2(existing, { id: '1', atualizado_em: T2, impedimento: null })
		if (r.action !== 'update') throw new Error('esperava update')
		expect(r.row).not.toHaveProperty('nome')          // ausente → mantém
		expect(r.row.impedimento).toBeNull()               // null → limpa
	})

	it('veiculo_interesse mapeia para a coluna veiculo; valor string vira número', () => {
		const r = mergeCardV2(null, { id: '1', atualizado_em: T1, veiculo_interesse: 'RS6 Avant', valor: '799000' })
		if (r.action === 'skip') throw new Error('unreachable')
		expect(r.row.veiculo).toBe('RS6 Avant')
		expect(r.row.valor).toBe(799000)
	})

	it('etapa v1 no payload é normalizada; sem_atualizacao vira situacao', () => {
		const r = mergeCardV2(null, { id: '1', atualizado_em: T1, etapa: 'sem_atualizacao' })
		if (r.action === 'skip') throw new Error('unreachable')
		expect(r.row.etapa).toBe('em_atendimento')
		expect(r.row.situacao).toBe('sem_atualizacao')
	})

	it('situacao explícita vence a implícita do sem_atualizacao', () => {
		const r = mergeCardV2(null, { id: '1', atualizado_em: T1, etapa: 'sem_atualizacao', situacao: 'nao_responde' })
		if (r.action === 'skip') throw new Error('unreachable')
		expect(r.row.situacao).toBe('nao_responde')
	})

	it('extras desconhecidos vão para dados, mesclando com os existentes', () => {
		const existing = { atualizado_em: new Date(T1), dados: { legado: 'x' } }
		const r = mergeCardV2(existing, { id: '1', atualizado_em: T2, score_ia: 87 })
		if (r.action !== 'update') throw new Error('esperava update')
		expect(r.row.dados).toEqual({ legado: 'x', score_ia: 87 })
	})

	it('datas da linha do tempo viram Date; null limpa', () => {
		const r = mergeCardV2(null, { id: '1', atualizado_em: T1, proxima_acao_em: T2, encerrado_em: null })
		if (r.action === 'skip') throw new Error('unreachable')
		expect(r.row.proxima_acao_em).toBeInstanceOf(Date)
		expect(r.row.encerrado_em).toBeNull()
	})
})
```

- [ ] **Step 2: Rodar e ver falhar** — `npx vitest run src/lib/__tests__/crm-webhook-v2.test.ts` → FAIL (módulo não existe).

- [ ] **Step 3: Implementar `src/lib/crm-webhook.ts`**

```ts
// Lógica pura do contrato v2 do webhook do CRM (Fykos → site).
// Regras: upsert por id; evento com atualizado_em <= o salvo é IGNORADO;
// campo ausente mantém, campo null limpa; extras desconhecidos vão pro JSONB.
import { createHmac, timingSafeEqual } from 'node:crypto'

export const ETAPAS_V2 = ['novo', 'em_atendimento', 'em_negociacao', 'encerrado_ganho', 'encerrado_perdido'] as const

export function verifyCrmSignature(rawBody: string, signatureHex: string | null, secret: string): boolean {
	if (!signatureHex) return false
	const expected = createHmac('sha256', secret).update(rawBody).digest()
	let given: Buffer
	try {
		given = Buffer.from(signatureHex, 'hex')
	} catch {
		return false
	}
	if (given.length !== expected.length) return false
	return timingSafeEqual(given, expected)
}

const ETAPA_V1_MAP: Record<string, { etapa: string; situacaoImplicita?: string }> = {
	aguardando_vendedor: { etapa: 'novo' },
	encerrado_sucesso: { etapa: 'encerrado_ganho' },
	sem_atualizacao: { etapa: 'em_atendimento', situacaoImplicita: 'sem_atualizacao' },
}

export function normalizeEtapa(etapa: string): { etapa: string; situacaoImplicita?: string } {
	return ETAPA_V1_MAP[etapa] ?? { etapa }
}

const CAMPOS_TEXTO = ['situacao', 'fonte_evento', 'nome', 'telefone', 'email', 'veiculo_troca', 'origem', 'vendedor', 'andamento', 'impedimento', 'proxima_acao', 'motivo_encerramento'] as const
const CAMPOS_DATA = ['proxima_acao_em', 'atribuido_em', 'primeiro_contato_em', 'encerrado_em'] as const
const CAMPOS_CONHECIDOS = new Set<string>([...CAMPOS_TEXTO, ...CAMPOS_DATA, 'id', 'etapa', 'atualizado_em', 'veiculo_interesse', 'veiculo', 'valor'])

export type CrmCardRowV2 = { id: string; atualizado_em: Date } & Record<string, unknown>

export function mergeCardV2(
	existing: { atualizado_em: Date | string; dados: Record<string, unknown> | null } | null,
	payload: Record<string, unknown>,
): { action: 'skip' } | { action: 'insert' | 'update'; row: CrmCardRowV2 } {
	const atualizadoEm = typeof payload.atualizado_em === 'string' && !isNaN(Date.parse(payload.atualizado_em))
		? new Date(payload.atualizado_em)
		: new Date()

	if (existing && atualizadoEm.getTime() <= new Date(existing.atualizado_em).getTime()) {
		return { action: 'skip' }
	}

	const row: CrmCardRowV2 = { id: String(payload.id), atualizado_em: atualizadoEm }

	// etapa (com normalização v1→v2)
	if (typeof payload.etapa === 'string' && payload.etapa !== '') {
		const norm = normalizeEtapa(payload.etapa)
		row.etapa = norm.etapa
		if (norm.situacaoImplicita && payload.situacao === undefined) row.situacao = norm.situacaoImplicita
	} else if (!existing) {
		row.etapa = 'novo'
	}

	// veiculo_interesse (v2) / veiculo (v1) → coluna veiculo
	const veiculoIn = 'veiculo_interesse' in payload ? payload.veiculo_interesse : ('veiculo' in payload ? payload.veiculo : undefined)
	if (veiculoIn !== undefined) row.veiculo = veiculoIn === null ? null : String(veiculoIn)

	if ('valor' in payload) {
		const v = payload.valor
		row.valor = v === null || v === '' ? null : Number(v)
	}

	for (const campo of CAMPOS_TEXTO) {
		if (campo in payload) {
			const v = payload[campo]
			row[campo] = v === null ? null : String(v)
		}
	}
	for (const campo of CAMPOS_DATA) {
		if (campo in payload) {
			const v = payload[campo]
			row[campo] = v === null || typeof v !== 'string' || isNaN(Date.parse(v)) ? null : new Date(v)
		}
	}

	// Extras desconhecidos → dados (merge com o existente; compatibilidade futura)
	const extras: Record<string, unknown> = {}
	for (const [k, v] of Object.entries(payload)) {
		if (!CAMPOS_CONHECIDOS.has(k)) extras[k] = v
	}
	if (Object.keys(extras).length > 0) {
		row.dados = { ...(existing?.dados ?? {}), ...extras }
	}

	return { action: existing ? 'update' : 'insert', row }
}
```

- [ ] **Step 4: Rodar e ver passar** — `npx vitest run src/lib/__tests__/crm-webhook-v2.test.ts` → PASS (11 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/crm-webhook.ts src/lib/__tests__/crm-webhook-v2.test.ts
git commit -m "feat(crm): lógica pura do contrato v2 (HMAC, ordenação, ausente/null, extras)"
```

---

### Task 3: Reescrever o route do webhook

**Files:**
- Modify: `src/app/api/webhook/fykos-crm/route.ts` (reescrever)

**Interfaces:**
- Consumes: `verifyCrmSignature`, `mergeCardV2` (Task 2); colunas novas (Task 1).
- Produces: `POST /api/webhook/fykos-crm` aceitando v2 (HMAC) e v1 (header legado), respondendo `{ success, upserts, ignorados, remocoes }`.

- [ ] **Step 1: Reescrever o route**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyCrmSignature, mergeCardV2 } from '@/lib/crm-webhook'

export const dynamic = 'force-dynamic'

// Receptor do CRM (Fykos) — contrato v2 (2026-07): upsert por id, ordenado por
// atualizado_em (evento atrasado é ignorado), campo ausente mantém / null limpa,
// extras vão pro JSONB `dados`.
//
// Auth (uma das duas):
//   1. v2: X-CRM-Signature = HMAC-SHA256(corpo bruto, CRM_SITE_WEBHOOK_SECRET)
//      (fallback de secret: FYKOS_CRM_SECRET, para emissor que já usa o mesmo)
//   2. v1 (transição): X-Webhook-Secret = FYKOS_CRM_SECRET
// Etapas v1 recebidas são normalizadas para v2 no ingest.
// `{ "remover": [ids] }` continua suportado (lead saiu do funil).

export async function POST(request: NextRequest) {
	const secretV2 = process.env.CRM_SITE_WEBHOOK_SECRET || process.env.FYKOS_CRM_SECRET
	const secretV1 = process.env.FYKOS_CRM_SECRET
	if (!secretV2 && !secretV1) {
		return NextResponse.json({ error: 'Webhook sem secret configurado no servidor' }, { status: 500 })
	}

	const rawBody = await request.text()
	const assinaturaOk = !!secretV2 && verifyCrmSignature(rawBody, request.headers.get('x-crm-signature'), secretV2)
	const legadoOk = !!secretV1 && request.headers.get('x-webhook-secret') === secretV1
	if (!assinaturaOk && !legadoOk) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	}

	let body: Record<string, unknown>
	try {
		body = JSON.parse(rawBody)
	} catch {
		return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
	}

	// Remoções (legado; v2 encerra em vez de remover)
	const remover = Array.isArray(body.remover) ? body.remover.map(String) : []
	if (remover.length > 0) {
		try {
			await db.deleteFrom('crm_cards').where('id', 'in', remover).execute()
		} catch (error) {
			return NextResponse.json({ error: `Falha ao remover: ${error instanceof Error ? error.message : error}` }, { status: 500 })
		}
	}

	const lista: Record<string, unknown>[] = Array.isArray(body.cards)
		? (body.cards as Record<string, unknown>[])
		: (body.id !== undefined ? [body] : [])

	if (lista.some(c => c.id === undefined || c.id === null || String(c.id) === '')) {
		return NextResponse.json({ error: 'Todo card precisa de id' }, { status: 400 })
	}

	let upserts = 0
	let ignorados = 0
	try {
		for (const card of lista) {
			const id = String(card.id)
			const existing = await db.selectFrom('crm_cards')
				.select(['atualizado_em', 'dados'])
				.where('id', '=', id)
				.executeTakeFirst()

			const r = mergeCardV2(
				existing ? { atualizado_em: existing.atualizado_em as Date, dados: existing.dados as Record<string, unknown> | null } : null,
				card,
			)
			if (r.action === 'skip') { ignorados++; continue }
			if (r.action === 'insert') {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				await db.insertInto('crm_cards').values(r.row as any).execute()
			} else {
				const { id: _id, ...mudancas } = r.row
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				await db.updateTable('crm_cards').set(mudancas as any).where('id', '=', id).execute()
			}
			upserts++
		}
	} catch (error) {
		return NextResponse.json({ error: `Falha no upsert: ${error instanceof Error ? error.message : error}` }, { status: 500 })
	}

	console.log(`[FykosCRM] upserts=${upserts} ignorados=${ignorados} remoções=${remover.length} auth=${assinaturaOk ? 'hmac-v2' : 'legado-v1'}`)
	return NextResponse.json({ success: true, upserts, ignorados, remocoes: remover.length })
}
```

Nota: o `as any` nos values/set é o preço de `CrmCardRowV2` ser dinâmico (Partial por design do contrato). Se preferir, tipar com `Updateable<Database['crm_cards']>` e um cast único — não travar no lint aqui.

- [ ] **Step 2: Verificar** — `npx tsc --noEmit` (sem erros novos) e `npx vitest run` (tudo verde).

- [ ] **Step 3: Commit**

```bash
git add src/app/api/webhook/fykos-crm/route.ts
git commit -m "feat(crm): receptor do webhook migrado pro contrato v2 (HMAC + ordenação + null semantics)"
```

---

### Task 4: Vocabulário e tooltips da UI (`crm-constants.ts` + `InfoDica`)

**Files:**
- Create: `src/app/admin/crm/crm-constants.ts`
- Create: `src/app/admin/crm/info-dica.tsx`

**Interfaces:**
- Produces:
  - `ETAPAS_KANBAN: { id, label, descricao, dot, badge }[]` (5 etapas v2, na ordem do contrato)
  - `SITUACOES: Record<string, { label: string; classe: string }>` + `situacaoInfo(s: string)` com fallback humanizado
  - `FONTES_EVENTO: Record<string, string>`
  - `InfoDica({ children }: { children: React.ReactNode })` — ícone (i) com tooltip acessível (hover + focus)

- [ ] **Step 1: Criar `crm-constants.ts`**

```ts
// Vocabulário do contrato v2 do CRM + estilos e textos dos tooltips (i).
export const ETAPAS_KANBAN = [
	{
		id: 'novo', label: 'Novo', dot: 'bg-amber-500',
		badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
		descricao: 'Lead chegou e ainda não foi assumido por um vendedor. Meta: primeiro contato o quanto antes.',
	},
	{
		id: 'em_atendimento', label: 'Em atendimento', dot: 'bg-blue-500',
		badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
		descricao: 'Um vendedor assumiu e está conversando com o cliente. Ainda não há proposta na mesa.',
	},
	{
		id: 'em_negociacao', label: 'Em negociação', dot: 'bg-purple-500',
		badge: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
		descricao: 'Proposta, valores ou troca em discussão. É o lead mais quente do funil.',
	},
	{
		id: 'encerrado_ganho', label: 'Encerrado — Ganho', dot: 'bg-green-500',
		badge: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30',
		descricao: 'Venda concluída.',
	},
	{
		id: 'encerrado_perdido', label: 'Encerrado — Perdido', dot: 'bg-red-500',
		badge: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30',
		descricao: 'Encerrado sem venda. O motivo aparece no card.',
	},
] as const

export const ETAPA_DESCONHECIDA = {
	dot: 'bg-zinc-400',
	badge: 'bg-background text-foreground-secondary border-border',
	descricao: 'Etapa fora do contrato v2 — verificar o emissor.',
}

export const SITUACOES: Record<string, { label: string; classe: string }> = {
	sem_contato:       { label: 'Sem contato',        classe: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/30' },
	em_conversa:       { label: 'Em conversa',        classe: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30' },
	aguardando_cliente:{ label: 'Aguardando cliente', classe: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' },
	proposta_enviada:  { label: 'Proposta enviada',   classe: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30' },
	negociando:        { label: 'Negociando',         classe: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30' },
	avaliando_troca:   { label: 'Avaliando troca',    classe: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30' },
	sem_estoque:       { label: 'Sem estoque',        classe: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30' },
	sem_perfil:        { label: 'Sem perfil',         classe: 'bg-stone-500/10 text-stone-600 dark:text-stone-400 border-stone-500/30' },
	comprou_outro:     { label: 'Comprou outro',      classe: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30' },
	nao_responde:      { label: 'Não responde',       classe: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30' },
	desistiu:          { label: 'Desistiu',           classe: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30' },
	sem_atualizacao:   { label: 'Sem atualização',    classe: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30' },
}

export function situacaoInfo(s: string): { label: string; classe: string } {
	return SITUACOES[s] ?? {
		label: s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
		classe: 'bg-background text-foreground-secondary border-border',
	}
}

export const FONTES_EVENTO: Record<string, string> = {
	alerta: 'Alerta automático',
	aceite: 'Aceite do vendedor',
	reporte: 'Reporte do vendedor',
	cobranca: 'Cobrança automática',
	venda: 'Venda registrada',
	perda: 'Perda registrada',
	correcao_manual: 'Correção manual (gestor)',
}

// Filtros de período: base = movimentação (atualizado_em)
export const PERIODOS = [
	{ dias: 1,  label: 'Hoje' },
	{ dias: 7,  label: 'Semana (7d)' },
	{ dias: 15, label: 'Quinzena (15d)' },
	{ dias: 30, label: 'Mês (30d)' },
	{ dias: 0,  label: 'Tudo' },
] as const
```

- [ ] **Step 2: Criar `info-dica.tsx`**

```tsx
'use client'

import { Info } from 'lucide-react'
import type { ReactNode } from 'react'

// Tooltip (i) acessível: abre no hover e no foco de teclado, sem JS de estado.
export function InfoDica({ children }: { children: ReactNode }) {
	return (
		<span className="relative inline-flex group/dica align-middle" tabIndex={0} aria-label="Ajuda">
			<Info className="w-3.5 h-3.5 text-foreground-secondary/70 hover:text-foreground-secondary cursor-help" />
			<span
				role="tooltip"
				className="invisible opacity-0 group-hover/dica:visible group-hover/dica:opacity-100 group-focus/dica:visible group-focus/dica:opacity-100 transition-opacity absolute left-1/2 -translate-x-1/2 top-full mt-1.5 z-40 w-60 p-2.5 rounded-lg bg-foreground text-background text-[11px] leading-snug font-normal normal-case tracking-normal text-left shadow-lg pointer-events-none"
			>
				{children}
			</span>
		</span>
	)
}
```

- [ ] **Step 3: Verificar** — `npx tsc --noEmit`.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/crm/crm-constants.ts src/app/admin/crm/info-dica.tsx
git commit -m "feat(crm): vocabulário v2 (etapas, situações, fontes) + tooltip InfoDica"
```

---

### Task 5: Redesign do kanban (`crm-admin.tsx`)

**Files:**
- Modify: `src/app/admin/crm/crm-admin.tsx` (reescrever)

**Interfaces:**
- Consumes: `ETAPAS_KANBAN`, `ETAPA_DESCONHECIDA`, `situacaoInfo`, `FONTES_EVENTO`, `PERIODOS`, `InfoDica`.
- Consome a mesma GET `/api/admin/crm/cards` (selectAll — as colunas novas já vêm).

**Requisitos de design (do pedido do usuário — o layout anterior "não entrega nada"):**

1. **KPI strip** acima do board, calculada sobre os cards filtrados: Leads no período · Novos · Em negociação · Ganhos · Perdidos · Valor em aberto (soma de `valor` das etapas não-encerradas, formatado R$). Cada KPI com `InfoDica` explicando o cálculo.
2. **Filtros**: período (`PERIODOS`: Hoje/Semana/Quinzena/Mês/Tudo, base `atualizado_em`) + vendedor (existente). `InfoDica` no filtro de período: "Considera a data da última movimentação do lead (atualizado_em). 'Hoje' = últimas 24h."
3. **5 colunas** na ordem de `ETAPAS_KANBAN`, cabeçalho com dot + label + contagem + `InfoDica` com a `descricao` da etapa. Colunas `w-80`. Etapas fora do contrato viram colunas extras no fim (comportamento defensivo atual, mantido).
4. **Card** (nesta ordem visual):
   - Linha 1: nome (bold, truncate) + badge de `situacao` (via `situacaoInfo`) à direita.
   - Linha 2: valor em R$ (semibold, quando houver) + tempo desde `atualizado_em` (ex.: "3h").
   - Veículo: ícone Car + `veiculo` (interesse); se `veiculo_troca`, linha abaixo "Na troca: {veiculo_troca}" (text-xs, cinza).
   - **Andamento** (se houver): bloco destacado `border-l-2 border-blue-400 pl-2 italic text-xs`, clamp de 3 linhas — é a "última fala do vendedor".
   - **Impedimento** (se houver): bloco vermelho `bg-red-500/10 text-red-600 rounded px-2 py-1 text-xs` com ícone AlertTriangle.
   - **Próxima ação** (se houver): ícone CalendarClock + texto + data `proxima_acao_em` formatada (`dd/mm hh:mm`); se a data já passou, texto em âmbar ("atrasada").
   - **Motivo do encerramento** (só nas colunas encerradas, se houver): "Motivo: {motivo_encerramento}" text-xs.
   - Rodapé: telefone → link WhatsApp (mantido) + vendedor + origem (uppercase 10px).
5. **Modal de detalhes** atualizado: badge etapa + badge situacao; grid com telefone/e-mail/veículo/troca/valor/vendedor/origem; seção "Standup" com andamento, impedimento, próxima ação; motivo do encerramento; linha do tempo (atribuído em → primeiro contato em → atualizado em → encerrado em, só os presentes); `fonte_evento` traduzido via `FONTES_EVENTO` com `InfoDica` ("Qual evento do CRM gerou a última atualização deste card"); JSONB `dados` continua alimentando os campos legados exibidos hoje (observacoes_alerta, ultima_resposta_vendedor) se presentes.
6. `interface CrmCard` do componente ganha os campos novos (`situacao, fonte_evento, andamento, impedimento, proxima_acao, proxima_acao_em, motivo_encerramento, veiculo_troca, atribuido_em, primeiro_contato_em, encerrado_em` — todos `string | null`).
7. Manter: polling 60s, Esc fecha modal, filtro de vendedor com `VENDEDORES_OCULTOS`, estados de loading/erro/vazio, aviso "somente leitura".

- [ ] **Step 1: Reescrever o componente** seguindo os requisitos acima (usar o arquivo atual como base de estrutura; helpers `fmtValor`, `fmtQuando`, `fmtDataHora`, `dadoStr`, `ultimaResposta` são reaproveitados).

- [ ] **Step 2: Verificar** — `npx tsc --noEmit` e `npm run build` (compila).

- [ ] **Step 3: Smoke visual local** — `npx next start` e abrir `/admin/crm` exige login; em vez disso, conferir no build que a rota compila e revisar o JSX. A validação visual real acontece em produção após o deploy (a página é atrás de auth).

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/crm/crm-admin.tsx
git commit -m "feat(crm): kanban v2 — 5 colunas, KPIs, standup no card, filtros de período e tooltips"
```

---

### Task 6: Verificação final

- [ ] **Step 1:** `npx vitest run && npx tsc --noEmit && npm run build` — tudo verde (36 erros de tsc pré-existentes).
- [ ] **Step 2:** Revisar `git diff master --stat`: só arquivos de CRM + migration + types.
- [ ] **Step 3:** Commit final se sobrar ajuste.

---

## Deploy (fora do plano de código — executar após merge)

1. Aplicar migration na VPS: `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/20260727_crm_v2.sql` (backup antes: `pg_dump -t crm_cards`).
2. Definir `CRM_SITE_WEBHOOK_SECRET` no `.env.production` da VPS (valor = o secret usado pelo sistema emissor; enquanto não definido, cai no fallback `FYKOS_CRM_SECRET`).
3. Deploy padrão (`deploy/deploy-vps.sh`).
4. Teste E2E no servidor: POST assinado (HMAC) com card de teste → 200 `{upserts:1}`; repetir com `atualizado_em` menor → `{ignorados:1}`; `{ "remover": ["id-teste"] }` limpa.

## Pendências do usuário

- Valor do `CRM_SITE_WEBHOOK_SECRET` (ou confirmar que o emissor assina com o mesmo `FYKOS_CRM_SECRET` já configurado).
- Confirmar quando o emissor passa a mandar v2 para desligar o header legado (remoção futura do fallback).
