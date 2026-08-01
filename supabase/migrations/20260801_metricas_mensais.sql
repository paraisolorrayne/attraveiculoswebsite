-- =====================================================
-- MIGRATION: resumo mensal de métricas (sobrevive à limpeza dos brutos)
--
-- Contexto: /api/cron/cleanup-tracking roda todo dia às 3:30 e apaga
-- visitor_sessions e visitor_page_views além da janela de retenção. Até aqui
-- a janela era de 60 dias e nada resumia o que ia embora — de 02/06/2026 para
-- trás não existe mais nenhum registro, nem bruto nem agregado.
--
-- Estas tabelas guardam o SIGNIFICADO de cada mês em poucas linhas: quanto
-- cada canal e cada campanha trouxeram, e quais veículos foram mais abertos.
-- O resumo é gravado ANTES de qualquer exclusão (ver a rota de cleanup), então
-- nenhum mês some sem ter sido resumido.
--
-- Grão: mês × canal × campanha. Uma chave primária composta permite reprocessar
-- o mesmo mês quantas vezes for preciso sem duplicar (upsert).
-- =====================================================

CREATE TABLE IF NOT EXISTS public.metricas_mensais (
    mes DATE NOT NULL,                 -- sempre o dia 1 do mês
    canal TEXT NOT NULL,               -- classificarCanal() de src/lib/traffic-channel.ts
    campanha TEXT NOT NULL,            -- '(sem campanha)' quando não veio marcada
    sessoes INTEGER NOT NULL DEFAULT 0,
    visitantes INTEGER NOT NULL DEFAULT 0,
    page_views INTEGER NOT NULL DEFAULT 0,
    veiculos_vistos INTEGER NOT NULL DEFAULT 0,
    whatsapp_cliques INTEGER NOT NULL DEFAULT 0,
    formularios INTEGER NOT NULL DEFAULT 0,
    duracao_total_segundos BIGINT NOT NULL DEFAULT 0,
    sessoes_com_duracao INTEGER NOT NULL DEFAULT 0,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (mes, canal, campanha)
);

COMMENT ON TABLE public.metricas_mensais IS
    'Resumo mensal por canal e campanha. Gravado antes da limpeza dos dados brutos; é o que resta de um mês depois que as sessões são apagadas.';

-- Veículos ficam em tabela própria: o grão é outro (mês × veículo) e repetir
-- isso por linha de campanha inflaria a tabela sem ganho de leitura.
CREATE TABLE IF NOT EXISTS public.metricas_mensais_veiculos (
    mes DATE NOT NULL,
    vehicle_slug TEXT NOT NULL,
    aberturas INTEGER NOT NULL DEFAULT 0,
    sessoes INTEGER NOT NULL DEFAULT 0,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (mes, vehicle_slug)
);

COMMENT ON TABLE public.metricas_mensais_veiculos IS
    'Veículos mais abertos por mês. Mesma finalidade de metricas_mensais: preservar a leitura depois que os page views brutos são apagados.';
