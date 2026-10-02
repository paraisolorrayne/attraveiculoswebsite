-- Diagnóstico (só leitura, só contagens) da aba Leads da área da Media House.
-- Uso: ssh attra-vps 'sudo -u postgres psql -d attra -X -P pager=off' < scripts/diagnostico/leads-agencia.sql
\pset footer off
\echo '== Cards do CRM nos últimos 30 dias, por como foram ligados ao site'
select coalesce(dados->>'site_session_origem', '(sem ligação)') as ligacao, count(*) as cards
from crm_cards where criado_em >= now() - interval '30 days'
group by 1 order by 2 desc;

\echo '== Visitas com marcador da Media House nos últimos 30 dias'
with mh as (select * from agencias where slug = 'media-house')
select count(distinct s.id) as visitas_mh,
       count(distinct s.id) filter (where s.contacted_whatsapp) as clicaram_whatsapp,
       count(distinct w.card_id) as cliques_ligados_a_card
from visitor_sessions s
cross join mh
left join whatsapp_clicks w on w.session_db_id = s.id
where s.started_at >= now() - interval '30 days'
  and (
    exists (select 1 from unnest(mh.prefixos) p(v) where btrim(v) <> '' and (
      starts_with(lower(btrim(coalesce(s.utm_campaign, ''))), lower(btrim(v)))
      or starts_with(lower(btrim(coalesce(s.utm_content, ''))), lower(btrim(v)))))
    or exists (select 1 from unnest(mh.utm_medium_marca) m(v) where btrim(v) <> '' and lower(btrim(coalesce(s.utm_medium, ''))) = lower(btrim(v)))
    or exists (select 1 from unnest(mh.ids_campanha) i(v) where btrim(v) <> '' and lower(btrim(coalesce(s.utm_id, ''))) = lower(btrim(v)))
  );

\echo '== Perfis identificados no site com telefone (caminho da ligação por telefone)'
select count(*) as perfis_com_telefone from visitor_profiles where phone is not null;
