# Migração: Supabase → Postgres puro na VPS (Opção B)

> Objetivo: **remover o Supabase por completo** (cloud E software) e rodar só
> PostgreSQL na VPS, com a aplicação falando SQL direto. Substitui a Opção A
> descrita em `MIGRACAO_SUPABASE_VPS.md` (que mantinha o Supabase self-hosted).
>
> Decisão do produto (2026-07-20): aceitar o custo maior (semanas) pra zerar
> qualquer dependência de Supabase.

## Decisões de arquitetura (travadas)

| Camada | Escolha | Substitui |
|---|---|---|
| Acesso a dados | **Kysely** (query builder tipado) + driver `pg` | `@supabase/supabase-js` (203 `.from()`, 8 `.rpc()`) |
| Auth do admin | **Auth.js (NextAuth) Credentials** contra `admin_users` (bcrypt) | GoTrue (`auth.users`, `supabase.auth.*`) |
| Storage | **Disco na VPS (`/var/www/attra-media`) + Nginx** | Supabase Storage (3 buckets) |
| Controle de acesso | **Tudo pela API do Next** (sem RLS; o browser não fala mais com o banco) | 121 políticas RLS anon/authenticated |
| Busca semântica | Kysely + SQL cru (`<=>`), extensão `vector` | RPC `match_vehicles` |

## Por que NÃO é estrangulamento incremental em produção

A RLS é o nó: hoje o **browser** (anon key) lê do banco direto, protegido por
políticas. Em Postgres puro isso deixa de existir — todo acesso do browser tem
que passar pela API do Next. Não dá pra migrar "meia tabela": no dia do corte,
**todos** os caminhos anon-do-browser precisam já estar server-side. Por isso:

> **Estratégia: reconstrução em BRANCH + banco de staging + um único cutover.**
> Não flipar módulo a módulo em produção. Construir tudo (Kysely + Auth.js +
> Storage) contra uma cópia de staging do banco, validar paridade, e cortar.

Durante o desenvolvimento, `DATABASE_URL` aponta pro Postgres de staging; o
site em produção segue no Supabase até o cutover.

---

## Fases

### Fase 0 — Fundação ✅ FEITO (2026-07-20)
- Deps: `kysely`, `pg`, `@types/pg`.
- `src/lib/db/index.ts` — conexão Kysely preguiçosa (pool único, lê `DATABASE_URL`).
- `src/lib/db/types.ts` — interface `Database` (schema tipado). Começa pela fatia
  de **tracking** (`visitor_fingerprints/sessions/page_views`); cresce por módulo.
- `src/lib/db/__tests__/db-smoke.test.ts` — prova que os tipos geram o SQL certo
  (compila queries sem banco).

### Fase 1 — Provisionar Postgres (⚙️ OPS na VPS — precisa de você)
- Instalar PostgreSQL 17 (nativo ou Docker) na VPS.
- `CREATE DATABASE attra; CREATE ROLE attra_app LOGIN PASSWORD '…';`
- Extensões: `CREATE EXTENSION vector; "uuid-ossp"; pgcrypto;` (e `pg_cron`/`pg_net` **não** — crons ficam no `/etc/cron.d`).
- `DATABASE_URL=postgres://attra_app:…@127.0.0.1:5432/attra` no `.env.production` (5432 só em localhost).
- Postgres de **staging** (outro DB/porta) pro desenvolvimento da migração.

### Fase 2 — Schema (⚙️ ops + código)
1. `pg_dump --schema-only --no-owner --no-privileges` do schema `public` do cloud (precisa da connection string do painel Supabase).
2. **Sanitizar**: remover `CREATE POLICY`/`ENABLE ROW LEVEL SECURITY`, refs a `auth.*`/`storage.*`, e roles `anon/authenticated/service_role`. Manter tabelas, índices (HNSW do pgvector!), triggers de negócio, funções SQL úteis.
3. Aplicar no staging e validar (contagem de tabelas, `\df`, índices).

### Fase 3 — Dados (⚙️ ops)
- `pg_dump --data-only` do `public` → restore no staging. Corrigir sequences (`setval`).
- Tabelas grandes de tracking migram antes; delta no cutover.
- **Não** migrar as 11 tabelas de CRM/banners já removidas (DROP em `20260711`).

### Fase 4 — Portar acesso a dados (código) — por módulo, ordem de risco ↑
Para cada módulo: adicionar tabelas em `src/lib/db/types.ts`, trocar `supabase-js` por Kysely, testar (compile-test + integração contra Postgres real).
1. **Tracking** ✅ **MÓDULO 100% PORTADO** — `src/lib/supabase/tracking-client.ts` REMOVIDO.
   - Rotas de escrita: `session`, `pageview`, `interaction`/whatsapp_click, `page-time`, `identify`, `abandoned`, `conversion`. RPCs `increment`/`increment_session_page_views` viraram SQL inline.
   - Reads: `admin/visitors` (embedding do PostgREST → LEFT JOIN + agregação), `admin/visitors/metrics` (counts), `session-explore` (+ **corrigido o bug do UUID**: `session_id` é a string do client, não UUID), `geolocation` (cache IP + update de sessão), `fykos.ts` `lookupSession`.
   - Tabelas tipadas: visitor_fingerprints/sessions/page_views/identity_events/visitor_profiles/conversion_events/ip_geolocation_cache.
   - **12 testes de integração contra PG real** (opt-in via `TEST_DATABASE_URL`; fixture `src/lib/db/__tests__/fixtures/tracking-schema.sql`). Proxy `db` corrigido pra getters do Kysely (`fn`/`dynamic`).
   - Dívida herdada: a Edge Function `ip-geo-updater` do geolocation ainda é do Supabase (código fora do repo, tem fallback ipapi.co) — recuperar numa fase posterior.
