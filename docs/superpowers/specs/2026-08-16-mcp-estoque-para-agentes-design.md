# Servidor MCP: estoque da Attra para agentes de IA

**Data:** 16/08/2026
**Status:** desenho aprovado, implementação não iniciada

## Objetivo

Lead rastreável com origem em assistente de IA. Um agente consulta o estoque
da Attra em linguagem natural, recebe dado real e registra o interesse da
pessoa — com o prazo de compra declarado.

## O que motivou

Dois artigos da AuthorityTech, trazidos pela Attra, e a verificação de ambos.

**O que se confirmou.** A Auto Trader lançou app no ChatGPT em 15/05/2026 e
descreve, na própria nota, ter construído "foundational, plug-and-play
infrastructure using the Model Context Protocol (MCP)", com a intenção
declarada de reusar a mesma interface para outros LLMs. A citação a MCP é
literal, não interpretação.

**O que não se sustenta.** O artigo sobre visibilidade em IA propõe que
citação se ganha com colocação editorial em Reuters e Forbes, e afirma que
conteúdo próprio tem "zero sinal". A AuthorityTech vende assessoria de
imprensa, e a conclusão do texto é o serviço dela. A afirmação é exagerada:
assistentes citam página própria com frequência quando a pergunta é
específica de produto.

O que os dois artigos juntos acertam é a separação entre duas coisas:

| | pergunta | como se ganha | codificável |
|---|---|---|---|
| autoridade de marca | "melhor loja de carros premium?" | editorial de terceiros | não |
| presença de produto | "SUV familiar até R$ 300 mil" | estoque estruturado e conectável | **sim** |

Este spec trata só da segunda. É onde uma loja de ~80 carros compete com um
marketplace de 100 mil: não é preciso vencer em volume, é preciso estar entre
os três resultados certos.

## O dado que enquadra a decisão

Medido em produção em 16/08/2026, sobre 20.092 sessões entre 02/06 e 16/08:

| canal | sessões | viu veículo | WhatsApp |
|---|---|---|---|
| todo o resto | 20.062 | 18% | 358 |
| IA: ChatGPT | 19 | 42% | 1 |
| IA: outros | 1 | 0 | 0 |

**ChatGPT é 0,09% do tráfego — cerca de 7 visitas por mês.** A taxa de abertura
de veículo é mais alta, mas com n=19 não sustenta conclusão; o único clique de
WhatsApp é evento único.

Isto está registrado para que a decisão seja lida pelo que é: **aposta em canal
que ainda não existe, feita com os olhos abertos**, e não resposta a demanda
observada. A Attra decidiu construir sabendo do número.

Dois achados de passagem, que valem para além deste projeto:

- **O lead da Attra é o WhatsApp**, não o formulário: 358 contra 2 em 20 mil
  sessões.
- Sessões de IA duram menos (48s contra 172s), o que sugere conferência de
  informação, não pesquisa.

## Limite do mecanismo, dito uma vez

**MCP não é canal de descoberta.** Um servidor MCP só responde a quem o conectou
deliberadamente. Não é o que faz a Attra aparecer para quem pergunta "onde
comprar Porsche" ao ChatGPT. Quem entra por ali já sabe que a Attra existe: o
time, parceiros, e eventualmente um diretório de conectores.

Isso não invalida o projeto — define quem é o usuário e, portanto, quais
ferramentas fazem sentido.

## Arquitetura

Rota dentro da própria app Next (`/api/mcp`), e não processo separado. O motivo
decisivo é **fonte única de estoque**: um servidor apartado leria outra origem e
um dia divergiria, e um assistente citando preço errado com autoridade de fonte
consultada é pior que assistente sem resposta. Compartilhar a fonte é estrutural
aqui e seria disciplina lá.

```
src/lib/mcp/perfil-semantico.ts     PURO. Veículo + descritores → texto indexável.
                                    Sem banco, sem rede.
            ↓ alimenta
vehicle_embeddings (já existe)      pgvector 1024. Passa a indexar intenção,
                                    não só ficha técnica.
            ↑ consulta
src/lib/mcp/ferramentas.ts          DOMÍNIO. buscar / detalhar / registrar /
                                    critérios. Não sabe o que é MCP.
            ↑ expõe
src/app/api/mcp/route.ts            PROTOCOLO. Transporte e schema das tools.
                                    Fino: traduz e delega.
```

