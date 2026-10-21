# Sugestões do Gemini — validação

Cinco sugestões de "ajustes técnicos no site" trazidas em 21/10/2026, conferidas contra
produção e o código no mesmo dia. Veredito de cada uma: **já existe**, **procede** ou
**procede o diagnóstico, não a receita**.

| # | Sugestão | Veredito | O que muda |
|---|---|---|---|
| 1 | Dados estruturados AutoDealer, Vehicle e Offer | já existe | nada |
| 2 | Página e menções de "entrega nacional" | já existe | erro de digitação corrigido |
| 3 | Descrições longas e "semânticas" por carro | procede o diagnóstico, não a receita | depende da Attra no AutoConf |
| 4 | Hub de conteúdo com guias | procede em parte | depende de conteúdo da Attra |
| 5 | Velocidade e imagens em WebP | WebP já existe; os gargalos eram outros | 4 ajustes neste PR, HTTP/2 no servidor, 2 investigações |

## 1. Dados estruturados

Já existe, em produção desde o PR #46:
- **Em toda página:** `AutoDealer`, com endereço, geo, horário, telefone e `areaServed: Brasil`, e `WebSite`.
- **Em cada ficha:** `Vehicle` com `Offer` (preço em BRL, `InStock`, condição), `BreadcrumbList`, `FAQPage` e `ItemPage`.
- **Na listagem:** `ItemList`.

A auditoria semanal (`scripts/auditar-catalogo-publico.mjs`) já confere o `Offer` das 68 fichas.

Os robôs não "adivinham pela imagem": a ficha tem marca, modelo, preço e quilometragem em
texto e no JSON-LD.

**Observação, sem mudança:** cada ficha também emite um `Product` (`#product`) com a mesma
oferta do `Vehicle` (`#vehicle`). Como o Google trata `Vehicle` como produto, a página
declara dois. Vale ver no Search Console, em "Snippets de produto", se aparecem em dobro
antes de mexer.

## 2. Entrega nacional

Já existe, e de forma explícita:
- **Home:** "Selecionados em Uberlândia, entregues em todo o Brasil", "entrega em 27 estados", "transporte fechado e seguro" e o exemplo da entrega em Manaus.
- **FAQ:** a da home e a de cada ficha ("pode ser entregue em qualquer cidade do Brasil com transporte em caminhão fechado").
- **Demais lugares:** `/sobre`, o rodapé e a meta description da home.
- **JSON-LD:** `areaServed: Brasil` no `AutoDealer` e em cada `Offer`.

**Corrigido:** o passo 3 da jornada na home dizia "Logística National".

**Página dedicada:** não recomendada agora, porque a `/jornada` já cobre o percurso até a
entrega. Se assistentes ainda limitam a Attra a Minas Gerais, a causa provável está fora do
site: o Perfil da Empresa no Google e as menções em sites de terceiros. Isso não dá para
verificar daqui.

## 3. Descrições de estoque

**O diagnóstico procede.** A descrição de todas as 68 fichas sai do mesmo molde, por exemplo:

> BMW X4 2024 com apenas 40.570 km rodados. Motor Gasolina, câmbio Automático.
> Documentação em dia, pronto para entrega.

**A receita, não.** Ela pede parágrafos sobre pacotes de opcionais como "Sport Chrono",
"laudo cautelar aprovado" e "procedência" para cada carro. Sem o documento do carro, isso é
publicar especificação não verificada. Foi exatamente o erro corrigido em 20/10: a FAQ dava
ao 911 Carrera GTS Cabriolet 2026 os 385 cv do Carrera da geração anterior, e o mesmo
acontecia em 20 das 68 fichas. Texto gerado por IA para preencher lacuna factual vira
resposta errada citada pelos assistentes.

"Densidade de palavra-chave" também não é critério atual de busca nem de assistente. O que
eles citam é fato específico e verificável.

**O caminho é o campo "Descrição Customizada para o Site" do AutoConf**, preenchido pela
Attra com o que o carro tem de fato (`docs/attra-autoconf-field-audit.md`). A Fase B no Aston
Martin 899967 confirmou que o texto chega pela API que o site lê. Mostrá-lo na ficha é o
passo 3 daquela proposta, atrás de uma flag. Falta a Attra responder se esse texto também
vai para os portais.

## 4. Conteúdo de autoridade

