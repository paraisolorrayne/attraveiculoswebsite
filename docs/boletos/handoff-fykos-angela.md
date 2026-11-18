# Boletos: contrato entre o painel do site e o Fykos (agente Ângela)

Escrito em 18/11/2026. Lado do site: pronto. Lado do Fykos: a implementar.

## O que cada lado faz

O financeiro cadastra os boletos no painel do site (`/admin/boletos`), um por vez ou por planilha. O painel **não envia WhatsApp**. Ele avisa o Fykos de cada boleto, e a Ângela cuida da conversa com o cliente pela API oficial, com template. O que acontecer na conversa volta para o painel.

```
painel do site                         Fykos (Ângela)
--------------                         --------------
boleto cadastrado, alterado,   ──▶     guarda o boleto, decide quando lembrar,
pago, cancelado, excluído              envia o template, lê a resposta

atualiza o boleto e o          ◀──     lembrete enviado ou não entregue, cliente
histórico                              respondeu, prometeu pagar em tal dia,
                                       mandou comprovante, pagamento confirmado
```

Decisões já tomadas no lado do site:

- **Quando lembrar é decisão do Fykos.** O painel manda o boleto com o vencimento; a régua (quantos dias antes, no dia, depois) é da Ângela.
- **Comprovante não marca como pago.** O painel mostra "Comprovante para conferir" e alguém do financeiro confirma. Quando confirmar, o Fykos recebe `boleto.pago`.
- **O valor pode vir vazio.** A planilha do financeiro tem nome, vencimento e telefone; o valor é opcional. O template não pode depender dele.
- **O painel guarda só o link do comprovante**, nunca o arquivo.

## 1. Painel → Fykos

O Fykos expõe um endereço HTTPS e informa a URL e o segredo. No servidor do site:

```
FYKOS_BOLETOS_WEBHOOK_URL=https://<host do fykos>/<caminho>
FYKOS_BOLETOS_WEBHOOK_SECRET=<segredo de saída>
```

Sem as duas variáveis o painel não envia nada.

### Requisição

`POST` com `Content-Type: application/json` e:

| Cabeçalho | Valor |
|---|---|
| `X-Boletos-Signature` | HMAC-SHA256 do corpo bruto com o segredo de saída, em hexadecimal |
| `X-Boletos-Event-Id` | o mesmo `id_evento` do corpo |
| `Idempotency-Key` | o mesmo `id_evento` do corpo |

```json
{
  "evento": "boleto.cadastrado",
  "id_evento": "6f1c2a0e-3b4d-4e5f-8a9b-0c1d2e3f4a5b",
  "enviado_em": "2026-11-18T16:42:10.123Z",
  "boletos": [
    {
      "id": "0b6c1c1e-7a2f-4c55-9d0e-3f6f5a1b2c3d",
      "nome": "Maria da Silva",
      "telefone": "+5534999990000",
      "email": null,
      "vencimento": "2026-11-25",
      "valor": 1250.5,
      "descricao": "Parcela 3 de 12",
      "status": "aberto",
      "pago_em": null,
      "promessa_em": null
    }
  ]
}
```

- `boletos` traz de 1 a 100 itens. Uma planilha grande vira vários avisos.
- Cada item é o **estado completo e atual** do boleto. O Fykos pode gravar por `id` (criar se não existe, atualizar se existe) sem olhar o `evento`.
- `telefone` vem em E.164. `valor`, `email`, `descricao`, `pago_em` e `promessa_em` podem ser `null`.
- `status`: `aberto`, `em_negociacao`, `pago` ou `cancelado`.

### Eventos

