# FAQ e Troubleshooting: Merchant Feed AI Shopping

**Versão:** 1.0  
**Data:** 22 de Março 2026  
**Audiência:** TI, Produto, Comercial  

---

## ❓ Perguntas Frequentes

### Nível: TI / DevOps

**P1: O feed precisa de autenticação?**
> Não. Feeds XML/RSS são públicos por design. Qualquer pessoa (ou IA) pode acessar. Apenas implementar rate limiting (100 req/IP/hora) para proteção contra scraping agressivo.

**P2: Com que frequência o Google Merchant atualiza o feed?**
> Google crawla feeds de Merchant Center a cada **24 horas** por padrão. Mas você pode solicitar crawl manual via Google Search Console. Para Attra, a cada 1h via ISR (Incremental Static Regeneration), então feeds estão sempre "frescos".

**P3: Qual é o tamanho máximo do feed?**
> Google Merchant Center aceita feeds até **2.5GB** ou **50.000 itens**. Attra tem ~1.200 veículos, então é ~300KB (bem dentro do limite).

**P4: E se um carro for vendido enquanto está no feed?**
> Ótima pergunta! Estruturar um webhook que, quando a venda é confirmada no CRM, envia um POST de cancelamento para o feed. O carro desaparece em < 1 hora. **Importante:** Evita vender "carro fantasma" que a IA ainda recomenda.

**P5: Qual é a melhor hora para deployer o feed em produção?**
> Horário com menos tráfego (ex: 2-4 da manhã) para evitar spikes. Mas dado que Attra usa ISR (não impacta user-facing requests), pode ser qualquer hora. Recomendação: terça ou quarta (não fim de semana).

---

### Nível: Produto / Frontend

**P1: O Concierge precisa de aprovação de termos de IA?**
> Não é regulado como chatbot tradicional (não faz compra), mas recomenda-se: 
> - Disclaimer: "Assistente IA da Attra"
> - Sempre oferecer opção "falar com humano"
> - Mencionar que dados podem ser usados para treinar modelos (LGPD)

**P2: Como o Concierge sabe de qual IA o cliente veio?**
> Via **UTM parameters** no link clicado. Exemplo:
> ```
> https://attraveiculos.com.br/estoque/bmw-x5-2024?utm_source=ai_shopping&utm_medium=chatgpt
> ```
> JavaScript lê os parâmetros e pass para Concierge via contexto.

**P3: O Concierge pode fazer a venda de verdade (sem consultor)?**
> Não é recomendado para Attra. Veículos premium requerem:
> - Financiamento customizado
> - Avaliação de troca (negociação)
> - Garantia e serviços pós-venda
> 
> O Concierge qualifica, o consultor fecha. Modelo hibrido ideial.

**P4: Como integrar Concierge com o CRM existente?**
> Via webhook POST. Quando cliente clica "falar com consultor":
> ```json
> POST /api/crm/leads
> {
>   "nome": "João Silva",
>   "email": "joao@email.com",
>   "telefone": "+55 11 98765-4321",
>   "origem": "ai_shopping",
>   "veiculo_id": "bmw_x5_2024",
>   "urgencia": "alta",
>   "duvida_principal": "financiamento"
> }
> ```
> CRM recebe e roteia para consultor livre.

---

### Nível: Comercial / Consultores

**P1: Como é diferente atender um lead do ChatGPT vs. lead tradicional?**

| Aspecto | Lead Tradicional | Lead AI Shopping |
|---------|-----------------|------------------|
| **Conhecimento do carro** | Genérico / cold | Específico (já sabe qual) |
| **Contexto** | Nenhum | Sabe de onde veio (Chat, Google) |
| **Urgência** | Desconhecida | Mapeada pelo Concierge |
| **Qualificação** | Você precisa qualificar | Pré-qualificado |
| **Abordagem** | "O que você busca?" | "Vi que você quer o X5..." |
| **Conversão** | 20-30% | 50-60% |

