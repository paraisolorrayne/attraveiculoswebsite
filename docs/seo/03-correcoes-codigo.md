# Pacote de correções — Next.js App Router
**Para:** equipe de desenvolvimento da Attra
**Contexto:** o site foi auditado a partir das respostas HTTP públicas. Não houve acesso ao repositório, então os trechos abaixo são padrões de implementação a adaptar aos nomes de arquivo e ao data layer reais, não patches prontos para aplicar às cegas.

**Antes de qualquer alteração global:** criar branch, versionar `app/layout.tsx`, `next.config.js`, `app/robots.ts`, `app/sitemap.ts` e os componentes de metadata/JSON-LD, e registrar no PR quais arquivos foram tocados.

---

## 1. Renderização no servidor das rotas client-only (A1 — prioridade máxima)

### Como diagnosticar cada rota

O teste é objetivo. Para qualquer rota, compare o HTML bruto com o DOM renderizado:

```bash
curl -s https://attraveiculos.com.br/comprar/porsche/911 \
  | sed -E 's/<script[^>]*>.*?<\/script>//g' \
  | grep -c '<h1'
# hoje: 0    |    esperado depois da correção: 1
```

Rotas que retornam `0` estão client-only. Foram 186 das 350 — o corte é por família inteira, não caso a caso: todas as rotas de `/comprar`, `/preco`, `/guia`, `/importacao`, `/manual-attra`, todas as institucionais, a home e o índice `/blog`.

### Causa provável

Três padrões produzem esse sintoma no App Router. Verificar qual se aplica:

1. **`'use client'` no topo do `page.tsx`** — a página inteira vira Client Component e o Next só entrega o shell mais o payload RSC.
2. **`dynamic(() => import(...), { ssr: false })`** envolvendo o conteúdo principal.
3. **Busca de dados dentro de `useEffect`** — o HTML sai vazio porque os dados só chegam depois da hidratação. Este é claramente o caso de `/preco/*`, onde o HTML renderizado exibe o texto "Consultando estoque...".

### Padrão-alvo

Manter a página como Server Component e isolar a interatividade em ilhas de cliente:

```tsx
// app/comprar/[marca]/[modelo]/page.tsx  — SEM 'use client'
import { getModeloContent, getVeiculosPorModelo } from '@/lib/inventory'
import { FiltrosInterativos } from './filtros'   // este sim, 'use client'

export const revalidate = 900   // ISR: HTML fresco a cada 15 min

export async function generateStaticParams() {
  return await listarCombinacoesMarcaModelo()
}

export async function generateMetadata({ params }) {
  const m = await getModeloContent(params)
  return {
    title: m.tituloSeo,                                  // ver item 2
    description: m.descricao,
    alternates: { canonical: `/comprar/${params.marca}/${params.modelo}` },
    openGraph: { url: `https://attraveiculos.com.br/comprar/${params.marca}/${params.modelo}` },
  }
}

