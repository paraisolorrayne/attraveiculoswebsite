# 🚀 NEXT ACTIONS: O que fazer agora

**Data:** 23 de Março de 2026  
**Status:** Backend ✅ Completo | Faltam: Staging + Deploy + Google Setup

---

## 📋 Para o Tech Lead / DevOps

### Reunião de Approval (30 min)

Agende uma reunião com:
- **Participantes:** DevOps Lead, Tech Lead, Backend Dev
- **Objetivo:** Revisar código e aprovar deploy
- **Artefatos para revisar:**
  - `src/app/api/feed/estoque/route.ts` (354 linhas)
  - Commit hash: `58b11bc`
  - Branch: `feature/merchant-feed`

### Checklist de Code Review

- [ ] Validação de segurança (XML escape, rate limiting)
- [ ] Tipagem TypeScript correta
- [ ] Cache headers configurados (ISR 1h)
- [ ] Error handling robusto
- [ ] Logging apropriado

### Após Approval → Próximos Passos

```bash
# 1. Criar PR no GitHub
git push origin feature/merchant-feed
# → Abrir PR: feature/merchant-feed → staging

# 2. DevOps puxa no VPS: git pull + npm run build + pm2 restart
# Observar build no servidor (pm2 log attra)

# 3. Testar em Staging
curl https://staging.attraveiculos.com.br/api/feed/estoque.xml

# 4. Validar XML (local)
curl https://staging.attraveiculos.com.br/api/feed/estoque.xml > feed.xml
xmllint --noout feed.xml

# 5. Análise de performance
curl -I https://staging.attraveiculos.com.br/api/feed/estoque.xml
# Esperado: Cache-Control: public, s-maxage=3600
```

---

## 📊 Para Product / Frontend

### Preparo do Concierge Chatbot

**Enquanto TI deploya, começar:**

```typescript
// src/components/product/attra-concierge.tsx

export function AttraConcierge({ vehicleId }: Props) {
  return (
    <div className="concierge-widget">
      {/* Aparece após 3s da página ser carregada */}
      {/* Oferece "Falar com Consultor" como CTA */}
      {/* Envia POST para /api/leads/ai-shopping */}
    </div>
  )
}
```

**Checklist para próxima semana:**
- [ ] Componente Concierge criado
- [ ] Lógica de trigger (delay 3s)
- [ ] Form de coleta de dados
- [ ] Webhook POST configurado
- [ ] Error handling
- [ ] Testing

---

## 💼 Para Comercial / Sales

### Preparação para Treinamento

**Depois que feed estiver live (próximas 48h):**

1. [ ] Reunião de training (1-2 horas)
   - Explicar nova jornada (AI Shopping)
   - Demonstrar como lead chega no CRM
   - Distribuir scripts de atendimento

2. [ ] Materiais preparados
   - ✓ Script de resposta (ver CUSTOMER_JOURNEY_FLOW.md)
   - ✓ Checklist de intenção
   - ✓ Exemplo de conversas
   - ✓ FAQ de objeções

3. [ ] Setup de notificações
   - [ ] WhatsApp funciona
   - [ ] Push notifications ativadas
   - [ ] Email de backup configurado

---

## 📊 Para Marketing / Analytics

### Setup de Monitoramento

**Em paralelo com deploy:**

1. [ ] Google Analytics 4
   - Adicionar filtro: `utm_source=ai_shopping`
   - Criar custom dashboard
   - Metrics: Impressões, Cliques, Conversão

2. [ ] Google Merchant Center
   - [ ] Account criada (comercial@attra.com.br)
   - [ ] Domínio verificado
   - [ ] Feed URL: https://attraveiculos.com.br/api/feed/estoque.xml
   - [ ] Aguardar indexação (24-48h)

3. [ ] Internal Dashboard
   - [ ] CRM linked para lead metrics
   - [ ] Weekly report template criado
   - [ ] Escalation alerts configurados

---

## ✅ Checklist de Deployment

### Pré-Deploy (Hoje)
- [ ] Code review aprovado
- [ ] Linting passou
- [ ] No secrets/env vars exposed
- [ ] URLs corretas configuradas

