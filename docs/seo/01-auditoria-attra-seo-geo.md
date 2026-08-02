# Auditoria SEO + GEO — Attra Veículos
**Domínio:** https://attraveiculos.com.br
**Data da coleta:** 01/08/2026
**Método:** rastreamento das 350 URLs declaradas nos 4 sitemaps, com leitura do HTML bruto de cada resposta (sem execução de JavaScript), inspeção do DOM renderizado, dos blocos JSON-LD, do `robots.txt`, do `llms.txt` e dos endpoints públicos `/api/llm/*` e `/api/vehicles/*`.

> Todos os números deste documento vieram de medição direta no site em produção. Nada foi estimado. Onde a informação depende de dado comercial que só a Attra pode confirmar, o item está marcado como **[VALIDAR]** e listado no documento `04-pendencias-validacao.md`.

---

## 1. Inventário técnico

### 1.1 Stack e estrutura

O site roda em **Next.js com App Router** (presença de `/_next/`, payload RSC via `self.__next_f.push`, `meta name="next-size-adjust"`). A hospedagem responde com HTTP/2, HTML em `pt-BR`, e há Google Tag Manager instalado na home.

A arquitetura de URLs é limpa e estável — não há IDs de sessão, parâmetros de tracking nas rotas canônicas nem extensões de arquivo. Isso é um ativo: a base está correta, o problema não é a estrutura de endereços.

### 1.2 Mapa de URLs declaradas

`/sitemap.xml` é um índice válido, com `lastmod` atualizado, apontando para quatro sitemaps filhos:

| Sitemap | URLs | Conteúdo |
|---|---|---|
| `/sitemap-pages.xml` | 89 | home, institucionais, `/comprar/*`, `/preco/*`, `/guia/*`, `/importacao/*` |
| `/sitemap-manual.xml` | 99 | glossário técnico `/manual-attra/*` |
| `/sitemap-blog.xml` | 92 | posts `/blog/*` |
| `/sitemap-estoque.xml` | 70 | fichas `/veiculo/*` |
| **Total** | **350** | |

Distribuição por família:

| Família | URLs |
|---|---|
| `/manual-attra/*` (glossário) | 99 |
| `/blog/*` | 94 |
| `/veiculo/*` (estoque) | 70 |
| `/comprar/*` (marca, modelo, condição, faixa de preço, perfil) | 48 |
| Institucionais e serviços | 16 |
| `/preco/*` | 13 |
| `/guia/*` | 5 |
| `/importacao*` | 4 |
| Home | 1 |

### 1.3 Estoque real (base para qualquer decisão de conteúdo)

70 veículos com URL própria e indexável. Composição por marca:

Porsche 19 · BMW 10 · Mercedes-Benz 8 · Land Rover 7 · Audi 6 · Ferrari 4 · RAM 3 · Chevrolet 2 · Cadillac 2 · Ford 2 · Lamborghini 1 · Tesla (Cybertruck) 1 · Volvo 1 · GMC 1 · Nissan 1 · Pontiac 1.

### 1.4 Sinais de entidade e NAP

O bloco `AutoDealer` da home declara: Attra Veículos · +55 34 3014-3232 · Av. Rondon Pacheco, Uberlândia/MG, BR · `areaServed`: Brasil · `sameAs`: apenas Instagram.

O `llms.txt` declara adicionalmente WhatsApp (34) 99944-4747 e e-mail faleconosco@attraveiculos.com.br. **Esses dois canais não aparecem no JSON-LD** — a entidade está descrita de forma mais completa no arquivo para LLMs do que no dado estruturado que o Google lê.

---

## 2. O achado central: metade do site não existe para crawlers sem JavaScript

Esta é a conclusão que muda a prioridade de tudo o que vem depois.

Foi medido, para cada uma das 350 URLs, quantas palavras de texto o servidor entrega **dentro de elementos HTML** — descontando todo o conteúdo que só existe dentro de tags `<script>` (o payload RSC do Next.js).

