-- Auditoria do balão do WhatsApp (23/10/2026).
--
-- O balão verde ("Interesse no Mercedes S-63? / Tenho interesse", ou "Abrir
-- WhatsApp" fora da ficha) abre sozinho no computador 15 s depois da chegada,
-- e também quando o mouse passa pela bolinha. A pergunta: os cliques nele são
-- intenção ou acidente, sobretudo de quem chega por anúncio?
--
-- Cada clique em link do WhatsApp grava o texto do botão (identity_events,
-- event_data.anchor_text). A bolinha só tem ícone: sai sem texto.
-- "Virou card" = o clique foi ligado a uma conversa do CRM (whatsapp_clicks.card_id).
--
-- Só leitura, sem nome, telefone, e-mail, gclid nem IP.

set default_transaction_read_only = on;
set timezone = 'America/Sao_Paulo';
set statement_timeout = '120s';

\echo
\echo '== 1. Últimos 30 dias, por botão'
with cliques as (
  select e.created_at,
         coalesce(nullif(trim(e.event_data->>'anchor_text'), ''), '(sem texto: bolinha verde)') as botao,
         extract(epoch from e.created_at - s.started_at) as seg,
         (coalesce(s.gclid, '') <> '' or coalesce(s.wbraid, '') <> '' or coalesce(s.gbraid, '') <> ''
          or s.utm_medium in ('cpc', 'ppc', 'paid', 'paid_social')) as pago,
         f.device_type as aparelho,
         s.page_views_count as paginas,
         exists (select 1 from whatsapp_clicks w
                  where w.session_db_id = s.id and w.card_id is not null
                    and w.clicked_at between e.created_at - interval '15 seconds' and e.created_at + interval '15 seconds') as virou_card
  from identity_events e
  join lateral (select * from visitor_sessions vs
                 where vs.fingerprint_id = e.fingerprint_id and vs.started_at <= e.created_at
                 order by vs.started_at desc limit 1) s on true
  left join visitor_fingerprints f on f.id = e.fingerprint_id
  where e.event_type = 'interaction_whatsapp'
    and e.created_at >= now() - interval '30 days'
)
select botao,
       count(*) as cliques,
       round(100.0 * avg(pago::int)) as "% pago",
       round(100.0 * avg((aparelho = 'desktop')::int)) as "% computador",
       round(percentile_cont(0.5) within group (order by seg)::numeric) as "mediana s",
       round(100.0 * avg((seg < 3)::int)) as "% <3s",
       round(100.0 * avg((seg >= 15 and seg < 25)::int)) as "% 15-25s",
       round(100.0 * avg((paginas <= 1)::int)) as "% só 1 página",
       round(100.0 * avg(virou_card::int)) as "% virou card"
from cliques
group by botao
order by cliques desc
limit 20;

\echo
\echo '== 2. Só o balão: quando foi o clique, em que aparelho, de onde veio'
\echo '   (antes de 15 s = abriu pelo mouse na bolinha; 15-25 s = logo depois de abrir sozinho)'
with cliques as (
  select extract(epoch from e.created_at - s.started_at) as seg,
         (coalesce(s.gclid, '') <> '' or coalesce(s.wbraid, '') <> '' or coalesce(s.gbraid, '') <> ''
          or s.utm_medium in ('cpc', 'ppc', 'paid', 'paid_social')) as pago,
         f.device_type as aparelho,
         s.page_views_count as paginas,
         exists (select 1 from whatsapp_clicks w
                  where w.session_db_id = s.id and w.card_id is not null
                    and w.clicked_at between e.created_at - interval '15 seconds' and e.created_at + interval '15 seconds') as virou_card
  from identity_events e
  join lateral (select * from visitor_sessions vs
                 where vs.fingerprint_id = e.fingerprint_id and vs.started_at <= e.created_at
                 order by vs.started_at desc limit 1) s on true
  left join visitor_fingerprints f on f.id = e.fingerprint_id
  where e.event_type = 'interaction_whatsapp'
    and e.created_at >= now() - interval '30 days'
    and trim(e.event_data->>'anchor_text') in ('Tenho interesse', 'Abrir WhatsApp')
)
select coalesce(aparelho, '?') as aparelho,
       case when pago then 'anúncio' else 'orgânico/direto' end as origem,
       case when seg < 15 then '1. antes de 15 s'
            when seg < 25 then '2. 15-25 s'
            when seg < 60 then '3. 25-60 s'
            else '4. mais de 1 min' end as quando,
       count(*) as cliques,
       round(100.0 * avg((paginas <= 1)::int)) as "% só 1 página",
       round(100.0 * avg(virou_card::int)) as "% virou card"
from cliques
group by 1, 2, 3
order by 1, 2, 3;

\echo
\echo '== 3. Quem chega por anúncio: de onde sai cada clique no WhatsApp'
with cliques as (
  select case
           when trim(e.event_data->>'anchor_text') in ('Tenho interesse', 'Abrir WhatsApp') then 'balão'
           when coalesce(trim(e.event_data->>'anchor_text'), '') = '' then 'bolinha verde'
           else 'outros botões'
         end as onde,
         (coalesce(s.gclid, '') <> '' or coalesce(s.wbraid, '') <> '' or coalesce(s.gbraid, '') <> ''
          or s.utm_medium in ('cpc', 'ppc', 'paid', 'paid_social')) as pago,
         exists (select 1 from whatsapp_clicks w
                  where w.session_db_id = s.id and w.card_id is not null
                    and w.clicked_at between e.created_at - interval '15 seconds' and e.created_at + interval '15 seconds') as virou_card
  from identity_events e
  join lateral (select * from visitor_sessions vs
                 where vs.fingerprint_id = e.fingerprint_id and vs.started_at <= e.created_at
                 order by vs.started_at desc limit 1) s on true
  where e.event_type = 'interaction_whatsapp'
    and e.created_at >= now() - interval '30 days'
)
select case when pago then 'anúncio' else 'orgânico/direto' end as origem,
       onde,
       count(*) as cliques,
       round(100.0 * count(*) / sum(count(*)) over (partition by pago)) as "% da origem",
       round(100.0 * avg(virou_card::int)) as "% virou card"
from cliques
group by pago, onde
order by pago desc, cliques desc;