| `evento` | Quando | O que a Ângela faz |
|---|---|---|
| `boleto.cadastrado` | Boleto novo (avulso ou planilha), ou reenvio de todos os em aberto | Guarda e passa a lembrar |
| `boleto.atualizado` | Mudou nome, telefone, vencimento, valor ou descrição; entrou ou saiu de negociação | Atualiza. Com `status = em_negociacao`, **não lembra** |
| `boleto.pago` | Marcado como pago no painel | **Para de lembrar** |
| `boleto.cancelado` | Cancelado no painel | **Para de lembrar** |
| `boleto.reaberto` | Voltou de pago ou cancelado para aberto | Volta a lembrar |
| `boleto.excluido` | Apagado (cadastro por engano, planilha desfeita) | Para de lembrar e esquece o boleto |

### Regras de entrega

- Responda **2xx** em até 8 segundos. Qualquer outra resposta, ou demora, conta como falha.
- Na falha o painel tenta de novo: 30 s, 1 min, 2 min, dobrando até 1 hora entre tentativas, sem desistir.
- A ordem é mantida: enquanto um aviso não é aceito, os seguintes esperam. Por isso `boleto.cadastrado` sempre chega antes de `boleto.pago` do mesmo boleto.
- O mesmo `id_evento` pode chegar mais de uma vez (o painel não soube se a entrega anterior valeu). Trate como repetido e responda 2xx.
- "Reenviar os em aberto", no painel, manda `boleto.cadastrado` de todos os boletos em aberto. Como o Fykos grava por `id`, isso não pode gerar lembrete repetido.

## 2. Fykos → painel

```
POST https://attraveiculos.com.br/api/webhook/fykos-boletos
Content-Type: application/json
X-Boletos-Signature: <HMAC-SHA256 do corpo bruto com o segredo de entrada, em hexadecimal>
```

No servidor do site:

```
BOLETOS_SITE_WEBHOOK_SECRET=<segredo de entrada>
```

São dois segredos diferentes, um para cada sentido.

### Corpo

```json
{
  "evento": "promessa.pagamento",
  "id_evento": "angela-2026-11-18-000123",
  "ocorrido_em": "2026-11-18T17:05:00Z",
  "boleto_id": "0b6c1c1e-7a2f-4c55-9d0e-3f6f5a1b2c3d",
  "dados": { "data": "2026-11-25", "mensagem": "Consigo pagar na quarta que vem" }
}
```

| Campo | Obrigatório | O que é |
|---|---|---|
| `evento` | sim | um dos eventos da tabela abaixo |
| `id_evento` | sim | qualquer texto único por evento, até 200 caracteres. O mesmo id enviado de novo não muda nada |
| `boleto_id` | sim | o `id` que o painel enviou |
| `ocorrido_em` | não | data e hora em ISO 8601. Sem ele, vale a hora do recebimento |
| `dados` | depende do evento | ver abaixo |

### Eventos e o que muda no painel

| `evento` | `dados` | Efeito |
|---|---|---|
| `lembrete.enviado` | `template` (opcional): nome do template | Conta um lembrete e grava a hora. Limpa o aviso de "não entregue" |
| `lembrete.falhou` | `motivo` (opcional): texto curto | Boleto ganha o aviso "lembrete não entregue" com o motivo |
| `cliente.respondeu` | `mensagem`: o que o cliente escreveu | Só histórico |
| `promessa.pagamento` | `data` (**obrigatório**): `AAAA-MM-DD`; `mensagem` (opcional) | Boleto passa a "Prometeu pagar" até essa data. Passou a data sem pagamento, volta a "Em atraso", com a promessa à vista |
| `comprovante.recebido` | `url` (opcional): link **https** do arquivo; `pago_em` (opcional): `AAAA-MM-DD`; `mensagem` (opcional) | Boleto passa a "Comprovante para conferir". **Não** vira pago |
| `pagamento.confirmado` | `pago_em` (opcional): `AAAA-MM-DD`, não pode ser futuro | Boleto vira pago. Use só quando o pagamento estiver confirmado de verdade |

Textos (`mensagem`, `motivo`) são cortados em 1.000 caracteres.

Se a Ângela não conseguir extrair a data de uma promessa ("pago semana que vem"), mande `cliente.respondeu` com a mensagem, e não `promessa.pagamento` com data chutada.

### Respostas

