# Kit de cron — rotinas automáticas da Attra (VPS)

Fonte da verdade versionada dos crons nativos do Linux que rodam na VPS. Antes
disso, wrappers e crontabs existiam **só na VPS** e sumiam em silêncio (o
`attra-news-ingestion.sh` desapareceu 2x, deixando `/news` sem ciclo novo por
semanas). Agora o estado desejado vive no repo e o `install-crons.sh` o aplica.

> Por que cron nativo e não pg_cron: o pg_cron do Supabase managed **agenda mas
> não executa** (pg_net não dispara). Diagnóstico e troubleshooting em
> [`../../docs/CRON_TROUBLESHOOTING.md`](../../docs/CRON_TROUBLESHOOTING.md).

## Conteúdo

```
deploy/cron/
  wrappers/                     # -> /usr/local/bin/ (0755)
    attra-blog-ai.sh            # curl /api/cron/blog-ai
    attra-news-ingestion.sh     # curl /api/cron/news-ingestion
    attra-hero-preprocess.sh    # npm run hero:preprocess (tsx, sem HTTP)
    attra-cleanup-tracking.sh   # curl /api/cron/cleanup-tracking (retenção 60d)
  cron.d/                       # -> /etc/cron.d/ (0644, root)
    attra-blog-ai               # 0 4 * * *   (diário 04:00)
    attra-news-ingestion        # 0 3 * * *   (diário 03:00 — no-op se o ciclo tem <6 dias; auto-cura quando o domingo falha)
    attra-hero-preprocess       # 0 */6 * * * (a cada 6h)
    attra-cleanup-tracking      # 30 3 * * *  (diário 03:30)
  install-crons.sh              # aplica tudo, idempotente, valida com ls
```

Todos os horários são **hora local da VPS** (atualmente UTC+2). Cada job loga em
`/var/log/attra-<job>.log`.

## Instalar / atualizar na VPS

```bash
cd /var/www/attra
git pull --ff-only origin master
sudo bash deploy/cron/install-crons.sh
```

O script copia os wrappers (chmod +x), instala os crontabs com permissão correta,
recarrega o cron e **valida com `ls` que os wrappers existem e são
executáveis** — se algum sumir de novo, o erro aparece aqui em vez de falhar
silenciosamente no domingo seguinte.

## Disparar manualmente (testar agora)

```bash
/usr/local/bin/attra-news-ingestion.sh
/usr/local/bin/attra-blog-ai.sh          # aceita force via endpoint: &force=1
/usr/local/bin/attra-hero-preprocess.sh
/usr/local/bin/attra-cleanup-tracking.sh # retenção: apaga tracking/caches >60d
```

## Regra de retenção de dados (attra-cleanup-tracking)

Executa diariamente a função SQL `cleanup_old_tracking_data(60)` (migration
`20260506_data_retention_cleanup.sql`) via `/api/cron/cleanup-tracking`. O
pg_cron do Supabase nunca a executou — este cron nativo é quem garante a regra.

- **Apaga (>60 dias):** `visitor_page_views`, `visitor_sessions`,
  `identity_events`, `ip_geolocation_cache`, `ip_company_cache`.
- **NUNCA apaga (dado de negócio):** leads, CRM, `conversion_events`, blog,
  notícias, marketing, newsletter.
- Janela ajustável por chamada (`?days=N`, mínimo 30); o cron usa o padrão 60.
- A regra continua válida após a migração do banco para a VPS
  ([`../../docs/MIGRACAO_SUPABASE_VPS.md`](../../docs/MIGRACAO_SUPABASE_VPS.md)) —
  o endpoint fala com o banco que estiver configurado no `.env.production`.
