-- Board de marketing: o card passa a ser o VEÍCULO, não a campanha.
--
-- As colunas do board são "Publicada / Encerrada por Ganho / Encerrada por
-- Desempenho" — o ciclo de vida de um anúncio de veículo, não o de uma
-- campanha inteira. Um carro sai do ar porque vendeu (ganho) ou porque não
-- performou; a campanha em si segue existindo e agrupando os outros. Até aqui
-- o status vivia só em marketing_campaigns, então mover um card arrastava
-- todos os veículos da campanha junto.
--
-- ended_date e end_reason continuam onde estão: guardam QUANDO e POR QUÊ, e
-- este status guarda ONDE o card está no board.

ALTER TABLE campaign_vehicles
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'publicada';

-- Mesmos valores das colunas do board.
ALTER TABLE campaign_vehicles
  DROP CONSTRAINT IF EXISTS campaign_vehicles_status_check;
ALTER TABLE campaign_vehicles
  ADD CONSTRAINT campaign_vehicles_status_check
  CHECK (status IN ('publicada', 'encerrada_ganho', 'encerrada_desempenho'));

-- Quem já tinha data de encerramento nasce encerrado, para o board não
-- mostrar como no ar um anúncio que a equipe já tinha baixado.
UPDATE campaign_vehicles
   SET status = CASE
     WHEN end_reason ILIKE '%ganho%' OR end_reason ILIKE '%vend%' THEN 'encerrada_ganho'
     ELSE 'encerrada_desempenho'
   END
 WHERE ended_date IS NOT NULL AND status = 'publicada';

CREATE INDEX IF NOT EXISTS campaign_vehicles_status_idx
  ON campaign_vehicles (status);
