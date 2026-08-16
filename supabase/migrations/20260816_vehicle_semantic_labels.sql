-- Rótulos de intenção por veículo.
--
-- Separada de vehicle_embeddings de propósito: aquela é derivada e pode ser
-- regerada do zero a qualquer momento; esta contém correção humana, que não
-- pode ser perdida numa ressincronização.
create table if not exists vehicle_semantic_labels (
  vehicle_id        bigint primary key,
  rotulos_uso       text[] not null default '{}',
  rotulos_comprador text[] not null default '{}',
  rotulos_forca     text[] not null default '{}',
  prosa             text,
  -- E-mail de quem sobrescreveu à mão. Nulo = só regra.
  -- É esta coluna que a ressincronização consulta para NÃO sobrescrever.
  sobrescrito_por   text,
  criado_em         timestamptz not null default now(),
  atualizado_em     timestamptz not null default now()
);

create index if not exists idx_vsl_sobrescrito
  on vehicle_semantic_labels (sobrescrito_por)
  where sobrescrito_por is not null;
