# Pendências de validação — equipe Attra

Nenhum dos itens abaixo pode ir ao ar sem confirmação. São informações comerciais que não são verificáveis a partir do site público, e o briefing é explícito: nada de atributo comercial inventado, nada de alegação absoluta.

Enquanto não houver resposta, a orientação é **não publicar** o campo ou o bloco correspondente — omitir é sempre melhor que declarar errado, tanto para o Google quanto para um LLM que vai repetir a informação.

---

## Bloco 1 — Dados da entidade (bloqueiam o item B4)

Estes campos entram no JSON-LD `AutoDealer` e no `llms.txt`, e são o que faz o Google e os modelos reconhecerem a Attra como um negócio local real.

1. **Endereço completo** — hoje o site declara apenas "Av. Rondon Pacheco". Falta número, complemento, bairro e CEP.
2. **Coordenadas** (latitude e longitude) do endereço de atendimento.
3. **Horário de funcionamento** por dia da semana, incluindo sábado e feriados.
4. **Perfis oficiais** além do Instagram: existe Google Business Profile reivindicado? YouTube, Facebook, LinkedIn, TikTok? Só entram no `sameAs` perfis oficiais confirmados.
5. **WhatsApp e e-mail** — o `llms.txt` declara (34) 99944-4747 e faleconosco@attraveiculos.com.br, mas o JSON-LD não. Confirmar que ambos estão corretos e ativos para virarem dado estruturado.
6. **Faixa de preço** (`priceRange`) que a Attra quer declarar publicamente.
7. **Razão social e CNPJ** — se a Attra quiser declará-los, reforçam a identificação da entidade.
8. **Ano de fundação** — a landing page indexada em `/lp-importacao/` menciona "Importação Exclusiva desde 2008". Confirmar se 2008 é o ano correto de início da operação, para uso em `foundingDate`.

## Bloco 2 — Serviços realmente oferecidos (bloqueiam B5, B6 e todo o conteúdo de confiança)

Para cada item: **oferece ou não?** Se sim, com qual escopo exato, e há documento ou página que comprove?

9. **Inspeção de 150 pontos** — a página `/veiculos` menciona um processo de inspeção de 150 pontos, e a ficha de veículo afirma "passou pela inspeção rigorosa da Attra". Qual é o escopo real, quem executa, e o cliente recebe laudo por escrito?
10. **"Garantia de procedência"** — a ficha exibe esse selo. O que exatamente ele cobre, por quanto tempo, e sob quais condições? É garantia contratual ou declaração de origem?
11. **"Documentação em dia"** — quais verificações são efetivamente feitas (débitos, restrições, sinistro, leilão, chassi, histórico de recall)?
12. **Financiamento** — existe `/financiamento`. Confirmar quais instituições, se há simulação real e quais condições podem ser publicadas.
13. **Troca** — existe `/compramos-seu-carro`. Confirmar o processo e se há avaliação presencial obrigatória.
14. **Consignação** — existe `/servicos/consignado`. Confirmar condições publicáveis.
15. **Entrega em todo o Brasil** — existe `/como-funciona-entrega-brasil`. Confirmar cobertura real, prazo, custo e quem executa o transporte. **Sem isso não é possível declarar `shippingDetails` no schema.**
16. **Política de devolução ou arrependimento** — existe alguma? Sem confirmação, `hasMerchantReturnPolicy` não entra no JSON-LD.
17. **Importação** — `/servicos/importacao` e `/importacao-de-veiculos-de-luxo` coexistem. A Attra importa sob encomenda? Qual o processo, prazo e o que pode ser afirmado publicamente?

## Bloco 3 — Operação de estoque (bloqueia B6 e o modelo de 3 estados)

18. **O que acontece hoje com um veículo vendido?** A URL sai do ar, permanece com o status alterado, ou permanece sem alteração nenhuma? Na amostra de 15 fichas verificadas, todas declaravam disponibilidade — nenhuma marcada como vendida.
19. **Existe status "reservado"** no sistema de estoque?
20. **Existe histórico de veículos já comercializados** consultável por modelo? Isso define quais das 8 páginas de modelo sem estoque podem continuar indexáveis (estado 2 da máquina de estados) e quais vão para `noindex`.
21. **Política de preço** — todos os veículos têm preço público, ou alguns são "sob consulta"? O `Offer` só pode declarar `price` quando o preço é realmente público.
22. **Por que 20 dos 70 veículos não aparecem no feed `/api/llm/vehicles`?** Confirmar se é limite técnico de 50 ou se esses 20 estão em algum estado especial (vendidos, reservados, em preparação).

## Bloco 4 — Decisões de conteúdo (bloqueiam B1, B2, C1, C2)

23. **As 8 páginas de modelo sem estoque** — Ferrari Roma, BMW X5, Audi R8, McLaren Artura, Mercedes C63 AMG, Audi Q7, Range Rover Sport. São modelos que a Attra trabalha recorrentemente e ficaram sem estoque agora, ou nunca teve? A resposta define manter ou despublicar.
24. **Marcas do estoque sem página de categoria** — Lamborghini, RAM, Cadillac, GMC, Ford, Volvo, Nissan, Tesla. Quais fazem parte do posicionamento e merecem página própria?
25. **Blog programático** — 92 posts no padrão `modelo-A-vs-modelo-B-comparativo-{hash}`. Quem produz, com qual processo de revisão editorial, e a geração continua ativa? Recomendo congelar novas gerações até essa conversa acontecer.
26. **`/manual-attra` (99 páginas) e `/glossario-automotivo`** — há sobreposição de conteúdo entre os dois? Qual é o canônico?
27. **`/news` e `/videos`** — são canais ativos com atualização regular ou legado?
28. **Conteúdo em inglês** — 4 dos 10 prompts sem menção são em inglês. A Attra atende cliente estrangeiro ou brasileiro que pesquisa em inglês? Se sim, vale a versão `/en` de 4 a 6 páginas-chave.

## Bloco 5 — Acessos necessários para fechar a auditoria

29. **Google Search Console** — sem ele não dá para saber quais das páginas thin já recebem impressões e cliques. Nenhuma decisão de `noindex` ou remoção deveria ser tomada antes disso.
30. **Google Analytics / GTM** — para medir o efeito das correções sobre tráfego orgânico e conversão.
31. **Repositório do site** — para aplicar as correções do documento 03 diretamente, em vez de repassar como especificação.
32. **Acesso ao Google Business Profile** — para conferir a consistência de NAP entre site, JSON-LD e ficha do Google.

---

## Alegações que precisam sair ou ser comprovadas

Encontradas no site durante a auditoria, sinalizadas porque o briefing veda alegações absolutas ou não comprováveis:

- **"referência nacional em veículos premium e superesportivos"** — está no `llms.txt`, na primeira seção. É alegação absoluta. Remover ou substituir por fato verificável (por exemplo, número de veículos comercializados ou tempo de operação, se houver como comprovar).
- **"procedência verificada"** e **"garantia de procedência"** — aceitáveis se a Attra puder descrever exatamente o que é verificado e o que é garantido. Hoje aparecem como selo sem escopo publicado.
- **"inspeção rigorosa"** — substituir por descrição objetiva do processo (os tais 150 pontos, se confirmados).
