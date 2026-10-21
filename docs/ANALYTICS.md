# Guia de Analytics e Observabilidade - Attra Veículos

Este documento descreve a implementação de ferramentas de observabilidade e SEO no site Attra Veículos (Next.js 15).

## Índice

1. [Variáveis de Ambiente](#variáveis-de-ambiente)
2. [Componentes de Analytics](#componentes-de-analytics)
3. [Eventos Customizados](#eventos-customizados)
4. [Configuração das Ferramentas](#configuração-das-ferramentas)
5. [SEO e Indexação](#seo-e-indexação)
6. [Checklist de Verificação](#checklist-de-verificação)
7. [Integração com Visitor Tracking](#integração-com-visitor-tracking)

---

## Variáveis de Ambiente

Adicione as seguintes variáveis ao seu arquivo `.env.local`:

```env
# Google Tag Manager (Recomendado - gerencia todos os tags)
NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX

# Google Analytics 4 (Opcional se usar GTM)
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Microsoft Clarity (Heatmaps e Session Recordings)
NEXT_PUBLIC_CLARITY_ID=xxxxxxxxxx
```

### Prioridade de Carregamento

1. Se `NEXT_PUBLIC_GTM_ID` estiver definido, o GTM será usado como principal
2. Se apenas `NEXT_PUBLIC_GA_MEASUREMENT_ID` estiver definido, GA4 será carregado diretamente
3. `NEXT_PUBLIC_CLARITY_ID` sempre carrega independentemente (é gratuito e complementar)

---

## Componentes de Analytics

### Arquivos Criados

| Arquivo | Descrição |
|---------|-----------|
| `src/components/analytics/google-tag-manager.tsx` | Componente GTM com script otimizado |
| `src/components/analytics/google-analytics.tsx` | Componente GA4 direto (fallback) |
| `src/components/analytics/microsoft-clarity.tsx` | Componente Clarity para heatmaps |
| `src/components/analytics/analytics-provider.tsx` | Provider centralizado |
| `src/components/analytics/index.ts` | Exports |
| `src/hooks/use-analytics.ts` | Hook com eventos customizados |

### Integração no Layout

O `AnalyticsProvider` está integrado no `src/app/layout.tsx`:

```tsx
<html lang="pt-BR">
  <head>
    <AnalyticsProvider />
  </head>
  <body>
    <AnalyticsNoScript />
    {children}
  </body>
</html>
```

---

## Eventos Customizados

### Hook `useAnalytics`

```tsx
import { useAnalytics } from '@/hooks/use-analytics'

const {
  trackVehicleView,        // Visualização de veículo
  trackWhatsAppClick,      // Clique no WhatsApp
  trackFormSubmission,     // Submissão de formulário
  trackFinancingCalculation, // Cálculo de financiamento
  trackGuideDownload,      // Download de guia
  trackGalleryInteraction, // Interação com galeria
  trackSearch,             // Busca
  trackScrollDepth,        // Profundidade de scroll
  trackCTAClick,           // Clique em CTA
  trackVideoPlay,          // Reprodução de vídeo
} = useAnalytics()
```

### Eventos Implementados

#### 1. Vehicle View (`view_vehicle`)
Disparado quando um usuário visualiza a página de um veículo.

```ts
trackVehicleView({
  id: 'vehicle-123',
  name: 'Porsche 911 Carrera',
  brand: 'Porsche',
  model: '911 Carrera',
  year: 2024,
  price: 850000,
  category: 'supercar',
  slug: 'porsche-911-carrera-2024',
})
```

**Parâmetros GA4 compatíveis:** `view_item`, `items[]`

#### 2. WhatsApp Click (`whatsapp_click`)
Disparado quando o usuário clica no botão de WhatsApp.

```ts
trackWhatsAppClick('/veiculo/porsche-911', {
  id: 'vehicle-123',
  name: 'Porsche 911',
  brand: 'Porsche',
  price: 850000,
})
```

**Parâmetros GA4 compatíveis:** `generate_lead`, `value`, `currency`

#### 3. Form Submission (`form_submission`)
Disparado quando um formulário é enviado com sucesso.

```ts
trackFormSubmission({
  formName: 'contact_form',
  formLocation: '/contato',
  vehicleId: 'vehicle-123', // opcional
  vehicleName: 'Porsche 911', // opcional
})
```

#### 4. Financing Calculation (`financing_calculation`)
Disparado quando o usuário usa a calculadora de financiamento.

```ts
trackFinancingCalculation({
  vehiclePrice: 500000,
  downPayment: 100000,
  installments: 48,
  monthlyPayment: 10500,
  vehicleId: 'vehicle-123', // opcional
})
```

#### 5. Guide Download (`guide_download`)
Disparado quando o usuário baixa um material (guia, PDF).

```ts
trackGuideDownload('Guia Supercarro Attra', 'email@exemplo.com')
```

**Parâmetros GA4 compatíveis:** `file_download`

---

## Configuração das Ferramentas

### Google Tag Manager (GTM)

1. Acesse [tagmanager.google.com](https://tagmanager.google.com)
2. Crie uma nova conta e container (Web)
3. Copie o ID do container (GTM-XXXXXXX)
4. Adicione ao `.env.local`: `NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX`

**Configuração no GTM:**
- Configure o GA4 tag com o Measurement ID
- Configure eventos customizados para cada evento do dataLayer
- Use os parâmetros `event` para identificar o tipo de evento

### Google Analytics 4 (GA4)

1. Acesse [analytics.google.com](https://analytics.google.com)
2. Crie uma nova propriedade GA4
3. Copie o Measurement ID (G-XXXXXXXXXX)
4. Se usar GTM: configure o tag GA4 no GTM
5. Se não usar GTM: adicione ao `.env.local`: `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX`

### Microsoft Clarity

1. Acesse [clarity.microsoft.com](https://clarity.microsoft.com)
2. Crie um novo projeto
3. Copie o Project ID (10 caracteres)
4. Adicione ao `.env.local`: `NEXT_PUBLIC_CLARITY_ID=xxxxxxxxxx`

**Recursos disponíveis (Grátis):**
- ✅ Heatmaps de cliques
- ✅ Gravações de sessão ilimitadas
- ✅ Scroll maps
- ✅ Integração com GA4
- ✅ Insights automáticos

### Google Search Console

1. Acesse [search.google.com/search-console](https://search.google.com/search-console)
2. Adicione a propriedade (URL prefix ou domínio)
3. Verifique a propriedade via:
   - Meta tag HTML (adicionar no head)
   - Registro DNS
   - Google Analytics (se já configurado)
4. Após verificação, o sitemap será automaticamente detectado em `/sitemap.xml`

---

## SEO e Indexação

### Sitemap Dinâmico

O arquivo `src/app/sitemap.ts` gera automaticamente um sitemap incluindo:

- **Páginas estáticas** (home, estoque, sobre, contato, etc.)
- **Todos os veículos** do estoque (até 500)
- **Todos os posts do blog** (até 500)

**URL:** `https://attraveiculos.com.br/sitemap.xml`

**Prioridades configuradas:**
| Tipo | Prioridade | Frequência |
|------|------------|------------|
| Home | 1.0 | daily |
| Estoque | 0.9 | daily |
| Veículos | 0.8 | daily |
| Blog Posts | 0.7 | weekly |
| Outras páginas | 0.6-0.8 | weekly/monthly |

### Robots.txt

A rota `src/app/robots.ts` publica as regras de `src/lib/seo/regras-robots.ts`: um grupo por
robô de busca e de IA, todos com `/admin/`, `/private/`, `/api/` e `/*.json$` bloqueados (menos
as duas APIs públicas do `llms.txt`), e o `/_next/` liberado para a renderização. O porquê de
cada regra e a matriz por robô estão em `docs/seo/06-handoff-robots-openai.md`.

---

## Checklist de Verificação

### Pré-Deploy

- [ ] Variáveis de ambiente configuradas no ambiente de produção
- [ ] GTM ID válido e container publicado
- [ ] Clarity projeto ativo
- [ ] Google Search Console verificado

### Pós-Deploy

- [ ] Verificar se scripts carregam no DevTools (Network tab)
- [ ] Verificar dataLayer no console: `window.dataLayer`
- [ ] Verificar eventos no GA4 DebugView
- [ ] Verificar gravações no Clarity (pode demorar até 2h)
- [ ] Submeter sitemap no Search Console
- [ ] Testar robots.txt: `https://attraveiculos.com.br/robots.txt`
- [ ] Testar sitemap: `https://attraveiculos.com.br/sitemap.xml`

### Eventos a Testar

| Evento | Onde Testar | Esperado |
|--------|-------------|----------|
| `view_vehicle` | Acessar página de veículo | dataLayer com dados do veículo |
| `whatsapp_click` | Clicar no botão WhatsApp | dataLayer com source e vehicle |
| `form_submission` | Submeter formulário de contato | dataLayer com form_name |
| `financing_calculation` | Usar calculadora de financiamento | dataLayer com valores |
| `guide_download` | Baixar guia de supercarros | dataLayer com guide_name |

---

## Integração com Visitor Tracking

O sistema de analytics está integrado com o visitor tracking existente (`VisitorTrackingProvider`) para enriquecer os eventos com dados contextuais do visitante.

### Arquitetura da Integração

```
┌──────────────────────────────────────────────────────────────┐
│                    VisitorTrackingProvider                    │
├──────────────────────────────────────────────────────────────┤
│  - Fingerprinting (visitor_id)                               │
│  - Session management (session_id)                           │
│  - Geolocation via /api/geolocation                          │
│  - Device data (browser, OS, screen)                         │
│  - UTM params                                                │
│  - getVisitorContext() → VisitorContext                      │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                      Eventos Enriched                        │
├──────────────────────────────────────────────────────────────┤
│  dataLayer.push({                                            │
│    event: 'form_submission',                                 │
│    form_name: 'contact_form',                               │
│    user_city: 'São Paulo',        // ← Geolocation          │
│    user_region: 'SP',             // ← Geolocation          │
│    device_type: 'mobile',         // ← Device data          │
│    utm_source: 'google',          // ← Traffic source       │
│    user_identified: true,         // ← LGPD-safe            │
│  })                                                          │
└──────────────────────────────────────────────────────────────┘
```

### Interface VisitorContext

```typescript
interface VisitorContext {
  visitorId?: string          // Fingerprint ID
  sessionId?: string          // Session ID
  fingerprintDbId?: string    // Supabase fingerprint ID
  geolocation?: {
    city?: string
    region?: string
    country?: string
  }
  device?: {
    type?: string             // 'mobile' | 'tablet' | 'desktop'
    browser?: string          // 'Chrome' | 'Safari' | etc.
    os?: string               // 'Windows' | 'macOS' | 'iOS' | etc.
    screenResolution?: string // '1920x1080'
  }
  traffic?: {
    utmSource?: string
    utmMedium?: string
    utmCampaign?: string
    utmContent?: string
    utmTerm?: string
    referrer?: string
    landingPage?: string
  }
  user?: {
    email?: string
    phone?: string
    name?: string
    identifiedAt?: string
    identificationSource?: string
  }
}
```

### Usando getVisitorContext nos Componentes

```tsx
import { useVisitorTracking } from '@/components/providers/visitor-tracking-provider'
import { useAnalytics } from '@/hooks/use-analytics'

function MyForm() {
  const { trackFormSubmission } = useAnalytics()
  const { getVisitorContext, identifyVisitor } = useVisitorTracking()

  const onSubmit = async (data) => {
    // Track com contexto do visitante (inclui geolocalização)
    const visitorContext = getVisitorContext()
    trackFormSubmission({
      formName: 'my_form',
      formLocation: '/my-page',
    }, visitorContext)

    // Identificar o visitante (atualiza GA4 User Properties e Clarity)
    identifyVisitor({
      email: data.email,
      phone: data.phone,
      name: data.name,
    })
  }
}
```

### Eventos Automáticos

O `VisitorTrackingProvider` dispara automaticamente:

| Evento | Quando | Dados Incluídos |
|--------|--------|-----------------|
| `session_start` | Início de nova sessão | visitor_id, session_id, device, UTM, geolocation |
| `visitor_identified` | Identificação via URL ou formulário | source, has_email, has_phone, has_name |
| `interaction_*` | trackInteraction() chamado | interaction_type, page_path, geolocation |

### Sincronização com Clarity

Além do dataLayer, o sistema também:

1. **Define Clarity Tags** para segmentação:
   - `device_type`: mobile, tablet, desktop
   - `user_city`: cidade do visitante
   - `utm_source`: fonte de tráfego
   - `user_identified`: true quando identificado

2. **Identifica usuário no Clarity** com visitor_id anônimo

### Conformidade LGPD

A integração foi projetada para conformidade com LGPD:

| Dado | Enviado para Analytics? | Observação |
|------|------------------------|------------|
| E-mail | ❌ Não | Apenas `has_email: true` |
| Telefone | ❌ Não | Apenas `has_phone: true` |
| Nome | ❌ Não | Apenas `has_name: true` ou inicial |
| Cidade | ✅ Sim | Dado agregado, não pessoal |
| Região/Estado | ✅ Sim | Dado agregado, não pessoal |
| País | ✅ Sim | Dado agregado, não pessoal |
| Device Type | ✅ Sim | Dado técnico |
| Browser/OS | ✅ Sim | Dado técnico |
| UTM Params | ✅ Sim | Dado de campanha |

**Importante:** Os dados pessoais (email, telefone, nome) são armazenados apenas no Supabase (nosso banco de dados) e nunca enviados para ferramentas de terceiros.

### GA4 User Properties

Quando um visitante é identificado, as seguintes User Properties são definidas no GA4:

```typescript
{
  user_identified: true,           // Boolean
  identification_source: 'form',   // 'form' | 'url_param'
  has_email: true,                 // Boolean
  has_phone: true,                 // Boolean
  has_name: true,                  // Boolean
  user_city: 'São Paulo',          // String
  user_region: 'SP',               // String
}
```

Isso permite criar segmentos no GA4 como:
- Usuários identificados vs anônimos
- Usuários por cidade/região
- Usuários que forneceram telefone vs apenas email

---

## Suporte

Para dúvidas sobre a implementação, consulte:
- [Documentação GTM](https://developers.google.com/tag-manager)
- [Documentação GA4](https://developers.google.com/analytics/devguides/collection/ga4)
- [Documentação Clarity](https://docs.microsoft.com/en-us/clarity)
- [Next.js App Router](https://nextjs.org/docs/app)

