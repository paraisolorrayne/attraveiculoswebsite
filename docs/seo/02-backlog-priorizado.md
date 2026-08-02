# Backlog priorizado — SEO + GEO Attra Veículos

Critério de ordenação: impacto na probabilidade de citação por LLM e na indexação, dividido pelo esforço de engenharia. O esforço está em faixas (P = até meio dia, M = 1 a 3 dias, G = mais de 3 dias) e assume um desenvolvedor familiarizado com o projeto Next.js.

---

## Alto impacto

| # | Ação | Esforço | Por que primeiro |
|---|---|---|---|
| A1 | **Renderizar no servidor as 186 páginas hoje client-only** — home, `/comprar/*` (48), `/preco/*` (13), `/guia/*` (5), `/importacao*` (4), `/manual-attra/*` (99), institucionais (15) e o índice `/blog` | G | É a única correção que destrava simultaneamente a maior parte dos prompts sem menção. `/comprar/porsche/911` já tem 7 carros reais e texto pronto — só não é entregue em HTML. |
| A2 | **Consertar `/api/vehicles/search`** — hoje retorna `results: []` para qualquer consulta | P | Está liberado no `robots.txt` e divulgado no `llms.txt` como busca semântica. Hoje responde a todo LLM que a Attra não tem carro nenhum. Maior relação impacto/esforço de toda a lista. |
| A3 | **Remover o limite de 50 do feed `/api/llm/vehicles`** — devolver os 70 veículos, paginando se necessário | P | 20 carros invisíveis para consumo por LLM, incluindo Ferrari 296 e Mercedes GLE 63 S. |
| A4 | **Entregar os 70 veículos no HTML de `/veiculos`** (paginação com links `rel=next`/`prev` ou renderização completa no servidor) — hoje só 12 aparecem. Mesmo tratamento para o índice `/blog`, que hoje não expõe nenhum dos 92 posts em HTML | M | Um crawler sem JS descobre 17% do estoque pela listagem e nenhum post pelo hub do blog. |
| A5 | **Corrigir o sufixo duplicado de título** em 169 páginas (`... \| Attra Veículos \| Attra Veículos`) | P | Bug único no `template` de metadata; corrige de uma vez títulos, largura de snippet e parte dos 252 títulos longos. |
| A6 | **Adicionar canonical autorreferente** nas 113 URLs sem a tag (home, 12 institucionais, 99 `/manual-attra`, 1 blog) | P | Correção no layout raiz, resolve o cluster inteiro. |
| A7 | **Canonicalizar URLs com filtro** — `/veiculos?marca=…&ano=…` e `/blog?categoria=…` apontando para a versão limpa, e `noindex, follow` nas combinações de dois ou mais filtros | P | Impede que o espaço combinatório de 6 filtros + ordenação entre no índice. |
| A8 | **Um único `<h1>` por página** — hoje 70 fichas de veículo e 9 posts têm dois. Trocar o H1 da ficha de `911` para `Porsche 911 Carrera GTS Cabriolet 2026` | P | Sinal de entidade errado em 100% do estoque. |
| A9 | **Deduplicar os blocos `AutoDealer` e `WebSite`** nas páginas internas (hoje 2× cada) | P | Sinal contraditório de entidade em quase todo o site. |
| A10 | **Enriquecer `llms.txt`**: listar o inventário (marca, modelo, ano, km, faixa de preço e URL de cada veículo), remover a expressão "referência nacional", incluir data de atualização | P | O `llms.txt` já existe e é bem feito — falta nele exatamente o ativo citável, que é o estoque. |

## Médio impacto