export default async function Page({ params }) {
  const [conteudo, veiculos] = await Promise.all([
    getModeloContent(params),
    getVeiculosPorModelo(params),      // executa no servidor
  ])

  return (
    <main>
      <h1>{conteudo.h1}</h1>            {/* um único H1 */}
      <p>{conteudo.introducao}</p>

      <FiltrosInterativos />            {/* ilha cliente, sem conteúdo indexável */}

      {/* a lista precisa sair renderizada no HTML */}
      <ul>
        {veiculos.map(v => (
          <li key={v.id}>
            <a href={`/veiculo/${v.slug}`}>
              {v.marca} {v.modelo} {v.versao} {v.ano} — {v.km} km — {v.precoFormatado}
            </a>
          </li>
        ))}
      </ul>

      <Faq itens={conteudo.faq} />       {/* visível, e só então o FAQPage */}
    </main>
  )
}
```

O ponto que não pode ser negociado: **os dados que devem ser citáveis precisam ser buscados no servidor e emitidos como HTML**. Qualquer `useEffect` que popule a lista de veículos mantém o problema de pé.

### Ordem de migração

`/comprar/*` (48 páginas, maior retorno nos prompts monitorados) → institucionais (15) → `/preco/*` (13) → `/guia/*` e `/importacao*` (9) → home e índice `/blog` → `/manual-attra/*` (99).

Validar cada lote com o `curl` acima antes de seguir.

---

## 2. Sufixo de título duplicado (A5 — 169 páginas)

O sintoma `Porsche 911 2026 | Attra Veículos | Attra Veículos` indica que o `title.template` do layout raiz está sendo aplicado sobre um título que já traz o sufixo.

```tsx
// app/layout.tsx
export const metadata = {
  metadataBase: new URL('https://attraveiculos.com.br'),
  title: {
    default: 'Attra Veículos | Supercarros e veículos premium em Uberlândia',
    template: '%s | Attra Veículos',
  },
}
```

Com esse template no lugar, **nenhuma página filha pode incluir o sufixo**:

```tsx
// errado — gera a duplicação
title: `${v.marca} ${v.modelo} ${v.ano} | Attra Veículos`

// certo — e já resolve o P1.12, diferenciando veículos do mesmo modelo/ano
title: `${v.marca} ${v.modelo} ${v.versao} ${v.ano} — ${v.km} km`
```

Guarda de regressão, barata e eficaz:

```ts
// scripts/check-titles.ts — rodar no CI sobre as URLs do sitemap
const SUFIXO = ' | Attra Veículos'
if (title.split(SUFIXO).length > 2) throw new Error(`Sufixo duplicado: ${url}`)
if (title.length > 65)              console.warn(`Título longo (${title.length}): ${url}`)
```

---

## 3. Canonical ausente e URLs com filtro (A6 e A7)

Canonical autorreferente por padrão, resolvido no layout raiz via `metadataBase` + `alternates` em cada página. Para as rotas que hoje não declaram nada (home, institucionais, `/manual-attra/*`), basta adicionar:

```tsx
export const metadata = {
  alternates: { canonical: '/manual-attra/pts-paint-to-sample' },
}
```

Para as listagens com query string, a canonical precisa apontar para a versão limpa e as combinações profundas precisam sair do índice:

```tsx
// app/veiculos/page.tsx
const FILTROS_INDEXAVEIS = ['marca']   // apenas 1 dimensão entra no índice

export async function generateMetadata({ searchParams }) {
  const chaves = Object.keys(searchParams ?? {})
  const combinacaoProfunda =
    chaves.length > 1 || chaves.some(k => !FILTROS_INDEXAVEIS.includes(k))

  return {
    alternates: { canonical: '/veiculos' },
    robots: combinacaoProfunda
      ? { index: false, follow: true }
      : { index: true,  follow: true },
    openGraph: { url: 'https://attraveiculos.com.br/veiculos' },   // corrige o P1.3
  }
}
```

O mesmo tratamento vale para `/blog?categoria=…`.

---

## 4. Um único H1 e H1 descritivo na ficha (A8)

Hoje a ficha do Porsche 911 emite `<h1>911</h1>` e `<h1>Porsche 911</h1>`. O segundo provavelmente vem de um componente de seção reaproveitado. Rebaixá-lo para `<h2>` e tornar o H1 completo:

```tsx
<h1>{v.marca} {v.modelo} {v.versao} {v.ano}</h1>
{/* Porsche 911 Carrera GTS Cabriolet 2026 */}
```

Guarda no CI: `document.querySelectorAll('h1').length === 1` para toda URL do sitemap.

---

## 5. Deduplicação do JSON-LD de entidade (A9)

As páginas internas emitem `AutoDealer` e `WebSite` duas vezes; a home, uma vez só. O padrão correto é declarar a entidade **uma única vez no layout raiz** e, nas páginas, apenas referenciá-la por `@id`:

```tsx
// app/layout.tsx — única fonte da entidade
<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
  '@context': 'https://schema.org',
  '@graph': [ORGANIZACAO, WEBSITE],
})}} />
```

```tsx
// app/veiculo/[slug]/page.tsx — referencia, não redeclara
offers: {
  '@type': 'Offer',
  seller: { '@id': 'https://attraveiculos.com.br/#organization' },
  // ...
}
```

Remover o componente que reinjeta `AutoDealer`/`WebSite` dentro das páginas.

### Entidade completa (B4) — preencher só com dado confirmado

```jsonc
{
  "@context": "https://schema.org",
  "@type": "AutoDealer",
  "@id": "https://attraveiculos.com.br/#organization",
  "name": "Attra Veículos",
  "url": "https://attraveiculos.com.br",
  "telephone": "+553430143232",
  "email": "faleconosco@attraveiculos.com.br",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Av. Rondon Pacheco, [NÚMERO]",   // VALIDAR
    "addressLocality": "Uberlândia",
    "addressRegion": "MG",
    "postalCode": "[CEP]",                              // VALIDAR
    "addressCountry": "BR"
  },
  "geo": { "@type": "GeoCoordinates", "latitude": "[LAT]", "longitude": "[LON]" },  // VALIDAR
  "openingHoursSpecification": [/* VALIDAR horários reais */],
  "areaServed": { "@type": "Country", "name": "Brasil" },
  "priceRange": "[FAIXA]",                              // VALIDAR
  "sameAs": [
    "https://www.instagram.com/attra.veiculos"
    // acrescentar apenas perfis oficiais confirmados: Google Business Profile, YouTube, Facebook, LinkedIn
  ]
}
```

### `Offer` completo (B5)

```jsonc
"offers": {
  "@type": "Offer",
  "url": "https://attraveiculos.com.br/veiculo/{slug}",
  "price": 1590000,
  "priceCurrency": "BRL",
  "priceValidUntil": "2026-12-31",
  "itemCondition": "https://schema.org/UsedCondition",
  "availability": "https://schema.org/InStock",
  "seller": { "@id": "https://attraveiculos.com.br/#organization" }
  // hasMerchantReturnPolicy e shippingDetails: só incluir se a política for real e publicada
}
```

---

## 6. Estado de disponibilidade e veículos vendidos (B6)

Modelar como enum único, com o JSON-LD derivando do mesmo campo que a interface exibe — assim nunca divergem:

```ts
type StatusVeiculo = 'disponivel' | 'reservado' | 'vendido'