**P2: Qual é o script ideal para ligar para um lead AI?**

```
[No CRM, você vê: "Origem: ai_shopping | Veículo: BMW X5 M50i | Urgência: Alta"]

VOCÊ:
"Oi João, tudo bem? Meu nome é Rafael, consultor da Attra Veículos.

Vi que você estava no ChatGPT procurando um SUV com performance,
e a IA recomendou nosso BMW X5 que chegou semana passada.

Aquele chat no site resolveu suas dúvidas sobre financiamento?
Se não, eu simulo rapidinho agora mesmo."

[Se "Sim" → Pede test drive]
[Se "Não" → Simula financiamento no telefone]
```

**P3: Se o cliente disser "já encontrei outro lugar mais barato", como responder?**

```
"Entendo! Mas importante destacar: a Attra não é só o carro.

Nós oferecemos:
- Garantia de 12 meses (ou 30 dias money-back)
- Serviços inclusos (revisão, óleo, filtros)
- Clube de proprietários premium
- Revisão prioritária na nossa autorizada
- Seguro com desconto (parceria)

Quer agendar um test drive para sentir a diferença?"
```

**P4: Quantos leads AI devo esperar por dia em Week 1?**
> Semana 1: 0-2 (feed ainda indexando)  
> Semana 2: 5-10 (Google começou raspar)  
> Semana 3: 15-30 (momentum crescendo)  
> Mês 2: 30-50/dia (com otimizações)

---

### Nível: Marketing

**P1: Como saber o ROI do feed de IA?**

```
Google Analytics:
├─ Segment: utm_source = "ai_shopping"
├─ Funnel: Impressions → Clicks → Leads → Sales
├─ Conversion rate target: > 8%
├─ Revenue from segment: Total sales from source

Dashboard interno:
├─ Feed impressions (Google Console)
├─ Feed clicks (GA)
├─ Leads gerados (CRM + contact form)
├─ Deal size médio
└─ Cycle time (dias até closed)
```

**P2: Preciso fazer anúncios para promover o feed?**
> Não! O feed é descoberta orgânica. A IA index automaticamente. Mas você pode:
> - Mencionar na newsletter: "Agora recomendado pelo ChatGPT!"
> - Post no blog: "Como a IA te ajuda a escolher carro"
> - LinkedIn: Case study de leads AI

**P3: Como otimizar as descrições para IA indexar melhor?**

```xml
<!-- ❌ Ruim -->
<g:description>BMW 2024</g:description>

<!-- ✅ Bom -->
<g:description>
BMW X5 M50i 2024 com motor V8 bi-turbo 523 HP, 
teto panorâmico, som Bose premium, interior couro Merino. 
Apenas 3.200 km, sem colisão, único dono. 
Certificado de qualidade Attra. Pronta entrega.
</g:description>
```

AIs (ChatGPT, Gemini) analisam descrições para fazer recomendações. Mais detalhes = melhor match com query do usuário.

**P4: Quanto de budget para "promover" o feed?**
> R$ 0 para o próprio feed. Custos apenas infraestrutura:
> - VPS Interlivre (hosting Next.js): ~R$ 80-150/mês
> - Cloudinary (imagens): já tem
> - Google Merchant: Grátis
> 
> Total: R$ 100-200/mês + dev one-time (15k)

---

## 🔧 Troubleshooting

### ❌ Feed não aparece em live/produção

**Simptomas:**
```
curl https://attraveiculos.com.br/api/feed/estoque.xml
→ HTTP 404 / 500
```

**Checklist:**
1. [ ] Arquivo `src/app/api/feed/estoque/route.ts` existe?
2. [ ] Deploy foi feito? (`npm run build && npm run start`)
3. [ ] Log de erro no servidor (pm2 log attra)?
4. [ ] Porta correta? (Dev: 3000, Prod: 3000 via Nginx reverse proxy)

