# Área da agência ("Marketing Media House")

**Data:** 2026-10-02 · Depende de: auditoria de cliques/atribuição de 02/10
(commits 11e8bab, 5bf6dff, f959d5b, 393f847) e da tabela de campanhas com
score (714a725, 5b090ec).

## Problema

A Media House (VA) roda campanhas para a Attra em Google, Meta e WebMotors e
hoje não tem como ver o resultado delas: o painel de Visitantes mistura todas
as origens, só o time da Attra o acessa, e o CRM não diz de qual campanha veio
cada lead. A loja quer dar à agência uma área própria com (1) tudo de
Visitantes filtrado para as campanhas dela e (2) um mini CRM que confronte
quem clicou no WhatsApp com os leads das campanhas dela que estão com vendedor,
sem expor vendedor nem cliente.

## Decisões (fechadas com a usuária)

1. **Lead → campanha:** pedir à Fykos que mande campanha/anúncio no card (pedido
   enviado em 02/10) e, até lá, mostrar o que já é possível — leads ligados por
   clique no site. A tela nasce pronta para os campos da Fykos.
2. **Portal ≠ campanha no portal.** `origem = portal` inclui iCarros, OLX,
   Mobiauto etc. e não é atribuível à agência. A campanha da Media House
   **dentro** da WebMotors é outro mundo, e vamos verificar a possibilidade de a
   WebMotors enviar os dados dessas campanhas para nós (fonte a definir; até
   lá, a campanha é cadastrada e casa com as visitas que trouxerem a UTM dela).
   As campanhas da **Meta** fazem um **A/B: braço "site" × braço "WhatsApp
   direto"**, e os dados precisam considerar os dois braços.
3. **Acesso:** contas próprias da agência, com papel novo `agencia`; desenho
   **genérico para várias agências** (a EB entra depois só com cadastro). Time
   da Attra (admin, owner, operador) vê a área de qualquer agência.
4. **Status no mini CRM:** com vendedor (novo, em atendimento, em negociação) ·
   vendido (ganho) · descartado (perdido). Nunca vendedor, cliente ou valor.
5. **Cadastro de campanha vale na hora**, sem aprovação. Mantida só uma trava
   técnica: o mesmo ID (ou o mesmo nome na mesma plataforma) não pertence a
   duas agências.
6. **Visitantes:** as 6 abas (Visão geral, Origens, Entradas, Sessões,
   Comportamento, Veículos) + a página por campanha, filtradas. **Receita em
   R$ não aparece** para a agência — só quantos leads viraram venda.
7. **Layout em abas**, ocupando **100% da largura, sem rolagem lateral** em
   qualquer tela (requisito central).
8. **Veículo de interesse normalizado** (sem cortar texto): regras fixas, sem IA.
9. **Horário da Fykos é de Brasília.**
10. **Toda fase roda local e é aprovada pela usuária antes do deploy.**

## Arquitetura: escopo obrigatório

As consultas das abas de Visitantes (hoje dentro das rotas
`/api/admin/visitors/*`) passam a ser funções em `src/lib/visitors/` que
recebem um **`Escopo` obrigatório**:

```ts
type Escopo = { tipo: 'tudo' } | { tipo: 'agencia'; agenciaId: string }
```

- As rotas atuais (`/api/admin/visitors/*`) chamam com `{ tipo: 'tudo' }` — o
  painel da Attra não muda.
- As rotas novas (`/api/admin/agencia/[slug]/*`) montam o escopo a partir do
  **login**: usuário `agencia` → a agência dele, e qualquer `slug` diferente é
  403. Time da Attra → a agência do `slug`.
- O escopo vira um fragmento SQL (`naAgencia(escopo)`, alias `s` =
  `visitor_sessions`) aplicado junto de `noPeriodo` em toda consulta. Sem
  escopo a função não compila.

## Modelo de dados

Migration `supabase/migrations/20261002_agencias.sql` (idempotente):