const AVAILABILITY: Record<StatusVeiculo, string> = {
  disponivel: 'https://schema.org/InStock',
  reservado:  'https://schema.org/PreOrder',
  vendido:    'https://schema.org/SoldOut',
}
```

Para `vendido`: manter a URL, exibir o aviso de indisponibilidade acima da dobra, **remover o preço do `Offer`** ou marcá-lo como histórico, manter a página fora do sitemap de estoque ativo e renderizar 3 a 6 alternativas reais do mesmo segmento. Nunca 404 — a URL já acumulou autoridade.

---

## 7. Páginas de modelo sem estoque (B1)

Implementação da máquina de 3 estados descrita na auditoria:

```tsx
export async function generateMetadata({ params }) {
  const veiculos = await getVeiculosPorModelo(params)
  const temHistorico = await modeloJaComercializado(params)

  const indexavel = veiculos.length > 0 || temHistorico

  return {
    alternates: { canonical: `/comprar/${params.marca}/${params.modelo}` },
    robots: indexavel ? { index: true, follow: true } : { index: false, follow: true },
  }
}
```

E no corpo: quando `veiculos.length === 0`, renderizar o bloco de indisponibilidade honesto, o CTA para `/solicitar-veiculo` e o `ItemList` de alternativas — **sem emitir `Product` nem `Offer`**, apenas `WebPage` e `FAQPage`.

O sitemap passa a ser gerado a partir da mesma regra, para não declarar URL `noindex`:

```ts
// app/sitemap.ts
const paginasModelo = (await listarModelos())
  .filter(m => m.emEstoque > 0 || m.temHistorico)