**Solução:**
```bash
# Ver logs do deploy
pm2 log attra --lines 100

# Testar localmente
npm run dev
curl http://localhost:3000/api/feed/estoque

# Se local OK, problema é deploy
# Fazer redeploy
git push origin master  # DevOps faz pull + build + pm2 restart no servidor
```

---

### ❌ Google Merchant diz "XML malformed"

**Sintomas:**
```
Google Merchant Center → Feeds → Status: "Parse Error"
Error: Unexpected element 'g:description'
```

**Checklist:**
1. [ ] Encoding é UTF-8?
2. [ ] Caracteres especiais escapados? (`escapeXml()`)
3. [ ] Namespace correto? (`xmlns:g="http://base.google.com/ns/1.0"`)
4. [ ] Validar XML localemente

**Solução:**
```bash
# Baixar feed do servidor
curl https://attraveiculos.com.br/api/feed/estoque.xml > feed.xml

# Validar
xmllint --noout feed.xml
# Se erro, mostra linha/coluna

# Testar com Google Tool
# https://www.google.com/webmasters/tools/merchants
# Upload manual do feed.xml
# Google mostra erro específico
```

---

### ❌ Feed gerado mas sem items (vazio)

**Sintomas:**
```
curl https://attraveiculos.com.br/api/feed/estoque.xml
→ <rss>...</rss> válido, MAS SEM <item>
```

**Checklist:**
1. [ ] `getVehicleInventory()` retorna dados?
2. [ ] `list_vehicle.json` tem registros?
3. [ ] Veículos têm `id` preenchido?

**DEBUG:**
```typescript
// Adicionar log no route.ts
const vehicles = await getVehicleInventory()
console.log(`Loaded ${vehicles.length} vehicles`)
vehicles.slice(0, 1).forEach(v => console.log(v)) // Primeiro veículo

// Isso vai mostrar no pm2 log attra em produção
```

---

### ❌ Feed tem items mas Google não converte a leads

**Sintomas:**
```
- Feed indexado: ✅
- Feed items importados: ✅
- Mas zero impressões no Google Shopping
```

**Causas possíveis:**
1. **Imagens ruins**: URLs Cloudinary estão quebradas?
2. **Preços fora de padrão**: "1150000.00 BRL" ou "R$ 1150000"?
3. **Categoria errada**: Category deve ser bem específica
4. **Falta de links**: `<g:link>` aponta para página válida?

**Checklist:**
```bash
# 1. Validar URLs de imagens
curl -I "https://res.cloudinary.com/attra/image/upload/v1/..."
→ 200 OK

# 2. Validar price format
grep "<g:price>" feed.xml | head -1
→ Esperado: "580000.00 BRL" (não "R$")

# 3. Validar links
grep "<g:link>" feed.xml | head -1
→ Esperado: URL válida, sem caracteres especiais

# 4. Google Console → Feed → View full report
# Mostra quais items foram importados vs. exibidos
```

---

### ❌ Google indexou mas conversão baixa

**Sintomas:**
```
- Impressões: 500/dia ✅
- Cliques: 20/dia (4% CTR) ⚠️
- Leads: 2/dia (10% conversion)
```

**Causas possíveis:**
1. **Descrições genéricas**: Não chamam atenção
2. **Imagens ruins**: Thumbnail não é apetitoso
3. **Preço alto vs. mercado**: Google mostra, mas cliente acha caro
4. **Concierge não engaja**: Cliente chega na página, sai sem interagir

**Otimizações:**
```xml
<!-- Melhorar descrição -->
<g:description>
BMW X5 M50i 2024, NOVO ESTOQUE! 
Motor V8 523HP • Teto panorâmico • Som Bose
Apenas 3.200 km • Zero colisão • Pronta entrega
Garantia Attra 12 meses
</g:description>

<!-- Adicionar custom labels -->
<g:custom_label_0>Premium Curated</g:custom_label_0>
<g:custom_label_1>Pronta Entrega</g:custom_label_1> ← Urgência!
<g:custom_label_3>Baixa Quilometragem</g:custom_label_3>
```

