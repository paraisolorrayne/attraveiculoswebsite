-- Remove a tabela page_channel_settings — não usamos mais o roteamento
-- por canal (Leadster vs WhatsApp). O botão flutuante agora é sempre um
-- redirect direto para o WhatsApp, e o formulário de contato dispara
-- notificações via Email (Resend) + WhatsApp (Avisa API).
--
-- CASCADE remove índices e policies dependentes criados em:
--   20260120_create_page_channel_settings.sql
--   20260217_security_fixes.sql (bloco 8)

DROP TABLE IF EXISTS public.page_channel_settings CASCADE;