O blog tem volume: 156 posts no sitemap, 61 deles comparativos. Três ressalvas:
- **Comparativos:** saem dos pares de carros em estoque, e por isso vários não correspondem a uma dúvida real de compra (RAM 3500 × SL 63, AMG GT 63 S × Ranger Raptor). O exemplo do Gemini, X5 × GLE, não existe.
- **Guias:** os poucos que existem tratam do mesmo tema, procedência e "proteger o patrimônio", em pelo menos 5 posts de título quase igual.
- **O que falta:** guias por modelo com o processo real da Attra. Por exemplo, o que a inspeção de 200+ itens confere num AMG seminovo, ou o que muda entre gerações do Cayenne.

Esse conteúdo precisa vir da Attra: do checklist de inspeção e da experiência de quem vende.
Não pode ser preenchido por IA.

## 5. Velocidade

**WebP já está em uso:** toda foto de carro passa pelo `next/image` e sai como `image/webp`.

Os gargalos reais foram medidos com Lighthouse 13.5 (celular, simulado) em 21/10.

**Antes, em produção:**

| Página | Nota | LCP (simulado) | Peso |
|---|---|---|---|
| Ficha do BMW X4 | 65 | 12,1 s | 3,66 MB |
| `/veiculos` | 78 | 4,5 s | 1,9 MB |
| Home | 55 | 27 s (primeira pintura em 3,1 s mesmo sem limitar a rede) | 4,0 MB |

**Corrigido neste PR:**
- **A ficha baixava 3 JPEGs originais que ninguém via** (1,7 MB, 47% do peso). A galeria pré-carregava o original da foto atual e das vizinhas para a tela cheia, mas as três já estavam na página em WebP. Agora o original só é pré-carregado com a tela cheia aberta.
- **A primeira foto da ficha nascia invisível.** Ela ficava em `opacity-0` no HTML e só aparecia depois de o React hidratar, o que prendia o LCP ao JavaScript. Agora ela vem visível e com `fetchpriority="high"`, e o skeleton continua por baixo até ela pintar.
- **A foto do primeiro card de `/veiculos` era a última a ser pedida.** Ela é o LCP da página e estava com `loading="lazy"`. Agora carrega cedo e com prioridade alta.
- **O logo preto (77 KB) tinha prioridade alta em toda página**, embora só apareça depois de rolar no tema claro. Agora carrega sem prioridade.

**Depois, no build local** com os dados de reserva do repositório: a ficha caiu para 1,29 MB, sem
nenhum JPEG original. A primeira foto e a do primeiro card saem no HTML visíveis e com
prioridade alta. O LCP real medido no build local foi de 0,9 s na ficha e 0,5 s na listagem,
sem latência de rede. O tempo simulado do Lighthouse em localhost não serve de comparação com
produção. **Medir de novo em produção depois do deploy.**

**Fora deste PR:**
- **HTTP/2: ligado em 21/10** no nginx da VPS (`listen 443 ssl http2`, no site e no concierge, com backup em `/root/nginx-antes-http2-20261021205650`). Antes o servidor só falava HTTP/1.1, com cerca de 40 scripts e 20 fotos por ficha passando por uma conexão que baixa poucos arquivos de cada vez. Medido no mesmo momento, com o Chrome forçado em HTTP/1.1 e depois em HTTP/2, na melhor de 2 rodadas por página:

  | Página | Primeira pintura, HTTP/1.1 → HTTP/2 | LCP real, HTTP/1.1 → HTTP/2 |
  |---|---|---|
  | Home | 1,6 → 1,2 s | 1,7 → 1,2 s |
  | Ficha do BMW X4 | 1,5 → 1,2 s | 2,7 → 1,8 s |
  | `/veiculos` | 1,4 → 1,6 s | 1,6 → 1,9 s (dentro da variação) |
- **Ficha renderizada a cada acesso:** ela responde com `Cache-Control: no-store`, e o primeiro byte chega em 0,85 a 1,1 s. As páginas em cache, como home, `/blog` e `/sobre`, respondem em cerca de 0,5 s. Falta achar o que torna a rota dinâmica.
- **Primeira pintura travada em ~2,7 s, de vez em quando, em qualquer página:** era o "3 s da home". Acontece em 1 de cada 2 ou 3 rodadas, nos dois protocolos. O trace mostra o HTML, o CSS e os scripts prontos por volta de 1,4 s, a thread principal quase parada (cerca de 100 ms de tarefas longas) e nenhum quadro novo pedido entre ~1,6 e ~2,6 s. Ainda não sei se é coisa do Chrome headless ou da página. Para separar, falta dado de campo: o relatório do Chrome (CrUX) no Search Console, ou medir os web vitals no próprio site.
- **Scripts de terceiros:** GTM, Google Ads, Meta e Clarity somam cerca de 570 KB por página. É uma decisão de marketing.
