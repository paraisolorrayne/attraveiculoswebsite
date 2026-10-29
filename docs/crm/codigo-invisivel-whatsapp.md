# Código invisível do WhatsApp: o que a Fykos precisa fazer

**Data:** 29/10/2026. **Do lado do site:** pronto. Entra no ar no próximo deploy; avisamos a data.

## Resumo

Todo clique num botão de WhatsApp do site coloca na mensagem pré-preenchida um código de 44 caracteres invisíveis, logo depois da saudação ("Olá!"). O cliente vê só o texto normal.

O mesmo código vai no aviso de clique (`aviso_clique_site`), no campo novo `codigo_whatsapp`. Com isso, a primeira mensagem da conversa se liga ao clique certo pelo código, sem depender do horário.

No teste de 29/10, o código chegou inteiro no iPhone, no WhatsApp Web e com a mensagem editada antes do envio. Chegou igual nos três pontos que vocês conferiram: o que a Avisa entregou, o banco do atendimento e o que o attra-py gravou. O Android ainda não foi testado.

## 1. O que muda no aviso de clique

O aviso ganha um campo, `codigo_whatsapp`:
- É um número inteiro de 0 a 4.294.967.295.
- Vem `null` quando o link não levava código, o que acontece em avisos de antes do deploy.
- O `versao` continua 1, porque o campo é só acrescentado.

```json
{
  "tipo": "aviso_clique_site",
  "versao": 1,
  "clique_id": "f84ac3a8-1481-4ddb-ad22-63b7587e9be4",
  "clique_em": "2026-10-29T13:36:41.000Z",
  "session_id": "1784810859532-pupqonclbi",
  "pagina": "/veiculo/mercedes-s-63-2025-1142317",
  "veiculo_id": "1142317",
  "first_touch": { "gclid": "Cj0KCQjw...", "utm_campaign": "[VA] Search | Estoque Premium", "...": "..." },
  "last_touch": { "...": "..." },
  "mensagem": "Olá!<44 caracteres invisíveis> Tenho interesse no Mercedes S-63 2025. Gostaria de mais informações.",
  "codigo_whatsapp": 1630495827
}
```

`mensagem` continua sendo o texto exato que foi pré-preenchido, agora **com** os caracteres invisíveis dentro, como chegam na conversa. Por isso, o casamento de vocês por "texto igual" não quebra.

## 2. Formato do código

São 44 caracteres seguidos, colocados logo depois da saudação:

| Caractere | Vale |
|---|---|
| `U+200C` (zero-width non-joiner) | 0 |
| `U+200D` (zero-width joiner) | 1 |

| Posição | Conteúdo |
|---|---|
| 1 a 4 | marca de início, sempre `1011` |
| 5 a 36 | o código: 32 bits, número sem sinal, bit mais alto primeiro |
| 37 a 44 | verificação: CRC-8 (polinômio `0x07`, valor inicial 0) dos 4 bytes do código, em big-endian |

**A regra de leitura:** procurar 44 caracteres seguidos de `U+200C`/`U+200D` que comecem com `1011` e cujo CRC confira. Se não conferir, descartar. É melhor não ligar a conversa ao clique do que ligar à pessoa errada.

## 3. O que implementar

1. **Ao receber o aviso:** guardar o `codigo_whatsapp` junto da nota, com índice por código.
2. **Na primeira mensagem de uma conversa nova:** ler o código do texto **bruto**, antes de qualquer limpeza, com `ler_codigo` (seção 4). Se o webhook vier em JSON, decodificar o JSON primeiro: os caracteres podem vir escapados como `\u200c` e `\u200d`.
3. **Achou o código:**
   - Ligar a conversa ao aviso com o mesmo `codigo_whatsapp` recebido nos últimos 7 dias. Se houver mais de um, ficar com o mais recente antes da mensagem.
   - Dele vêm a campanha (`first_touch`/`last_touch`, com gclid/gbraid/wbraid), a página, o veículo e o `session_id`.
   - Marcar a ligação como **por código**, que é a determinística.
4. **O aviso ainda não chegou:** o aviso sai no clique, antes de o WhatsApp abrir, mas o envio é best-effort (duas tentativas).
   - Se a mensagem chegar com código e sem aviso, guardar o código na conversa.
   - Quando o aviso chegar, procurar conversa recente com o mesmo código e ligar.
