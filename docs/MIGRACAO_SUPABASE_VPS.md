# Migração: Supabase Cloud → Banco interno na VPS

> Plano estruturado para tirar o banco de dados do Supabase cloud e hospedá-lo na mesma
> VPS do site (`/var/www/attra`, PM2 + Nginx). Documento de planejamento — nenhum passo
> foi executado ainda.
>
> Trilha relacionada, porém separada: `docs/CRM_MIGRACAO_REGRAS_NEGOCIO.md` trata de
> extrair o CRM para outro projeto. Esta migração move o banco **como está**, sem mudar
> o desenho da aplicação.

---

## 1. O que o Supabase fornece hoje (inventário)

Levantamento feito no código em 2026-07-10:

> **Atualização 2026-07-11:** os módulos Banners, CRM e Google Reviews foram removidos
> do código (CRM migrou para o sistema externo Fykos; leads dos formulários agora vão
> direto ao Fykos via webhook). As 11 tabelas desses módulos **não serão migradas** e
> têm DROP preparado em `supabase/migrations/20260711_drop_removed_modules.sql`
> (aplicar só após backup/export). O bucket `banner-images` também sai (4 → 3 buckets).
> Toda a integração n8n foi removida do site.

| Recurso | Uso no projeto | Impacto na migração |
|---|---|---|
| **Postgres** | ~28 tabelas ativas (`.from(...)`), 38 migrations em `supabase/migrations/` | Núcleo da migração |
| **Extensão pgvector** | `vehicle_embeddings` + RPC `match_vehicles` (busca semântica) | Precisa da extensão no destino |
| **Auth (GoTrue)** | Login do admin (e-mail/senha) via `src/lib/admin-auth-supabase.ts`, gate na tabela `admin_users` | Precisa de equivalente ou migração dos usuários |
| **Storage** | 3 buckets: `audio-files`, `blog-images`, `vehicle-hero-assets` | Migrar arquivos **e reescrever URLs persistidas no banco** |
| **RPCs (SQL functions)** | 8 funções: `calculate_lead_score`, `check_sales_qualification`, `increment`, `increment_session_page_views`, `list_cron_jobs`, `match_vehicles`, `update_admin_last_login`, `update_profile_behavioral_signals` | Migram junto no dump de schema |
| **RLS** | Policies nas migrations; app usa anon key (respeita RLS) + service role (bypass) | Migram no dump; manter os dois níveis de acesso |
| **Realtime** | ❌ não usado | Sem impacto |
| **Edge Functions** | ❌ não usado | Sem impacto |
| **pg_cron** | ❌ não dispara (crons já rodam nativos via `/etc/cron.d` na VPS) | Sem impacto; RPC `list_cron_jobs` (diagnóstico) pode ser aposentada |

Clientes no código: `src/lib/supabase/{client,server,admin,tracking-client,storage}.ts`.
Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

---

## 2. Decisão de arquitetura

### Opção A — Supabase self-hosted na VPS (Docker) ✅ recomendada

Rodar o stack open-source do Supabase em Docker Compose na própria VPS, com os serviços
mínimos: **db (Postgres) + kong (gateway) + auth (GoTrue) + rest (PostgREST) + storage-api**.
Desabilitar: realtime, analytics/logflare, imgproxy (opcional), studio (opcional, só local).

- **Mudança de código: quase zero.** O app continua usando `@supabase/ssr` e
  `@supabase/supabase-js`; troca-se apenas as 3 env vars (URL + chaves novas geradas
  a partir do novo `JWT_SECRET`).
- Auth e Storage continuam funcionando com a mesma API; usuários migram com senha
  (hashes bcrypt vivem no schema `auth` do próprio Postgres).
- Requisito estimado: ~1,5–2 GB de RAM adicionais e ~2× o tamanho atual do banco em disco.

### Opção B — Postgres puro + refatoração do app

Instalar só PostgreSQL (nativo ou Docker) e refatorar o app: `supabase-js` → cliente SQL
(`pg`/Drizzle), Auth → solução própria (ex.: Auth.js/credenciais contra `admin_users`),
Storage → filesystem + Nginx (ou MinIO).

- Stack mínima e sem serviços extras, mas exige reescrever o acesso a dados de **39 tabelas
  espalhadas por dezenas de rotas**, o login do admin e 4 fluxos de upload.
- Estimativa: semanas de trabalho + risco de regressão alto.

### Recomendação

**Opção A agora** (ganho imediato: dado dentro de casa, sem limites/custos do cloud, latência
local app↔banco), e tratar a Opção B como evolução incremental futura, se fizer sentido —
por exemplo, junto com a extração do CRM já planejada.

---

## 3. Fase 0 — Levantamento (pré-requisito para dimensionar)

Rodar na VPS (`ssh attra-vps`):

```bash
free -h && df -h / && nproc                      # RAM / disco / CPU
command -v docker && docker --version            # Docker instalado?
```

Rodar contra o Supabase cloud (com a connection string do painel):

```bash
psql "$SUPABASE_DB_URL" -c "SELECT pg_size_pretty(pg_database_size(current_database()));"
psql "$SUPABASE_DB_URL" -c "SELECT schemaname, relname, n_live_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC LIMIT 20;"
```