---

### ❌ Concierge funciona mas não captura leads

**Sintomas:**
```
- Visitantes: 500/dia
- Chat interactions: 50 (10%)
- Leads capturados: 5 (1%)
- Esperado: 50+ (10%)
```

**Checklist:**
1. [ ] CTA "Falar com consultor" está visível no chat?
2. [ ] Formulário aparece depois de N mensagens?
3. [ ] Webhook está sendo disparado? (checar logs CRM)
4. [ ] Email/telefone são campos obrigatórios?

**Teste:**
```javascript
// No console do navegador (em página com Concierge)
console.log(window.attractaContext)
// Deve mostrar: { chat_enabled: true, webhook_url: "...", etc }

// Testar webhook manualmente
fetch('https://sua-instancia-crm.com/api/leads', {
  method: 'POST',
  body: JSON.stringify({
    nome: 'Teste',
    email: 'teste@email.com',
    telefone: '+5511999999999'
  })
})
// Deve retornar 201 Created
```

---

### ❌ Consultor não recebe notificação de novo lead

**Sintomas:**
```
- Lead criado no CRM: ✅
- Webhook disparo: ✅
- Consultores afirmam: "Não vi notificação"
```

**Checklist:**
1. [ ] Webhook está ligado? (N8N / CRM settings)
2. [ ] Webhook route existe? (`/webhooks/leads_ai_shopping`)
3. [ ] WhatsApp/SMS service está online?
4. [ ] Número de telefone do consultor está correto no CRM?

**DEBUG N8N:**
```
N8N Dashboard → Workflows → "Lead AI Shopping"
├─ Trigger: Webhook (ativo? ✅)
├─ Node 1: Recebe POST
├─ Node 2: Validação
├─ Node 3: Send WhatsApp
│  └─ Check: Telefone formatado? (ex: +5511987654321)
└─ Logs: Executou com sucesso? Qual erro?
```

---

## 🎯 Performance Optimization

### Se feed está lento (> 1s resposta)

1. **Adicionar índice na database**
   ```sql
   CREATE INDEX idx_vehicles_status ON vehicles(status);
   CREATE INDEX idx_vehicles_updated_at ON vehicles(updated_at);
   ```

2. **Implementar pagination** (se > 5000 items)
   ```
   /api/feed/estoque.xml → Redireciona para /estoque?page=1
   /api/feed/estoque-page-1.xml → Items 1-5000
   /api/feed/estoque-page-2.xml → Items 5001-10000
   ```

3. **Usar CDN (Cloudflare na frente do Nginx)**
   - Set `cacheMaxAge: 3600` nas headers
   - Feed servido de edge location mais próximo

---

## 📞 Escalar um Problema

### Critério de Severidade

| Severidade | Exemplo | SLA |
|------------|---------|-----|
| **P0 (Critical)** | Feed retorna 500 | < 15 min |
| **P1 (High)** | Feed lento, > 5s | < 1 hora |
| **P2 (Medium)** | Google não indexa | < 4 horas |
| **P3 (Low)** | Descrição ruim | < 1 dia |

### Contato

```
P0: #emergency no Slack + ligar tech lead
P1: #merchant-feed no Slack
P2: Email devops@attra.com.br
P3: Criar issue no GitHub
```

---

## ✅ Checklist de Saúde Semanal

```
Toda segunda-feira, 9h:
☐ Feed uptime: > 99%? (checar pm2 status / monitoring externo)
☐ Feed size: entre 100KB - 1MB?
☐ Google Merchant: parse success 100%?
☐ Lead volume: esperado para semana?
☐ Concierge engagement: > 10%?
☐ Consultor contact rate: > 80%?
☐ Feedback comercial: alguma issue?

Se rojo em qualquer item → Agendar debug
```

---

**Última atualização:** 22 Mar 2026  
**Próxima revisão:** 30 Mar 2026 (após 1a semana live)
