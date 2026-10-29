-- Código invisível do clique no WhatsApp (29/10/2026).
--
-- O clique passa a levar na mensagem pré-preenchida um código de 32 bits em
-- caracteres invisíveis (src/lib/codigo-whatsapp.ts). A Fykos lê o código na
-- primeira mensagem da conversa e o devolve no card (`codigo_whatsapp`). Com o
-- código gravado aqui, o card se liga ao clique exato, sem depender do horário
-- (whatsapp-correlacao-db.ts, `ligarPorCodigo`).
--
-- bigint porque o código vai até 4.294.967.295, acima do integer.
-- Cliques de antes desta data ficam com null.
--
-- Idempotente. Na VPS: sudo -u postgres psql -d attra -v ON_ERROR_STOP=1 -f -

ALTER TABLE whatsapp_clicks ADD COLUMN IF NOT EXISTS codigo_whatsapp bigint;

CREATE INDEX IF NOT EXISTS whatsapp_clicks_codigo_idx
  ON whatsapp_clicks (codigo_whatsapp)
  WHERE codigo_whatsapp IS NOT NULL;