As três decisões difíceis mudam em ritmos diferentes, e por isso moram em
arquivos diferentes: como descrever um carro para uma IA é conteúdo (muda toda
semana), quais ferramentas existem é produto (muda por trimestre), o protocolo
é infraestrutura de terceiro (muda quando OpenAI e Anthropic mudarem).

### O que já existe e será reusado

- `vehicle_embeddings` — pgvector 1024, sincronizada por `/api/embeddings/sync`
- `/api/vehicles/search` — busca semântica já em produção, já liberada no robots
- `buildVehiclePassage` em `src/lib/jina.ts` — o texto que vira embedding
- `/api/contact` — três canais (e-mail, WhatsApp, webhook CRM) e o 502 quando
  nenhum recebe
- `traffic-channel.ts` — já classifica `chatgpt` no grupo `ia`

## Camada semântica

É o coração do projeto, não um acessório. O texto indexado hoje é todo factual:

```
marca · modelo · versão · ano · cor · carroceria · combustível ·
motor · potência · km · preço · descrição
```

Nada nele fala "família", "porta-malas grande", "fim de semana" ou "boa
liquidez". A consulta que abre o case da Auto Trader — *"SUV familiar com
bastante espaço no porta-malas"* — casa mal, e não por falta de MCP.

### Rótulos, por regra

Vocabulário fechado. Regra determinística sobre `body_type`, `doors`, `seats`,
`mileage`, `price`, `brand` — não palpite de modelo. Cupê de dois lugares nunca
é "familiar"; isso é derivável e portanto testável.

```
uso        urbano · viagem · fim de semana · família · pista · coleção
comprador  primeiro premium · executivo · família · entusiasta · colecionador
força      conforto · desempenho · espaço · exclusividade · liquidez ·
           baixa quilometragem
```

### Prosa, por modelo

Uma ou duas frases que amarram os rótulos, porque embedding casa melhor com
texto corrido do que com lista de etiquetas. Mesma infraestrutura do Gemini que
já escreve "Sobre este veículo" no site.

**Regra dura:** a prosa só reescreve rótulo e valor de ficha. **Sem comparativo,
superlativo ou juízo de conforto.** Nada de "espaçoso", "confortável", "mais
rápido que", "ideal para", "espaço real para quatro adultos", "desempenho acima
da média da categoria".

Isso é mais restritivo do que soa — a maior parte da prosa que um modelo escreve
sobre carro cai nessa peneira. O custo é texto mais seco, que casa um pouco
menos. O erro evitado é um assistente afirmando que cabem quatro adultos e o
cliente descobrindo no showroom.

Exemplo do que a passagem passa a conter:

```
Porsche Macan GTS Bi-Turbo 2024 Cinza SUV Gasolina 19.930 km R$ 499.000
SUV premium para uso diário e viagem em família. Baixa quilometragem.
Perfil: executivo, família.
```

Defensável linha a linha: `body_type` dá "SUV", os rótulos dão uso e perfil,
`mileage` dá "baixa quilometragem".

### Onde os descritores moram

Tabela nova, `vehicle_semantic_labels`, chaveada por `vehicle_id`:

```
vehicle_id
rotulos_uso        text[]   derivados por regra
rotulos_comprador  text[]
rotulos_forca      text[]
prosa              text     gerada pelo modelo
sobrescrito_por    text     e-mail do operador, nulo quando é só regra
atualizado_em
```

Separada de `vehicle_embeddings` de propósito: aquela é derivada e pode ser
regerada do zero a qualquer momento; esta contém correção humana, que não pode
ser perdida numa ressincronização. `buildVehiclePassage` passa a ler as duas.

### Correção pela Attra

Qualquer rótulo pode ser sobrescrito à mão, pela tela de admin do veículo. A
regra vai errar em casos que só quem atende conhece. Sobrescrita **sobrevive à
regeração** — é o motivo de a tabela ser separada, e vale um teste próprio.

### Falha do modelo

