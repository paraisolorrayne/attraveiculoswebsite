-- Diagnóstico (só leitura, só contagens) da queda dos avisos de clique à Fykos.
-- Uso: ssh attra-vps 'sudo -u postgres psql -d attra -X -P pager=off' < scripts/diagnostico/cliques-whatsapp.sql
--
-- Leitura por coluna, dia a dia (horário de Brasília):
--   sessoes            visitas que o site registrou
--   marcadas_whatsapp  visitas que o navegador marcou como "clicou no WhatsApp"
--   cliques_gravados   linhas em whatsapp_clicks — cada uma dispara um aviso à Fykos
--   sessoes_com_clique visitas distintas com clique gravado
-- Se marcadas_whatsapp cai junto, o problema é no navegador ou no tráfego; se
-- só cliques_gravados cai, o insert falha; se os dois ficam, o aviso é que falha.
\pset footer off
with dias as (
  select d::date as dia
  from generate_series(date '2026-09-25', (now() at time zone 'America/Sao_Paulo')::date, interval '1 day') d
),
s as (
  select (started_at at time zone 'America/Sao_Paulo')::date as dia,
         count(*) as sessoes,
         count(*) filter (where contacted_whatsapp) as marcadas_whatsapp
  from visitor_sessions
  where started_at >= timestamptz '2026-09-25 00:00 -03'
  group by 1
),
c as (
  select (clicked_at at time zone 'America/Sao_Paulo')::date as dia,
         count(*) as cliques_gravados,
         count(distinct session_db_id) as sessoes_com_clique
  from whatsapp_clicks
  where clicked_at >= timestamptz '2026-09-25 00:00 -03'
  group by 1
)
select to_char(d.dia, 'DD/MM') as dia,
       coalesce(s.sessoes, 0) as sessoes,
       coalesce(s.marcadas_whatsapp, 0) as marcadas_whatsapp,
       coalesce(c.cliques_gravados, 0) as cliques_gravados,
       coalesce(c.sessoes_com_clique, 0) as sessoes_com_clique
from dias d
left join s using (dia)
left join c using (dia)
order by d.dia;
