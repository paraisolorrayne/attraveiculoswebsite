# Relatório: Jina AI para SEO/LLMO da Attra Veículos

## Sumário Executivo

A Attra Veículos já possui uma base sólida de SEO técnico (JSON-LD, `llms.txt`, sitemaps, `robots.txt`), mas está **invisível nas buscas genéricas** por supercarros no Brasil. Usando as APIs da Jina AI — **Reader**, **Reranker** e **Embeddings** — podemos melhorar significativamente o rankeamento tanto em mecanismos de busca tradicionais (Google) quanto em **buscas de LLMs** (ChatGPT, Perplexity, Gemini) através de LLMO (Large Language Model Optimization).

---

## 1. Diagnóstico Atual

### 1.1 Como a Jina Reader vê o site

Usando `r.jina.ai`, analisamos como LLMs e crawlers leem as páginas da Attra:

| Página | Título | Content Length | Problemas |
|--------|--------|---------------|-----------|
| `/` (Home) | "Attra Veículos - Carros Premium em Uberlândia" | ~8.500 chars | Título genérico, pouco conteúdo textual |
| `/veiculos` | "Attra Veículos - Carros Premium em Uberlândia" | ~15.350 chars | **Título igual ao da home** — ambiguidade para LLMs |
| `/veiculo/[slug]` | "Chevrolet Corvette Z06 Z06 2023" | ~13.650 chars | Bom conteúdo, ficha técnica presente |
| `/jornada` | "Attra Veículos - Carros Premium em Uberlândia" | ~12.000 chars | **Título igual ao da home** |
| `/llms.txt` | ✅ Presente e bem estruturado | ~4.500 chars | Falta mencionar a Jornada/Acervo Icônico |

### 1.2 Rankeamento nas Buscas (via `s.jina.ai`)

| Busca | Posição Attra | Observação |
|-------|--------------|------------|
| "concessionária carros premium uberlândia" | **#1** ✅ | Excelente — marca local forte |
| "ferrari a venda uberlândia" | **#8** ⚠️ | Perdendo para WebMotors, OLX, Trovit |
| "comprar supercarros brasil" | **Não aparece** ❌ | WebMotors, ShiftCar, SuperCarros dominam |
| "carros de luxo importados brasil" | **Não aparece** ❌ | Gatti, Stern Import, ShiftCar aparecem |
| "attra veiculos ferrari uberlândia" | **#1** ✅ | Busca de marca funciona |

**Diagnóstico**: Attra domina buscas de marca/local, mas é invisível em buscas genéricas por categoria.

### 1.3 O que já existe de SEO

