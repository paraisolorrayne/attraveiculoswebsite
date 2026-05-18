# Cron Troubleshooting — Rotinas Automáticas Attra

Diagnóstico para quando o "Insights" / blog AI / news ingestion **não dispara**.

## Mapa das rotinas

| Rotina | Arquivo do job | Endpoint | Agendador | Frequência |
|---|---|---|---|---|
| Blog AI diário | `src/lib/jobs/daily-blog-ai.ts` | `POST /api/cron/blog-ai` | Supabase pg_cron (migration `20260420_blog_ai_automation.sql`) | 11:00 UTC diário (08:00 BRT) |
| News ingestion semanal | `src/lib/jobs/weekly-news-ingestion.ts` | `GET /api/cron/news-ingestion` | Supabase pg_cron (migration `20260517_schedule_news_ingestion_cron.sql`) | Domingo 03:00 UTC (00:00 BRT) |

> **Histórico:** o news-ingestion era disparado pelo `vercel.json`, que foi removido no commit `3a3f143` (migração Vercel → VPS Interlivre + PM2). A migration `20260517` recoloca esse agendamento dentro do pg_cron.

## Checklist de validação em produção

### 1. SSH na VPS — conferir env

```bash
ssh user@vps-interlivre
cd /caminho/do/projeto
printenv | grep -E "CRON_SECRET|NEXT_PUBLIC_SITE_URL|SUPABASE"
# Espere ver:
#   CRON_SECRET=<algum_valor>
#   NEXT_PUBLIC_SITE_URL=https://attraveiculos.com.br
#   NEXT_PUBLIC_SUPABASE_URL=...
#   SUPABASE_SERVICE_ROLE_KEY=...
```

Se `CRON_SECRET` estiver vazio, o endpoint retorna **401 Unauthorized** e o pg_cron vai falhar silenciosamente.

### 2. Conferir migrations aplicadas

Via CLI:

```bash
npx supabase migration list --linked
```

Espere ver tanto `20260420_blog_ai_automation` quanto `20260517_schedule_news_ingestion_cron` na coluna "Remote".

Via SQL Editor do Supabase Dashboard:

```sql
SELECT version, name FROM supabase_migrations.schema_migrations
WHERE name LIKE '%blog_ai%' OR name LIKE '%news_ingestion%';
```

### 3. Conferir jobs no pg_cron

SQL Editor do Supabase Dashboard:

```sql
SELECT jobid, jobname, schedule, active, command
FROM cron.job
WHERE jobname IN ('daily-blog-ai', 'weekly-news-ingestion');
```

Espere 2 linhas com `active = true`. Se faltar `weekly-news-ingestion`, aplique a migration `20260517`.

### 4. Curl manual no endpoint

Da VPS (ou de qualquer máquina com o `CRON_SECRET` em mãos):

```bash
# Blog AI
curl -X POST https://attraveiculos.com.br/api/cron/blog-ai \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{}'

# News ingestion
curl -X POST https://attraveiculos.com.br/api/cron/news-ingestion \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Respostas esperadas: 200 com JSON `{ message: "..." }`. Se vier 401 → secret errado/vazio. Se vier 500 → falha no job (ver logs do PM2: `pm2 logs`).

### 5. Logs do pg_cron

SQL Editor:

```sql
SELECT jobid, runid, job_pid, status, return_message, start_time, end_time
FROM cron.job_run_details
WHERE jobid IN (
    SELECT jobid FROM cron.job
    WHERE jobname IN ('daily-blog-ai', 'weekly-news-ingestion')
)
ORDER BY start_time DESC
LIMIT 20;
```

Se `status = 'failed'`, leia `return_message`. Se vier `401`, secret está errado no comando do cron — re-rode a migration com o secret atual.

### 6. Diagnóstico rápido — script CLI

Da máquina local (apontando para prod) ou da VPS:

```bash
npx tsx scripts/check-cron-status.ts
```

Imprime: jobs do pg_cron, últimas 5 runs do blog AI, últimos 3 news_cycles, e env vars críticas (sem expor valores).

### 7. Diagnóstico via endpoint admin

Logado como admin no painel, abra:

```
https://attraveiculos.com.br/api/admin/cron-status
```

Retorna JSON com o mesmo conteúdo do script CLI.

## Hipóteses ordenadas por probabilidade

1. **Migration `20260420` não aplicada no banco prod** → checklist passo 2/3.
2. **`CRON_SECRET` vazio no `.env.production` da VPS** → endpoint 401 → passo 1/4.
3. **News-ingestion órfão pós-Vercel** → aplique migration `20260517` (passo 2).
4. **PM2 sem cron próprio** — não é necessário; pg_cron faz HTTP direto.
