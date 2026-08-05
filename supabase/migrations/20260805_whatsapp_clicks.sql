-- Cliques no WhatsApp, para atribuir a conversa sem sujar a mensagem do cliente.
--
-- Até aqui a origem viajava dentro do texto que o COMPRADOR envia à loja
-- ("[ref: 1785952608677-yvi3485tgnb]"). Funcionava, mas externalizava um
-- identificador interno numa mensagem que não é nossa. A decisão foi tirá-lo da
-- mensagem e mandar a referência por outro caminho.
--
-- Este é o outro caminho: no clique gravamos QUEM clicou (a sessão, que carrega
-- utm/campanha/termo) e QUANDO. Quando a conversa chega pelo webhook do CRM sem
-- marcador, ela é correlacionada ao clique mais recente e ainda não usado.
--
-- A correlação é por proximidade de tempo, e portanto MENOS certa que o
-- marcador explícito. Por isso a coluna `consumido_em`: um clique só atribui uma
-- conversa, e a consulta se recusa a escolher quando há mais de um candidato na
-- janela — atribuição errada é pior que ausente, como já aprendemos na colisão
-- de visitor_id.

CREATE TABLE IF NOT EXISTS whatsapp_clicks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_db_id uuid NOT NULL,
  clicked_at    timestamptz NOT NULL DEFAULT now(),
  page_path     text,
  vehicle_id    text,
  -- Preenchidos quando uma conversa é atribuída a este clique.
  consumido_em  timestamptz,
  card_id       text
);

-- A consulta de correlação é sempre "cliques recentes ainda não consumidos".
CREATE INDEX IF NOT EXISTS whatsapp_clicks_janela_idx
  ON whatsapp_clicks (clicked_at DESC)
  WHERE consumido_em IS NULL;

CREATE INDEX IF NOT EXISTS whatsapp_clicks_sessao_idx
  ON whatsapp_clicks (session_db_id);
