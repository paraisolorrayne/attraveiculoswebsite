# Cron Troubleshooting — Rotinas Automáticas Attra

Diagnóstico para quando o blog AI / news ingestion / hero preprocess **não dispara**.

> **IMPORTANTE — como o agendamento realmente funciona:** as rotinas rodam via
> **cron nativo do Linux** (`/etc/cron.d/`) na VPS, **não** via Supabase pg_cron.
> O pg_cron managed *agenda* mas **não executa** (o `net.http_post`/pg_net não
> dispara de fato — `cron.job_run_details` fica vazio). Os jobs do pg_cron foram
> desabilitados (`cron.unschedule(...)`) para não confundir. Toda a seção
> "pg_cron" das versões antigas deste doc está obsoleta.

## Mapa das rotinas

| Rotina | Job | Endpoint | Wrapper (VPS) | `/etc/cron.d/` | Frequência | Log |
|---|---|---|---|---|---|---|
| Blog AI | `src/lib/jobs/daily-blog-ai.ts` | `GET/POST /api/cron/blog-ai` | `/usr/local/bin/attra-blog-ai.sh` | `attra-blog-ai` | `0 4 * * 0` (dom 04:00 UTC) | `/var/log/attra-blog.log` |
| News ingestion | `src/lib/jobs/weekly-news-ingestion.ts` | `GET/POST /api/cron/news-ingestion` | `/usr/local/bin/attra-news-ingestion.sh` | `attra-news-ingestion` | `0 3 * * 0` (dom 03:00 UTC) | `/var/log/attra-news.log` |
| Hero preprocess | `scripts/preprocess-hero-assets.ts` | `GET /api/cron/hero-preprocess` | `/usr/local/bin/attra-hero-preprocess.sh` | `attra-hero-preprocess` | `0 */6 * * *` (a cada 6h) | `/var/log/attra-hero.log` |

Cada wrapper segue o mesmo padrão:

```bash
#!/usr/bin/env bash
set -e
cd /var/www/attra
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
set -a; . /var/www/attra/.env.production; set +a
curl -sS --max-time 300 "http://localhost:3000/api/cron/<job>?secret=$CRON_SECRET"
```

## Checklist de validação em produção

### 1. O wrapper existe? (causa nº 1 de "cron não roda")

O `/etc/cron.d/<job>` pode existir e o cron disparar, mas se o **wrapper em
`/usr/local/bin/` sumir**, falha em silêncio. O sintoma no log é
`No such file or directory`.

```bash
ssh root@<vps>
ls -la /usr/local/bin/attra-*.sh        # os 3 devem existir e ser executáveis
cat -A /etc/cron.d/attra-news-ingestion # confira o schedule e o caminho do wrapper
```

> **Histórico:** em mai/2026 o `/news` ficou sem ciclo novo de ~abr até 28/mai
> porque o wrapper `attra-news-ingestion.sh` havia sumido — o cron disparava
> todo domingo e morria com `No such file or directory`. Recriado via base64.

Recriar um wrapper sumido (exemplo news):

```bash
# do seu terminal local; o base64 evita problema de aspas no SSH
echo '<base64-do-wrapper>' | ssh root@<vps> \
  'base64 -d > /usr/local/bin/attra-news-ingestion.sh && chmod +x /usr/local/bin/attra-news-ingestion.sh'
```

### 2. O serviço de cron está ativo?

```bash
systemctl is-active cron || systemctl is-active crond   # deve responder "active"
```

### 3. Conferir env

```bash
cd /var/www/attra
grep -E "CRON_SECRET|GEMINI_API_KEY|GNEWS_API_KEY|SUPABASE" .env.production | sed 's/=.*/=.../'
```

Se `CRON_SECRET` estiver vazio, o endpoint retorna **401 Unauthorized** e o cron
falha silenciosamente. O wrapper carrega `.env.production` antes do `curl`.

### 4. Ler o log da última execução

```bash
tail -40 /var/log/attra-news.log
tail -40 /var/log/attra-blog.log
```

Cada run imprime marcadores `===== <timestamp> — <job> start/done =====` e o JSON
de resposta do endpoint. Procure por `failed`, `401`, `error`, ou
`No such file or directory`.

### 5. Disparar manualmente (rodar agora)

```bash
cd /var/www/attra
set -a; . .env.production; set +a

# News ingestion
curl -sS --max-time 300 "http://localhost:3000/api/cron/news-ingestion?secret=$CRON_SECRET"

# Blog AI (aceita &force=1 para pular a idempotência diária)
curl -sS --max-time 300 "http://localhost:3000/api/cron/blog-ai?secret=$CRON_SECRET&force=1"
```

Resposta esperada: `200` com JSON `{ "message": "... completed ..." }`.
- `401` → secret errado/vazio.
- `500` → falha no job (o JSON traz `error`/`errors`; cheque `pm2 logs attra`).

### 6. Conferir o estado dos dados (news)

A página `/news` só mostra conteúdo se houver um `news_cycle` com `is_active = true`.
Consulte direto via REST (service role):

```bash
cd /var/www/attra; set -a; . .env.production; set +a
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/news_cycles?select=id,week_start,week_end,is_active,created_at&order=created_at.desc&limit=6" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

Espere exatamente **uma** linha com `is_active: true` apontando para a semana corrente.

> Atenção a cache: `/api/news` tem `revalidate = 3600` e a página `/news` é ISR.
> Após uma ingestão manual, o `revalidatePath('/news')` do job atualiza a página,
> mas o endpoint `/api/news` pode servir resposta cacheada por até 1h.

### 7. Diagnóstico via endpoint admin

```
https://attraveiculos.com.br/api/admin/cron-status
```

## Hipóteses ordenadas por probabilidade

1. **Wrapper sumido em `/usr/local/bin/`** → passo 1 (log mostra `No such file or directory`).
2. **`CRON_SECRET` vazio no `.env.production`** → endpoint 401 → passo 3/5.
3. **Job falha no meio** (Gemini/GNews/Supabase) → passo 4/5, leia o `errors[]` do JSON.
4. **Serviço de cron inativo** → passo 2.
5. **Alguém reativou o pg_cron** → ignore; ele não executa. O agendador real é o `/etc/cron.d`.