- `ALTER TYPE admin_role ADD VALUE IF NOT EXISTS 'agencia'` (statement próprio).
- **`agencias`**: `id uuid pk`, `nome text`, `slug text unique`
  (`media-house`), `prefixos text[]` (ex.: `{va-,[va]}` — só para sugerir
  campanhas não cadastradas), `utm_medium_marca text[]` (ex.: `{mediahouse}`),
  `criado_em`.
- **`agencia_campanhas`**: `id uuid pk`, `agencia_id fk`, `plataforma`
  (`google` | `meta` | `webmotors`), `nome text`, `id_externo text null` (o
  `utm_id` / campaign id da plataforma), `destino` (`site` |
  `whatsapp`), `mensagem_prefixo text null` (mensagem pré-preenchida do
  anúncio, para o braço WhatsApp direto), `inicio date`, `fim date null`,
  `criado_por`, `criado_em`, `atualizado_por`, `atualizado_em`.
  - **Índices únicos:** `(plataforma, id_externo) where id_externo is not null`
    e `(plataforma, lower(nome))`. É a trava entre agências.
  - Encerrar = preencher `fim`; nada é apagado.
- **`admin_users.agencia_id uuid null fk`** — obrigatório quando `role =
  'agencia'` (check constraint).

## Acesso e papéis

- `ROUTE_ACCESS.agencia = ['/admin/agencia']`; o layout de `/admin/agencia/[slug]`
  confere que o slug é o da agência do usuário, senão redireciona para o dele.
- Login de usuário `agencia` cai em `/admin/agencia/<slug>`.
- Tela de Usuários: papel "Agência" + seletor de agência (obrigatório nesse
  papel). Exceções de seção (`secoes_extras`) não se aplicam a esse papel.
- Tela inicial do admin (time da Attra): um card por agência — "Marketing Media
  House".

## Atribuição de visitas

Uma sessão é da agência quando casa com uma campanha cadastrada dela:
`s.utm_id = id_externo` **ou** `lower(campanhaSql) = lower(nome)`, na mesma
plataforma quando a plataforma da sessão é conhecida. A plataforma da sessão sai
dos sinais que ela já tem: `gclid`/`wbraid`/`gbraid` ou `utm_source` do Google →
`google`; `fbclid` ou `utm_source` facebook/instagram/meta → `meta`;
`utm_source` webmotors → `webmotors`; sem sinal → desconhecida, e casa só por ID
ou nome. O ID resolve a PMax que chega sem nome desde 29/09. Período da campanha não restringe a sessão (uma
visita fora do período ainda veio daquela campanha).

## Atribuição de leads (mini CRM)

Um card é da agência por **um** destes caminhos, nesta ordem de precedência
(o primeiro que casar vence e fica registrado como "como foi ligado"):

1. **`clique_site_id`** devolvido pela Fykos → sessão do clique → campanha.
2. **Campanha/anúncio informado pela Fykos** (`origem_detalhe.campanha_id`,
   `campanha_nome`, `anuncio_id`, `referral.source_id`) → campanha cadastrada.
3. **Mensagem do anúncio:** `primeira_mensagem.texto` começa com o
   `mensagem_prefixo` de uma campanha (normalizado: sem acento, caixa, espaços).
   No braço "WhatsApp direto" da Meta, o caminho 2 (`referral`/`ctwa_clid`) já
   identifica o anúncio quando a Fykos repassar; a mensagem é o reforço.
4. **Clique no site** já ligado ao card hoje (`dados.site_session_id` com
   origem `correlacao_clique_veiculo`, `formulario` ou `marcador`) → sessão →
   campanha.

Card sem caminho não aparece para a agência. Para o time da Attra, a tela
mostra quantos leads do período estão sem campanha identificada.

- **Status:** `novo`/`em_atendimento`/`em_negociacao` → com vendedor;
  `encerrado_ganho` → vendido; `encerrado_perdido` → descartado.