| Status | Significado | O que fazer |
|---|---|---|
| `200 {"ok":true,"repetido":false}` | Aplicado | Nada |
| `200 {"ok":true,"repetido":true}` | Esse `id_evento` já tinha sido aplicado | Nada |
| `400 {"error":"..."}` | Corpo inválido; o texto diz o que faltou | Corrigir. Repetir igual não adianta |
| `401` | Assinatura ausente ou errada | Conferir o segredo e se a assinatura foi feita sobre o corpo bruto |
| `404` | `boleto_id` não existe no painel (foi excluído) | Parar de lembrar esse boleto |
| `413` | Corpo acima de 100 kB | Mandar um evento por requisição |
| `500` | Falha ao gravar | Tentar de novo com o mesmo `id_evento` |
| `503` | Segredo de entrada não configurado no site | Avisar a Attra |

## 3. Assinatura

Nos dois sentidos: HMAC-SHA256 dos **bytes exatos do corpo**, com o segredo daquele sentido, em hexadecimal minúsculo. Assinar o JSON depois de reformatar (outra ordem de chaves, outros espaços) dá assinatura diferente.

Conferir o que chega do painel (Python):

```python
import hashlib, hmac

def assinatura_confere(corpo_bruto: bytes, cabecalho: str | None, segredo: str) -> bool:
    if not cabecalho:
        return False
    esperado = hmac.new(segredo.encode(), corpo_bruto, hashlib.sha256).hexdigest()
    return hmac.compare_digest(esperado, cabecalho.strip().lower())
```

Assinar o que vai para o painel (Python):

```python
import hashlib, hmac, json, httpx

corpo = json.dumps(evento, ensure_ascii=False).encode()
assinatura = hmac.new(SEGREDO_DE_ENTRADA.encode(), corpo, hashlib.sha256).hexdigest()
httpx.post(URL_DO_PAINEL, content=corpo, headers={
    "Content-Type": "application/json",
    "X-Boletos-Signature": assinatura,
})
```

Teste pelo terminal:

```bash
CORPO='{"evento":"cliente.respondeu","id_evento":"teste-1","boleto_id":"<id de um boleto>","dados":{"mensagem":"teste"}}'
ASSINATURA=$(printf '%s' "$CORPO" | openssl dgst -sha256 -hmac "$SEGREDO_DE_ENTRADA" -hex | sed 's/^.*= //')
curl -i -X POST https://attraveiculos.com.br/api/webhook/fykos-boletos \
  -H 'Content-Type: application/json' -H "X-Boletos-Signature: $ASSINATURA" -d "$CORPO"
```

## 4. Para ligar

1. Fykos implementa o recebimento (seção 1) e informa a URL e o segredo de saída.
2. Attra gera o segredo de entrada e passa ao Fykos.
3. As três variáveis entram no `.env.production` do site, seguidas de um deploy.
4. No painel, "Reenviar os em aberto" manda ao Fykos os boletos que já estavam cadastrados.
5. Teste com um boleto de telefone interno: cadastrar, receber o template, responder com uma data, mandar um comprovante, confirmar o pagamento no painel e ver a Ângela parar.

## 5. O que fica do lado do Fykos decidir

- A régua de lembretes e os horários de envio.
- Os templates aprovados na API oficial, lembrando que o valor pode faltar.
- O que fazer com cliente que pediu para não receber mensagem.
- Quando usar `pagamento.confirmado`. Na dúvida, mande `comprovante.recebido` e deixe o financeiro confirmar.

## Onde está no código do site

| O quê | Arquivo |
|---|---|
| Envio, fila e leitura dos eventos | `src/lib/boletos-fykos.ts` |
| Recebimento | `src/app/api/webhook/fykos-boletos/route.ts` |
| Nova tentativa pelo cron | `src/app/api/cron/boletos-fykos/route.ts`, `deploy/cron/` |
| Tabelas | `supabase/migrations/20261118_boletos.sql` |
| Testes | `src/lib/__tests__/boletos-fykos.test.ts` |