| Família | URLs | Sem HTML renderizado (< 50 palavras) | % |
|---|---|---|---|
| Home | 1 | 1 | 100% |
| `/comprar/*` | 48 | 48 | 100% |
| `/preco/*` | 13 | 13 | 100% |
| `/guia/*` | 5 | 5 | 100% |
| `/importacao*` | 4 | 4 | 100% |
| `/manual-attra/*` | 99 | 99 | 100% |
| Institucionais | 15 | 15 | 100% |
| `/blog` (índice) | 1 | 1 | 100% |
| `/blog/*` (posts) | 93 | 0 | 0% |
| `/veiculo/*` | 70 | 0 | 0% |
| `/veiculos` (listagem) | 1 | 0 | 0% |
| **Total** | **350** | **186** | **53%** |

O corte é limpo: **todas** as páginas de conteúdo institucional, de categoria, de preço, de guia e de glossário estão do lado invisível. **Todas** as fichas de veículo e posts de blog estão do lado visível. Não é um problema difuso de qualidade — é um problema de arquitetura de renderização, concentrado em famílias inteiras de rotas.

Exemplos verificados individualmente:

| URL | Bytes de HTML | Palavras em HTML | `<h1>` no HTML |
|---|---|---|---|
| `/` | 64.904 | **0** | 0 |
| `/comprar/porsche/911` | 67.337 | **0** | 0 |
| `/preco/audi-rs6-brasil` | 46.324 | **0** | 0 |
| `/sobre` | 86.835 | **0** | 0 |
| `/contato` | 66.981 | **0** | 0 |
| `/veiculos` | 251.224 | 446 | 1 |
| `/veiculo/porsche-911-2026-1066491` | 332.314 | 629 | 2 |
| `/blog/bmw-320i-vs-audi-rs6-avant-comparativo-y114` | 107.021 | 1.081 | 2 |

### Por que isso é decisivo para GEO

O Googlebot renderiza JavaScript, então essas páginas **podem** ser indexadas — com atraso e custo de crawl budget. Mas os rastreadores que alimentam os modelos de linguagem e as respostas de busca por IA, em regra, **não executam JavaScript**: eles leem o HTML bruto da primeira resposta. Para GPTBot, ClaudeBot, PerplexityBot e afins, `/comprar/porsche/911` é um documento de 67 KB sem um único parágrafo, título ou link de produto.

Agora cruze isso com o monitoramento. As 4 citações que a Attra já recebeu vieram do site; as três famílias que entregam HTML de verdade são exatamente `/veiculo/*`, `/blog/*` e `/veiculos`. E os prompts em que a marca **não** aparece são atendidos justamente pelas famílias invisíveis:

| Prompt sem menção | Página que deveria responder | Estado |
|---|---|---|
| Porsche 911 à venda | `/comprar/porsche/911` (**7 unidades reais em estoque**) | 0 palavras em HTML |
| Carros de luxo usados à venda | `/comprar/condicao/seminovos-premium` | 0 palavras em HTML |
| Onde comprar carro importado com segurança | `/garantia-e-procedencia`, `/importacao-de-veiculos-de-luxo` | 0 palavras em HTML |
| Carros esportivos à venda / usados | *(não existe página dedicada)* | ausente |
| Lamborghini Urus à venda | *(sem Urus em estoque — há 1 Gallardo)* | não aplicável |
| Bentley usada | *(sem Bentley em estoque)* | não aplicável |
| 4 prompts em inglês | *(site é 100% pt-BR, sem hreflang, `/en` → 404)* | ausente |

Não é preciso criar quase nada para destravar o item mais valioso da lista: a página do Porsche 911 já existe, com estoque real de 7 carros e texto editorial escrito. Ela simplesmente não é entregue em HTML.

---

## 3. Problemas técnicos confirmados

Ordenados por impacto. Cada item traz a evidência medida.

### P0 — Bloqueiam a citação por LLM e a indexação eficiente

**P0.1 — 186 páginas sem renderização no servidor.**
Detalhado na seção 2. Causa provável: `'use client'` no nível de página ou carregamento de dados no cliente nessas rotas. Correção no documento `03-correcoes-codigo.md`, item 1.

