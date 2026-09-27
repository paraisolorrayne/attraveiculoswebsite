-- wbraid / gbraid em visitor_sessions.
--
-- O Google Ads manda UM destes NO LUGAR do gclid quando o clique vem do iOS com
-- rastreamento limitado (ATT): `gbraid` no caminho web→app e `wbraid` no
-- app→web. Como o site só capturava gclid, esse tráfego chegava sem nenhum
-- identificador de clique pago e era lido como orgânico — exatamente o furo que
-- o handoff da Fykos de 27/09/2026 aponta em "quem chega por Google Ads cai
-- muitas vezes com gclid e sem UTM".
--
-- Colunas separadas, e não uma coluna só com o valor: os três identificam
-- clique pago do Google, mas a API de conversões os trata por nomes diferentes,
-- e juntá-los aqui obrigaria a adivinhar qual era na hora de enviar.
ALTER TABLE visitor_sessions ADD COLUMN IF NOT EXISTS wbraid text;
ALTER TABLE visitor_sessions ADD COLUMN IF NOT EXISTS gbraid text;

-- Os painéis filtram "tem clique pago do Google" com frequência; o índice
-- parcial cobre os dois sem pesar nas linhas que não têm nenhum.
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_braid
  ON visitor_sessions (started_at DESC)
  WHERE wbraid IS NOT NULL OR gbraid IS NOT NULL;
