# Checklist de Implementação: Merchant Feed para AI Shopping

**Status:** 🚀 Pronto para iniciar  
**Data:** 22 de Março de 2026  
**Responsável:** Time de DevOps / Backend  

---

## ✅ Fase 0: Preparação (Dia 1)

- [ ] **Revisar Documentação**
  - [x] Guia Técnico: `MERCHANT_FEED_TECHNICAL_GUIDE.md`
  - [x] Fluxo do Cliente: `CUSTOMER_JOURNEY_FLOW.md`
  - [x] Template API: `src/app/api/feed/estoque/route.ts`

- [ ] **Reunião de Kickoff**
  - [ ] Agendar reunião com TI + Produto + Comercial
  - [ ] Definir SLA (quando feed precisa estar vivo?)
  - [ ] Identificar owner de cada componente
  - [ ] Criar canal Slack: #merchant-feed-launch

- [ ] **Preparar Ambiente**
  - [ ] Acessar repositório GitHub
  - [ ] Branch novo: `feature/merchant-feed`
  - [ ] Verificar acesso ao Google Merchant Center
  - [ ] Testar importar `list_vehicle.json`

---

## ✅ Fase 1: Desenvolvimento Backend (Dias 2-3)

### 1.1 Implementar Endpoint API

- [ ] **Criar arquivo da rota**
  - [x] Arquivo criado: `src/app/api/feed/estoque/route.ts`
  - [ ] Revisar tipos de dados de veículos
  - [ ] Verificar campos obrigatórios em `list_vehicle.json`
  
- [ ] **Implementar função de leitura de estoque**
  ```typescript
  // Adicionar em src/lib/vehicle-inventory-data.ts
  export async function getVehicles() {
    // Retorna array de veículos com:
    // - id, marca_nome, modelopai_nome, anomodelo
    // - preco, estoque, formato BRL
    // - foto_principal_url, fotos_adicionais_urls
    // - cambio_nome, cor_nome, km_total
  }
  ```
  - [ ] Testar retorno de dados
  - [ ] Log de erros implementado

- [ ] **Validar geração de XML**
  ```bash
  npm run dev
  curl http://localhost:3000/api/feed/estoque
  # Esperado: XML válido, status 200
  ```

- [ ] **Implementar Cache (ISR)**
  - [ ] Cache-Control headers configurados
  - [ ] Time-to-live: 3600s (1 hora)
  - [ ] Stale-while-revalidate: 7200s (2 horas)

### 1.2 Testes Locais

- [ ] **Validar XML**
  ```bash
  curl http://localhost:3000/api/feed/estoque | xmllint --noout -
  # Esperado: documento válido
  ```

- [ ] **Contar items**
  ```bash
  curl http://localhost:3000/api/feed/estoque | grep -c "<g:id>"
  # Esperado: > 0
  ```

- [ ] **Verificar caracteres especiais**
  - [ ] Testa veículo com ç, ã, é, etc.
  - [ ] Verifica `escapeXml()` funcionando
  - [ ] Confirma encoding UTF-8

- [ ] **Performance**
  - [ ] Tempo geração < 500ms (100 veículos)
  - [ ] Tamanho feed < 500KB
  - [ ] Memória < 50MB em pico

---

## ✅ Fase 2: Deploy e Validação (Dias 4-5)

### 2.1 Deploy para Staging

- [ ] **Fazer commit e PR**
  - [ ] Código reviewado por 2+ devs
  - [ ] Testes passando (if applicable)
  - [ ] Deploy automático para staging

- [ ] **Testar em Staging**
  ```bash
  curl https://staging.attraveiculos.com.br/api/feed/estoque.xml
  # Esperado: 200 OK, conteúdo válido
  ```

- [ ] **Validar com Google Tools**
  - [ ] Acessar: https://www.google.com/webmasters/tools/merchants
  - [ ] Fazer upload manual do feed XML
  - [ ] Verificar erros de parsing
  - [ ] Confirmar todos campos estão presentes

- [ ] **Performance em staging**
  - [ ] Medir tempo de resposta (< 1s)
  - [ ] Testar rate limiting (100 req/hora)
  - [ ] Simular múltiplos crawlers simultaneamente

### 2.2 Deploy para Produção

