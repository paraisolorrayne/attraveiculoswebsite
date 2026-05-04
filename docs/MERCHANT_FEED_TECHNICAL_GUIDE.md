# Guia Técnico: Merchant Feed (XML/RSS) para IA Shopping Discovery
**Versão:** 1.0  
**Data:** Março 2026  
**Público:** Time de TI / DevOps / Backend  

---

## 📋 Índice
1. [Visão Geral](#visão-geral)
2. [Requisitos Técnicos](#requisitos-técnicos)
3. [Especificação do Feed XML/RSS](#especificação-do-feed-xmlrss)
4. [Implementação no Next.js](#implementação-no-nextjs)
5. [Integração com Google Merchant Center](#integração-com-google-merchant-center)
6. [Monitoramento e Troubleshooting](#monitoramento-e-troubleshooting)
7. [Performance e Escalabilidade](#performance-e-escalabilidade)

---

## Visão Geral

### O que é um Merchant Feed?
Um **Merchant Feed** é um arquivo XML/RSS que lista todos os produtos disponíveis (neste caso, veículos) em um formato padronizado. Plataformas como Google Shopping, ChatGPT, Gemini e outras AIs usam esse feed para indexar seu estoque em tempo real e recomendá-lo aos usuários.

### Por que é crítico para Attra?
- **Visibilidade em IA:** Quando alguém pergunta ao ChatGPT "qual SUV premium está disponível agora no Brasil?", o feed da Attra alimenta essa resposta.
- **Sem delays:** Diferente de SEO tradicional que leva semanas, o feed é indexado em horas.
- **Conversão direta:** Reduz ciclos de descoberta (IA → Lead → Consultor).

### URLs da Attra (Definir após homologação)
```
Produção:      https://attraveiculos.com.br/api/feed/estoque.xml
Staging:       https://staging.attraveiculos.com.br/api/feed/estoque.xml
Robots.txt:    https://attraveiculos.com.br/robots.txt
Sitemap:       https://attraveiculos.com.br/sitemap.xml
```

---

## Requisitos Técnicos

### Backend (Next.js)
- **Framework:** Next.js 16.1.6 (atual)
- **API Route:** `/src/app/api/feed/estoque.route.ts`
- **Cache:** ISR (Incremental Static Regeneration) = regenerar a cada 1 hora
- **Memória:** ~2-5 MB por feed completo (1200 veículos)

### Dados
- **Fonte:** `list_vehicle.json` + dados de imagens do Cloudinary
- **Atualização:** Em tempo real via CMS ou webhook do inventário
- **Histórico:** Manter histórico de 30 dias de feeds para auditoria

### Segurança
- **Autenticação:** Nenhuma (feed público por design)
- **Rate Limiting:** 100 requisições/IP/hora (proteção contra scraping)
- **CORS:** Não aplicável (feed XML)
- **Validação:** Verificar XML bem-formado antes de servir

### Compatibilidade
- **Padrão:** Google Merchant Center Schema v2.1
- **Encoding:** UTF-8
- **Content-Type:** `application/rss+xml; charset=utf-8`

---

## Especificação do Feed XML/RSS

### Estrutura Base
```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Attra Veículos - Estoque Premium</title>
    <link>https://attraveiculos.com.br</link>
    <description>Curadoria de veículos premium e alto padrão no Brasil</description>
    <lastBuildDate>Fri, 22 Mar 2026 14:30:00 GMT</lastBuildDate>
    <language>pt-br</language>
    
    <!-- ITEMS ABAIXO -->
  </channel>
</rss>
```

### Estrutura de `<item>` (Veículo)
Cada veículo deve ter os campos abaixo **obrigatórios**:

| Campo | Obrigatório | Tipo | Exemplo | Notas |
|-------|-------------|------|---------|-------|
| `g:id` | ✅ | string | `ATTRA-911-2023-ABC123` | ID único (brand-model-year-internalId) |
| `g:title` | ✅ | string | `Porsche 911 Carrera S 2023 - Cor Giz` | Max 150 caracteres |
| `g:description` | ✅ | string | `Exclusivo 911 com motor bi-turbo...` | Max 5000 caracteres |
| `g:link` | ✅ | URL | `https://attraveiculos.com.br/estoque/porsche-911-2023` | Link único do veículo |
| `g:image_link` | ✅ | URL | `https://cdn.cloudinary.com/...` | Imagem principal (mín 100x100px) |
| `g:price` | ✅ | decimal | `1150000.00 BRL` | Formato: número espaço moeda |
| `g:availability` | ✅ | enum | `in stock` | Valores: `in stock`, `out of stock` |
| `g:condition` | ✅ | enum | `used` | Valores: `new`, `used`, `refurbished` |
| `g:brand` | ✅ | string | `Porsche` | Exatamente como marca do veículo |
| `g:google_product_category` | ✅ | string | `Vehicles & Parts > Vehicles > Motor Vehicles > Cars` | Veja [Google Category List](https://www.google.com/basepages/producttype/taxonomy-en-US.txt) |

### Campos Recomendados (Boost NA IA)

| Campo | Tipo | Exemplo | Impacto |
|-------|------|---------|---------|
| `g:additional_image_link` | URL (múltiplas) | Interior, rodas, detalhes | +30% relevância visual |
| `g:custom_label_0` | string | `Premium Curated` | Diferencial no Shopping |
| `g:custom_label_1` | string | `Pronta Entrega` | Timeline importante |
| `g:custom_label_2` | string | `Blindado` | Feature especial |
| `g:custom_label_3` | string | `Único Dono` | Vantagem competitiva |
| `g:custom_label_4` | string | `Veiculo Importado` | Informação demográfica |
| `g:mpn` | string | `2024-PORSCHE-911-001` | Manufacturer Part Number |
| `g:gtin` | string | `ATTRA-SKU-2024-001` | Global Trade Item Number |

### Exemplo Completo de Item
```xml
<item>
  <g:id>ATTRA-911-CARRERA-2023-001</g:id>
  <g:title>Porsche 911 Carrera S 2023 - Cor Giz Premium</g:title>
  <g:description>Exclusivo 911 Carrera S com interior em couro Marrom Trufa, apenas 4.500 km, manual, sem colisão. Equipado com PASM, teto panorâmico, som Bose premium e sistema de navegação. Certificado de qualidade Attra.</g:description>
  <g:link>https://attraveiculos.com.br/estoque/porsche-911-2023-carrera-s</g:link>
  <g:image_link>https://res.cloudinary.com/attra/image/upload/v1/porsche-911-2023-carrera-s-capa.jpg</g:image_link>
  <g:additional_image_link>https://res.cloudinary.com/attra/image/upload/v1/porsche-911-2023-interior.jpg</g:additional_image_link>
  <g:additional_image_link>https://res.cloudinary.com/attra/image/upload/v1/porsche-911-2023-rodas.jpg</g:additional_image_link>
  <g:price>1150000.00 BRL</g:price>
  <g:availability>in stock</g:availability>
  <g:condition>used</g:condition>
  <g:brand>Porsche</g:brand>
  <g:google_product_category>Vehicles &amp; Parts &gt; Vehicles &gt; Motor Vehicles &gt; Cars</g:google_product_category>
  <g:custom_label_0>Premium Curated</g:custom_label_0>
  <g:custom_label_1>Pronta Entrega</g:custom_label_1>
  <g:custom_label_2>Manual</g:custom_label_2>
  <g:custom_label_3>Sem Colisão</g:custom_label_3>
  <g:custom_label_4>Único Dono</g:custom_label_4>
  <g:mpn>2024-PORSCHE-911-CARRERA-S</g:mpn>
  <g:gtin>ATTRA-SKU-911-2023-001</g:gtin>
</item>
```

---

## Implementação no Next.js

### Passo 1: Criar o Endpoint API

**Arquivo:** `src/app/api/feed/estoque/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import type { AutoConfVehicle } from '@/lib/autoconf-api'
import { getVehicleInventory } from '@/lib/vehicle-inventory-data'

// Tipos
interface FeedItem {
  id: string
  title: string
  description: string
  link: string
  imageLink: string
  additionalImageLinks: string[]
  price: number
  currency: string
  availability: 'in stock' | 'out of stock'
  condition: 'new' | 'used' | 'refurbished'
  brand: string
  googleProductCategory: string
  customLabels: {
    label0?: string // Premium, Curated
    label1?: string // Delivery timeline
    label2?: string // Special features
    label3?: string // Unique attributes
    label4?: string // Geographic/Origin
  }
  mpn?: string
  gtin?: string
}

// Função para gerar XML seguro e bem-formado
function escapeXml(text: string): string {
  if (!text) return ''
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// Função para converter veículo para item do feed
function vehicleToFeedItem(vehicle: AutoConfVehicle): FeedItem {
  // Lógica de mapeamento de dados para o padrão do feed
  // IMPLEMENTAÇÃO ESPECÍFICA ABAIXO
  return {
    id: `ATTRA-${vehicle.marca_nome.toUpperCase()}-${vehicle.modelopai_nome.toUpperCase()}-${vehicle.anomodelo}-${vehicle.id}`,
    title: `${vehicle.marca_nome} ${vehicle.modelopai_nome} ${vehicle.anomodelo}`,
    description: `Veículo ${vehicle.marca_nome} ${vehicle.modelopai_nome} do ano ${vehicle.anomodelo}, curado pela Attra Veículos.`,
    link: `https://attraveiculos.com.br/estoque/${vehicle.id}`,
    imageLink: vehicle.foto_principal_url || 'https://via.placeholder.com/400x300',
    additionalImageLinks: vehicle.fotos_adicionais_urls || [],
    price: parseFloat(vehicle.preco) || 0,
    currency: 'BRL',
    availability: vehicle.estoque > 0 ? 'in stock' : 'out of stock',
    condition: 'used',
    brand: vehicle.marca_nome,
    googleProductCategory: 'Vehicles & Parts > Vehicles > Motor Vehicles > Cars',
    customLabels: {
      label0: 'Premium Curated',
      label1: 'Pronta Entrega',
      label2: vehicle.cambio_nome || undefined,
      label3: vehicle.km_total <= 5000 ? 'Baixa Quilometragem' : undefined,
      label4: vehicle.procedencia || undefined,
    },
    mpn: `${vehicle.marca_nome.toUpperCase()}-${vehicle.anomodelo}-${vehicle.id}`,
    gtin: `ATTRA-SKU-${vehicle.id}`,
  }
}

// Função para gerar XML
function generateXmlFeed(items: FeedItem[]): string {
  const lastBuildDate = new Date().toUTCString()
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`
  xml += `<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n`
  xml += `  <channel>\n`
  xml += `    <title>Attra Veículos - Estoque Premium</title>\n`
  xml += `    <link>https://attraveiculos.com.br</link>\n`
  xml += `    <description>Curadoria de veículos premium e alto padrão no Brasil</description>\n`
  xml += `    <lastBuildDate>${lastBuildDate}</lastBuildDate>\n`
  xml += `    <language>pt-br</language>\n\n`

  for (const item of items) {
    xml += `    <item>\n`
    xml += `      <g:id>${escapeXml(item.id)}</g:id>\n`
    xml += `      <g:title>${escapeXml(item.title)}</g:title>\n`
    xml += `      <g:description>${escapeXml(item.description)}</g:description>\n`
    xml += `      <g:link>${escapeXml(item.link)}</g:link>\n`
    xml += `      <g:image_link>${escapeXml(item.imageLink)}</g:image_link>\n`
    
    for (const additionalImage of item.additionalImageLinks) {
      xml += `      <g:additional_image_link>${escapeXml(additionalImage)}</g:additional_image_link>\n`
    }
    
    xml += `      <g:price>${item.price.toFixed(2)} ${item.currency}</g:price>\n`
    xml += `      <g:availability>${item.availability}</g:availability>\n`
    xml += `      <g:condition>${item.condition}</g:condition>\n`
    xml += `      <g:brand>${escapeXml(item.brand)}</g:brand>\n`
    xml += `      <g:google_product_category>${escapeXml(item.googleProductCategory)}</g:google_product_category>\n`
    
    if (item.customLabels.label0) {
      xml += `      <g:custom_label_0>${escapeXml(item.customLabels.label0)}</g:custom_label_0>\n`
    }
    if (item.customLabels.label1) {
      xml += `      <g:custom_label_1>${escapeXml(item.customLabels.label1)}</g:custom_label_1>\n`
    }
    if (item.customLabels.label2) {
      xml += `      <g:custom_label_2>${escapeXml(item.customLabels.label2)}</g:custom_label_2>\n`
    }
    if (item.customLabels.label3) {
      xml += `      <g:custom_label_3>${escapeXml(item.customLabels.label3)}</g:custom_label_3>\n`
    }
    if (item.customLabels.label4) {
      xml += `      <g:custom_label_4>${escapeXml(item.customLabels.label4)}</g:custom_label_4>\n`
    }
    
    if (item.mpn) {
      xml += `      <g:mpn>${escapeXml(item.mpn)}</g:mpn>\n`
    }
    if (item.gtin) {
      xml += `      <g:gtin>${escapeXml(item.gtin)}</g:gtin>\n`
    }
    
    xml += `    </item>\n\n`
  }

  xml += `  </channel>\n`
  xml += `</rss>`
  
  return xml
}

// Handler GET para o feed
export async function GET(request: NextRequest) {
  try {
    // Fetch veículos do inventário
    const vehicles = await getVehicleInventory()
    
    // Converter para feed items
    const feedItems = vehicles.map(vehicleToFeedItem)
    
    // Gerar XML
    const xmlContent = generateXmlFeed(feedItems)
    
    // Validar XML (básico)
    if (!xmlContent.startsWith('<?xml')) {
      throw new Error('Invalid XML generated')
    }
    
    // Retornar com headers apropriados
    return new NextResponse(xmlContent, {
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200', // ISR: regen a cada 1h
        'X-Generated-At': new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Feed generation error:', error)
    
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0">
        <channel>
          <title>Attra Veículos - Feed Error</title>
          <link>https://attraveiculos.com.br</link>
          <description>Erro ao gerar feed</description>
        </channel>
      </rss>`,
      {
        status: 500,
        headers: {
          'Content-Type': 'application/rss+xml; charset=utf-8',
        },
      }
    )
  }
}
```

### Passo 2: Atualizar `robots.txt`

**Arquivo:** `public/robots.txt`

```
User-agent: *
Allow: /

# Feed URLs
Allow: /api/feed/estoque.xml
Allow: /feed/estoque.xml

# Google Merchant Center
User-agent: Googlebot
Allow: /

Sitemap: https://attraveiculos.com.br/sitemap.xml
Sitemap: https://attraveiculos.com.br/api/feed/estoque.xml
```

### Passo 3: Adicionar ao `sitemap.xml`

**Arquivo:** `src/app/sitemap.ts` (atualizar)

```typescript
import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://attraveiculos.com.br',
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 1,
    },
    {
      url: 'https://attraveiculos.com.br/api/feed/estoque.xml',
      lastModified: new Date(),
      changeFrequency: 'hourly', // Feed atualiza a cada hora
      priority: 0.9,
    },
    // ... resto dos URLs
  ]
}
```

### Passo 4: Rate Limiting

**Arquivo:** `src/lib/rate-limit.ts` (adicionar/atualizar)

```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

export const feedRateLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 h'), // 100 req/hora por IP
  analytics: true,
})

// Uso no endpoint:
export async function rateLimit(ip: string) {
  try {
    const { success } = await feedRateLimit.limit(ip)
    return success
  } catch (error) {
    console.error('Rate limit check failed:', error)
    return true // Fail open
  }
}
```

---

## Integração com Google Merchant Center

### Passos de Setup

1. **Ir para:** https://merchantcenter.google.com
2. **Criar conta comerciante** (se não tiver)
3. **Adicionar website:** `attraveiculos.com.br`
4. **Claim URL:** Verificar posse do domínio (via arquivo no root ou tag HTML)
5. **Submeter Feed:**
   - **Primary Feed:** `https://attraveiculos.com.br/api/feed/estoque.xml`
   - **Frequency:** Automático (crawler do Google verifica a cada 24h)
   - **Formato:** RSS 2.0 com Google Namespace

### Configuração de Atributos (Google Merchant)

| Atributo | Valor Padrão Attra |
|----------|-------------------|
| `condition` | `used` (sempre, para estoque usado) |
| `availability` | `in stock` (verif. em tempo real) |
| `category` | Varia por tipo de veículo |
| `shipping` | Não aplicável (pickup local) |
| `tax` | Não aplicável (negociação direta) |

### Monitoramento no Google Console

```
Google Merchant Center → Feeds → Estoque
  ├── Status: Parse successful / Errors
  ├── Items approved: X / Total: Y
  ├── Last upload: HHmm ago
  └── Performance: Impressions, Clicks, Conversions
```

---

## Monitoramento e Troubleshooting

### Checklist de Saúde do Feed

```bash
# 1. Verificar feed está acessível
curl -I https://attraveiculos.com.br/api/feed/estoque.xml
# Esperado: 200 OK, Content-Type: application/rss+xml

# 2. Validar XML
curl https://attraveiculos.com.br/api/feed/estoque.xml | xmllint --noout -
# Esperado: document validates

# 3. Contar items
curl https://attraveiculos.com.br/api/feed/estoque.xml | grep -c "<g:id>"
# Esperado: > 0

# 4. Testar estrutura
curl https://attraveiculos.com.br/api/feed/estoque.xml | head -50
# Esperado: XML válido com <rss>, <channel>, <item>
```

### Erros Comuns e Solução

| Erro | Causa | Solução |
|------|-------|--------|
| `500 Internal Server Error` | Erro ao buscar inventário | Verificar conexão BD; logs de servidor |
| `<?xml ...>` mas vazio | Nenhum veículo no BD | Verificar dados em `list_vehicle.json` |
| `Invalid Character in XML` | Caractere não-UTF-8 | Usar `escapeXml()` em todos os campos |
| `Feed Parse Error (Google)` | XML malformado | Validar com `xmllint` |
| `414 URI Too Long` | Feed > tamanho máximo | Limitar a 50k items ou usar paginação |

### Logs e Monitoramento

**Adicionar no endpoint:**

```typescript
// Log em produção
console.log({
  timestamp: new Date().toISOString(),
  event: 'feed_generated',
  itemCount: feedItems.length,
  sizeBytes: xmlContent.length,
  duration: `${Date.now() - startTime}ms`,
})

// Integração com observabilidade (ex: Sentry)
import * as Sentry from '@sentry/nextjs'
Sentry.captureMessage('Feed generated successfully', 'info')
```

---

## Performance e Escalabilidade

### Benchmarks Esperados

| Métrica | Target | Atual |
|---------|--------|-------|
| Tempo de geração (100 veículos) | < 500ms | - |
| Tamanho do feed (100 veículos) | < 500 KB | - |
| Cache hit rate | > 95% | - |
| Disponibilidade | > 99.9% | - |

### Otimizações Recomendadas

1. **ISR em vez de SSG:** Regenerar a cada 1 hora (não a cada request)
2. **Compressão**: Servir com `gzip` (economia ~70% em tamanho)
3. **CDN**: Colocar Cloudflare na frente do Nginx para distribuição global
4. **Índices BD**: Fazer índice em `vehicles.status` e `vehicles.updated_at`

### Scaling Vertical (Se > 5000 veículos)

```typescript
// Paginação do feed (ativada se > 5000 items)
const pageSize = 5000
const pages = Math.ceil(feedItems.length / pageSize)

// URL Principal redireciona para página 1
// URLs secundárias: /api/feed/estoque-page-1.xml, estoque-page-2.xml
```

---

## Checklist de Implementação

- [ ] Endpoint `/api/feed/estoque/route.ts` criado
- [ ] Função `getVehicleInventory()` retorna dados corretos
- [ ] XML gerado e validado localmente
- [ ] Rate limiting implementado
- [ ] Cache headers (ISR) configurado
- [ ] Robots.txt atualizado
- [ ] Sitemap.xml referencia feed
- [ ] Google Merchant Center configurado
- [ ] Feed submetido e aguardando parse (24-48h)
- [ ] Monitoramento configurado
- [ ] Documentação compartilhada com time

---

## Suporte

**Em caso de dúvidas técnicas:**
- Abrir issue no repositório interno
- Contatar DevOps/InfraBrMer: `devops@attra.com.br`
- Validar feed em: https://www.google.com/webmasters/tools/merchants