✅ **Bem feito:**
- `llms.txt` dinâmico com blog posts
- JSON-LD: `Vehicle`, `Product`, `FAQPage`, `BreadcrumbList`, `AutoDealer`, `Organization`, `WebSite` com SearchAction
- Sitemaps split (blog, estoque, manual, páginas)
- `robots.ts` com regras por bot
- Open Graph meta tags
- Ficha técnica curada para 20+ modelos (PR #11)

⚠️ **Pontos de melhoria:**
- Títulos de página repetidos (home = veículos = jornada)
- `llms.txt` não menciona a Jornada Attra, acervo icônico, ou a ficha técnica
- Falta `llms-full.txt` com contexto expandido
- Sem uso de busca semântica no site (só filtros tradicionais)
- Página de veículos sem `ItemList` schema para o catálogo
- Jornada sem `CollectionPage` ou `ItemList` schema para os carros icônicos

---

## 2. APIs da Jina AI — O que cada uma faz

### 2.1 Jina Reader (`r.jina.ai` / `s.jina.ai`)

**O que é**: Converte URLs em texto limpo (Markdown) otimizado para consumo por LLMs. Também faz busca na web (`s.jina.ai`).

**Para que serve na Attra:**
- **Monitoramento LLMO**: Periodicamente verificar como LLMs veem cada página da Attra
- **Auditoria de conteúdo**: Identificar quando o conteúdo renderizado por JS não é visível para crawlers
- **Análise competitiva**: Verificar como concorrentes aparecem nas buscas de LLMs
- **Validação de `llms.txt`**: Confirmar que o arquivo está sendo servido corretamente

**Custo**: Gratuito sem API key (rate limit baixo). Com API key, 1M tokens grátis/mês.

### 2.2 Jina Reranker (`jina-reranker-v3`)

**O que é**: Dado uma query de busca e uma lista de documentos, reordena por relevância semântica. Funciona em português e multilingue.

**Teste realizado com dados Attra:**
```
Query: "Ferrari com motor V12 aspirado para colecionador"
Resultados:
  #1 (score: 0.4691): Ferrari 812 GTS V12 6.5L aspirado 795 cv ✅ CORRETO
  #2 (score: -0.0312): Ferrari SF90 Stradale V8 biturbo hybrid
  #3 (score: -0.0332): Ferrari Roma V8 biturbo
```
O reranker entende semântica profunda — "V12 aspirado" rankeia a 812 GTS muito acima do SF90 (V8 turbo).

**Para que serve na Attra:**
1. **Busca interna de veículos**: Substituir filtros tradicionais por busca semântica. "Carro para pista com motor aspirado" → encontra Porsche GT4 RS e Audi R8 antes do Mercedes G63.
2. **Blog relacionado**: Dado um veículo, encontrar os posts de blog mais relevantes para cross-link.
3. **FAQ relevante**: Dado a página que o usuário está vendo, selecionar as 3 perguntas mais relevantes das FAQs gerais.

**Custo**: Gratuito até 1M tokens/mês.

### 2.3 Jina Embeddings (`jina-embeddings-v5-text-small`)

**O que é**: Gera vetores numéricos (1024 dimensões) que representam o significado de textos. Textos similares → vetores próximos.

**Teste realizado:**
```
Input 1: "Ferrari 812 GTS V12 aspirado 795 cv supercarro esportivo spider teto retrátil Uberlândia"
Input 2: "comprar superesportivo com motor aspirado naturalmente no Brasil"
Input 3: "melhor carro para colecionador de veículos premium"
→ 1024 dimensões por input, 62 tokens consumidos
```

**Para que serve na Attra:**
1. **Busca semântica de veículos**: Armazenar embeddings de cada veículo no Supabase (pgvector). Quando o usuário busca "carro para viagem confortável com família", retorna Range Rover e Escalade, não Corvette.
2. **Recomendação de veículos similares**: "Viu o 911 GT3? Veja também: 718 GT4 RS, AMG GT, Ferrari Roma"
3. **Classificação automática de leads**: Analisar a mensagem do lead e classificar interesse (esportivo, SUV, luxo, colecionador)
4. **Busca semântica no blog**: "Como funciona um motor turbo?" → encontra todos os posts relevantes, não só os que usam a palavra exata "turbo"

**Custo**: Gratuito até 1M tokens/mês.

---

## 3. Plano de Implementação

### Fase 1 — Quick Wins (podem entrar no PR #11)

#### 3.1a Atualizar `llms.txt` com Jornada e Acervo Icônico

Adicionar a Jornada Attra e os carros icônicos no `llms.txt`:

```
- [Jornada Attra](${BASE}/jornada): processo completo de compra de supercarros — da curadoria à entrega nacional
- [Acervo Icônico Attra](${BASE}/jornada#acervo-iconico): 8 veículos marcantes já comercializados — Ferrari 812 GTS, SF90 Stradale, Roma, Mercedes G-63, McLaren Artura, Porsche 718, GMC Hummer EV e Audi R8
```

#### 3.1b Adicionar JSON-LD `ItemList` na Jornada (Acervo Icônico)

Schema `ItemList` para os carros icônicos, melhorando a indexação:
```json
{
  "@type": "ItemList",
  "name": "Carros Icônicos que Passaram pela Attra",
  "numberOfItems": 8,
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "item": { "@type": "Vehicle", "name": "Ferrari 812 GTS", ... } }
  ]
}
```

#### 3.1c Enriquecer meta tags da Jornada

O título `<title>` da Jornada é idêntico ao da Home. Precisa ser único para SEO.

### Fase 2 — Integração Jina na Busca Interna (PR separado)

#### 3.2a Busca semântica de veículos com Jina Embeddings

Fluxo:
1. Na inserção/atualização de veículo (AutoConf sync), gerar embedding via Jina Embeddings API
2. Armazenar no Supabase usando `pgvector` (extensão já disponível)
3. Na busca: converter query do usuário em embedding → `ORDER BY embedding <=> query_embedding`
4. Refinar com Jina Reranker para os top 20 resultados

**Benefício**: Usuário digita "carro esportivo para track day" → retorna GT3, GT4 RS, Corvette Z06 (não por keyword, mas por significado).

#### 3.2b Busca semântica no blog com Reranker

Quando o usuário acessa um veículo, usar o Reranker para sugerir posts de blog relevantes:
```
POST https://api.jina.ai/v1/rerank
query: "Ferrari Roma 2023 V8 biturbo"
documents: [todos os posts do blog]
→ top 3 posts mais relevantes como "Leitura Recomendada"
```

### Fase 3 — LLMO Avançado (PR separado)

#### 3.3a Endpoint de Embedding para Crawlers de LLM

Criar `/api/llm/vehicles` que retorna embeddings pré-computados dos veículos em formato JSON. LLMs como ChatGPT podem usar esse endpoint para buscar veículos semanticamente.

#### 3.3b Monitoramento de Visibilidade em LLMs

Cron job usando `s.jina.ai` para monitorar posição da Attra em buscas estratégicas:
- "comprar supercarros brasil"
- "ferrari a venda minas gerais"
- "porsche concessionária confiável"
- "carros premium uberlândia"

Alertar quando a posição cair ou subir significativamente.

#### 3.3c Otimização de Conteúdo Baseada em Embeddings

Comparar embeddings das páginas de veículos da Attra com embeddings das buscas mais comuns. Identificar "gaps semânticos" — termos que os usuários buscam mas não estão cobertos pelo conteúdo.

---

## 4. Implementação Técnica — Configuração das APIs

### API Key da Jina

Já fornecida: `jina_cd6437dfd7a74ff1a6c758eff3dd35fcvtT6eh8cCHw_LHT0K5iBRAmrHX1k`

### Endpoints

| API | Endpoint | Modelo | Uso |
|-----|----------|--------|-----|
| Reader | `https://r.jina.ai/{url}` | N/A | Monitoramento LLMO |
| Search | `https://s.jina.ai/{query}` | N/A | Auditoria de rankeamento |
| Reranker | `https://api.jina.ai/v1/rerank` | `jina-reranker-v3` | Busca interna, blog relacionado |
| Embeddings | `https://api.jina.ai/v1/embeddings` | `jina-embeddings-v5-text-small` | Busca semântica, similaridade |

### Exemplo de uso no código (Next.js API route)

```typescript
// src/lib/jina.ts
const JINA_API_KEY = process.env.JINA_API_KEY

export async function rerankDocuments(query: string, documents: string[], topN = 5) {
  const res = await fetch('https://api.jina.ai/v1/rerank', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${JINA_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'jina-reranker-v3',
      query,
      top_n: topN,
      documents,
      return_documents: true,
    }),
  })
  return res.json()
}

export async function generateEmbeddings(texts: string[]) {
  const res = await fetch('https://api.jina.ai/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${JINA_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'jina-embeddings-v5-text-small',
      task: 'retrieval.passage',
      normalized: true,
      input: texts,
    }),
  })
  return res.json()
}
```

---

## 5. Resultados Esperados

| Métrica | Atual | Com Fase 1 | Com Fase 2+3 |
|---------|-------|-----------|--------------|
| "concessionária premium uberlândia" | #1 | #1 | #1 |
| "ferrari a venda uberlândia" | #8 | #3-5 | #1-3 |
| "comprar supercarros brasil" | Não aparece | Top 10 | Top 5 |
| "carros de luxo importados brasil" | Não aparece | Top 10 | Top 5 |
| Visibilidade em ChatGPT/Perplexity | Baixa | Média | Alta |
| Busca interna do site | Keyword-only | Keyword + filtros | Semântica com Jina |
| Cross-link blog ↔ veículo | Manual | Manual | Automático com Reranker |

---

## 6. Próximos Passos Recomendados

1. **Agora (PR #11)**: Implementar quick wins — `llms.txt` atualizado, JSON-LD `ItemList` na Jornada, meta tags únicas
2. **Sprint seguinte**: Criar `src/lib/jina.ts` com client das APIs, integrar Reranker na busca de blog
3. **Médio prazo**: pgvector no Supabase, embeddings de veículos, busca semântica
4. **Contínuo**: Monitorar rankeamento em LLMs via `s.jina.ai` com dashboards

---

*Relatório gerado em 03/05/2026 com testes reais usando a API Jina AI (key: jina_cd...X1k)*
