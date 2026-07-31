# Nota ao time do webhook do CRM — validação dos cards (2026-07-31)

Auditamos os 314 cards recebidos até hoje no site (`crm_cards`) contra o
contrato v2. O receptor e a UI do site já suportam todos os campos abaixo —
as lacunas são de emissão. Quatro pedidos, em ordem de impacto:

## 1. `motivo_encerramento` quase nunca é enviado (crítico)

| Etapa | Cards | Com `motivo_encerramento` |
|---|---|---|
| encerrado_perdido | 171 | **7 (4%)** |
| encerrado_ganho | 7 | **0** |

O que chega hoje no lugar, dentro dos extras (`dados`, legado v1):

- `resultado`: enum de máquina (`encerrado_por_inatividade` em 164 cards,
  `corrigido_auto_atribuicao_indevida` em 49, etc.) — útil, mas não é o
  motivo humano;
- `ultima_resposta_vendedor`: a última mensagem bruta do vendedor, que às
  vezes é o motivo real ("optou por fechar outra mais próxima da cidade
  dele") e às vezes é ruído ("Já", "bom dia, relembre que tenho que ligar…").

**Pedido:** ao encerrar um card (eventos `venda`/`perda`), enviar em
`motivo_encerramento` o texto do vendedor que justificou o encerramento
(a mensagem de fechamento, não a última mensagem qualquer). `resultado`
pode continuar vindo — cai nos extras sem conflito.

## 2. `veiculo_interesse` e `valor` faltam em quase metade dos cards

| Origem | Cards | Com veículo | Com valor |
|---|---|---|---|
| (sem origem) | 153 | 64 | 52 |
| patrocinado | 122 | 88 | 74 |
| site | 30 | 18 | 17 |
| organico | 9 | 2 | 2 |
| **Total** | **314** | **172 (55%)** | **145 (46%)** |

Lead de anúncio patrocinado nasce de um anúncio de um veículo específico —
mesmo assim 34 dos 122 chegam sem `veiculo_interesse`. E 33 cards têm
veículo mas não têm `valor` (o preço anunciado do veículo resolveria).

**Pedido:** enviar `veiculo_interesse` e `valor` sempre que conhecidos —
no mínimo, para todo lead originado de anúncio/estoque, preencher com o
veículo e o preço do anúncio de origem.

## 3. `origem` ausente em metade da base

153 de 314 cards (49%) chegam sem `origem`. Isso quebra o recorte de
performance por canal no painel.

**Pedido:** enviar `origem` sempre (`patrocinado`, `site`, `organico`, …).

## 4. Campos v1 ainda chegando como extras

`atribuido_em` (288), `encerrado_em` (229), `resultado` (236) e
`ultima_resposta_vendedor` (169) seguem chegando dentro de `dados` no
formato v1. O contrato v2 tem colunas próprias para datas
(`atribuido_em`, `encerrado_em`) e o par
`motivo_encerramento`/`situacao` cobre o papel de `resultado`.

**Pedido:** migrar esses campos para os equivalentes v2 do contrato
(os extras continuam aceitos, mas não alimentam os recursos do painel).

---

Receptor: `POST /api/webhook/fykos-crm` (contrato v2 — upsert por `id`,
ordenado por `atualizado_em`; campo ausente mantém, `null` limpa).
Dúvidas sobre o contrato: ver `src/lib/crm-webhook.ts` no repo do site.

---

## Adendo — resposta do time do webhook (2026-07-31)

Diagnóstico corrigido pelo emissor após análise:

1. **Motivo ausente ≠ formato**: o encerramento por inatividade
   (`encerra_atribuicao_inativa`) era um **gatilho mudo** — fechava
   atribuição/cronômetro/estado sem emitir card. Os 164
   `encerrado_por_inatividade` chegaram só pelo backfill antigo (sem
   motivo). Encerramento com reporte do vendedor já envia
   `motivo_encerramento` (daí os 7).
2. **Item 4 da nota parcialmente incorreto**: `atribuido_em`/`encerrado_em`
   já são colunas v2 no receptor; `resultado` e `ultima_resposta_vendedor`
   caem em `dados` por design do próprio receptor. Os problemas reais:
   `situacao` faltando na perda e `encerrado_em = agora()` em vez do
   timestamp persistido da atribuição.
3. `veiculo_interesse` nunca foi populado por gatilho algum (todos mandam
   o `veiculo` v1 — que o receptor também aceita); o card de venda tinha
   `motivo_encerramento` hardcoded "Venda fechada.".

**Correção em curso** (branch `fix/crm-webhook-campos-v2` do emissor):
motivo real do vendedor na venda; card novo no encerramento por
inatividade com motivo honesto; veículo+valor enriquecidos via
atribuição/negociação em todos os gatilhos; origem na cobrança semanal;
`encerrado_em` persistido; `situacao=perdido` na perda.

**Prontidão do site**: `situacao=perdido` ganhou badge vermelho no
vocabulário (`crm-constants.ts`); o motivo novo de inatividade é texto
livre e será exibido direto; o fallback do `resultado` legado permanece
para o histórico do backfill. Após o deploy do emissor, revalidar com a
query de completude por etapa desta nota.