- **Campos expostos (lista permitida, montada campo a campo):** data de
  entrada, campanha, plataforma, veículo normalizado, tipo (comprar /
  vender-trocar), como chegou (site / WhatsApp direto / formulário), como foi
  ligado, status. **Nunca:** vendedor, nome, telefone, e-mail, valor,
  observações, motivo de perda, id do card.

### Normalizador do veículo (`normalizarVeiculoInteresse`)

Função pura, testada com os padrões reais do campo `veiculo`:

1. **Tipo:** "carro do(a) cliente para venda", "venda do veículo do cliente",
   "cliente quer VENDER", "Troca:" → `vender_trocar`; senão `comprar`.
2. **Limpeza:** remove prefixos de tipo, trechos entre parênteses, preço
   (`R$ …`), quilometragem (`… km`, "zero quilômetro"), cor, segmentos depois
   de `|` e `—`. Vários carros (`/`) → o primeiro + "+N".
3. **Marca canônica** por dicionário (Mercedes, Mercedes-AMG, Mercedes-Benz →
   Mercedes-Benz; Land Rover; RAM; GMC; …). Modelo, versão e ano ficam como
   vieram, já limpos.
4. **Sem marca reconhecível** → "Não especificado".
5. Se a Fykos mandar `veiculo_interesse_detalhe`, ele tem precedência; o
   normalizador vira plano B.

O texto original não muda no banco.

### Contrato com a Fykos (pedido enviado em 02/10)

Campos opcionais lidos do payload do card e guardados em `dados`:
`origem_detalhe` (canal, plataforma, portal_tipo, campanha_id, campanha_nome,
conjunto_id, anuncio_id, ctwa_clid, referral), `primeira_mensagem` (em, texto),
`veiculo_interesse_detalhe` (marca, modelo, versao, anos, estoque_id, tipo),
`clique_site_id`. **`primeira_mensagem.em` sem fuso é lido como
America/Sao_Paulo**; com fuso, respeita o fuso. Quando presente, ele também
substitui o horário de criação do card na ligação clique → conversa.

## Telas e UX

**Rotas:** `/admin/agencia/[slug]` (Resumo) · `/visitantes/[aba]` · `/leads` ·
`/campanhas` · `/campanha/[chave]`. Filtros (período, plataforma, campanha) na
URL, valendo para todas as abas.

**Regra de largura (vale para toda a área):**
- Sem `max-w`; margem lateral 16 px (celular), 24 px (tablet), 40 px (≥1536).
- Tabelas `table-fixed w-full`, **sem `min-w`**; texto longo quebra ou trunca
  com título completo no hover.
- **Prioridade por coluna:** P1 sempre, P2 a partir de `md`, P3 a partir de
  `xl`. Clicar na linha expande os valores escondidos.
- **Abaixo de `md`, cada linha vira cartão** (pares rótulo/valor em 2 colunas).
- Gráficos SVG na largura disponível, sem `min-w`/`overflow-x`; em tela
  estreita mostram menos rótulos.
- Abas principais cabem em 360 px; as 6 sub-abas de Visitantes viram
  `<select>` abaixo de `md`.
- A `TabelaOrdenavel` ganha `prioridade` por coluna e o modo cartão. As telas
  atuais não mudam (continuam sem prioridade).

**Resumo:** faixa de 6 números (Sessões · Clicaram no WhatsApp com
"+N acidentais" · Leads no CRM · Com vendedor · Vendidos · Descartados) →
funil por plataforma + quadro A/B Meta, site × WhatsApp direto (lado a lado em `xl`, empilhados
abaixo) → **confronto por campanha** (sessões, conversão, score, cliques sem
acidentais, leads, com vendedor, vendidos, descartados, clique→lead,
lead→venda) → leads mais recentes.

**Leads:** contagens por status que funcionam como filtro; tabela entrada ·
campanha · veículo · status (P1) · plataforma · tipo (P2) · como chegou (P3);
aviso fixo de cobertura enquanto a Fykos não manda a campanha.

