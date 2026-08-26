# Monitoramento de citações em assistentes de IA (AEO)

Mede, uma vez por mês, se a Attra é citada quando alguém pergunta a um assistente
de IA o que o site existe para responder. É a métrica de resultado da estratégia
de AEO (avaliação de 26/08/2026): sem isto, todo ajuste no site é fé.

## O painel (22 prompts)

Fixo de propósito — mudar as perguntas todo mês impede comparar. Só entra prompt
novo com uma linha explicando por quê, e o antigo continua sendo medido.

| # | Prompt | Página que deve responder |
|---|---|---|
| 1 | Porsche 911 à venda no Brasil | `/comprar/porsche/911` |
| 2 | Carros de luxo usados à venda | `/comprar/condicao/carros-de-luxo-usados` |
| 3 | Onde comprar carro importado com segurança | `/onde-comprar-carros-de-luxo` |
| 4 | Carros esportivos usados à venda | `/comprar/condicao/carros-esportivos-usados` |
| 5 | Loja de carros de luxo em Uberlândia | `/carros-de-luxo-uberlandia` |
| 6 | Concessionária de carros premium em Minas Gerais | `/carros-de-luxo-uberlandia`, `/sobre` |
| 7 | Mercedes G 63 AMG à venda | `/comprar/mercedes-benz/g63-amg` |
| 8 | McLaren à venda no Brasil | categoria McLaren / ficha |
| 9 | Ferrari 296 GTS preço no Brasil | ficha da 296 |
| 10 | Aston Martin Vantage à venda | ficha / categoria |
| 11 | RAM 1500 usada à venda | categoria RAM (a criar — backlog B2) |
| 12 | Tesla Cybertruck no Brasil, onde comprar | ficha do Cybertruck |
| 13 | Como saber se um carro de luxo usado tem procedência | `/criterios-de-selecao` |
| 14 | Vale a pena comprar supercarro usado? | `/comprar/condicao/carros-esportivos-usados`, blog |
| 15 | Loja que aceita meu carro na troca por um de luxo | `/troca` |
| 16 | Como financiar um carro de luxo | `/financiamento` |
| 17 | Comprar carro de luxo em outra cidade com entrega | `/como-funciona-entrega-brasil` |
| 18 | Importar carro de luxo para o Brasil, como funciona | `/importacao-de-veiculos-de-luxo` |
| 19 | Quanto custa manter uma Ferrari no Brasil | blog |
| 20 | Comprar supercarros no Brasil | `/comprar`, `/veiculos` |
| 21 | Luxury car dealer in Brazil (en) | só se houver versão em inglês |
| 22 | Buy a Porsche 911 in Brazil (en) | só se houver versão em inglês |

## Como medir (1ª semana de cada mês)

Para cada prompt, em cada motor, **numa janela anônima e sem histórico**:

| Motor | Como |
|---|---|
| ChatGPT | modo com busca na web ligado |
| Perplexity | busca padrão |
| Gemini | app do Gemini |
| Copilot | copilot.microsoft.com |
| Google AI Overview / AI Mode | busca no Google; registrar se o bloco de IA apareceu e quem ele cita |

Anotar por linha:

- **Resultado:** `citada` (com link para o site) · `mencionada` (nome sem link) · `ausente`
- **No lugar:** até 3 fontes citadas quando a Attra não aparece (WebMotors, OLX, ShiftCar…)
- **Página citada:** qual URL da Attra apareceu (confere se foi a página certa)

Preencher o arquivo do mês copiando `2026-08.md`. Uma hora de trabalho.

## Metas (90 dias, a partir de setembro/2026)

Dos 20 prompts em português: citada em **8 no Perplexity** e **5 no ChatGPT**.
Zero veículo vendido citado com preço (linha "Frescor" abaixo).

## O que cruzar com o painel

- **Canal "Assistente de IA"** no painel de visitantes (`/admin/visitors`): sessões e
  leads vindos de chatgpt.com, perplexity.ai, copilot, gemini, claude.ai. É o resultado
  em dinheiro; o painel de prompts é o diagnóstico.
- **Bing Webmaster Tools:** páginas indexadas e o relatório do IndexNow (o cron
  `attra-indexnow-sync` envia o que mudou de hora em hora).
- **Frescor:** abrir 5 fichas citadas e conferir se "anúncio publicado em" e
  "disponibilidade conferida em" batem com a realidade.

## Proxy automático (opcional)

`node scripts/monitorar-citacoes-ia.mjs` roda os 22 prompts na busca da Jina
(`s.jina.ai`, precisa de `JINA_API_KEY`, a mesma do embeddings-sync) e diz em que
posição `attraveiculos.com.br` aparece nos resultados de busca web. **Não é** a
resposta de um assistente — é o insumo que eles usam. Serve para acompanhar entre
uma medição manual e outra, não para substituí-la.
