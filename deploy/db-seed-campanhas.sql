-- Migra o controle de campanhas da mensagem pinada do WhatsApp
-- ("Estrutura atual – 25/06/2026") para o board de Marketing do admin.
--
-- Também cria a tabela campaign_vehicles, que nunca foi aplicada em
-- produção (o board de campanhas quebrava sem ela).
--
-- Idempotente: só insere se as campanhas ainda não existirem.
-- Uso: psql "postgresql://..." -v ON_ERROR_STOP=1 -f deploy/db-seed-campanhas.sql

-- 1) Tabela que faltava em produção
CREATE TABLE IF NOT EXISTS public.campaign_vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
    vehicle_name TEXT NOT NULL,
    added_date DATE,
    notes TEXT,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.campaign_vehicles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'campaign_vehicles') THEN
        CREATE POLICY "Admin can manage campaign vehicles"
            ON public.campaign_vehicles FOR ALL
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.admin_users
                    WHERE admin_users.id = auth.uid()
                    AND admin_users.role = 'admin'
                )
            );
    END IF;
END $$;

-- 2) Seed das 3 campanhas (estado do WhatsApp em 25/06/2026)
DO $$
DECLARE
    v_rondon UUID;
    v_perfil UUID;
    v_site UUID;
BEGIN
    IF EXISTS (SELECT 1 FROM public.marketing_campaigns WHERE name = 'Campanha Rondon') THEN
        RAISE NOTICE 'Campanhas já existem — seed pulado';
        RETURN;
    END IF;

    INSERT INTO public.marketing_campaigns (name, description, status)
    VALUES ('Campanha Rondon',
            'Veículos em anúncio. Migrado da mensagem pinada do WhatsApp (estrutura de 25/06/2026).',
            'publicada')
    RETURNING id INTO v_rondon;

    INSERT INTO public.marketing_campaigns (name, description, status)
    VALUES ('Aquisição de público — perfil',
            'Campanha de aquisição de público para o perfil do Instagram. Migrado do WhatsApp (25/06/2026).',
            'publicada')
    RETURNING id INTO v_perfil;

    INSERT INTO public.marketing_campaigns (name, description, status)
    VALUES ('Aquisição de público — site',
            'Campanha de aquisição de público para o site. Migrado do WhatsApp (25/06/2026).',
            'publicada')
    RETURNING id INTO v_site;

    INSERT INTO public.campaign_vehicles (campaign_id, vehicle_name, added_date, display_order) VALUES
        (v_rondon, 'Porsche Macan T 2024',                        '2026-05-07', 1),
        (v_rondon, 'LR Defender X-Dynamic 2023',                  '2026-05-14', 2),
        (v_rondon, 'Audi Q5 Prestige 2022',                       '2026-05-26', 3),
        (v_rondon, 'Porsche Macan 2023',                          '2026-05-26', 4),
        (v_rondon, 'Porsche Macan T 2025',                        '2026-05-30', 5),
        (v_rondon, 'Mercedes GLC 300 Coupé 2023',                 '2026-05-30', 6),
        (v_rondon, 'BMW X4 M40i 2024',                            '2026-05-30', 7),
        (v_rondon, 'LR Discovery HSE R-Dynamic 2023',             '2026-06-16', 8),
        (v_rondon, 'LR Defender X-Dynamic 2023 (2º)',             '2026-06-16', 9),
        (v_rondon, 'BMW X6 xDrive 40i 2026',                      '2026-06-16', 10),
        (v_rondon, 'Audi RS6 2023',                               '2026-06-16', 11),
        (v_rondon, 'Mercedes AMG GT63 S Performance 2025',        '2026-06-16', 12),
        (v_rondon, 'Ram 3500 Night Edition 2022',                 '2026-06-16', 13),
        (v_rondon, 'Porsche Cayenne Turbo GT 2025',               '2026-06-16', 14),
        (v_rondon, 'LR Discovery Metropolitan Edition 2025',      '2026-06-16', 15),
        (v_rondon, 'Nissan Frontier 2023',                        '2026-06-17', 16),
        (v_rondon, 'Cadillac Escalade',                           '2026-06-23', 17);

    INSERT INTO public.campaign_vehicles (campaign_id, vehicle_name, added_date, display_order) VALUES
        (v_perfil, 'Reels — Pneu frio = acidente',                NULL,          1),
        (v_perfil, 'Reels — GLE 63 S Coupé',                      '2026-06-17',  2);

    INSERT INTO public.campaign_vehicles (campaign_id, vehicle_name, added_date, display_order) VALUES
        (v_site, 'Reels do Estoque',                              NULL,          1);

    RAISE NOTICE 'Seed concluído: 3 campanhas, 20 itens';
END $$;

-- Conferência
SELECT c.name, c.status, count(v.id) AS itens
FROM public.marketing_campaigns c
LEFT JOIN public.campaign_vehicles v ON v.campaign_id = c.id
GROUP BY c.id, c.name, c.status
ORDER BY c.name;