2. ✅ **Conteúdo/config SSR** — site_settings, vehicle_section_content, vehicle_sounds (CRUD), vehicle-hero-asset (DB; storage na Fase 6).
3. ✅ **Blog / News** — dual_blog_posts, blog_posts (legado), blog_ai_generations, news_* (+ jobs de ingestão), páginas SSR.
4. ✅ **Marketing** — strategies/tasks/campaigns/comments/history/metrics; embeds PostgREST → `jsonObjectFrom`/`jsonArrayFrom`.
5. ✅ **Newsletter** — campaigns + subscribers (CRUD, import, export, subscribe público).
6. ✅ **CRM / Settings / Misc** — crm_cards + webhook Fykos, settings, cron-status, embeddings/sync + llm/gaps, inventory-snapshot, cleanup-tracking.
7. ✅ **`match_vehicles`** (pgvector) → SQL cru `<=>`.

> **FASE 4 CONCLUÍDA.** Todo o acesso a DADOS está em Kysely. Os únicos `.from()`
> restantes são em `admin_users` (arquivos de auth) → vão na Fase 5. Tipadas ~30
> tabelas em `src/lib/db/types.ts`.

### Fase 5 — Auth ✅ NÚCLEO FEITO (commit 01e591f)
- **Auth.js (next-auth v5) Credentials** contra `admin_users` (bcrypt via `bcryptjs`).
  `src/auth.config.ts` (edge-safe, middleware) + `src/auth.ts` (Node) + route handler
  em `app/api/auth/[...nextauth]`. `getCurrentAdmin`/`isAuthenticated`/`signIn`/`signOut`
  reimplementados em `admin-auth-supabase.ts` — as ~40 rotas não mudam.
- **5 papéis** (admin/owner/operador/marketing/gerente) + matriz de acesso em
  `src/lib/auth/roles.ts`. Migration `20260721_auth_roles_and_password.sql` adiciona
  os valores ao enum + `admin_users.password_hash`.
- `middleware.ts`: gating real por papel (removeu o bypass temporário).
- login/logout + gestão de usuários (create/reset senha) → bcrypt + Kysely.
- **Pendências (precisam do banco real / decisão):**
  1. `AUTH_SECRET` no `.env` (`npx auth secret`).
  2. **Migrar os hashes** GoTrue `auth.users.encrypted_password` → `admin_users.password_hash`
     por `id` (GoTrue usa bcrypt padrão → `bcryptjs.compare` valida; ninguém troca senha).
  3. **Atribuir papéis**: Lorrayne=admin, Cris=owner, Pedro Spini=operador, Eduardo=marketing, + um gerente.
  4. **Reset de senha por e-mail** (token + Resend) — fatia à parte (hoje stub; admin reseta pelo painel de usuários).
  5. Testar login de cada admin no staging ANTES do cutover.

### Fase 6 — Storage ✅ CÓDIGO FEITO
- ✅ **Código**: `src/lib/storage/disk.ts` (nova camada `fs` — `putObject`/`deleteObject`/`publicUrl`/`objectPathFromUrl`, anti path-traversal). `src/lib/supabase/storage.ts` reescrito sobre ela (mesmos exports); `vehicle-hero-asset.ts` e `blog-ai/comparison-image.ts` → `putObject`. `deleteObject`/`objectPathFromUrl` aceitam URL **legada Supabase E nova** (transição). Removidos `client.ts`/`server.ts`/`admin.ts` e as deps `@supabase/*`. **Zero `@supabase` no src.**
- Env: `MEDIA_ROOT` (default `/var/www/attra-media`), `MEDIA_PUBLIC_URL` (default `https://attraveiculos.com.br/media`).
- ⚙️ **OPS (Fase 7)**: criar `/var/www/attra-media` (dono = user do PM2); `location /media/ { alias /var/www/attra-media/; expires 30d; }` no Nginx; `next.config.ts` → adicionar host de `MEDIA_PUBLIC_URL` em `images.remotePatterns` + CSP.
- ⚙️ **OPS (Fase 7)**: baixar os 3 buckets (`audio-files`, `blog-images`, `vehicle-hero-assets`) → `/var/www/attra-media/<bucket>/`; **reescrever URLs `*.supabase.co` gravadas no banco** (`dual_blog_posts`, `vehicle_sounds`, `vehicle_hero_asset`, `newsletter_campaigns`).