Se a geração de prosa falhar, a sincronização grava a passagem factual e segue.
Índice desatualizado é pior que índice sem prosa.

## Ferramentas

**`buscar_veiculos`** — recebe pergunta em linguagem natural, não filtros.
Consulta vetorial sobre a passagem enriquecida; corte por preço e
disponibilidade aplicado **depois** do vetor. Devolve poucos resultados, com
link. Nunca a lista inteira: o valor é ser os três certos.

**`detalhar_veiculo`** — ficha completa de um slug, preço e disponibilidade ao
vivo. É o que impede o assistente de responder de memória sobre carro já
vendido.

**`registrar_interesse`** — cria o lead.

```
nome
contato
veiculo            (slug, quando houver um específico)
procurando         (o que a pessoa descreveu)
prazo_de_compra    ate_1_mes | ate_3_meses | ate_6_meses | sem_prazo  (opcional)
```

`prazo_de_compra` usa vocabulário fechado porque "mês que vem", "logo", "sem
pressa" e "assim que vender o meu" precisam cair em caixas ordenáveis. Mapeia no
`prioridade: baixa | media | alta` que o CRM já tem.

**Trava:** o campo é opcional e o assistente só manda `sem_prazo` quando
perguntou e a pessoa não soube — **nunca por dedução**. Um modelo que escreve
"3 meses" porque soa razoável envenena a fila que o campo existe para ordenar, e
o erro é invisível: chega lead bem formatado com prioridade errada. Isso vai na
descrição da ferramenta, que é o que o modelo lê antes de chamar.

Este campo é a primeira coisa do projeto que o canal faz **melhor** que o site:
no formulário, "quando pretende comprar?" é campo a mais e derruba conversão;
numa conversa, é a pergunta que qualquer vendedor faz naturalmente.

**`criterios_da_attra`** — o que reprova um veículo, o que é conferido, como
funcionam troca e importação. Já existe como página (`/criterios-de-selecao`).
Sem isso o assistente inventa sobre procedência — e procedência é a palavra que
a Attra usa em todo anúncio.

## Atribuição

**O problema:** todo o aparato da Attra pressupõe navegador. `visitor_sessions`
guarda referrer, UTM e gclid; `classificarCanal` lê esses campos; os painéis
contam sessões. Uma chamada MCP não tem cookie, referrer nem sessão. Um lead que
entre por ali cairia fora de todos os relatórios, aparecendo como "(sem fonte)"
no meio do tráfego direto.

**Três peças, nenhuma suficiente sozinha:**

1. **`clientInfo` do handshake MCP** — nome e versão do cliente ("ChatGPT",
   "Claude Desktop"). É o mais próximo de um referrer que o canal tem, e vai
   gravado no lead. **Autodeclarado e não verificável** — pista, nunca prova.
   Mesma disciplina do gclid, que fica 90 dias no cookie e não prova origem paga.

2. **Links de saída marcados** — toda URL devolvida numa resposta MCP leva
   `utm_source=<cliente>&utm_medium=mcp`. Quando a pessoa clica, vira sessão
   normal e o `traffic-channel.ts` classifica em `ia` com a máquina que já
   existe. Costura os dois mundos sem inventar aparato novo.

3. **Tabela `mcp_requests`** — ferramenta, cliente, timestamp, quantidade de
   resultados. Sem dado pessoal. Responde uma pergunta só: **o canal está
   crescendo?** Hoje são 7 visitas/mês; se virar 200, é ela que avisa, e o
   gatilho da fase seguinte passa a ser dado em vez de artigo. Retenção de 180
   dias, pela mesma faxina do cron `cleanup-tracking` que já roda.

O lead não ganha caminho novo: `/api/contact` com `sourcePage: 'mcp'`, cliente
declarado e prazo. Herda o tratamento que devolve 502 quando nenhum canal
recebeu.

**O que não será prometido:** ligar um lead MCP à conversa que o originou. Não
há como ver o que a pessoa perguntou antes de o assistente chamar a ferramenta.
Sabe-se que veio do ChatGPT, o que foi pedido na chamada e o que foi clicado.
Relatório que sugerir mais que isso está errado.