E no painel do Supabase: tamanho total do Storage (os 3 buckets) e nº de usuários em Auth.

**Critério de decisão:** a Opção A precisa de ~2 GB de RAM livres. Se a VPS não tiver folga
(o Next standalone + PM2 já consomem), avaliar upgrade da VPS **antes** de começar — é mais
barato que a refatoração da Opção B.

### Resultado do levantamento na VPS (2026-07-10) ✅

- RAM: 7,8 GB total / **4,7 GB disponíveis** → Opção A cabe com folga.
- Disco: 145 GB (130 GB livres, 11% de uso).
- CPU: 4 vCPUs.
- Docker: **ausente** → instalar na Fase 1.
- Swap: **0B** → criar swapfile de 2–4 GB antes de subir o stack (sem swap, pico de
  memória dispara o OOM killer do kernel):

  ```bash
  fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  ```

- Pendente da Fase 0: tamanho do banco e dos buckets no painel do Supabase cloud.

### Pré-migração: retenção de dados (fazer ANTES de migrar) ✅ implementada

A função SQL `cleanup_old_tracking_data(60)` (migration `20260506`) existia, mas estava
agendada via pg_cron — que no Supabase cloud não dispara. Ou seja, **nunca rodou** e o
tracking vinha acumulando sem limpeza.

Corrigido em 2026-07-10 no modelo dos demais crons nativos:
`/api/cron/cleanup-tracking` (rota autenticada por `CRON_SECRET`) + wrapper + crontab
diário 03:30 em `deploy/cron/` (regra documentada no `deploy/cron/README.md`).

**Por que antes de migrar:** rodar a limpeza no cloud primeiro reduz o volume do
dump/restore e do cutover. Após instalar (`sudo bash deploy/cron/install-crons.sh` na
VPS), disparar manualmente uma vez e conferir o total deletado:

```bash
/usr/local/bin/attra-cleanup-tracking.sh && tail -5 /var/log/attra-cleanup-tracking.log
```

---

## 4. Fase 1 — Provisionamento na VPS

1. Instalar Docker + Docker Compose (se ausentes).
2. Clonar o compose oficial self-hosted do Supabase para `/var/www/attra-db/`
   (fora do diretório do site).
3. Configurar `.env` do stack: `POSTGRES_PASSWORD` forte, `JWT_SECRET` novo (≥32 chars),
   gerar `ANON_KEY` e `SERVICE_ROLE_KEY` a partir dele (ferramenta oficial de geração de
   JWT do Supabase), `SITE_URL=https://<domínio do site>`.
4. Enxugar o compose: remover/desabilitar `realtime`, `analytics`, `vector` (log), `studio`
   (ou deixar acessível só via túnel SSH), `imgproxy` se não usar transformação de imagem.
5. **Rede:** publicar somente a porta do Kong e apenas em `127.0.0.1`. Postgres (5432) não
   exposto publicamente — acesso externo só por túnel SSH.
6. Nginx: criar vhost `db.attraveiculos.com.br` (ou similar) → proxy para o Kong local,
   com TLS (certbot). Esse hostname vira o novo `NEXT_PUBLIC_SUPABASE_URL`.
   - Obrigatório ser HTTPS público: o browser do admin fala direto com Auth/Storage.
7. Subir o stack e smoke test: `curl https://db.../auth/v1/health` e `/rest/v1/`.

## 5. Fase 2 — Migração de schema

1. Dump do cloud: `pg_dump --schema-only --no-owner --no-privileges` dos schemas
   `public`, `auth` e `storage` (o compose já cria `auth`/`storage` base — conferir versão
   do GoTrue/storage-api para compatibilidade de schema).
2. Extensões antes do restore: `CREATE EXTENSION IF NOT EXISTS vector; ... "uuid-ossp"; ... pgcrypto;`
3. Aplicar o schema no novo banco e validar: contagem de tabelas (≥39), as 8 RPCs
   (`\df public.*`), policies de RLS (`pg_policies`), índices do pgvector.
4. Alternativa: aplicar as migrations do repo (`supabase/migrations/`) em ordem — mais
   auditável, porém o dump garante fidelidade ao estado real (migrations podem ter sido
   editadas fora do repo). **Usar o dump como fonte da verdade** e conferir divergências
   contra o repo.

## 6. Fase 3 — Migração de dados

1. Ensaio geral (sem janela): `pg_dump --data-only` do cloud → restore no novo banco →
   validar contagens por tabela (script comparando `n_live_tup` / `COUNT(*)` dos dois lados).
2. Corrigir sequences: `SELECT setval(...)` para todas as sequences após o restore
   (o `pg_dump` data-only já inclui, mas conferir).
3. Tabelas de maior volume esperado (tracking): `visitor_page_views`, `visitor_sessions`,
   `identity_events`, `conversion_events` — se a janela de cutover apertar, migrar
   histórico de tracking antes e sincronizar só o delta no dia.

## 7. Fase 4 — Usuários do Auth