| # | Ação | Esforço | Observação |
|---|---|---|---|
| B1 | **Definir o estado das 8 páginas de modelo sem estoque** (`ferrari/roma`, `bmw/x5`, `audi/r8`, `mclaren/artura`, `modelo/mercedes-c63-amg`, `modelo/audi-q7`, `modelo/range-rover-sport`, `modelo/bmw-x5`) segundo a máquina de 3 estados da seção 5 da auditoria | M | Cruzar antes com o Search Console. **[VALIDAR]** |
| B2 | **Criar páginas de marca para o estoque não coberto**: Lamborghini, RAM, Cadillac, GMC, Ford, Volvo, Nissan, Tesla | M | Só com inventário real e texto editorial próprio — não replicar template vazio. |
| B3 | **Criar `/comprar/carros-esportivos`** (categoria hoje inexistente e alvo de 2 prompts monitorados), montada sobre o estoque real de esportivos | M | Ferrari, Porsche 911/718, Corvette, Mustang, Camaro, Gallardo já sustentam a página. |
| B4 | **Completar a entidade `AutoDealer`**: número e CEP, `geo`, `openingHoursSpecification`, `priceRange`, `sameAs` com Google Business Profile, YouTube e demais perfis oficiais, `telephone` do WhatsApp | P | **[VALIDAR]** todos os campos com a Attra. |
| B5 | **Completar o `Offer`** das fichas com `priceValidUntil`, `itemCondition` no nível da oferta, e — apenas se confirmados — `hasMerchantReturnPolicy` e `shippingDetails` | P | **[VALIDAR]** política de devolução e de entrega antes de declarar qualquer uma. |
| B6 | **Implementar o estado `SoldOut`** nas fichas de veículos vendidos, mantendo a URL, com aviso visível e alternativas reais | M | Requisito explícito do briefing. **[VALIDAR]** o fluxo atual. |
| B7 | **`alt` descritivo nas 20 imagens da galeria da ficha** e `width`/`height` nas 30 sem dimensão | P | Acessibilidade + CLS no mobile. |
| B8 | **Redirect 301 de `/lp-importacao/` para `/importacao-de-veiculos-de-luxo`** | P | URL indexada no Google respondendo 404. |
| B9 | **Incluir `/news` e `/servicos/importacao` no sitemap**, ou consolidá-las se houver sobreposição com `/importacao-de-veiculos-de-luxo` | P | Hoje indexadas e fora de todos os sitemaps. |
| B10 | **Diferenciar títulos duplicados** — 8 pares de veículos do mesmo modelo/ano e o par home ÷ `/comprar`. Incluir versão, cor ou km no título da ficha | P | Canibalização direta. |
| B11 | **Corrigir `og:url` de `/veiculos`**, que hoje aponta para a home | P | |
| B12 | **Corrigir os 252 títulos acima de 65 caracteres** que sobrarem depois de A5 | M | |

## Baixo impacto (ou alto risco, exigindo decisão antes)

| # | Ação | Esforço | Observação |
|---|---|---|---|
| C1 | **Auditar a sobreposição entre `/manual-attra` (99 páginas) e `/glossario-automotivo`** e consolidar o que for duplicado | M | **[VALIDAR]** |
| C2 | **Revisar a estratégia do blog programático** (92 posts no padrão `X-vs-Y-comparativo-hash`). Congelar novas gerações, avaliar consolidação dos comparativos de baixo valor em hubs por segmento | G | Decisão de negócio antes de execução. **[VALIDAR]** |
| C3 | **Publicar versão em inglês** de 4 a 6 páginas-chave (`/sobre`, `/garantia-e-procedencia`, `/importacao-de-veiculos-de-luxo`, `/comprar`, `/veiculos`) com `hreflang` recíproco | G | Endereça 4 dos 10 prompts sem menção, todos em inglês. Só faz sentido depois de A1. |
| C4 | **Adicionar `ItemList` nas páginas de categoria** com estoque real | P | Depende de A1 para ter efeito. |
| C5 | **Data de atualização visível** nas fichas e nas categorias, quando o dado for tecnicamente confiável | P | Requisito do briefing; hoje ausente. |
| C6 | **Melhorar contraste do texto no tema escuro** das páginas de artigo | P | Observado visualmente; medir contra WCAG AA. |

---

## Sequência sugerida

**Semana 1 — correções cirúrgicas, sem risco de regressão:** A2, A3, A5, A6, A7, A9, B8, B11.
Todas são pontuais, mensuráveis em 48 h e não mexem em layout.

**Semanas 2 a 4 — a correção estrutural:** A1, começando por `/comprar/*` (48 páginas, maior retorno direto nos prompts monitorados), depois institucionais, depois `/manual-attra`. Junto: A4, A8, A10.

**Semanas 5 e 6 — conteúdo e entidade:** B1 a B7, B9, B10, B12 — todos dependentes das validações da equipe Attra.

**Depois:** C1 a C6, com decisão de negócio sobre C2 e C3.

---

## Páginas a enviar para indexação no Search Console (após A1)

Na ordem, e somente depois que cada uma passar no teste "o HTML bruto contém H1, texto e links":

`/`, `/veiculos`, `/comprar`, `/comprar/porsche/911`, `/comprar/porsche/cayenne`, `/comprar/porsche/macan`, `/comprar/mercedes-benz/g63-amg`, `/comprar/bmw/m3`, `/comprar/bmw/x6`, `/comprar/land-rover/range-rover`, `/comprar/ferrari/sf90`, `/comprar/chevrolet/corvette-z06`, `/comprar/condicao/seminovos-premium`, `/comprar/condicao/supercarros-seminovos`, `/comprar/faixa-preco/acima-de-1-milhao`, `/garantia-e-procedencia`, `/importacao-de-veiculos-de-luxo`, `/como-funciona-entrega-brasil`, `/por-que-comprar-na-attra`, `/sobre`, `/contato`.

Usar a Inspeção de URL para as prioritárias e reenviar `/sitemap.xml` ao final do lote.