**P0.2 — A listagem `/veiculos` entrega apenas 12 dos 70 veículos no HTML.**
Medido: o HTML bruto de `/veiculos` contém 12 links `href="/veiculo/..."`. Os outros 58 só aparecem após paginação/scroll no cliente. Um crawler sem JS descobre 17% do estoque a partir da listagem.

**P0.2b — O índice `/blog` também é client-only, e é o único hub para os 92 posts.**
Os posts individuais renderizam bem (1.081 palavras medidas em um deles), mas a página que os lista não entrega nada em HTML. Ou seja: o conteúdo editorial que hoje sustenta as citações da Attra depende do sitemap para ser descoberto — não há caminho de link interno rastreável sem JavaScript.

**P0.3 — A API de busca semântica anunciada para LLMs está quebrada.**
`/api/vehicles/search?q=porsche` responde `{"results":[],"query":"porsche"}`. Testado também com `q=carro esportivo para pista` — mesmo resultado vazio. Esse endpoint está explicitamente liberado no `robots.txt` (`Allow: /api/vehicles/search`) e divulgado no `llms.txt` como "busca semântica — busca por significado". Hoje ele diz a qualquer LLM que a Attra não tem nenhum carro.

**P0.4 — O feed de inventário para LLMs está truncado.**
`/api/llm/vehicles` devolve um `ItemList` com `numberOfItems: 50`, enquanto o sitemap declara 70 veículos. 20 carros ficam fora do feed — entre eles Ferrari 296 2025, Mercedes GLE 63 S 2023, BMW X6 2026, Porsche 911 2023 e Porsche 911 2012. Parece um limite fixo de 50 na consulta.

**P0.5 — URLs com filtro são indexáveis, sem canonical e com título idêntico.**
`/veiculos?marca=porsche` e `/veiculos?marca=porsche&ano=2024` retornam HTTP 200, `meta robots: index, follow`, **nenhuma tag canonical** e o mesmo `<title>` da listagem base. O mesmo vale para `/blog?categoria=mercado`. Com 6 dimensões de filtro na interface (marca, ano, carroceria, combustível, blindagem, faixa de preço) mais ordenação, isso é um espaço combinatório indexável.

**P0.6 — Tag canonical ausente em 113 URLs.**
Sem canonical: a home, 12 das 16 institucionais, as 99 páginas de `/manual-attra/*` e 1 post de blog. As famílias `/veiculo/*`, `/comprar/*`, `/preco/*`, `/guia/*` e `/importacao*` têm canonical correto e autorreferente.

**P0.7 — Sufixo de marca duplicado em 169 títulos.**
Padrão observado: `Porsche 911 2026 | Attra Veículos | Attra Veículos`. Atinge os 70 veículos, 44 posts de blog, 13 `/comprar/modelo/*`, 13 `/preco/*`, 8 institucionais, 7 `/comprar/perfil/*`, 5 `/guia/*`, 4 de importação e 5 de condição/faixa de preço. É um bug de composição de metadados (o layout provavelmente aplica um `template` e a página já entrega o sufixo).

### P1 — Degradam a qualidade do sinal

**P1.1 — Dois `<h1>` em todas as 70 páginas de veículo** (e em 9 posts de blog). Na ficha do Porsche 911 os dois são `911` e `Porsche 911`. Além de violar a hierarquia, o H1 principal é só o modelo — perde marca, versão e ano.

**P1.2 — JSON-LD `AutoDealer` e `WebSite` duplicados nas páginas internas.** A ficha de veículo carrega 8 blocos: `AutoDealer`, `WebSite`, `AutoDealer`, `WebSite`, `Vehicle`, `Product`, `BreadcrumbList`, `FAQPage`. A home carrega apenas 2, corretos. A duplicação vem de um componente global que também é montado dentro da página.

**P1.3 — `og:url` errado na listagem.** `/veiculos` declara `og:url = https://attraveiculos.com.br` (a home). Compartilhamentos da listagem apontam para o lugar errado.