**Campanhas:** lista plataforma · nome · ID · destino · período · situação ·
visitas no período (campanha ativa com 0 visitas = cadastro errado); formulário
em painel lateral (tela cheia no celular); erro de ID de outra agência diz só
"já cadastrado em outra agência — fale com a Attra"; bloco **"detectadas sem
cadastro"** com visitas recentes que têm o prefixo/`utm_medium` da agência e
botão "cadastrar".

**Visitantes:** as 6 abas filtradas. No detalhe da sessão, visitas da mesma
pessoa vindas de fora das campanhas da agência aparecem só como "outra origem:
<canal>", sem nome de campanha.

## Segurança

- Agência vem do login nas rotas da agência; parâmetro de agência é ignorado
  para usuário `agencia`.
- Escopo obrigatório por tipo; mini CRM por lista permitida; trava de
  unicidade por índice.
- Rotas `/api/admin/visitors/*` continuam fechadas para o papel `agencia`.
- IP da sessão nunca sai nas rotas da agência (nem no detalhe da sessão).
- **Usuários iniciais da Media House:** `mediahouse@webmotors.com.br` e
  `nayume.sousa@webmotors.com.br`, papel `agencia`. Em produção são criados
  pela tela de Usuários (senha definida lá); no ambiente local, o seed cria os
  dois com senha de teste.

## Testes

- **Unitários:** normalizador (tabela de casos reais), casamento sessão/lead →
  campanha, precedência dos 4 caminhos, leitura do horário (com e sem fuso),
  mapeamento de status.
- **Integração (Postgres local):** duas agências semeadas; em **todas** as
  rotas da agência, A não vê sessões, campanhas nem leads de B nem tráfego
  orgânico; números das rotas atuais iguais antes e depois do escopo; resposta
  do mini CRM sem nenhum campo fora da lista permitida; 403 para slug alheio.
- **Navegador:** cada tela em 360, 768, 1280 e 1920 px com
  `document.documentElement.scrollWidth <= innerWidth`, e print de cada uma.

## Ambiente local (requisito: ver rodando antes do deploy)

- Banco `attra_local` no Postgres local com o **esquema** de produção
  (`pg_dump --schema-only`, sem dados).
- **Dados sintéticos** por `scripts/seed-local-agencia.ts`: Media House e EB,
  campanhas nas três plataformas (incluindo o A/B da Meta), ~30 dias de
  sessões com UTMs reais de formato, cliques com a distribuição de tempo
  medida (incluindo acidentais), cards de CRM com textos de veículo nos padrões
  reais. **Nada copiado de produção** (sessões têm IP; cards têm nome e
  telefone).
- `.env.local` de exemplo (`DATABASE_URL`, `AUTH_SECRET`), um usuário admin e
  um usuário `agencia` da Media House, com as senhas no próprio script de seed.
- Cada fase termina com `npm run dev`, a usuária navega como admin e como
  agência, e só então vem o deploy.

## Fases de entrega

1. **Base + ambiente local:** migration, papel `agencia`, escopo nas consultas
   de Visitantes (sem mudança visível), seed local.
2. **Área da agência:** estrutura em largura total, Campanhas (cadastro,
   conferência, detectadas), Resumo e Visitantes filtrados.
3. **Mini CRM:** caminho 4 (clique no site), normalizador, confronto, A/B
   da Meta.
4. **Campos da Fykos:** caminhos 1–3, horário da primeira mensagem, veículo
   estruturado.

Cada fase: testes verdes → roda local → aprovação → deploy (com a migration no
comando, enquanto o `deploy-vps.sh` não roda migrations).

## Fora de escopo

- Receita em R$ para a agência.
- Edição de qualquer dado do CRM pela agência.
- Importar custo/verba das plataformas (CPC, CPL).
- Exportação de dados pela agência.
