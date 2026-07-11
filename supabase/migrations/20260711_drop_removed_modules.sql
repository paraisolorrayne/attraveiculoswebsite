-- Remove as tabelas dos módulos descontinuados em 2026-07-11:
--   - Banners (admin + site nunca exibiu)
--   - CRM (migrou para o sistema externo Fykos)
--   - Google Reviews (integração descontinuada)
--
-- ⚠️ NÃO APLICAR antes de exportar backup dessas tabelas (histórico de
-- leads/clientes/boletos). Ordem de aplicação combinada:
--   1. Export JSON/dump das tabelas abaixo
--   2. Aplicar esta migration
--
-- Ficam intactos: visitor intelligence (conversion_events, visitor_*,
-- identity_events) e as RPCs calculate_lead_score / check_sales_qualification,
-- que pertencem ao subsistema de visitantes, não ao CRM.

-- ---------- CRM ----------
-- Ordem respeita as FKs (eventos/notas antes das tabelas-mãe).
DROP TABLE IF EXISTS public.eventos_boleto CASCADE;
DROP TABLE IF EXISTS public.boletos CASCADE;
DROP TABLE IF EXISTS public.historico_compras CASCADE;
DROP TABLE IF EXISTS public.eventos_lead CASCADE;
DROP TABLE IF EXISTS public.lead_notes CASCADE;
DROP TABLE IF EXISTS public.leads CASCADE;
DROP TABLE IF EXISTS public.clientes CASCADE;

-- ---------- Banners ----------
DROP TABLE IF EXISTS public.site_banners CASCADE;

-- ---------- Google Reviews ----------
DROP TABLE IF EXISTS public.google_reviews_sync_log CASCADE;
DROP TABLE IF EXISTS public.google_reviews CASCADE;
DROP TABLE IF EXISTS public.google_places CASCADE;

-- Bucket de storage dos banners (objetos precisam ser removidos antes,
-- via API/painel; o DELETE falha silenciosamente se ainda houver objetos).
DELETE FROM storage.objects WHERE bucket_id = 'banner-images';
DELETE FROM storage.buckets WHERE id = 'banner-images';