5. **Sem código, ou com código sem aviso depois de 1 hora:** seguir com a regra atual, texto igual e mesmo minuto, marcando a ligação como **por horário**. Essa é provável, não certa.
   - Ligação por horário **nunca** deve virar conversão devolvida ao Google: um gclid errado ensina o lance a buscar o público errado.
6. **Limpar antes de mostrar:**
   - Tirar o código do texto antes de passar ao Luís, ao vendedor e aos relatórios, com `sem_codigo` (seção 4).
   - Ela remove só sequências de 8 ou mais desses caracteres. Não removam os isolados, porque emojis compostos (👨‍👩‍👧) usam `U+200D`.
   - O texto bruto fica onde for auditoria.
7. **Opcional:** no card que vocês mandam para `/api/webhook/fykos-crm`, incluir o `codigo_whatsapp` lido e como a ligação foi feita (`codigo` ou `horario`). Ainda não usamos isso aqui, mas deixa a conferência possível dos dois lados.

## 4. Código de referência (Python)

Conferido contra mensagens geradas pelo próprio site: lê o código, aguenta edição no fim da mensagem, descarta código incompleto e não mexe em emoji.

```python
import re

ZERO, UM = "\u200c", "\u200d"   # U+200C vale 0, U+200D vale 1
MARCA = "1011"
TAMANHO = 44                     # 4 de marca + 32 do código + 8 de verificação
_SEQUENCIA = re.compile("[\u200c\u200d]+")
_CODIGO = re.compile("[\u200c\u200d]{8,}")


def _crc8(dados: bytes) -> int:
    c = 0
    for b in dados:
        c ^= b
        for _ in range(8):
            c = ((c << 1) ^ 0x07) & 0xFF if c & 0x80 else (c << 1) & 0xFF
    return c


def ler_codigo(texto):
    """O código escondido na mensagem (int de 0 a 4294967295), ou None."""
    if not texto:
        return None
    for seq in _SEQUENCIA.findall(texto):
        for i in range(len(seq) - TAMANHO + 1):
            bits = "".join("1" if ch == UM else "0" for ch in seq[i:i + TAMANHO])
            if not bits.startswith(MARCA):
                continue
            codigo = int(bits[4:36], 2)
            if int(bits[36:], 2) == _crc8(codigo.to_bytes(4, "big")):
                return codigo
    return None


def sem_codigo(texto):
    """A mensagem sem o código, para o Luís, o vendedor e os relatórios."""
    return _CODIGO.sub("", texto or "")
```

### Vetores para teste

Os 44 bits de cada código (`1` = `U+200D`, `0` = `U+200C`):

| Código | Bits |
|---|---|
| 1630495827 (teste iPhone) | `10110110000100101111011001000101001101011000` |
| 3917058264 (teste WhatsApp Web) | `10111110100101111001100100001101100001111000` |
| 0 | `10110000000000000000000000000000000000000000` |
| 4294967295 | `10111111111111111111111111111111111111011110` |

Para montar uma mensagem de teste: `"Olá!" + bits trocados pelos caracteres + " Tenho interesse"`.

## 5. Critério de aceite

1. **Clique e envio sem mexer:** clicar em "Falar com consultor" num carro do site e enviar sem mexer. A conversa liga ao aviso daquele clique **por código**, com a campanha e o carro certos.
2. **Edição no fim:** o mesmo, mudando o fim da mensagem antes de enviar. Continua **por código**.
3. **Texto reescrito:** apagar o texto e escrever outro. Sem código, cai na regra **por horário**.
4. **Texto limpo:** o Luís e o vendedor veem o texto sem os caracteres. O banco guarda o bruto.
5. **Android:** clique e envio por um Android. Esse é o teste que falta.

## Do lado do site (referência)

- Geração e leitura: `src/lib/codigo-whatsapp.ts`.
- O código entra no link no clique, pelo ouvinte global de `visitor-tracking-provider.tsx`.
- No servidor, `src/app/api/tracking/interaction/route.ts` lê o código do próprio texto do link e o põe no aviso (`aviso-clique-fykos.ts`).
- Um segundo toque em menos de 3 s repete o código, porque o servidor ignora esse clique e não manda segundo aviso.
- A política de privacidade explica o código (seção "Atendimento via WhatsApp").
