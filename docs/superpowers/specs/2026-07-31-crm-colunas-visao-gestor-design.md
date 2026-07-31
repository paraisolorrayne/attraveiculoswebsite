# CRM: colunas na visão do gestor (assumido × movimentando)

**Data:** 2026-07-31 · Sucede o spec `2026-07-31-crm-kanban-redesign-design.md`

## Problema

As colunas espelhavam as etapas do CRM (`novo`, `em_atendimento`,
`em_negociacao`, encerrados) — vocabulário de vendedor. Pra quem lê,
"Em atendimento" × "Em negociação" confunde, e a coluna "Novo" não ajuda:
o painel deve focar no que os vendedores estão (ou não) movimentando.

## Decisões (fechadas com o usuário)

1. **Critério do corte: último evento** (`fonte_evento`). Reporte do
   vendedor → "Movimentando"; qualquer outro (aceite, alerta, cobrança,
   correção manual) → "Assumido pelo vendedor".
2. **Leads `novo` somem de vez** — nem coluna, nem KPI. O painel começa
   no aceite do vendedor.
3. **Encerrados seguem em duas colunas** (Ganho / Perdido), com somas
   separadas.

## Especificação

- **Colunas (4):** Assumido pelo vendedor (estilo azul) · Movimentando
  (roxo) · Encerrado — Ganho (verde) · Encerrado — Perdido (vermelho).
- **Classificador** `colunaDoCard({etapa, fonte_evento})` em
  `crm-constants.ts`: `encerrado_ganho`→ganho; `encerrado_perdido`→
  perdido; senão `fonte_evento === 'reporte'`→movimentando; senão→
  assumido. Etapa ativa desconhecida cai na mesma regra (sem colunas
  extras dinâmicas).
- **Etapa do CRM vira dado interno** — não define coluna nem aparece no
  modal; o badge do modal mostra a coluna nova.
- **KPIs:** Leads · Assumidos · Movimentando · Ganhos (n · R$) ·
  Perdidos · R$ em aberto — todos sobre a base já sem `novo`.
- **Fixtures do demo** cobrem: assumido mínimo (tudo "–"), assumido via
  cobrança (com impedimento), movimentando via reporte, perdido com
  motivo legado.
- Card (`crm-card.tsx`), filtros, modal (exceto badge) e backend
  intocados.

## Critérios de aceite

1. Nenhum card de etapa `novo` aparece em coluna ou KPI.
2. Card ativo com `fonte_evento='reporte'` está em Movimentando;
   qualquer outro ativo em Assumido; encerrados nas suas colunas.
3. `?demo=1` mostra as 4 colunas com as fixtures corretas.
4. `tsc`/`eslint` limpos; suíte de testes verde.