**P1.4 — Entidade `AutoDealer` incompleta.** Faltam: número e CEP no `streetAddress` (hoje só "Av. Rondon Pacheco"), `geo` (latitude/longitude), `openingHoursSpecification`, `priceRange`, e `sameAs` além do Instagram — não há Google Business Profile, YouTube, Facebook nem LinkedIn declarados. O WhatsApp e o e-mail que existem no `llms.txt` não estão no JSON-LD. **[VALIDAR]**

**P1.5 — `Offer` sem os campos que o Google pede para listagem de produto.** O `Offer` da ficha traz `url`, `price`, `priceCurrency`, `availability` e `seller`. Faltam `priceValidUntil`, `itemCondition` no nível da oferta, `hasMerchantReturnPolicy` e `shippingDetails` — ausências geram avisos no Rich Results Test e reduzem a elegibilidade a rich results. **[VALIDAR]** (política de devolução e entrega precisam ser confirmadas antes de declarar).

**P1.6 — Oito páginas ativas para modelos sem estoque.**
Confirmado por cruzamento com os 70 veículos: `/comprar/ferrari/roma`, `/comprar/bmw/x5`, `/comprar/audi/r8`, `/comprar/mclaren/artura`, `/comprar/modelo/mercedes-c63-amg`, `/comprar/modelo/audi-q7`, `/comprar/modelo/range-rover-sport`, `/comprar/modelo/bmw-x5` — todas com 0 unidades correspondentes. `/comprar/mclaren/artura`, por exemplo, tem 364 palavras de texto editorial e nenhum carro. Existem ainda as gêmeas `/preco/*` dos mesmos modelos.

**P1.7 — Nenhuma página de marca para 9 marcas que a Attra realmente tem.**
Há `/comprar/*` para Porsche, Ferrari, BMW, Mercedes-Benz, Audi, Land Rover, Chevrolet e McLaren. Não há para Lamborghini, RAM, Cadillac, GMC, Ford, Volvo, Nissan, Tesla e Pontiac — todas com estoque real.

**P1.8 — 20 imagens sem `alt` na ficha de veículo** (de 34 no total) e 30 sem `width`/`height` declarados, o que alimenta CLS. Na listagem e no blog o `alt` está correto; o problema é específico da galeria da ficha.

**P1.9 — 252 títulos acima de 65 caracteres**, incluindo praticamente todo o blog (90 de 94) e o glossário (98 de 99). Boa parte é consequência direta do P0.7.

**P1.10 — `/lp-importacao/` está indexado no Google e o servidor responde 404** na variante sem barra. É uma URL viva nos resultados de busca apontando para nada.

**P1.11 — `/news` e `/servicos/importacao` respondem 200 e estão fora de todos os sitemaps.** Ambas já aparecem indexadas.

**P1.12 — Títulos idênticos entre a home e `/comprar`** (`Comprar Carros de Luxo e Supercarros no Brasil | Attra Veículos`) e entre pares de veículos do mesmo modelo/ano — 8 pares confirmados, por exemplo os dois Porsche 911 2026, os dois Ferrari 296 2025 e os dois Mercedes G-63 2021. Sem o diferenciador (versão, cor, km) os títulos competem entre si.

### P2 — Risco estratégico e cobertura

**P2.1 — Padrão programático no blog.** 92 posts seguem o formato `{modelo-a}-vs-{modelo-b}-comparativo-{hash4}` ou `{modelo}-{ano}-{cor}-attra-veiculos-{hash4}`, com sufixo aleatório de 4 caracteres na URL. O conteúdo em si é substancial (1.081 palavras verificadas em um deles) e o autor declarado é "Attra Veículos", mas a escala e o padrão são o perfil que a política de *scaled content abuse* do Google descreve. Recomendação na seção 4.

**P2.2 — Cluster `/manual-attra` com 99 páginas**, todas sem canonical, todas sem HTML renderizado, 71 com meta description curta. Convive com `/glossario-automotivo`. **[VALIDAR]** se há sobreposição de conteúdo entre os dois.

**P2.3 — Zero conteúdo em inglês.** `html lang="pt-BR"`, nenhum `hreflang`, `/en`, `/en/`, `/english` e `/us` respondem 404. Quatro dos dez prompts em que a Attra não é citada são em inglês. Não há caminho para ser citada neles hoje.

