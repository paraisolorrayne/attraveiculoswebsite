# Roadmap: "quantos reais de margem esse canal gerou?"

**Data:** 08/08/2026

Esta é a pergunta que decide orçamento de mídia. Hoje o site **não consegue responder**,
e este documento diz exatamente o que falta, em que ordem, e quem precisa fazer cada
parte.

---

## Onde estamos, medido

| | |
|---|---|
| Vendas fechadas no CRM | **8** (desde 22/07/2026) |
| Com valor preenchido | 5 — somando **R$ 3.403.000** |
| Com identificador da sessão do site | **0** |
| Que batem por telefone com visitante do site | **0** |
| Com custo do veículo registrado | **0** (o campo não existe) |

Ou seja: **R$ 3,4 milhões vendidos sem nenhuma origem conhecida.** Não é que a
atribuição esteja imprecisa — ela é inexistente na última etapa.

E margem é outro problema, ainda anterior: o CRM guarda o **preço de venda** (`valor`),
não o custo. Sem custo não há margem, em nenhuma ferramenta.

---

## A cadeia completa, e onde ela quebra

```
1. Clique no anúncio        ✅ funciona   (UTM + pixel)
2. Sessão no site           ✅ funciona   (utm/campanha/termo gravados)
3. Lead                     ✅ funciona   (WhatsApp e formulário medidos)
4. Lead vira card no CRM    ✅ funciona   (webhook)
5. Card ↔ sessão            ❌ QUEBRA AQUI
6. Card vira venda          ✅ existe     (etapa encerrado_ganho + valor)
7. Venda vira margem        ❌ não existe (sem custo)
```

Os elos 1 a 4 estão de pé. **Todo o investimento em medição morre no elo 5.**

---

## Etapa 1 — Fazer o CRM devolver o identificador

**Impacto: resolve sozinho 80% do problema. Custo de código: quase zero.**

O site já manda o identificador da sessão em dois caminhos. O que não existe é o
**caminho de volta**: quando o CRM empurra o card para `/api/webhook/fykos-crm`, ele
não devolve nenhum dos dois.

O código do site já está pronto para isso. `src/lib/atribuicao-receita.ts` procura o
identificador dentro do JSONB `dados` do card — qualquer campo desconhecido que o
emissor mandar cai lá. **No dia em que o CRM devolver, a ligação passa a funcionar
sozinha, sem deploy.**

**O que fazer:** pedir ao time do CRM que inclua no payload de saída o campo que
recebeu na entrada — `site_session_id` para lead de formulário. É devolver o que já
chega.

**Quem faz:** time do CRM. Nosso lado está pronto.

---

## Etapa 2 — Correlação do WhatsApp por clique

**Status: implementado em 05/08/2026. Vale para leads novos.**

O identificador viajava dentro da mensagem que o cliente envia (`[ref: ...]`) e foi
retirado de lá a pedido, por ser dado interno numa mensagem que não é nossa.

No lugar, o clique no WhatsApp passou a ser gravado com sessão e horário
(`whatsapp_clicks`), e a conversa é correlacionada quando chega. A regra é recusar
quando há mais de um candidato na janela: **atribuição ausente é recuperável, errada
não.**

**O que falta:** ligar a correlação no receptor do webhook. A função existe e tem
testes; falta o ponto de chamada.

---

## Etapa 3 — Mandar a venda de volta para o OpenAI Ads

**Depende da Etapa 1 ou 2.**

Hoje o pixel mede até o lead. Agendamento, proposta e venda acontecem no CRM, e o
navegador não os enxerga — nenhum pixel resolve isso.

O caminho é a **Conversions API**: quando um card muda para `encerrado_ganho`, o
servidor dispara a conversão com o valor da venda. O webhook do CRM já nos avisa da
mudança de etapa, então o gatilho existe.

Só faz sentido depois que o elo 5 estiver de pé — sem saber de qual sessão veio a
venda, não há o que atribuir.

---

## Etapa 4 — Margem

**Bloqueada por dado que não existe em nenhum sistema que tocamos.**

O CRM guarda o preço de venda. Margem exige o **custo de aquisição do veículo**, que
vive no controle financeiro/estoque da Attra.

Três decisões antes de qualquer código:

1. **Qual definição de margem?** Preço de venda menos custo de aquisição? Descontando
   preparação, comissão, custo de capital pelo tempo em pátio?
2. **De onde vem o custo?** Precisa existir por veículo e ser acessível por integração
   ou exportação.
3. **Quem mantém?** Se depender de digitação manual, vai furar.

**Enquanto isso não existir**, o indicador possível é **receita por canal**, não margem.
É menos do que a pergunta pede, mas é honesto — e já muda decisão de mídia.

---

## Ordem recomendada

| # | Ação | Quem | Desbloqueia |
|---|---|---|---|
| 1 | CRM devolver `site_session_id` | Time do CRM | Tudo |
| 2 | Ligar a correlação de clique no receptor | Nós | Leads de WhatsApp |
| 3 | Painel de receita por canal | Nós | Primeira resposta útil |
| 4 | Conversions API na venda | Nós | Otimização do anúncio |
| 5 | Definir e trazer o custo | Attra | Margem de verdade |

O item 1 não é nosso e é o que mais importa. **Enquanto ele não acontecer, os itens 3 e
4 rodam com cobertura parcial** — só os leads de WhatsApp correlacionados.

---

## O que dá para prometer, e quando

**Hoje:** quantos leads cada canal gerou. Já funciona, está em `/admin/visitors`.

**Depois da Etapa 1 ou 2:** quanto de **receita** cada canal gerou. Semanas, não meses —
a maior parte do código existe.

**Depois da Etapa 4:** margem por canal. Depende de a Attra estruturar o custo por
veículo, que é trabalho de gestão, não de site.

Uma ressalva sobre volume: são 8 vendas desde 22/07. Mesmo com atribuição perfeita,
esse número é pequeno demais para conclusão estatística sobre canais. A atribuição
precisa começar a rodar **antes** de haver volume — senão, quando houver, não haverá
histórico.
