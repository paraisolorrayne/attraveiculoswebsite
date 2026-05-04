# 🚀 Quick Start Guide: Merchant Feed para AI Shopping

**Comece aqui!** Guia rápido para colocar o feed ao vivo em 10 dias.

---

## 📍 Estou em qual papel?

### 👨‍💻 Eu sou DEV / DEVOPS
→ Ir para: **[Seção: Implementação Técnica](#implementação-técnica)**

### 👩‍💼 Eu sou PRODUCT / FRONTEND
→ Ir para: **[Seção: Integração Web](#integração-web)**

### 💼 Eu sou COMERCIAL / CONSULTOR
→ Ir para: **[Seção: Novo Fluxo de Atendimento](#novo-fluxo-de-atendimento)**

### 📊 Eu sou MARKETING / ANALYTICS
→ Ir para: **[Seção: Monitoramento](#monitoramento)**

---

## 🔧 Implementação Técnica

**Timeline:** Dias 1-3  
**Owner:** Backend + DevOps  

### Step 1: Setup Inicial (1 hora)

```bash
# 1. Clone e entre no branch
git clone https://github.com/attra-veiculos/website.git
cd website
git checkout -b feature/merchant-feed

# 2. Verificar arquivo já criado
ls src/app/api/feed/estoque/route.ts
# ✅ Deve existir (já criado para você)

# 3. Revisar arquivo
cat src/app/api/feed/estoque/route.ts
# Deve ter: generateXmlFeed(), vehicleToFeedItem(), GET handler

# 4. Instalar dependências (se necessário)
npm install
```

### Step 2: Testar Localmente (1 hora)

```bash
# 1. Rodar dev server
npm run dev
# Esperado: Listening at http://localhost:3000

# 2. Testar feed no navegador
open http://localhost:3000/api/feed/estoque
# Esperado: XML válido com veículos

# 3. Validar XML via terminal
curl http://localhost:3000/api/feed/estoque | xmllint --noout -
# Esperado: document validates

# 4. Contar items
curl http://localhost:3000/api/feed/estoque | grep -c "<g:id>"
# Esperado: número > 0
```

**Se deu erro?** Ver [FAQ & Troubleshooting](MERCHANT_FEED_FAQ_TROUBLESHOOTING.md)

### Step 3: Revisar Dados de Veículos (30 min)

```bash
# 1. Verificar source dos dados
cat list_vehicle.json | head -20
# Deve ter: id, marca_nome, modelopai_nome, anomodelo, preco, etc

# 2. Verificar campos faltando
# Se falta "foto_principal_url" ou "preco":
# → Contactar Inventário (inventario@attra.com.br)

# 3. Contar veículos
cat list_vehicle.json | jq '.veiculos | length'
# Esperado: > 100 veículos
```

### Step 4: Deploy para Staging (30 min)

```bash
# 1. Commit seu código
git add src/app/api/feed/estoque/route.ts
git commit -m "feat: implement merchant feed XML/RSS"

# 2. Push para origin
git push origin feature/merchant-feed

# 3. Abrir PR no GitHub e aguardar review/CI

# 4. Testar em staging
curl https://staging.attraveiculos.com.br/api/feed/estoque
```

### Step 5: Submeter no Google Merchant Center (1 hora)

```
1. Ir para: https://merchantcenter.google.com
2. Login: comercial@attra.com.br
3. Add Feed:
   - URL: https://attraveiculos.com.br/api/feed/estoque.xml
   - Type: RSS 2.0
   - Language: Portuguese (Brazil)
   - Fetch frequency: Daily

4. Save e aguardar 24-48h de indexação
```

### Step 6: Deploy para Produção (30 min)

```bash
# 1. Merge PR (após code review)
git checkout main
git merge --no-ff feature/merchant-feed

# 2. Push para master e fazer deploy no servidor
git push origin master
# DevOps puxa no VPS Interlivre: git pull + npm run build + pm2 restart attra --update-env

# 3. Verificar
curl https://attraveiculos.com.br/api/feed/estoque
# Status 200? ✅ Live!

# 4. Log de sucesso
echo "✅ Feed live em " $(date)
```

**Done!** Feed está ao vivo. Próximo passo: Aguardar Google indexar (24-48h).

---

## 🌐 Integração Web

**Timeline:** Dias 4-7  
**Owner:** Frontend  

### Pré-requisitos
- [ ] Feed já está live (`/api/feed/estoque.xml`)
- [ ] Google Merchant começou indexar

### Tarefa 1: Concierge Chatbot (3h)

Adicionar chat na página de veículos que:
1. Aparece 3s após carregar (trigger automático)
2. Pergunta se cliente está interessado
3. Se interage + 3 mensagens → Oferece "falar com consultor"

```typescript
// Implementar em: src/components/product/attra-concierge.tsx

export function AttraConcierge({ vehicleId, vehicleName }: Props) {
  return (
    <div className={styles.concierge}>
      <header>Attra Concierge</header>
      <message initial={`Olá! Vi que você chegou procurando
        um ${vehicleName}. Posso ajudar?`} />
      <input placeholder="Digite sua pergunta..." />
      <button onClick={handleTalkToConsultor}>Falar com Consultor</button>
    </div>
  )
}
```

- [ ] Componente criado
- [ ] Trigger em timer funciona
- [ ] Detecta mensagens do usuário
- [ ] Botão "Falar com Consultor" visível

### Tarefa 2: Webhook de Lead Capture (2h)

Quando usuário clica "falar com consultor":

```typescript
// Em: src/app/api/leads/ai-shopping/route.ts

export async function POST(request: Request) {
  const { nome, email, telefone, vehicleId, source } = await request.json()
  
  // Validar
  if (!nome || !email) return Response.json({ error: 'Invalid' }, { status: 400 })
  
  // Enviar para CRM
  const crm_response = await fetch(process.env.CRM_WEBHOOK_URL!, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.CRM_API_KEY}` },
    body: JSON.stringify({
      nome, email, telefone,
      origem: 'ai_shopping',
      veiculo_id: vehicleId,
      timestamp: new Date().toISOString()
    })
  })
  
  return Response.json({ success: true })
}
```

- [ ] Endpoint criado e funciona
- [ ] Dados enviados para CRM via HTTP POST
- [ ] Log de erros implementado
- [ ] Testado com curl manual:
  ```bash
  curl -X POST http://localhost:3000/api/leads/ai-shopping \
    -H "Content-Type: application/json" \
    -d '{
      "nome": "João",
      "email": "joao@email.com",
      "telefone": "+5511987654321",
      "vehicleId": "bmw_x5_2024"
    }'
  ```

### Tarefa 3: Analytics / UTM (1h)

Rastrear tráfego do feed no Google Analytics:

```typescript
// Em qualquer página de produto
useEffect(() => {
  const params = new URLSearchParams(window.location.search)
  const source = params.get('utm_source') // Será "ai_shopping"
  
  if (source === 'ai_shopping') {
    gtag.pageview({
      page_title: 'AI_Shopping_Product_Page',
      page_path: window.location.pathname,
      custom_source: 'ai_shopping'
    })
  }
}, [])
```

- [ ] GA4 evento disparado quando origem = ai_shopping
- [ ] Dashboard customizado criado em GA4
- [ ] Tag "ai_shopping" nos links do feed

---

## ☎️ Novo Fluxo de Atendimento

**Timeline:** Dias 7-8  
**Owner:** Comercial / Training  

### Treinar Consultores (1 dia)

**Agenda de 2h:**

| Time | Atividade |
|------|-----------|
| 0-10min | Introdução: "O que é AI Shopping?" |
| 10-30min | Demo: Chat do consultor vendo lead AI (screenshot) |
| 30-50min | Role-play: "Como responder lead AI?" |
| 50-70min | Hands-on: Abrindo leads reais no CRM |
| 70-120min | Q&A e feedback |

### Script de Atendimento

```
[Você recebe notificação: "Lead quente - BMW X5 M50i - ChatGPT"]

