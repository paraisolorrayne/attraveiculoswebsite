-- Parâmetros do Google Ads que o modelo de rastreamento envia e que o site
-- ainda não guardava: tipo de correspondência da palavra-chave, dispositivo em
-- que o anúncio foi clicado e rede onde o clique ocorreu.
--
-- Ficam em colunas próprias, e não no JSONB `metadata`, porque o painel agrupa
-- por elas — dimensão que vira eixo de relatório precisa ser coluna.
--
-- `ads_device` e não `device`: já existe `device_type` no fingerprint, que é o
-- que o NAVEGADOR informa. Este aqui é o que a PLATAFORMA informa. Quase sempre
-- concordam, e quando não concordam isso é sinal, não ruído — por isso os dois
-- coexistem com nomes distintos.
--
-- Sem índice de propósito: são dimensões de baixa cardinalidade (3 a 6 valores)
-- sempre consultadas dentro de um recorte de período, que já tem índice. Índice
-- aqui só custaria escrita.

alter table visitor_sessions
  add column if not exists match_type  text,
  add column if not exists ads_device  text,
  add column if not exists ads_network text;

comment on column visitor_sessions.match_type  is 'matchtype do Google Ads: e (exata), p (frase), b (ampla). Valor cru.';
comment on column visitor_sessions.ads_device  is 'device do Google Ads: m (celular), c (computador), t (tablet). Valor cru, informado pela plataforma.';
comment on column visitor_sessions.ads_network is 'network do Google Ads: g (pesquisa), s (parceiros), d (display), u (smart). Valor cru.';