Com a Opção A, os usuários migram no dump do schema `auth` (Fase 2/3) — **senhas
preservadas** (hashes bcrypt em `auth.users.encrypted_password`). Validar:

1. Login de cada admin ativo (`admin_users.is_active = true`) no ambiente de teste.
2. Fluxo de reset de senha (`requestPasswordReset` usa `NEXT_PUBLIC_APP_URL` — conferir
   SMTP do GoTrue self-hosted; hoje o e-mail transacional do site é Resend, o GoTrue
   precisa de SMTP próprio → usar o SMTP do Resend).

## 8. Fase 5 — Storage (⚠️ ponto mais traiçoeiro)

1. Baixar todos os objetos dos 3 buckets (script com `storage.list()` + download, ou
   `rclone` via S3 compatível) e subir no storage-api novo, mantendo caminhos.
2. Recriar buckets com a mesma visibilidade (públicos) e policies.
3. **Reescrever URLs absolutas persistidas no banco.** Conteúdo gravado com
   `getPublicUrl()` guarda `https://<projeto>.supabase.co/storage/v1/object/public/...`
   em colunas de `dual_blog_posts` (imagens no corpo/destaque),
   `vehicle_sounds`, `vehicle_hero_asset`, `newsletter_campaigns` (blocos), etc.:

   ```sql
   -- gerar UPDATEs por tabela/coluna; exemplo:
   UPDATE dual_blog_posts SET content = replace(content, 'https://XXXX.supabase.co', 'https://db.attraveiculos.com.br');
   ```

   Mapear antes todas as colunas afetadas com um grep por `supabase.co` num dump de dados.

## 9. Fase 6 — Adaptação do app (mínima)

1. `.env.production` na VPS: trocar `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY` pelos novos valores.
2. **CSP** em `next.config.ts`: `connect-src` inclui `https://*.supabase.co` e
   `wss://*.supabase.co` — adicionar o novo host (`https://db.attraveiculos.com.br`) e,
   após período de estabilidade, remover os antigos.
3. `next.config.ts` `images.remotePatterns`/`domains` (se houver referência a
   `*.supabase.co` para `next/image`) → incluir o novo host.
4. Rebuild + deploy conforme runbook (`docs/DEPLOY_VPS.md`); lembrar que env é carregado
   no shell antes do `pm2 start` (bundle standalone).
5. Crons nativos (`/etc/cron.d`) chamam rotas do próprio site — sem mudança.

## 10. Fase 7 — Cutover

1. Agendar janela curta (madrugada; site é leitura-pesada, escrita é tracking + admin).
2. Congelar escrita: colocar site em modo manutenção OU aceitar perda de minutos de
   tracking (decisão de negócio — leads dos formulários seguem indo ao Fykos direto).
3. Dump final incremental (ou full, se o banco for pequeno) → restore → validar contagens.
4. Trocar env vars → `pm2 restart` (com env recarregado).
5. **Smoke tests:** home, página de veículo, blog (imagens!), sons de motor (áudio),
   login no admin, formulário de lead (chegou no Fykos?), busca semântica
   (`/api/vehicles/search`), formulário de lead do site.
6. Manter o projeto Supabase cloud **intocado e pausável** por 2–4 semanas como fallback.

## 11. Rollback

Reverter as 3 env vars para o cloud + `pm2 restart`. Perde-se apenas o que foi escrito no
banco novo durante a janela — por isso validar tudo antes de liberar tráfego de admin.

## 12. Pós-migração (obrigatório antes de considerar concluído)

- **Backups:** cron diário de `pg_dump` (custom format) + cópia dos volumes de storage,
  com retenção e **cópia fora da VPS** (ex.: rclone para um object storage barato).
  Hoje o Supabase cloud faz backup automático — isso passa a ser responsabilidade nossa.
- **Monitoramento:** healthcheck dos containers (restart policy `always` + alerta),
  espaço em disco (tracking cresce), e teste de restore do backup 1×/mês.
- **Segurança:** revisar que 5432 não está exposto; secrets fora do git; considerar
  reativar o auth do middleware (`src/middleware.ts` está com o bloco comentado — dívida
  já documentada em `ADMIN_PANEL.md` §2).
- Atualizar `docs/DEPLOY_VPS.md` com o novo componente (stack do banco, backups).
- Encerrar/downgrade do projeto Supabase cloud ao fim do período de fallback.

---

## 13. Checklist resumido

- [ ] Fase 0: specs da VPS + tamanho do banco/storage → confirmar Opção A
- [ ] Fase 1: stack self-hosted no ar (kong/auth/rest/storage), TLS, portas fechadas
- [ ] Fase 2: schema + extensões + RPCs + RLS validados
- [ ] Fase 3: ensaio de dados com contagens batendo
- [ ] Fase 4: logins de admin funcionando no ambiente novo
- [ ] Fase 5: objetos migrados + URLs reescritas no banco
- [ ] Fase 6: envs, CSP e build validados em staging local apontando pro banco novo
- [ ] Fase 7: cutover + smoke tests
- [ ] Fase 8: backups + monitoramento + doc de deploy atualizada
- [ ] Desativar projeto cloud
