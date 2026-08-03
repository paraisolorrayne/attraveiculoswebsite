-- Estrutura das campanhas conforme levantamento de 03/08/2026.
--
-- A lista informada pelo marketing é a verdade: o que não está nela saiu do ar.
-- Substitui a lista de veículos das duas campanhas ativas e remove a campanha
-- "Aquisição de público para o site", que não consta mais.

BEGIN;

-- ─────────────── Campanha Rondon ───────────────
DELETE FROM campaign_vehicles
 WHERE campaign_id = (SELECT id FROM marketing_campaigns WHERE name = 'Campanha Rondon');

INSERT INTO campaign_vehicles (campaign_id, vehicle_name, added_date, display_order, status)
SELECT c.id, v.nome, v.data::date, v.ord, 'publicada'
  FROM marketing_campaigns c,
       (VALUES
         ('Porsche 911 Turbo S Coupe Rubystar Neo', '2026-08-02',  0),
         ('Mercedes G63s 2019',                     '2026-08-01',  1),
         ('Porsche Panamera 4 2023',                '2026-07-24',  2),
         ('Audi RS6 2023',                          '2026-07-24',  3),
         ('BMW M3 Competition 2026',                '2026-07-24',  4),
         ('BMW X6M Competition 2024',               '2026-07-24',  5),
         ('LR Defender X-Dynamic 2026',             '2026-07-08',  6),
         ('Porsche 911 Carrera S 2012',             '2026-07-08',  7),
         ('Mercedes GLE 63s Coupe 2023',            '2026-07-08',  8),
         ('Audi Q5 Advanced 2025',                  '2026-07-08',  9),
         ('Cadillac Escalade',                      '2026-06-23', 10),
         ('Nissan Frontier Xe 2023',                '2026-06-17', 11),
         ('Ram 3500 Night Edition 2022',            '2026-06-16', 12),
         ('Porsche Cayenne Turbo GT 2025',          '2026-06-16', 13),
         ('BMW X6 XDRIVE 40i 2026',                 '2026-06-16', 14),
         ('Porsche Macan 2023',                     '2026-05-26', 15)
       ) AS v(nome, data, ord)
 WHERE c.name = 'Campanha Rondon';

-- ───── Aquisição de público para o perfil ─────
DELETE FROM campaign_vehicles
 WHERE campaign_id = (SELECT id FROM marketing_campaigns
                       WHERE name = 'Aquisição de público para o perfil');

INSERT INTO campaign_vehicles (campaign_id, vehicle_name, notes, display_order, status)
SELECT c.id, '[CORTE] G63 Interior - Cris', 'Público alterado para teste.', 0, 'publicada'
  FROM marketing_campaigns c
 WHERE c.name = 'Aquisição de público para o perfil';

-- ───── Campanha que saiu do ar ─────
DELETE FROM campaign_vehicles
 WHERE campaign_id = (SELECT id FROM marketing_campaigns
                       WHERE name = 'Aquisição de público para o site');
DELETE FROM marketing_campaigns WHERE name = 'Aquisição de público para o site';

COMMIT;
