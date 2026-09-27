# Atribuição de campanha para o CRM (Fykos)

Resposta ao handoff *"atribuição de campanha para leads vindos do site"* (27/09/2026).

## Por que não voltamos a anexar o `[ref: ...]`

O marcador não quebrou. Ele foi **removido de propósito em 05/08/2026** (commit `0f337c9`): o identificador de sessão é log interno e não deve viajar na mensagem que o **comprador** manda para a loja.

No lugar dele o site passou a gravar o clique (`whatsapp_clicks`: sessão + horário) e a correlacionar a conversa que chega pelo webhook, dentro de uma janela de 10 minutos, com duas regras deliberadas:

1. um clique atribui **uma** conversa;
2. havendo mais de uma sessão candidata na janela, **não escolhe**.

O que faltava era o caminho de volta: essa correlação ficava só no banco do site. É isso que os endpoints abaixo resolvem — sem devolver identificador interno para dentro da conversa do cliente.

## 1. Aviso de clique — o caminho principal

O site avisa **no momento do clique**, antes de a conversa chegar. É um `POST` para a URL que vocês informarem (`FYKOS_AVISO_CLIQUE_URL` do nosso lado), com `Authorization: Bearer <token>` se vocês quiserem.

```json
{
  "tipo": "aviso_clique_site",
  "versao": 1,
  "clique_id": "f84ac3a8-1481-4ddb-ad22-63b7587e9be4",
  "clique_em": "2026-09-27T22:17:32.084Z",
  "session_id": "s4",
  "pagina": "/veiculo/mercedes-g-63-2021-988095",
  "veiculo_id": "988095",
  "first_touch": { "gclid": "g1", "wbraid": null, "gbraid": null, "campaign": null, "landing": "/", "ts": "..." },
  "last_touch":  { "source": "linktr.ee", "landing": "/comprar", "ts": "..." }
}
```

### Três regras, por favor

1. **Isto não é um lead.** O `tipo` está aí para isso. Se o aviso criar usuário ou card, o mesmo lead entra duas vezes — uma por aqui e outra pela entrada real do WhatsApp. Guardem numa tabela lateral; quem cria o lead continua sendo o WhatsApp.
2. **A ligação é por tempo.** Quando a conversa chegar, casem com o aviso mais recente dentro de uma janela (usamos 10 min do nosso lado). Mais de um candidato → não escolher, como já fazemos aqui: atribuir a campanha errada contamina um lead real, e ausente é recuperável.
3. **`clique_id` é estável.** Reentrega do mesmo aviso não deve virar duas notas.

Só sai aviso quando há origem: visita sem nenhum sinal não gera nota, para não gastar uma correspondência possível com "não sei de onde veio".

O envio é best-effort e não segura nada: se o receptor estiver fora do ar, o clique continua gravado aqui e os endpoints abaixo continuam respondendo. Verificado derrubando o receptor.

## 2. Endpoints de consulta — o complemento

Servem para backfill e para o lead que virou card. Ambos pedem o cabeçalho `X-Api-Key`. Sem a chave configurada no servidor, respondem **503** e não atendem (falha fechado, de propósito).

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
- **`gclid`, `wbraid` e `gbraid`** são o MESMO clique pago do Google. No iOS com rastreamento limitado (ATT) o Google manda `wbraid` ou `gbraid` **no lugar** do `gclid` — nunca os três juntos. Quem só olhar `gclid` continua perdendo esse tráfego.
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
- definir `FYKOS_AVISO_CLIQUE_URL` (e opcionalmente `FYKOS_AVISO_CLIQUE_TOKEN`) na VPS — sem a URL, o aviso simplesmente não sai;
- definir `SITE_ATRIBUICAO_API_KEY` na VPS (sem ela: 503);
- ~~`wbraid` / `gbraid`~~ — **capturados desde 27/09/2026.** Precisa rodar a migration `20260927_visitor_sessions_wbraid_gbraid.sql` na VPS.

**Fykos:** receber o aviso de clique numa tabela lateral e casá-lo com a conversa por tempo. Os endpoints de consulta ficam para backfill e para o card.

## Critério de aceite

A conferência de vocês (`com_sessao / leads_site > 90%`) mede `usuario.site_session_id` sobre TODOS os leads com origem `site`, incluindo primeiro contato e descarte — que nunca viram card. É por isso que o aviso de clique é o caminho principal e o endpoint por card é só complemento: só o aviso cobre esse conjunto inteiro.