- [ ] **Planejar janela de deploy**
  - [ ] Horário com menos tráfego
  - [ ] Ter plano de rollback
  - [ ] Notificar equipe comercial

- [ ] **Executar deploy**
  - [ ] Merge para `main`
  - [ ] Deploy via SSH + git pull + npm run build + pm2 restart attra
  - [ ] Aguardar 5min de estabilidade

- [ ] **Validações pós-deploy**
  ```bash
  curl -I https://attraveiculos.com.br/api/feed/estoque.xml
  # Esperado: 200, Cache-Control implementado
  
  curl https://attraveiculos.com.br/api/feed/estoque.xml | wc -c
  # Esperado: > 1000 bytes
  ```

---

## ✅ Fase 3: Google Merchant Center Setup (Dias 5-6)

### 3.1 Criar/Configurar Conta

- [ ] **Acessar Google Merchant Center**
  - [ ] URL: https://merchantcenter.google.com
  - [ ] Login com email da Attra (comercial@attra.com.br)
  - [ ] Se novo, criar conta merchants

- [ ] **Verificar posse do domínio**
  - [ ] Método: Arquivo HTML no root `/verify-attra.html`
  - [ ] **OU** Meta tag no `<head>` do site
  - [ ] Test: Google consegue acessar?
  - [ ] Confirmar verificação em 1-24h

- [ ] **Adicionar feed primário**
  - [ ] Feed URL: `https://attraveiculos.com.br/api/feed/estoque.xml`
  - [ ] Tipo: RSS 2.0 (com namespace Google)
  - [ ] Frequência fetch: Automático (diário)
  - [ ] Salvar configuração

### 3.2 Monitoramento Inicial

- [ ] **Aguardar primeira varredura**
  - [ ] Timeline: 24-48 horas
  - [ ] Status: "Parse successful" ou erros?
  - [ ] Items: Todos foram importados?

- [ ] **Resolver possíveis erros**
  - [ ] Se erro de parsing: revisar XML com `xmllint`
  - [ ] Se missing field: adicionar campo ao template
  - [ ] Se imagens quebradas: verificar Cloudinary URLs
  - [ ] Se taxa de erro > 5%: escalate para tech lead

- [ ] **Configurar atributos em Google**
  - [ ] Condition: `used`
  - [ ] Availability: `in stock` / `out of stock`
  - [ ] Category: Importa automática

---

## ✅ Fase 4: Integração Web + CRM (Dias 7-8)

### 4.1 Feed Visível no Site

- [ ] **Atualizar `robots.txt`**
  ```
  Sitemap: https://attraveiculos.com.br/api/feed/estoque.xml
  Allow: /api/feed/estoque.xml
  ```

- [ ] **Atualizar `sitemap.xml`**
  - [ ] Feed aparece como alta prioridade
  - [ ] Changefreq: `hourly`

- [ ] **Adicionar link no footer (optional)**
  - [ ] Texto: *"Disponível em Google Shopping" / ícone Google*
  - [ ] Link para Google Shopping da Attra

### 4.2 Testar Fluxo Completo (Concierge → CRM)

- [ ] **Webhook de lead capture funcionando**
  - [ ] Quando cliente clica "Falar com Consultor" → Lead criado no CRM
  - [ ] Dados incluem: `origem=ai_shopping`, `veiculo_id`, etc.

- [ ] **Notificação em tempo real ao consultor**
  - [ ] WhatsApp/Email quando novo lead quente chega
  - [ ] CRM carregue contexto (onde cliente veio)

- [ ] **Analytics configurado**
  - [ ] Google Analytics: Rastrear tráfego do feed
  - [ ] Tag: `utm_source=ai_shopping`
  - [ ] Dashboard: Impressões vs. Cliques vs. Leads

---

## ✅ Fase 5: Monitoramento Contínuo (Semana 2+)

### 5.1 Dashboard de Saúde

- [ ] **Criar dashboard Datadog/CloudWatch**
  ```
  Métricas:
  ├─ Feed uptime: > 99.9%
  ├─ Feed size: 100KB - 1MB
  ├─ Generation time: < 500ms
  ├─ Cache hit rate: > 95%
  ├─ Error rate: < 0.1%
  └─ Google parse success: 100%
  ```

- [ ] **Alertas configurados**
  - [ ] Feed retorna erro 5xx → Alert urgente
  - [ ] Feed > tamanho esperado → Alert médio
  - [ ] Google Merchant parsing error → Alert urgente

