# Redesign do kanban do CRM (somente leitura)

**Data:** 2026-07-31 · **Branch:** `crm-validacao-webhook`
**Referência visual:** screenshot de pipeline (colunas com soma, cards enxutos, avatar) — adaptado ao admin existente.

## Contexto e objetivo

O painel `/admin/crm` é um espelho somente leitura do funil de vendas,
alimentado por webhook (contrato v2). A auditoria de 2026-07-31
(`docs/crm/nota-emissor-webhook-2026-07-31.md`) mostrou que ~45% dos cards
chegam sem veículo e ~54% sem valor, o que hoje produz cards de formatos
diferentes. Objetivo: cards uniformes com slots fixos ("–" quando o dado
não vier), leitura agregada por coluna e visual mais próximo de um
pipeline profissional — preservando o caráter 100% leitura.

## Decisões de produto (fechadas com o usuário)

1. **Slots fixos com "–"** apenas nos campos de identificação: nome,
   valor, veículo, telefone, origem, vendedor. Sempre renderizados;
   "–" discreto (`text-foreground-secondary`) quando ausentes.
2. **Blocos narrativos continuam condicionais** (só aparecem quando
   existem): veículo de troca, andamento, impedimento, próxima ação e
   motivo do encerramento (com o fallback pro `resultado` legado já
   implementado em `motivoDoCard`).
3. **Somas por coluna + KPIs**: cabeçalho de cada coluna ganha contagem e
   soma dos valores dos cards visíveis; a linha de KPIs continua, com o
   chip "Ganhos" passando a exibir contagem **e** soma (ex.:
   "3 · R$ 169 mil") no período filtrado.
4. **Estilo**: estrutura do screenshot com toques do visual (faixa
   tingida no cabeçalho da coluna, avatar de iniciais do vendedor,
   cards arredondados/arejados), mantendo os tokens de tema do admin
   (claro/escuro). Sem réplica fiel.
5. **Nada de ações de escrita** — o CRM segue somente leitura.

## Especificação

### Cabeçalho de coluna

Faixa com fundo tingido e borda na cor da etapa (paleta existente em
`ETAPAS_KANBAN`), contendo: ponto de cor, label, contagem e soma:

- Soma = `Σ valor` dos cards da coluna **após filtros** (período/vendedor).
- Formato abreviado pt-BR: `R$ 1,2 mi` / `R$ 257 mil` / `R$ 900`;
  "–" quando nenhum card da coluna tem valor.
- Colunas de etapa desconhecida usam o estilo neutro atual.

### KPI "Ganhos"

`{contagem} · {soma}` dos cards `encerrado_ganho` do conjunto filtrado
(mesma formatação abreviada). Os demais 5 chips ficam como estão.

### Card (ordem dos elementos)

1. Nome (ou "–") + badge de situação (condicional, como hoje).
2. Valor (`R$ 335.000` ou "–") + tempo relativo (`dataReferenciaPeriodo`).
3. Veículo com ícone (ou "–").
4. Troca (condicional).
5. Andamento (condicional, citação com borda azul).
6. Impedimento (condicional, alerta vermelho).
7. Próxima ação (condicional, com atraso destacado).
8. Motivo do encerramento (condicional, só nas colunas encerradas,
   via `motivoDoCard`).
9. Rodapé em linha: telefone como link wa.me (ou "–" sem link) ·
   origem (ou "–") · vendedor com **avatar de iniciais** (ou "–").
   Avatar: círculo pequeno com 1–2 iniciais, cor derivada do nome
   (hash → paleta fixa de 6 cores dos tokens), como no screenshot.

### Arquitetura

- Novo `src/app/admin/crm/crm-card.tsx`: componente do card do kanban +
  `AvatarVendedor` + formatadores compartilhados (`fmtValorAbrev`,
  `fmtQuando`, "–"). Sem estado próprio; recebe `card` e `onClick`.
- `crm-admin.tsx` mantém página, filtros, KPIs, colunas e modal
  (modal inalterado neste escopo).
- `crm-constants.ts` inalterado (a paleta já serve às faixas).
- Backend intocado — `/api/admin/crm/cards` já retorna todos os campos.

### Modo demo (verificação visual sem banco)

`/admin/crm?demo=1` (apenas leitura de um array de fixtures no client;
nenhuma chamada à API): 4 fixtures — card completo, card mínimo (tudo
"–"), encerrado_perdido com motivo legado, card com impedimento +
próxima ação atrasada. Serve pra validar o redesign localmente (o dev
local não tem `DATABASE_URL`) e vira ferramenta permanente de ajuste.

## Fora de escopo

- Redesign do modal de detalhes.
- Qualquer ação de escrita/edição no CRM.
- Mudanças no webhook/receptor (cobertas pela nota ao emissor).
- Réplica visual fiel do screenshot (fundo claro fixo, tipografia própria).

## Critérios de aceite

1. Todos os cards da mesma coluna têm os mesmos slots visíveis; campos
   de identificação ausentes mostram "–".
2. Cabeçalhos exibem contagem + soma corretas sob qualquer combinação de
   filtros; KPI Ganhos mostra contagem + soma do período.
3. Tema claro e escuro íntegros.
4. `tsc --noEmit` e `eslint` limpos nos arquivos tocados.
5. `/admin/crm?demo=1` renderiza as 4 fixtures sem chamar a API.
