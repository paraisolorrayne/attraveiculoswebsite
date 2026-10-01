-- Descarta os vínculos lead→sessão feitos SÓ por janela de horário.
--
-- Até 02/10/2026 a conversa do WhatsApp era ligada ao único clique dos 10
-- minutos anteriores. A auditoria mostrou que isso errava a maioria: dos 17
-- vínculos, só ~4 tinham o DDD compatível com a região da sessão, um mesmo
-- carro foi ligado a 4 leads de carros diferentes, e cliques gravados em dobro
-- foram repartidos entre dois leads. Esses vínculos alimentavam o endpoint de
-- atribuição que a Fykos consulta.
--
-- Nada é apagado: o id da sessão vai para `site_session_id_descartado` (fica
-- para auditoria) e o card deixa de responder atribuição. O clique é liberado
-- para a regra nova (mesmo carro) poder usá-lo, se for o caso.
--
-- Idempotente: só pega cards ainda marcados com a origem antiga.

UPDATE crm_cards
   SET dados = (dados - 'site_session_id')
               || jsonb_build_object(
                    'site_session_id_descartado', dados->>'site_session_id',
                    'site_session_origem', 'correlacao_horario_descartada'
                  )
 WHERE dados->>'site_session_origem' = 'correlacao_clique_whatsapp';

UPDATE whatsapp_clicks
   SET consumido_em = NULL, card_id = NULL
 WHERE card_id IS NOT NULL
   AND card_id IN (
     SELECT id FROM crm_cards WHERE dados->>'site_session_origem' = 'correlacao_horario_descartada'
   );