**P2.4 — `llms.txt` bem estruturado, mas com duas falhas.** O arquivo (21 KB, 128 linhas) tem seções organizadas, dados de contato e diretrizes. Porém: (a) contém a afirmação **"referência nacional em veículos premium e superesportivos"**, que é uma alegação absoluta não comprovável e contraria a regra do briefing; (b) lista apenas 1 link de veículo individual — não expõe o inventário, que é justamente o ativo citável.

**P2.5 — Nenhum veículo com status de vendido.** Amostra de 15 fichas: todas declaram `InStock`. **[VALIDAR]** qual é o tratamento atual quando um carro é vendido — se a URL é removida (perde autoridade acumulada e gera 404) ou se permanece.

---

## 4. O que NÃO recomendo fazer

Três recomendações negativas, porque o site já foi escalado agressivamente e mais volume pioraria a situação:

**Não criar novas páginas de modelo sem estoque.** Já existem 8. O caminho é o inverso: decidir o destino delas (seção 5).

**Não expandir o padrão de blog programático.** 92 posts com sufixo aleatório na URL, gerados em lote, é volume suficiente. O ganho marginal do post 93 é menor que o risco agregado de uma avaliação de conteúdo em escala.

**Não bloquear nem remover páginas antes de medir.** Várias das páginas thin podem estar recebendo tráfego ou já ter links. Antes de qualquer `noindex` ou remoção, cruzar com Search Console (impressões, cliques, páginas indexadas) — o que exige acesso à propriedade. **[VALIDAR]**

---

## 5. Recomendação de arquitetura para as páginas thin

Para as 8 páginas de modelo sem estoque e para o cluster `/manual-attra`, a decisão não é binária entre manter e apagar. Proponho um estado intermediário, controlado pelo próprio dado de estoque:

Uma página de modelo passa a ter três estados, resolvidos em tempo de build/ISR a partir do inventário:

1. **Com estoque** — indexável, `ItemList` com as unidades, conteúdo editorial + FAQ. É o estado atual desejado.
2. **Sem estoque, com histórico** — indexável, mas com bloco explícito de indisponibilidade ("não temos unidades deste modelo no momento"), CTA de `/solicitar-veiculo`, e `ItemList` com alternativas reais da mesma faixa. Sem `Offer`, sem `Product` — apenas `WebPage` + `FAQPage`. Isso mantém a URL, é honesto com o usuário e com o LLM, e não declara disponibilidade falsa.
3. **Sem estoque e sem histórico** — `noindex, follow`, fora do sitemap, mantida acessível por link interno.

O mesmo mecanismo resolve o item do briefing sobre veículos vendidos: a ficha migra para `availability: SoldOut`, mantém a URL, exibe o status com clareza e sugere alternativas — em vez de sumir com 404.

---

## 6. Checklist de QA (para usar após cada correção)

Indexabilidade: HTML bruto da rota contém `<h1>`, parágrafos e links de produto sem executar JS · `meta robots` correto · canonical autorreferente presente · URL no sitemap correspondente.

Dados estruturados: um único `AutoDealer` e um único `WebSite` por página · `Product`/`Vehicle` só quando todos os campos são verdadeiros · `FAQPage` só com as perguntas visíveis na página · validação sem erros no Schema Markup Validator e no Rich Results Test.

Metadados: título único, ≤ 65 caracteres, sem sufixo duplicado · description entre 120 e 160 caracteres · `og:url` igual ao canonical · um único `<h1>`.

Mídia e performance: todas as imagens com `alt` descritivo · `width` e `height` declarados · `loading="lazy"` fora da primeira dobra · LCP e CLS medidos no mobile antes e depois.

Funcional: formulários enviando · CTAs de WhatsApp e telefone abrindo corretamente no mobile · breadcrumbs visíveis e coerentes com o `BreadcrumbList` · GTM disparando.

Endpoints GEO: `/api/vehicles/search` retornando resultados · `/api/llm/vehicles` com a contagem igual à do sitemap · `llms.txt` sem alegações não comprováveis.