## Abuso e falhas

**O endpoint de escrita é público.** Sem chave — chave mataria o valor de
qualquer um conectar. Três defesas:

1. **Limite de taxa:** 5 chamadas de `registrar_interesse` por IP por hora, e 60
   chamadas de leitura por IP por minuto. Números de partida, escolhidos para
   não atrapalhar uso humano nenhum — uma pessoa não registra seis interesses
   numa hora. Ajustar com o dado de `mcp_requests`, não por intuição.
2. **Validação de formato** antes de qualquer envio: telefone e e-mail plausíveis,
   nome com tamanho mínimo, `veiculo` que exista no estoque.
3. **Card por pessoa no CRM**, de modo que repetição colapsa em vez de
   multiplicar.

Não elimina lixo; impede enxurrada.

**Três falhas tratadas de formas diferentes:**

| falha | tratamento | por quê |
|---|---|---|
| busca vetorial fora | erro explícito | cair em filtro por marca fingindo equivalência faz o assistente repassar resultado degradado com a mesma confiança |
| preço/disponibilidade velhos | `detalhar_veiculo` lê ao vivo, sem cache | carro vendido citado como disponível é a pior falha do projeto |
| `/api/contact` recusa | reporta falha ao assistente | é o erro que o formulário do site já cometeu: anunciar sucesso para envio que não chegou |

## Testes

| unidade | o que se prova |
|---|---|
| rótulos por regra | cupê de dois lugares nunca recebe "família" |
| vocabulário | nenhum rótulo fora da lista fechada |
| prosa | sem comparativo, superlativo ou juízo de conforto |
| passagem | volta ao texto factual quando o modelo falha |
| ferramentas | com estoque falso, sem banco e sem rede |
| protocolo | `initialize` e `tools/list` respondem |

## Riscos

**Incógnita técnica a resolver primeiro.** Não foi verificado se o SDK oficial de
MCP roda dentro de um route handler do Next 16 com o transporte HTTP atual. É
risco real: se não rodar, a arquitetura muda para processo separado. **Primeiro
passo do plano: prova de conceito que só responde "pong"**, antes de qualquer
ferramenta.

**Risco que não se elimina.** Mesmo recebendo dado correto, o modelo do outro
lado pode enfeitar — acrescentar opcional que o carro não tem, arredondar preço.
Reduz-se devolvendo dado seco e sempre com a URL, para o humano conferir na
fonte. Não se impede. Vale saber antes de tratar o canal como vitrine oficial.

**Risco de retorno.** O canal entrega 7 visitas/mês hoje. O projeto pode estar
correto e mesmo assim não gerar lead nenhum no primeiro ano. A tabela
`mcp_requests` existe para que isso seja medido em vez de discutido.

## Ordem de implementação

O spec é grande, e a ordem importa porque a primeira etapa pode derrubar a
arquitetura.

1. **Prova de conceito do transporte.** Rota `/api/mcp` que responde
   `initialize` e um `tools/list` com uma ferramenta boba. Se o SDK não rodar no
   route handler do Next 16, a arquitetura muda aqui e o resto se replaneja.
2. **Camada semântica.** Regras de rótulo, tabela de descritores, prosa,
   `buildVehiclePassage` estendido, ressincronização dos embeddings. Entrega
   valor sozinha: `/api/vehicles/search`, que já existe e já está exposta,
   melhora sem nenhum MCP.
3. **Ferramentas de leitura.** `buscar_veiculos`, `detalhar_veiculo`,
   `criterios_da_attra`.
4. **Escrita e atribuição.** `registrar_interesse`, limite de taxa, links
   marcados, `mcp_requests`.

O passo 2 é o único que entrega resultado mesmo que os demais parem — e é
deliberado que ele venha cedo, dado que o canal ainda entrega 7 visitas/mês.

## Fora de escopo

- App publicada no marketplace do ChatGPT — processo da OpenAI não documentado
  nos artigos, e o formato é de checkout, pouco aderente a carro de R$ 5 milhões
- ChatGPT Ads
- Autoridade de marca por colocação editorial — não é trabalho de código
- Agendamento de visita
- Qualquer escrita além de `registrar_interesse`
