-- ============================================================================
-- Fase 3 — Reescreve as URLs de storage do Supabase -> disco/Nginx.
-- Chamado por deploy/migrate-data.sh com:
--   -v old_prefix='https://<ref>.supabase.co/storage/v1/object/public/'
--   -v new_prefix='https://attraveiculos.com.br/media/'
--
-- SEGURO por construção: só troca o PREFIXO do storage público. Qualquer URL que
-- não seja de storage (feed de estoque, link de notícia externa, tracking) não
-- casa com o prefixo e fica intacta. Idempotente (rodar 2x não muda nada).
-- ============================================================================

\echo '  - dual_blog_posts (featured_image + content inline)'
UPDATE dual_blog_posts SET
  featured_image = replace(featured_image, :'old_prefix', :'new_prefix'),
  content        = replace(content,        :'old_prefix', :'new_prefix')
WHERE featured_image LIKE :'old_prefix' || '%'
   OR content        LIKE '%' || :'old_prefix' || '%';

-- blog_posts é legado e pode NÃO existir no banco de origem — o chamador roda
-- este arquivo com ON_ERROR_STOP=0, então um erro aqui não interrompe o resto.
\echo '  - blog_posts (legado — pode não existir)'
UPDATE blog_posts SET
  featured_image = replace(featured_image, :'old_prefix', :'new_prefix'),
  content        = replace(content,        :'old_prefix', :'new_prefix')
WHERE featured_image LIKE :'old_prefix' || '%'
   OR content        LIKE '%' || :'old_prefix' || '%';

\echo '  - news_articles (image_url)'
UPDATE news_articles SET
  image_url = replace(image_url, :'old_prefix', :'new_prefix')
WHERE image_url LIKE :'old_prefix' || '%';

\echo '  - vehicle_sounds (sound_file_url)'
UPDATE vehicle_sounds SET
  sound_file_url = replace(sound_file_url, :'old_prefix', :'new_prefix')
WHERE sound_file_url LIKE :'old_prefix' || '%';

\echo '  - vehicle_hero_asset (no_bg + composite)'
UPDATE vehicle_hero_asset SET
  no_bg_public_url     = replace(no_bg_public_url,     :'old_prefix', :'new_prefix'),
  composite_public_url = replace(composite_public_url, :'old_prefix', :'new_prefix')
WHERE no_bg_public_url     LIKE :'old_prefix' || '%'
   OR composite_public_url LIKE :'old_prefix' || '%';

\echo '  - newsletter_campaigns (featured_image)'
UPDATE newsletter_campaigns SET
  featured_image = replace(featured_image, :'old_prefix', :'new_prefix')
WHERE featured_image LIKE :'old_prefix' || '%';