VOCÊ:
"Oi João, tudo bem? Meu nome é Rafael, consultor da Attra.

Vi que você estava no ChatGPT procurando um SUV com performance,
e recomendou exatamente o BMW X5 que temos aqui.

Aquele chat no site resolveu tudo sobre financiamento?
Se não, eu posso simular agora mesmo no telefone."

[Cliente responde]

SE "Sim, quero test drive":
→ "Ótimo! Temos slots amanhã às 10h ou 14h. Qual encaixa melhor?"

SE "Não, tenho dúvida sobre X":
→ [Explica X] → "Quer agendar para conhecer pessoalmente?"

SE "Achei mais barato em Y":
→ "Entendo. Mas a Attra oferece garantia 12 meses + serviços inclusos.
   Quer agendar um teste para sentir a diferença?"
```

### Checklist de Implementação

- [ ] Script printed e em mão de cada consultor
- [ ] Notificações WhatsApp funcionando
- [ ] CRM exibe "Origem: AI Shopping" claramente
- [ ] SLA definido: Contatar < 1 hora
- [ ] Feedback loop criado (Concierge → Lead → Sale → Survey)

---

## 📊 Monitoramento

**Owner:** Marketing / Analytics  
**Frequência:** Diário (semana 1) → Semanal (depois)

### Dashboard Necessário

Criar no Google Data Studio com:

```
FEED PERFORMANCE:
├─ Feed status (up/down) — check a cada hora
├─ Google Merchant items indexed — daily
├─ Feed size in bytes — daily
└─ Parse success rate — daily

TRAFFIC METRICS:
├─ Impressões no Google/ChatGPT — diário
├─ Cliques (CTR) — diário
├─ Bounce rate — diário
└─ Avg time on page — diário

LEAD METRICS:
├─ Leads via AI Shopping — diário
├─ Lead-to-consultant rate — diário
├─ Conversion rate — semanal
└─ Cycle time (days to close) — semanal
```

### Setup Inicial (2h)

```
1. Google Analytics 4:
   ├─ Adicionar filtro: utm_source = "ai_shopping"
   └─ Criar custom dashboard