### Fase 7 — Cutover (⚙️ ops + você)
- Dump final de dados → restore no Postgres de produção da VPS.
- `.env.production`: setar `DATABASE_URL`, remover as 3 env vars do Supabase.
- Remover deps `@supabase/*`, remover `src/lib/supabase/*` e o browser client.
- Build + `pm2 restart`. Smoke tests: home, veículo, blog (imagens!), som de motor, login admin, form de lead (chegou no Fykos?), busca semântica.
- Manter dump do cloud como fallback por 2–4 semanas.

### Fase 8 — Pós (obrigatório)
- **Backups próprios**: `pg_dump` diário (custom format) + `/var/www/attra-media` → cópia **fora da VPS**. O backup automático do cloud deixa de existir.
- Monitoramento: disco (tracking cresce), healthcheck do PG.
- **Rotacionar** os secrets hardcoded nas migrations de pg_cron (`20260517`, `20260420`) — ficam inertes sem pg_cron, mas o token vazou no git.
- ~~Reativar o auth do middleware~~ ✅ feito na Fase 5 (bypass removido; gating real por role).

---

## Divisão do trabalho
- **Código (eu):** Fase 0 ✅, e Fases 2(sanitização)/4/5/6 (portes) numa branch.
- **Ops na VPS (você):** Fases 1/3/7 — instalar PG, dumps do cloud (precisa das credenciais), restore, janela de cutover. Eu forneço os comandos exatos.

## Anexo — Ponte de atribuição WhatsApp (feita junto do módulo de tracking)

Objetivo: linha do tempo **origem → páginas → clique no WhatsApp → conversa no
Fykos**, com a conversa amarrada à origem (utm/campanha/termo/gclid).

Estado hoje (auditado 2026-07-20):
- ✅ Origem capturada por sessão (`visitor_sessions`), inclusive sem UTM (referrer sempre gravado). Linktree → `referral`, direto → `direto`.
- ✅ Clique no WhatsApp registrado e preso ao `session_id` (`contacted_whatsapp`, `clicked_whatsapp`, `identity_events`).
- ✅ utm 30d / gclid 90d em cookie (last-touch), então a origem sobrevive entre páginas/visitas.
- ❌ **Nada atravessava pro WhatsApp** — o `wa.me?text=` não levava identificador → a conversa no Fykos não ligava à sessão/origem.
- ❌ Sem tela de timeline no admin; `session-explore` tem bug (valida `session_id` como UUID, mas o id real não é UUID).
- ❌ Clique não dispara conversão pro Google/Meta (`/api/tracking/conversion` sem chamador).

Fluxo desenhado:
`wa.me?text=... [ref: <session_id>]` → cliente envia → Avisa/**Fykos** recebe a 1ª mensagem → Fykos empurra o card pro `/api/webhook/fykos-crm` → o handler **extrai o `[ref:]`** → busca `visitor_sessions WHERE session_id = ref` → anexa origem/campanha/termo/gclid ao lead.

Peças:
1. ✅ **FEITO (DB-agnóstico):** `src/lib/whatsapp-ref.ts` (`appendWhatsAppRef`/`extractWhatsAppRef` + testes) e injeção no CTA principal (`src/components/layout/whatsapp-button.tsx`). Sobrevive intacto à migração.
2. ⏳ Cobrir as **outras superfícies wa.me** (`src/lib/constants.ts` `getWhatsAppUrl`, `/links`, barras flutuantes) — ideal: interceptar no listener global de clique do `visitor-tracking-provider.tsx` (reescreve o href com o ref no clique → cobre tudo com 1 ponto).
3. ⏳ **Enriquecer `/api/webhook/fykos-crm`** — `extractWhatsAppRef(card.first_message)` → lookup Kysely em `visitor_sessions` → anexar origem ao card. (Precisa Kysely + staging.)
4. ⏳ **Corrigir `session-explore`** (usar a coluna `session_id`, não UUID) + **tela de timeline** no admin.
5. ⏳ **Ligar `/api/tracking/conversion`** no clique → Google Ads (gclid) / Meta CAPI.

**Dependência do time Fykos (fora do meu código):** o join automático exige que o Fykos ou (a) parseie o `[ref:]` ele mesmo, ou (b) **inclua o texto da 1ª mensagem** no payload que já empurra pro webhook. Sem uma das duas, o ref chega no WhatsApp mas o site não recebe de volta pra fechar o join.

**Dica sem código:** pôr `?utm_source=linktree&utm_medium=bio&utm_campaign=<x>` nos links do próprio Linktree → atribuição precisa em vez de `referral` genérico.

## Riscos principais
1. **Auth** — errar derruba o admin. Mitigar: validar login de cada admin no staging antes do corte.
2. **RLS → API** — mapear todo acesso anon do browser e garantir que virou rota server-side.
3. **URLs de storage no banco** — grep por `supabase.co` num dump de dados antes do corte.
4. **`supabase.rpc('increment')`** (`tracking/session/route.ts:114`) não tem migration correspondente — conferir a função no banco vivo antes do dump.
5. **Edge Function `ip-geo-updater`** — código não está no repo; recuperar do painel ou reescrever (tem fallback ipapi.co).
