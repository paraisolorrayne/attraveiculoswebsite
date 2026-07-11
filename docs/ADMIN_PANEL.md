# Painel Administrativo — Attra Veículos

Documentação completa da área de administração do site (`/admin`). Cobre arquitetura,
autenticação, controle de acesso e cada um dos módulos com suas telas, rotas de API,
tabelas no Supabase e regras de negócio.

> **Stack:** Next.js (App Router) · React · TypeScript · Tailwind · Supabase (Postgres + Auth + Storage)
> **Localização do código:** páginas em `src/app/admin/`, rotas de API em `src/app/api/admin/`

> **Atualização (2026-07-11):** os módulos **Banners** e **CRM** e a integração
> **Google Reviews** foram removidos do painel. O CRM migrou para o sistema externo
> **Fykos** — os leads dos formulários do site agora são enviados via webhook direto
> ao Fykos.

---

## Índice

1. [Visão geral](#1-visão-geral)
2. [Autenticação e controle de acesso](#2-autenticação-e-controle-de-acesso)
3. [Navegação e layout](#3-navegação-e-layout)
4. [Módulo: Sons de Motor](#4-módulo-sons-de-motor)
5. [Módulo: Blog](#5-módulo-blog)
6. [Módulo: Newsletter](#6-módulo-newsletter)
7. [Módulo: Marketing](#7-módulo-marketing)
8. [Módulo: Visitantes / Analytics](#8-módulo-visitantes--analytics)
9. [Módulo: Configurações](#9-módulo-configurações)
10. [Diagnóstico de Crons](#10-diagnóstico-de-crons)
11. [Referência rápida de tabelas](#11-referência-rápida-de-tabelas)

---

## 1. Visão geral

O painel admin é uma área protegida do mesmo app Next.js que serve o site público.
Tem layout próprio (sem header/footer do site) e reúne todas as ferramentas operacionais
da Attra: gestão de conteúdo, e-mail marketing, analytics de visitantes e
configurações de funcionalidades do site.

**Módulos disponíveis (itens da navegação):**

| Módulo | Rota | Acesso por papel |
|---|---|---|
| Sons de Motor | `/admin/engine-sounds` | admin, gerente |
| Blog | `/admin/blog` | admin, gerente |
| Newsletter | `/admin/newsletter/campaigns` | admin |
| Marketing | `/admin/marketing` | admin, gerente |
| Criativos | `/admin/gerador-criativos` | admin, gerente |
| Configurações | `/admin/settings` | admin |

Além desses, há rotas de API sem tela dedicada: **Visitantes/Analytics** e **Diagnóstico de
Crons**.

---

## 2. Autenticação e controle de acesso

### Como funciona

- Autenticação via **Supabase Auth** (e-mail + senha). A sessão fica em cookies httpOnly.
- A autorização é feita contra a tabela `admin_users`: só entra quem tiver registro ativo
  (`is_active = true`) com `role` em (`admin`, `gerente`).
- Lógica central em `src/lib/admin-auth-supabase.ts`:
  - `signInWithEmail` / `signOut`
  - `getCurrentAdmin()` — retorna o admin logado ou `null`
  - `hasRole()` / `canAccessRoute()` — controle por papel
  - `requestPasswordReset()` / `updatePassword()`

### Papéis (roles)

| Papel | Permissões |
|---|---|
| **admin** | Acesso total a todos os módulos |
| **gerente** | Restrito a **Sons de Motor** (`/admin/engine-sounds`), login e reset de senha |

> O `AdminHeader` filtra os itens de menu pelo papel (`allowedRoles`), e a API de cada
> módulo aplica suas próprias checagens.

### Telas de autenticação

- **Login** (`/admin/login`): e-mail + senha, mostrar/ocultar senha, link "esqueci a senha"
  (dispara e-mail de reset). Em caso de sucesso redireciona para `/admin/engine-sounds`
  ou para o `?redirect=` original.
- **Reset de senha** (`/admin/reset-password`): valida a sessão vinda do link do e-mail,
  exige nova senha (mín. 8 caracteres) e redireciona ao login.

### Rotas de API de auth

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/admin/login` | Login. Tem **rate limit** estrito (`RATE_LIMIT_PRESETS.auth`), valida `admin_users`, seta cookies de sessão e atualiza `last_login`. |
| POST | `/api/admin/logout` | Encerra a sessão Supabase. |

### Middleware (`src/middleware.ts`)

Protege `/admin/:path*` (exceto `login` e `reset-password`) e bloqueia `/automations/*` (404).
Inclui logging de eventos de segurança (`security_event`).

> ⚠️ **Estado atual — BYPASS TEMPORÁRIO ATIVO.** No código vigente, a checagem de
> autenticação do middleware está comentada: `/admin` apenas redireciona para
> `/admin/engine-sounds` e as demais rotas passam direto (`NextResponse.next()`). A
> proteção real, hoje, recai sobre o `layout`/páginas (que usam `getCurrentAdmin()`) e
> sobre as rotas de API que checam auth individualmente. **Antes de produção, reativar o
> bloco de auth do middleware** (validação de sessão + RBAC por papel). Veja também o
> `ADMIN_AUTH_BYPASS` de desenvolvimento em `getCurrentAdmin()`.

> **Observação de cobertura:** nem todas as rotas de `/api/admin/*` chamam
> `getCurrentAdmin()`/`isAuthenticated()` explicitamente — parte depende da proteção de
> borda (middleware). Com o bypass ativo, vale auditar as rotas que não fazem checagem
> própria antes do go-live.

---

## 3. Navegação e layout

- **`src/app/admin/layout.tsx`** — layout limpo (sem header/footer do site). Renderiza o
  `AdminHeader` quando há admin logado. Metadata com `robots: noindex, nofollow`.
- **`src/components/admin/admin-header.tsx`** — barra superior com:
  - Logo "Admin" + navegação (Sons de Motor · Blog · Newsletter · Marketing · Criativos ·
    Configurações — itens filtrados por papel)
  - Badge do usuário (nome + papel), link "Ver Site", botão "Sair"
  - Menu hambúrguer responsivo no mobile

---

## 4. Módulo: Sons de Motor

**Rota:** `/admin/engine-sounds` · **Acesso:** admin, gerente

### Propósito
Associa veículos do estoque a arquivos de áudio (gravações do ronco do motor), exibidos na
seção "Som do Motor" da home.

### Tela
- Lista em cards: emoji/ícone, nome do veículo, descrição, badge "EV" (se elétrico) e
  ações: **play/pause** (preview), **editar**, **ativar/desativar**, **excluir**.
- Modal de criação em 3 passos:
  1. **Buscar veículo** (consulta `/api/vehicles?search=`)
  2. **Upload de áudio** (`.mp3`/`.wav`)
  3. **Infos extras** — descrição, ícone (🏎️ 🔥 ⚡ 🏁 🦅 🚀), flag "Elétrico"
- Modal de edição altera apenas metadados (não o arquivo).

### API

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/admin/engine-sounds` | Lista os sons cadastrados |
| POST | `/api/admin/engine-sounds` | Cria associação veículo + áudio (1 som por veículo → 409 se já existir) |
| GET | `/api/admin/engine-sounds/[id]` | Detalhe |
| PATCH | `/api/admin/engine-sounds/[id]` | Atualiza metadados |
| DELETE | `/api/admin/engine-sounds/[id]` | Exclui registro **e** remove o arquivo do storage |
| POST | `/api/admin/engine-sounds/upload` | Upload de áudio para o bucket `audio-files` |

### Dados
**Tabela `vehicle_sounds`:** `id`, `vehicle_id`, `vehicle_name`, `vehicle_brand`,
`vehicle_slug`, `sound_file_url`, `description`, `icon`, `is_electric`, `is_active`,
`display_order`, `created_at`, `updated_at`.
**Storage:** bucket `audio-files`.

### Regras
- Unicidade: um som por veículo.
- Campos denormalizados (`vehicle_name`/`vehicle_brand`) para exibição rápida e resiliência
  caso o veículo saia do estoque.
- `display_order` define a ordem na seção; default = contagem atual.

---

## 5. Módulo: Blog

**Rota:** `/admin/blog` · **Acesso:** admin, gerente

### Propósito
Gestão de posts em dois tipos: **Educativo** (Curadoria, Mercado, Dicas, Lifestyle) e
**Car Review** (review de veículo com specs, galeria, disponibilidade, FAQ). Unifica posts
criados no admin com conteúdo importado do WordPress.

### Tela
- Lista com busca (título/slug) e filtros por **tipo**, **status** (publicado/rascunho) e
  **origem** (admin/WordPress). Posts do WordPress são **somente leitura**.
- Modal de criação/edição com 3 abas:
  - **Conteúdo:** tipo, título, slug (auto a partir do título), resumo, conteúdo HTML,
    imagem destacada (+ alt), data, tempo de leitura, autor (default "Attra Veículos").
  - **Campos por tipo:**
    - *Educativo:* categoria, tópico, palavra-chave SEO.
    - *Car Review:* marca, modelo, ano, versão, specs (motor, potência, torque, 0-100,
      vel. máx., câmbio), galeria (multi-upload), disponibilidade (em estoque, preço).
  - **SEO & Meta:** meta title (60), meta description (160), canonical, keywords.
- Rodapé: **Salvar Rascunho** (`is_published:false`) ou **Publicar** (`is_published:true`).

### API

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/admin/blog` | Lista posts (admin + WordPress) com filtros |
| POST | `/api/admin/blog` | Cria post (admin) |
| GET | `/api/admin/blog/[id]` | Detalhe |
| PATCH | `/api/admin/blog/[id]` | Atualiza post (admin) |
| DELETE | `/api/admin/blog/[id]` | Exclui post + imagens associadas |
| POST | `/api/admin/blog/upload` | Upload de imagem (destacada/galeria) → bucket `blog-images` |

### Dados
**Tabela `dual_blog_posts`:** `post_type` (`educativo`|`car_review`), `title`, `slug`,
`excerpt`, `content` (HTML), `featured_image` (+ alt), `author` (json), `published_date`,
`reading_time`, `is_published`, blocos opcionais `educativo` / `car_review` / `seo`, e
`source` (`admin`|`wordpress`).
**Storage:** bucket `blog-images`. Posts WordPress importados ficam em
`src/lib/imported-blog-posts.ts`.

### Regras
- Slug gerado por kebab-case a partir do título; unicidade contra admin + WordPress.
- Ao excluir, remove imagens do storage (checa `isSupabaseStorageUrl()`).
- Specs técnicas desconhecidas são **omitidas**, nunca "sob consulta" (placeholder só para
  preço). Existe geração de conteúdo por IA via cron (ver §10) — o admin é a edição manual.

---

## 6. Módulo: Newsletter

**Rota:** `/admin/newsletter/campaigns` e `/admin/newsletter/subscribers` · **Acesso:** admin

### Propósito
E-mail marketing: campanhas com editor visual por blocos e gestão da lista de assinantes
(import/export, busca, paginação).

### Telas

**Campanhas** (`campaigns-admin.tsx`)
- Lista com status (Rascunho/Agendada/Enviada/Cancelada), assunto, nº de destinatários,
  datas. Ações: preview HTML, editar (oculto se enviada), excluir (oculto se enviada).
- Modal: título, assunto, status, agendamento (`scheduled_at`), e **editor de seções**
  (Título, Texto, Imagem, Botão, Divisor) ordenadas. Gera HTML inline pronto para e-mail
  (botão dourado `#c8a870`, rodapé com endereço da Attra, wrapper 600px).

**Assinantes** (`subscribers-admin.tsx`)
- Tabela: e-mail, nome, origem, status, data; ações ativar/desativar e excluir.
- Filtros: busca (e-mail/nome) e status (Todos/Ativos/Inativos). Paginação de 50.
- Adicionar individual, **importar** (colar `email` ou `email,nome` por linha) e
  **exportar CSV**.

### API

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/admin/newsletter/campaigns` | Lista campanhas |
| POST | `/api/admin/newsletter/campaigns` | Cria |
| GET/PUT/DELETE | `/api/admin/newsletter/campaigns/[id]` | Detalhe / atualizar / excluir (só rascunho/cancelada) |
| GET | `/api/admin/newsletter/subscribers` | Lista paginada (page, limit, search, status) |
| POST | `/api/admin/newsletter/subscribers` | Adiciona único **ou** importa em lote |
| PUT/DELETE | `/api/admin/newsletter/subscribers/[id]` | Atualiza (nome/ativo) / exclui |
| GET | `/api/admin/newsletter/subscribers/export` | Exporta CSV (filtro por status) |

### Dados
**`newsletter_campaigns`:** `title`, `subject`, `featured_image`, `sections` (jsonb),
`html_content`, `status` (`draft`|`scheduled`|`sent`|`cancelled`), `scheduled_at`,
`sent_at`, `recipient_count`, timestamps.
**`newsletter_subscribers`:** `email` (único, lowercase), `name`, `is_active`, `source`,
`subscribed_at`, `unsubscribed_at`.

### Regras
- Ciclo: rascunho (editável) → agendada → enviada (somente leitura) / cancelada.
- Import faz upsert por e-mail (normalizado lowercase+trim).
- Toggle de status grava/limpa `unsubscribed_at`.

---

## 7. Módulo: Marketing

**Rota:** `/admin/marketing` · **Acesso:** admin (CRUD), gerente (limitado às próprias tarefas)

### Propósito
Workspace de marketing com 3 visões: **Campanhas**, **Kanban de tarefas** e **Dashboard de
métricas**. Suporta estratégias, atribuição de tarefas a usuários, comentários, histórico de
status e export CSV.

### Telas
- **Barra de controle:** alternar visão (Campanhas | Kanban | Dashboard), exportar CSV,
  atualizar, "Nova Campanha"/"Nova Tarefa".
- **Campanhas (board, 3 colunas):** Publicada · Encerrada por Ganho · Encerrada por
  Desempenho. Cards arrastáveis (admin) com veículos e datas.
- **Kanban (5 colunas):** Backlog · Em Progresso · Revisão · Concluído · Falhou. Cards com
  categoria, prioridade (🔥 urgente), prazo (alerta de atraso), responsáveis. Drag muda
  status; filtros por status/categoria/prioridade.
- **Dashboard:** 4 cards (Total, Taxa de Conclusão, Atrasadas, Concluídas 30d) + gráficos
  por status e por categoria.
- **Modais:** Tarefa (título, descrição, categoria, status, prioridade, estratégia, prazo,
  horas estimadas/reais, responsáveis, comentários) e Campanha (nome, descrição, status,
  lista dinâmica de veículos com data).

### API

| Método | Rota | Descrição |
|---|---|---|
| GET/POST | `/api/admin/marketing/campaigns` | Lista / cria (admin) |
| GET/PATCH | `/api/admin/marketing/campaigns/[id]` | Detalhe / atualiza (admin) |
| GET/POST | `/api/admin/marketing/tasks` | Lista (filtros) / cria (admin) |
| GET/PATCH | `/api/admin/marketing/tasks/[id]` | Detalhe (com comentários e histórico) / atualiza |
| POST | `/api/admin/marketing/tasks/[id]/comments` | Adiciona comentário |
| GET/POST | `/api/admin/marketing/strategies` | Lista / cria (admin) |
| GET | `/api/admin/marketing/users` | Usuários ativos para atribuição |
| GET | `/api/admin/marketing/metrics` | Métricas agregadas |

### Dados
`marketing_campaigns`, `campaign_vehicles`, `marketing_tasks`, `task_assignments`,
`task_comments`, `task_status_history`, `marketing_strategies`.
(Status de tarefa: `backlog`|`in_progress`|`review`|`completed`|`failed`. Categorias: seo,
social_media, content, paid_ads, email, events, partnerships, other.)

### Regras
- RBAC: admin tem CRUD total e atribui tarefas; gerente vê e atualiza só as suas (status e
  horas reais).
- Toda mudança de status é registrada em `task_status_history`.
- Métricas: taxa de conclusão, taxa de sucesso, eficiência de horas (real/estimado),
  atrasadas e concluídas nos últimos 30 dias.
- Export CSV: `marketing-tasks-YYYY-MM-DD.csv`.

### 7.1 Gerador de Criativos

**Rota:** `/admin/gerador-criativos` (item "Criativos" no menu) · **Acesso:** admin, gerente

Ferramenta standalone (HTML auto-contido, canvas 1080×1920) para montar criativos de
stories/anúncios no padrão visual da Attra: fotos com zoom/enquadramento, logos oficiais
embutidas e preferência de logo persistida em `localStorage`. Não usa banco nem APIs.

- **Como funciona:** a página embute via iframe a rota
  `GET /api/admin/marketing/gerador-criativos`, que exige admin logado e serve o HTML.
- **Fonte da verdade:** `content/admin/gerador-criativos.html`. O HTML é embutido no build
  como string em `gerador-html.ts` (arquivo gerado — não editar).
- **Para atualizar a ferramenta:** edite o HTML em `content/admin/` e rode
  `node scripts/gen-gerador-criativos.mjs`.

---

## 8. Módulo: Visitantes / Analytics

**Rota:** `/admin/visitors` · **Acesso:** admin (sem item fixo no header)

### Propósito
Inteligência de visitantes: reconstrói jornadas a partir de fingerprints, enriquece perfis
(empresa/contato) e infere a origem provável de cada sessão.

### Tela
- 6 cards de métricas: visitantes totais, identificados, enriquecidos, page views, duração
  média de sessão, cliques no WhatsApp.
- Abas: Todos / Identificados / Enriquecidos. Tabela de visitantes (status, empresa, cargo,
  visitas, veículos, **lead score** 0–100, última visita). Seção "Top Veículos".

### API

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/admin/visitors` | Lista perfis com métricas agregadas (filtros: status, page, limit) |
| GET | `/api/admin/visitors/metrics` | Totais e top veículos |
| GET | `/api/admin/visitors/session-explore?session_id=` | Reconstrói a sessão: timeline, eventos, **origem provável** e recomendações |

### Dados
`visitor_profiles`, `visitor_fingerprints`, `visitor_sessions`, `visitor_page_views`,
`identity_events`, `conversion_events`.

### Regras
- Status do visitante: `anonymous` → `identified` → `enriched` → `converted`.
- **Origem provável:** gclid→Google Ads, fbclid/utm fb→Meta, ttclid→TikTok, referrer
  google→Orgânico, etc., com nível de confiança (alta/média/baixa).
- Gera recomendações automáticas (ex.: tráfego pago sem conversão → revisar landing/CTA).

---

## 9. Módulo: Configurações

**Rota:** `/admin/settings` · **Acesso:** admin

### Propósito
Liga/desliga funcionalidades de áudio do site em tempo real.

### Tela
Dois cards com toggle, descrição e status (Habilitado/Desabilitado):
- **`listen_to_content_enabled`** — botão "Ouvir esta matéria" no blog (síntese de voz).
- **`engine_sound_section_enabled`** — seção "Som do Motor" na home.

### API

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/admin/settings` | Lê as settings (público — usado pelo front para renderização condicional; retorna defaults `true` se faltar) |
| PATCH | `/api/admin/settings` | Atualiza uma setting (**admin only**); valida a key no whitelist; faz upsert com `updated_by`/`updated_at` |

### Dados
**Tabela `site_settings`** (chave-valor): `key` (PK), `value`, `updated_by`, `updated_at`.

### Regras
- Efeito imediato (sem rebuild); o front rebusca ao carregar a página.
- Apenas `role = admin` altera; defaults graciosos (`true`) se a leitura falhar.

---

## 10. Diagnóstico de Crons

**Rota:** `GET /api/admin/cron-status` · **Acesso:** admin (sem tela dedicada)

Diagnostica as rotinas automáticas (Blog AI diário + News Ingestion semanal). Retorna:
- `cron_jobs` (via RPC `list_cron_jobs` sobre `cron.job`)
- `cron_secret_configured` (booleano — **não** expõe o valor)
- `blog_ai_last_runs` (últimas 5 de `blog_ai_generations`)
- `news_cycles_recent` (últimos 3 de `news_cycles`)
- `app_url_configured` (`NEXT_PUBLIC_SITE_URL`) e `checked_at`

Cada query roda em try/catch isolado — uma falha não derruba a rota.

> Contexto operacional: os crons rodam via `/etc/cron.d` na VPS (o pg_cron do Supabase não
> dispara nesse setup). Ver `docs/CRON_TROUBLESHOOTING.md` e `docs/DEPLOY_VPS.md`.

---

## 11. Referência rápida de tabelas

| Domínio | Tabelas (Supabase) | Storage |
|---|---|---|
| Auth | `admin_users` | — |
| Sons de Motor | `vehicle_sounds` | `audio-files` |
| Blog | `dual_blog_posts` | `blog-images` |
| Newsletter | `newsletter_campaigns`, `newsletter_subscribers` | — |
| Marketing | `marketing_campaigns`, `campaign_vehicles`, `marketing_tasks`, `task_assignments`, `task_comments`, `task_status_history`, `marketing_strategies` | — |
| Visitantes | `visitor_profiles`, `visitor_fingerprints`, `visitor_sessions`, `visitor_page_views`, `identity_events`, `conversion_events` | — |
| Configurações | `site_settings` | — |
| Crons | `blog_ai_generations`, `news_cycles`, `cron.job` | — |

---

### Documentos relacionados
- `docs/DEPLOY_VPS.md` — deploy e operação na VPS
- `docs/CRON_TROUBLESHOOTING.md` — rotinas automáticas
- `docs/ANALYTICS.md` — tracking de visitantes (lado público)
- `docs/SECURITY_REVIEW_REPORT.md` — segurança

> **Manutenção:** ao adicionar/alterar um módulo do admin, atualize a seção correspondente
> e a tabela de referência (§11). Documentação desatualizada é pior que nenhuma.