2. Google Merchant Center:
   ├─ Acessar https://merchantcenter.google.com/feeds
   └─ Check status, items, performance

3. Internal CRM:
   ├─ Tag "ai_shopping" em leads
   └─ Report: leads_ai_shopping_per_day

4. Server monitoring (PM2 + Nginx logs ou ferramenta externa):
   ├─ Monitor: /api/feed/estoque uptime + latency
   └─ Alert se down > 5 min
```

### Weekly Report (30 min)

Toda segunda 9h, enviar email com:

```
Subject: [AI Shopping] Relatório Semanal (Semana XX)

Feed Metrics:
├─ Uptime: 99.9%
├─ Items indexed: 1.195/1.200 (99.6%)
└─ Last update: [timestamp]

Traffic:
├─ Impressões: 1.250 (+15% WoW)
├─ Cliques: 85 (6.8% CTR)
├─ Leads: 12 (14% conversion)
└─ Bounce: 22% ✅

Sales:
├─ Deals closed: 2
├─ Total value: R$ 1.160.000
└─ Avg cycle: 8 dias

Top Vehicles (by impressions):
1. BMW X5 M50i 2024 — 320 impressões
2. Porsche 911 Carrera 2023 — 180 impressões
3. Range Rover Sport 2023 — 150 impressões

Next Week Optimization:
□ Melhorar descrição dos 3 carros com baixo CTR
□ Adicionar imagens melhores para [X modelo]
□ A/B test: Concierge mensagem inicial
```

---

## ✅ Checkpoint: Semana por Semana

### Semana 1: Dev & Setup
- [ ] Feed live em produção
- [ ] Google Merchant feed submitted
- [ ] Concierge code pronto (em staging)
- [ ] Webhook endpoint criado
- [ ] **KPI:** Feed 99%+ uptime, 0 parse errors

### Semana 2: Go-Live Web + Treinamento
- [ ] Concierge deployed em produção
- [ ] Consultores treinados no novo fluxo
- [ ] Primeiros leads chegando
- [ ] Analytics dashboard criado
- [ ] **KPI:** 50+ leads da source "ai_shopping"

### Semana 3: Otimização
- [ ] Google Merchant indexando bem
- [ ] Feed impressões > 1000/dia
- [ ] First closed deals from AI Shopping
- [ ] Feedback loop ativo
- [ ] **KPI:** 1+ deal fechado, conversion > 30%

### Semana 4: Scale
- [ ] ROI positivo confirmado
- [ ] Processo estável
- [ ] Documentação atualizada
- [ ] Plano de expansão (FB Catalog, Pinterest, etc)
- [ ] **KPI:**  Lead-to-conversion > 40%

---

## 🆘 Preciso de Ajuda

| Problema | Contactar |
|----------|-----------|
| Feed não funciona | `@devops` no Slack → #merchant-feed |
| Concierge não aparece | `@frontend-lead` |
| Leads não chegam no CRM | `@crm-team` |
| Google Merchant erro | `@marketing` |
| Performance ruim | `@tech-lead` |

---

## 📚 Documentação Completa

Depois de ler este guia rápido, mergulhe em:

1. **[MERCHANT_FEED_TECHNICAL_GUIDE.md](MERCHANT_FEED_TECHNICAL_GUIDE.md)** — Spec completa (todas as flags do Google)
2. **[CUSTOMER_JOURNEY_FLOW.md](CUSTOMER_JOURNEY_FLOW.md)** — Entender a jornada end-to-end
3. **[MERCHANT_FEED_FAQ_TROUBLESHOOTING.md](MERCHANT_FEED_FAQ_TROUBLESHOOTING.md)** — Quando algo quebra
4. **[MERCHANT_FEED_IMPLEMENTATION_CHECKLIST.md](MERCHANT_FEED_IMPLEMENTATION_CHECKLIST.md)** — Checklist detalhada

---

## 🎯 Seu Próximo Passo

**Hoje (agora):**
1. Identifique seu papel acima ↑
2. Clique no link da seção
3. Execute Step 1

**Amanhã:**
1. Reunião de kickoff (30 min com lead da sua área)
2. Designar sub-tasks
3. Começar desenvolvimento

**Dia 10:**
- 🚀 **Feed está live no ChatGPT, Google Shopping e Gemini**
- 🎯 **Primeiros leads chegando**
- 💰 **Primeiras vendas sendo discutidas**

---

**Tempo estimado para completar:** 10 dias  
**Pessoas necessárias:** 1 dev + 1 frontend + 1 devops + treinamento comercial  
**Investimento:** R$ 15k (dev) + R$ 2k (infra)  
**Payback:** < 1 semana (após primeira venda)

**Let's go! 🚀**

---

*Última atualização: 22 Mar 2026*
*Próxima revisão: 01 Abr 2026 (após go-live)*