### 5.2 Otimizações Baseadas em Dados

- [ ] **Primeira semana - Análise**
  - [ ] Quantas impressões o feed gerou?
  - [ ] Qual taxa de cliques?
  - [ ] Qual bounce rate?
  - [ ] Quantos leads foram gerados?

- [ ] **Otimizar descrições (se necessário)**
  - [ ] Se CTR baixo (< 3%): melhorar títulos
  - [ ] Se bounce alto (> 30%): checker página destino
  - [ ] Se poucos leads: revisar página de produto

- [ ] **Escalar se necessário**
  - [ ] Feed > 10k itens? Implementar paginação
  - [ ] Traffic > 1000 req/hora? Aumentar rate limit

---

## ✅ Fase 6: Comunicação e Treinamento (Semana 2)

### 6.1 Comunicar com Equipes

- [ ] **Email para Comercial**
  - Assunto: "Feed de Estoque Attra ao Vivo no Google Shopping"
  - Conteúdo:
    - Link para Google Shopping (quando ativo)
    - Explicação (uma pequena jornada do cliente)
    - Como verificar lead origem = "ai_shopping"
    - Contato para dúvidas

- [ ] **Email para Marketing**
  - Dashboard de resultados
  - KPIs esperados vs. atuais
  - Sugestões de otimização

- [ ] **Training interno (30 min)**
  - [ ] Consultores aprendem fluxo AI Shopping
  - [ ] Como responder leads "quentes"
  - [ ] Gravação registrada no Wiki

---

## ✅ Fase 7: Otimizações Futuras (Semana 3+)

- [ ] **Adicionar campos avançados**
  - [ ] Google also accepts: `shipping`, `tax`, `installment`
  - [ ] Attra: implementar quando financiamento automatizado

- [ ] **API dinamicamente atualizado**
  - [ ] Quando novo veículo entra no estoque → Feed atualiza em < 1h
  - [ ] Quando veículo vendido → Remove em < 1h
  - [ ] Evita ofertar carros já vendidos

- [ ] **Integração com mais plataformas**
  - [ ] Facebook Catalog (além Google)
  - [ ] Pinterest Shopping
  - [ ] Alibaba (se exportar para China)

- [ ] **Análises avançadas**
  - [ ] Qual modelo tem maior CTR?
  - [ ] Qual faixa de preço converte mais?
  - [ ] Qual horário pico de tráfego AI?
  - [ ] Usar insights para prioritizar estoque

---

## 📊 Métricas de Sucesso

### Semana 1-2
- [ ] Feed gerado com sucesso
- [ ] Google Merchant indexou dados
- [ ] Primeira venda via AI Shopping

### Semana 3-4
- [ ] 50+ leads via AI Shopping/mês
- [ ] 5%+ conversion de lead → consultor
- [ ] Feedback positivo da equipe comercial

### Mês 2
- [ ] 200+ leads via AI Shopping/mês
- [ ] ROI identificável no CRM
- [ ] Extensão para outras plataformas (FB, etc.)

---

## 🚨 Escalation Path

| Problema | Owner | Contato |
|----------|-------|---------|
| Feed XML errors | DevOps | `devops@attra.com.br` |
| Dados de veículos incorretos | Inventário | `inventario@attra.com.br` |
| Google Merchant issues | Marketing | `marketing@attra.com.br` |
| CRM/Lead flow issues | Produto | `produto@attra.com.br` |
| Performance/scaling | Tech Lead | `tech@attra.com.br` |

---

## 📝 Sign-Off

- [ ] **Desenvolvedor:** Implementação completa ______ (assinatura)
- [ ] **Tech Lead:** Code review aprovado ______ (assinatura)
- [ ] **DevOps:** Deploy validado ______ (assinatura)
- [ ] **Product Manager:** Fluxo testado ______ (assinatura)
- [ ] **Comercial:** Consultores treinados ______ (assinatura)

---

**Status Final:** ☐ EM PLANEJAMENTO | ☐ EM DESENVOLVIMENTO | ☐ EM TESTE | ✅ LIVE

**Data de Conclusão Estimada:** 30 de Março de 2026 (10 dias corridos)

---

**Próximo passo:** Agendar reunião de kickoff e designar owners de cada task.