```

---

## 8. Endpoints para LLM (A2, A3, A10)

**`/api/vehicles/search`** — hoje retorna `{"results":[],"query":"..."}` para qualquer termo. Investigar se o índice de busca não está sendo populado no build ou se o parser da query falha. Enquanto não funcionar, é preferível retornar HTTP 503 a retornar lista vazia: uma lista vazia é lida como "não há estoque".

**`/api/llm/vehicles`** — remover o limite de 50. Se houver necessidade de paginar, expor `numberOfItems` com o total real e um cursor:

```ts
const total = await contarVeiculos()          // 70
return Response.json({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  numberOfItems: total,
  itemListElement: veiculos.map((v, i) => ({ '@type': 'ListItem', position: i + 1, item: toProduct(v) })),
})
```

**`llms.txt`** — gerar dinamicamente a partir do inventário, não como arquivo estático:

```ts
// app/llms.txt/route.ts
export const revalidate = 3600
export async function GET() {
  const veiculos = await listarVeiculosAtivos()
  const linhas = veiculos.map(v =>
    `- [${v.marca} ${v.modelo} ${v.versao} ${v.ano}](https://attraveiculos.com.br/veiculo/${v.slug}): ${v.km} km, ${v.cor}, ${v.precoFormatado}`
  )
  return new Response(montarLlmsTxt(linhas), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
```

Na mesma passada, remover a frase "referência nacional em veículos premium e superesportivos" — é alegação absoluta não comprovável, contrária às regras do briefing.

---

## 9. Mapa de redirecionamentos

| Origem | Destino | Código | Motivo |
|---|---|---|---|
| `/lp-importacao/` | `/importacao-de-veiculos-de-luxo` | 301 | URL indexada no Google, servidor responde 404 |
| `/lp-importacao` | `/importacao-de-veiculos-de-luxo` | 301 | mesma URL sem barra final |
| `/estoque` | `/veiculos` | — | **já existe e funciona**; confirmar que é 301 e não 302/307 |

```js
// next.config.js
async redirects() {
  return [
    { source: '/lp-importacao',       destination: '/importacao-de-veiculos-de-luxo', permanent: true },
    { source: '/lp-importacao/:path*', destination: '/importacao-de-veiculos-de-luxo', permanent: true },
  ]
}
```

Nenhum outro redirect é necessário — não foram encontradas outras URLs quebradas entre as 350 do sitemap (0 erros, 0 respostas fora de 200).

---

## 10. Sitemap

Incluir `/news` e `/servicos/importacao`, hoje respondendo 200 e ausentes de todos os sitemaps. Excluir automaticamente qualquer URL marcada `noindex` pela regra do item 7. Manter os quatro sitemaps filhos e o índice — a segmentação atual está correta.

---

## 11. Guardas de CI recomendadas

Um único script que percorre as URLs do `sitemap.xml` e falha o build em qualquer uma destas condições — é o que impede a regressão de tudo o que foi corrigido acima:

- HTML bruto (sem `<script>`) com menos de 50 palavras
- zero ou mais de um `<h1>`
- `<title>` com o sufixo da marca repetido, ou acima de 65 caracteres
- ausência de `link[rel=canonical]`
- mais de um bloco JSON-LD com `@type` `AutoDealer` ou `WebSite`
- `<img>` sem `alt` ou sem `width`/`height`
- `numberOfItems` de `/api/llm/vehicles` diferente da contagem de `/sitemap-estoque.xml`
- `/api/vehicles/search` retornando lista vazia para um termo de controle conhecido
