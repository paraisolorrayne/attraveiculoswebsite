# Atribuição de campanha para o CRM (Fykos)

Resposta ao handoff *"atribuição de campanha para leads vindos do site"* (27/09/2026).

## Por que não voltamos a anexar o `[ref: ...]`

O marcador não quebrou. Ele foi **removido de propósito em 05/08/2026** (commit `0f337c9`): o identificador de sessão é log interno e não deve viajar na mensagem que o **comprador** manda para a loja.

No lugar dele o site passou a gravar o clique (`whatsapp_clicks`: sessão + horário) e a correlacionar a conversa que chega pelo webhook, dentro de uma janela de 10 minutos, com duas regras deliberadas:

1. um clique atribui **uma** conversa;
2. havendo mais de uma sessão candidata na janela, **não escolhe**.

O que faltava era o caminho de volta: essa correlação ficava só no banco do site. É isso que os endpoints abaixo resolvem — sem devolver identificador interno para dentro da conversa do cliente.

## Endpoints

Ambos pedem o cabeçalho `X-Api-Key`. Sem a chave configurada no servidor, respondem **503** e não atendem (falha fechado, de propósito).

### `GET /api/sessions/card/{card_id}` ← **use este**

`card_id` é o id do card que **vocês mesmos** mandam para `/api/webhook/fykos-crm`. Não exige marcador nenhum na mensagem.

### `GET /api/sessions/{session_id}`

Para os leads que já têm o token: os de 23/07 a 05/08 (com `[ref: ...]`) e os de formulário, que mandam `site_session_id` no payload. Mesmo formato de resposta.

## Resposta

```json
{
  "session_id": "1784810859532-pupqonclbi",
  "ligacao": "correlacao_clique_whatsapp",
  "first_touch": {
    "source": "google", "medium": "cpc",
    "campaign": "[VA] Search | Estoque Premium",
    "content": null, "term": null,
    "gclid": "Cj0KCQjw", "fbclid": null,
    "landing": "/veiculos/porsche-macan-2023",
    "ts": "2026-09-19T13:41:02.000Z"
  },
  "last_touch": { "source": "linktr.ee", "medium": null, "...": null }
}
```

### `ligacao` — leiam este campo

Diz **como** a visita foi ligada ao lead, e portanto o quanto confiar nela:

| valor | o que é |
|---|---|
| `marcador` | o cliente mandou `[ref: ...]`. Ligação explícita. |
| `correlacao_clique_whatsapp` | clique e conversa casados por janela de tempo. **Menos certo.** |
| `formulario` | lead de formulário; a sessão veio no próprio payload. |

Tratar uma correlação por tempo como se fosse um marcador explícito é o tipo de coisa que contamina relatório. O campo existe para vocês poderem separar.

### Regras da resposta

- **`campaign` vai como está cadastrado**, com `[EB]` / `[VA]`. Não normalizamos.
- **Sem origem → `null`, nunca `"direct"`.** `"direct"` é uma afirmação, e errada. Ausente é recuperável; errado não.
- **`source` pelo referrer vai com o domínio cru** (`google.com`, não `google`). Com `utm_source=google` é Ads etiquetado; pelo referrer é clique orgânico — encurtar juntaria os dois.
- **`first_touch`** é a primeira visita **com sinal de origem** daquele visitante, não a primeira visita. **`last_touch`** é a visita que gerou o lead. Podem ser a mesma; nesse caso os dois vêm preenchidos e iguais.

Não foi preciso cookie novo de 90 dias: o `fingerprint_id` já atravessa sessões e cada sessão guarda a própria origem, então o first-touch é uma consulta e não um dado novo a coletar.

## Códigos

| código | quando | o que fazer |
|---|---|---|
| `200` | achou | usar |
| `400` | token fora do formato (`[A-Za-z0-9_-]{6,80}`) | corrigir a chamada |
| `401` | `X-Api-Key` ausente ou errada | conferir a chave |
| `404` + `motivo: card_desconhecido` | o card nunca chegou ao site | investigar a **entrega do webhook** |
| `404` + `motivo: sem_correlacao` | card conhecido, sem visita ligada | esperado: a correlação se recusou a escolher |
| `404` (rota por sessão) | sessão desconhecida | — |
| `503` | chave não configurada no servidor | avisar a Attra |

Os dois `404` são separados de propósito: apontam para lados diferentes do problema.

## O que falta dos dois lados

**Attra/site:**
- definir `SITE_ATRIBUICAO_API_KEY` na VPS (sem ela: 503);
- `wbraid` / `gbraid` ainda **não** são capturados. Tráfego de Google Ads no iOS chega sem `gclid` e com um desses — esses leads continuam sem clique pago identificado.

**Fykos:** chamar o endpoint quando o card entra (ou num backfill), guardando `ligacao` junto com a origem.

## Critério de aceite

A conferência de vocês (`com_sessao / leads_site > 90%`) mede o campo `usuario.site_session_id`. Com este caminho ele passa a ser preenchido pela resposta do endpoint, não pelo parser da mensagem — vale conferir se a consulta continua fazendo sentido desse jeito.
