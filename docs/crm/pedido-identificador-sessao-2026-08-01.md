# Pedido ao time do webhook do CRM — devolver o identificador da sessão

**Data:** 2026-08-01 · Complementa `nota-emissor-webhook-2026-07-31.md`

> **CORRIGIDO EM 01/08 pela resposta do time do CRM.** O pedido abaixo partia
> de uma premissa errada nossa: a de que o POST do lead de formulário chegava
> até eles com o identificador em `lead_id`. Não chega — eles não têm entrada
> para esse payload, e no endpoint mais parecido `lead_id` é tipado como
> inteiro, então o UUID derrubaria o payload inteiro (perdendo o lead, não só
> o identificador). Já corrigimos o nosso lado: o id saiu de `lead_id` e passou
> a viajar em `site_session_id`.
>
> **O caminho que funciona é o marcador `[ref: ...]` na mensagem do WhatsApp.**
> Ele chega intacto e passará a ser devolvido a partir do merge deles.
>
> **As 7 vendas citadas abaixo não serão atribuídas.** Só 3 leads têm o
> marcador, todos de 23/07 em diante; as 7 vendas fecharam em 12/07 e 21/07, e
> nenhum webhook guardou o payload cru. Confirmamos as datas no nosso banco.
> O número serve como motivação do pedido, não como promessa de recuperação.

## Resumo em uma linha

O site já manda o identificador da visita junto do lead, no campo `lead_id`.
Precisamos que ele **volte** no webhook do card. É um campo só.

## Por que isso importa

O painel do site agora classifica cada visita por canal e campanha
(busca paga, social pago, orgânico, assistente de IA, referência) a partir
de UTM, click ids e referrer. Falta o último elo: saber **qual canal gerou
venda**, não apenas clique.

Hoje há **7 vendas fechadas somando R$ 3.403.000** que não podem ser
atribuídas a nenhum canal — não porque o dado não exista, mas porque a
ligação entre a visita e o card se perde no caminho de volta.

Sem isso, a decisão de verba continua sendo tomada por proxy (cliques no
WhatsApp) em vez de receita.

## O que o site JÁ envia hoje

No POST do lead (`src/lib/fykos.ts`, payload `type: "Novo Atendimento"`):

```json
{
  "type": "Novo Atendimento",
  "lead_id": "3f7c1a92-5e44-4b0d-9c31-2a8e6b0d17f5",
  "name": "...",
  "mobile_phone": "...",
  "interested_in_vehicle": [ ... ],
  "utm_source": "google", "utm_campaign": "...", "gclid": "..."
}
```

`lead_id` é o **UUID da sessão do visitante** no nosso banco
(`visitor_sessions.id`). É ele que amarra o lead a toda a origem já
gravada: campanha, termo, anúncio, cidade, veículos que a pessoa abriu.

Para leads que chegam pelo WhatsApp, o identificador viaja dentro da
própria mensagem que o cliente envia, no formato `[ref: <id>]` — anexado
automaticamente ao link do wa.me.

## O que volta hoje

Auditamos os 324 cards recebidos. O webhook devolve estes extras:

| Campo | Cards |
|---|---|
| `atribuido_em` | 288 |
| `resultado` | 237 |
| `encerrado_em` | 229 |
| `auditoria` | 225 |
| `ultima_resposta_vendedor` | 169 |
| **`lead_id`** | **0** |
| **texto com `[ref: ...]`** | **0** |

Ou seja: o identificador chega até vocês e não retorna.

## O pedido

**Devolver, no card do webhook, o mesmo `lead_id` que receberam do site.**

O receptor já aceita o valor em qualquer um destes nomes (o primeiro
encontrado vale) — use o que for mais natural no lado de vocês:

```
lead_id · session_id · sessionId · attra_session_id ·
site_session_id · visitor_session_id · ref · ref_sessao
```

Campo desconhecido pelo contrato v2 cai automaticamente no JSONB `dados`
e é lido de lá — não é preciso mudar nada no contrato.

**Formato aceito:** o valor exatamente como recebido, sem reformatar.
Aceitamos tanto o UUID (`3f7c1a92-...`) quanto o token de sessão do
navegador (`1754003821-k3f9x2m`). Regra: 6 a 80 caracteres, apenas
letras, dígitos, `-` e `_`.

**Alternativa para leads de WhatsApp:** se o card nasceu de uma conversa,
devolver o texto da mensagem do cliente (em qualquer campo de texto dos
extras) já resolve — extraímos o `[ref: ...]` de dentro dele.

## Uma armadilha que vale evitar

Se o `lead_id` for **sobrescrito** pelo id interno do CRM antes de voltar,
o efeito é pior do que não mandar nada: o site passa a receber um
identificador que parece válido, não resolve em nenhuma visita, e a
atribuição fica bloqueada de forma silenciosa.

Se vocês precisarem trafegar o id de vocês nesse campo, tudo bem — basta
mandar o nosso em **outro nome** da lista acima (`site_session_id` é o
mais explícito).

## Como saberemos que funcionou

Assim que os primeiros cards voltarem com o identificador, o painel de
visitantes passa a mostrar receita por canal e campanha automaticamente —
não é preciso deploy do nosso lado. Conferimos com uma consulta simples
de cobertura ("N de 324 cards ligados a uma visita") e devolvemos o
número para vocês.

---

Contexto técnico, se útil: receptor em `POST /api/webhook/fykos-crm`,
contrato v2 (upsert por `id`, ordenado por `atualizado_em`; campo ausente
mantém, `null` limpa). Lógica de leitura em `src/lib/atribuicao-receita.ts`.