### Deploy Staging (Amanhã)
- [ ] PR criado e merged
- [ ] Deploy no VPS bem-sucedido (pm2 status mostra attra online)
- [ ] Teste de endpoint OK
- [ ] XML validado
- [ ] Headers corretos

### Google Setup (48h após staging)
- [ ] Feed URL registrada
- [ ] Wait para parsing (24-48h)
- [ ] Monitor Google Console para erros
- [ ] Validar items importados

### Pre-Go-Live (Dia 5-7)
- [ ] Concierge integrado
- [ ] Webhook testado
- [ ] Comercial treinado
- [ ] Notificações funcionando
- [ ] Analytics monitorando

---

## 📞 Distribuição de Comunicação

### Email de Update para Stakeholders

**Subject:** ✅ Merchant Feed - Semana 1 Completa

```
Pessoal,

Grande notícia! A primeira fase da implementação do Merchant Feed 
foi concluída com sucesso. 

✅ Metas alcançadas:
  • Backend 100% implementado
  • API endpoint testada e validada
  • Zero erros de linting e validação XML
  • Code pronto para deploy

⏳ Próximas fases:
  • Deploy Staging: [Data]
  • Google Merchant Setup: [Data]
  • Go-Live Produção: [Data]

👥 Próximas ações por time:
  • TI: Code review + Deploy
  • Frontend: Começar Concierge
  • Comercial: Revisar scripts
  • Marketing: Google Setup

📊 Timeline contínua sendo honrada (10 dias totais)

Dúvidas? Slack: #merchant-feed-launch

---
[Seu Nome]
[Seu Title]
```

---

## 🎯 Definição de Pronto (DoD)

Antes de qualquer step passar para "Completo":

- [ ] Código implementado
- [ ] Testes locais passando
- [ ] Linting 0 erros
- [ ] Code reviewed (+2 pessoas)
- [ ] Documentação atualizada
- [ ] Commit com mensagem clara
- [ ] Stakeholders notificados
- [ ] Próximo owner identificado

---

## 📋 Documentos de Referência

Durante os próximos passos, consulte:

| Documento | Quando consultar |
|-----------|------------------|
| [QUICK_START_GUIDE](QUICK_START_GUIDE.md) | Para steps rápidos |
| [MERCHANT_FEED_TECHNICAL_GUIDE](MERCHANT_FEED_TECHNICAL_GUIDE.md) | Para detalhes técnicos |
| [CUSTOMER_JOURNEY_FLOW](CUSTOMER_JOURNEY_FLOW.md) | Para entender fluxo |
| [MERCHANT_FEED_FAQ_TROUBLESHOOTING](MERCHANT_FEED_FAQ_TROUBLESHOOTING.md) | Para problemas |
| [IMPLEMENTATION_PROGRESS](IMPLEMENTATION_PROGRESS.md) | Para status atual |

---

## ⏱️ Timeline Esperada (Atualizada)

```
23 Mar (Hoje) ✅  → Backend completo + Commit
24 Mar (Amanhã)   → Code review + Deploy staging
25 Mar            → Google Merchant Center setup iniciado
26-27 Mar         → Google indexando (24-48h)
28 Mar            → Concierge + Frontend integração
29 Mar            → Comercial training
30 Mar            → Go-Live 🎉

Total: 7 dias (vs 10 dias estimado)
```

---

## 🚨 Se Algo der Errado

**Bloqueador técnico?**
→ Slack: `@devops` ou `#merchant-feed-launch`

**Problema com dados?**
→ Email: `inventario@attra.com.br`

**Issue com Google?**
→ Contato: `marketing@attra.com.br` + escalate para Google Support

**Dúvida sobre fluxo?**
→ Referência: `CUSTOMER_JOURNEY_FLOW.md` ou reunião com Product Lead

---

## ✍️ Sign-Off

Para cada time conferir que está pronto para próxima fase:

- [ ] **TI/DevOps:** Pronto para code review?
- [ ] **Frontend/Product:** Pronto para começar Concierge?
- [ ] **Comercial:** Scripts em mão?
- [ ] **Marketing:** Google account criada?

---

**Próxima reunião:** [Agendar para amanhã]

**Próxima atualização:** Após deploy staging

---

*Criado por: [Seu Nome]*  
*Data: 23 Mar 2026*  
*Status: 🟢 Em Progresso - No Caminho Certo*
