# Canal editorial da Attra Veículos — design

**Data:** 2026-07-24
**Status:** aprovado para planejamento

## Problema

A Attra mantém duas URLs editoriais e nenhuma das duas cumpre função.

`/news` é um agregador de terceiros: sete itens, todos de Fórmula 1, todos creditados a LANCE, CNN Brasil, Gazeta de Alagoas e Estadão. Conteúdo de terceiro não ranqueia para o domínio da Attra, não constrói marca e encerra a visita mandando o leitor para outro site.

`/blog` **não está vazio — tem cerca de 90 posts publicados**, com cadência quase diária desde maio de 2026 e histórico que remonta a março de 2025. O problema é outro, e é triplo:

**Órfãos.** A listagem em `/blog` aplica `POSTS_PREVIEW_LIMIT = 6` por tipo, exibindo 12 posts no total, sem paginação e sem página de arquivo. Os outros ~78 estão no `sitemap-blog.xml` e são alcançáveis por URL direta, mas **não têm nenhum caminho de navegação a partir do site**. Página sem link interno recebe pouca autoridade e praticamente nenhuma descoberta por navegação. É o maior desperdício de ativo do projeto: o conteúdo foi produzido, indexado e escondido.

**Degradação editorial ao longo do tempo.** Em dezembro de 2025 há uma safra com tese clara e alinhada ao posicionamento — "o guia definitivo da Attra: como garantir a procedência", "o risco oculto no supercarro dos seus sonhos: por que a procedência é mais importante que a marca", "o mito da baixa quilometragem", "decisão patrimonial ou impulso emocional". A partir de 2026 o padrão vira comparativo automático sem lógica editorial: *BMW 320i vs Audi RS6 Avant*, *Audi Q5 vs RS6 Avant*, *Ford Ranger Raptor vs RS6*, *Ram 3500 vs BMW X2*. O canal já soube fazer o que este design propõe, e desaprendeu ao ser automatizado sem critério.

**Volume sem função.** Publicar quase todo dia sem critério de pauta produz massa que não responde a nenhuma pergunta de busca e não sustenta autoridade.

O `/news`, por sua vez, entrega conteúdo de terceiro. O efeito combinado: um canal invisível e um canal que manda o visitante embora.

## Estado atual da implementação

O repositório do site (`attraveiculoswebsite`, Next.js) já contém um pipeline editorial com IA em operação. **O problema não é ausência de infraestrutura — é infraestrutura sem critério editorial.** Isso reduz substancialmente o escopo de construção e desloca o esforço para conteúdo e regras.

### O que já existe

| Componente | Situação |
|---|---|
| `src/lib/jobs/daily-blog-ai.ts` | Job diário de geração de post, com idempotência por dia |
| `src/lib/blog-ai/gemini-blog.ts` | Geração via Gemini, com persona de "redator sênior da Attra" |
| `src/lib/blog-ai/vehicle-picker.ts` | Seleção de veículos no estoque AutoConf |
| `src/lib/blog-ai/internal-linker.ts` | Inserção automática de links internos |
| `src/lib/blog-ai/comparison-image.ts` | Geração da imagem de comparação |
| `src/lib/blog-ai/instagram-fetcher.ts` | Expande post do @attra.veiculos em matéria |
| `src/lib/jobs/weekly-news-ingestion.ts` | Ingestão semanal do agregador de terceiros |
| `src/lib/news-guardrails.ts` | Classificador Gemini que filtra notícia de terceiro por relevância |
| `src/app/admin/blog`, `src/app/admin/newsletter` | Painéis administrativos |
| `src/lib/blog-schema.ts`, `sitemap-blog.xml` | Schema estruturado e sitemap dedicado |

O job já opera três estratégias: expandir post do Instagram das últimas 24h; gerar *review* de veículo acima de R$ 300 mil; gerar *comparison* entre dois veículos.

### Por que o resultado não aparece

Os comparativos de 2026 explicam o problema. O `pickVehiclesForComparison` pareia veículos por **proximidade de preço**, evitando apenas repetir marca e modelo. Não há nenhuma noção de perfil de uso, de público ou de pergunta a responder. O resultado é tecnicamente correto e editorialmente sem sentido: ninguém que considera um AMG GT está avaliando uma Ranger Raptor, ninguém que avalia um Audi Q5 está cogitando um RS6 Avant.

O sintoma mais visível é a recorrência do RS6 Avant como parte fixa de quatro comparativos distintos em julho — ele é simplesmente o veículo do estoque cujo preço mais frequentemente cai perto de outro.

Isso valida o desenho proposto por um caminho inesperado. O formato *Comparativo por perfil de uso* — "nunca A contra B, sempre para este uso, o que muda" — corrige exatamente o defeito que a implementação atual demonstra na prática.

### Conflito a resolver

O `news-guardrails.ts` atual rejeita explicitamente pautas de "IPVA, multas" e de "relógios, joias, moda". Faz sentido enquanto o `/news` é agregador de terceiros. Mas **colide de frente com a editoria de Custo de posse**, em que IPVA é pauta central. Ao migrar o `/news` para conteúdo autoral, esse classificador precisa ser reescrito ou aposentado — ele foi desenhado para filtrar notícia alheia, não para reger pauta própria.

### Dados institucionais confirmados

A Attra fica em **Uberlândia-MG**, o que torna o custo de posse em Minas Gerais o recorte regional natural do `custos.md` (IPVA de MG, rede de serviço na região, comparação com SP).

O repositório contém `docs/ATTRA_BRAND_POSITIONING_CONTENT_TASK.md`, que converge com este design: prescreve "curadoria antes de catálogo", "relação antes de transação", "procedência antes de pressa", "mais prova de critério" e a instrução explícita de não citar concorrentes. Esse documento deve ser a base do `voz.md` e do `fatos.md`, não um ponto de partida do zero.

Ele também registra uma inconsistência ainda **não resolvida**: o site alterna entre 2008, 2009 e 2010 como ano de fundação, e entre "15+" e "18+" anos de mercado. O briefing adota 2009 como base provisória — o que daria 17 anos em 2026, não os "quase 20" usados neste spec. **Nenhum conteúdo consultivo deve ser publicado antes de esse número ser fixado**, porque o canal inteiro vende confiança e não pode ter data elástica.

## Análise competitiva

Três referências foram examinadas.

**4Boss** opera um portal jornalístico em domínio próprio (4bossnews.com.br), com matéria assinada por jornalista, 2 a 3 publicações por semana e mais de oito páginas de arquivo. Mistura lançamento global, estoque próprio tratado como notícia ("A primeira unidade da Ferrari 849 Testarossa do Brasil desembarca na 4Boss"), lifestyle de luxo e o fundador como personagem público. Mantém ainda um "Journal" em formato de revista digital.

**Avantgarde** separa dois canais. A revista são 21 edições em PDF, trimestrais, de maio/2020 a janeiro/2026 — peça de marca e relacionamento. O blog é o canal de busca: posts autorais sobre modelos, com cadência de 1 a 2 por mês e cerca de dez páginas de arquivo.

**Stuttgart Porsche** publica a revista "Insider", por volta da 95ª edição, centrada em eventos, experiências e comunidade. É o modelo de concessionária oficial: relacionamento, não aquisição.

*Limitação de método:* `4boss.com.br/news` e a Insider não puderam ser lidos diretamente por restrição de domínio e resposta 403. O 4Boss foi analisado pelo portal 4bossnews.com.br; a Insider baseia-se em busca web e tem menos profundidade que as demais.

### A lacuna

Os três ocupam o mesmo território — desejo. Ferrari nova, showroom, evento, jantar de grife. Em toda a amostra, o único conteúdo voltado a decisão de compra foi "3 Motivos para escolher um blindado em 2025", da Avantgarde.

Ninguém responde às perguntas de quem está prestes a gastar sete dígitos: quanto custa manter o carro por ano no Brasil, como funciona blindagem em superesportivo, 0km importado contra seminovo premium, o que a garantia cobre, quanto o segmento desvaloriza. Volume de busca real, intenção altíssima, território vazio.

## Objetivo

Aquisição por busca somada a autoridade de marca. Duas camadas: uma que ranqueia e traz público novo, outra que converte esse público em lead qualificado.

## Posicionamento

**O conselho de quem tem o carro, não de quem quer vender o carro.**

A Attra é empresa familiar com quase 20 anos de mercado, três irmãos sócios. O critério de curadoria declarado — cada veículo em estoque poderia ser o carro pessoal de qualquer um dos três — é a origem da autoridade editorial.

Três pilares sustentam a voz:

**Critério antes de desejo.** Toda peça responde a uma pergunta real de decisão. Isso não elimina a matéria sobre o lançamento; muda o ângulo dela, de "conheça o modelo novo" para "o que esse lançamento significa para quem já tem um carro do segmento".

**Conhecimento com sobrenome.** Quase 20 anos e uma estrutura familiar por trás do critério. Resolve também o problema estrutural de conteúdo assistido por IA: voz genérica soa como IA porque não tem ninguém atrás dela.

**Honestidade que custa.** Dizer o que é caro de manter, o que desvaloriza rápido, quando o seminovo é melhor negócio que o 0km. Em ticket de sete dígitos, a confiança fecha a venda, e ela se constrói exatamente onde o conteúdo abre mão de uma.

### Filtro editorial

Aplicado a toda peça antes da publicação:

> Eu recomendaria isso, nesses termos, para o meu irmão?

Se a resposta for não, o texto muda. O filtro é regra dura na fonte de verdade e item da checagem humana.

### Decisões de voz

**Autoria institucional.** As peças assinam como Attra, não nominalmente pelos sócios. A história familiar aparece no tom e numa página institucional.

**Crítica sem citar modelo.** Custos e armadilhas são tratados por categoria e perfil de uso. Nunca "o modelo X é ruim" — sempre "para este uso, esta categoria não se encaixa". O problema é sempre o encaixe, nunca o carro.

### Compensações

As duas decisões acima abrem mão das alavancas mais óbvias contra texto genérico. São substituídas por três, mais fortes para busca:

**Número brasileiro real.** Revisão dos 20 mil km, IPVA por estado, seguro por perfil, pneu, desvalorização do segmento em reais nos últimos 24 meses. Nenhum concorrente publica; é literalmente o que se digita no Google. Dado verificável substitui opinião pessoal.

**Critério publicado.** Página fixa com o que precisa ser verdade para um carro entrar na Attra: procedência, histórico, quilometragem, o que reprova uma unidade. Dá dono ao critério sem exigir assinatura, e vira o alvo de link interno mais recorrente do site.

**Caso real anonimizado.** O que o cliente queria, o que não havia considerado, o que mudou na decisão. Quase duas décadas de repertório viram conteúdo sem expor cliente nem atacar marca — é a forma de dizer "isso não serve para você" sem jamais dizer que o carro é ruim.

## Arquitetura

Dois canais com funções distintas e ligação mútua.

### `/blog` — captura por busca

Conteúdo perene, sem data sensível, textos longos.

| Editoria | Escopo |
|---|---|
| Custo de posse | Manutenção, seguro, IPVA, pneu, desvalorização por categoria |
| Decisão de compra | 0km importado contra seminovo premium, blindar ou não, garantia e cobertura |
| Comprar bem | De quem comprar e como não errar nisso |
| Entender o carro | Comparativos por perfil de uso, o que separa categorias, vocabulário técnico |

**"Comprar bem" é a editoria mais estratégica do projeto.** O eixo não é qual carro comprar, mas de quem — sem citar ninguém, porque descrever o padrão correto já expõe quem não o cumpre. Pautas: o checklist completo a exigir de qualquer loja; como verificar procedência de superesportivo no Brasil; o que "revisado" costuma significar e o que deveria; por que a unidade mais barata costuma ser a mais cara; consignação contra compra direta; garantia de multimarca; o que acontece depois que o cliente sai da loja.

É fundo de funil puro — quem busca esses termos está a semanas de comprar. É território que os concorrentes não ocupam sem se autoincriminar: loja que é vitrine não publica o checklist que ela mesma não cumpre. E a comparação é feita pelo leitor, o que convence mais que acusação.

**Restrição operacional:** cada item desse checklist precisa ser verdade na operação. O conteúdo é promessa pública. É a única parte do projeto em que o texto obriga a operação, e cada item exige validação com os sócios antes de publicar.

### `/news` — desejo com critério, e velocidade

Datado, curto, alimenta marca e redes.

| Editoria | Escopo |
|---|---|
| Chegadas com critério | Que unidade entrou, o que a torna incomum, por que passou no filtro |
| Mercado e lançamentos | O fato do setor, lido pelo ângulo de quem já tem um carro do segmento |
| F1 na Attra | O encontro na loja, a temporada de kart, tecnologia que desce da pista |

**F1 na Attra** não cobre corrida — cobrindo corrida a Attra compete com LANCE e Globo em velocidade e perde. O objeto é o encontro: um dos sócios, Thiago, acompanha F1, o filho compete no kart, e clientes se reúnem na loja nos sábados de treino. Formatos: "Sábado de treino", recorrente e visual durante a temporada; "A temporada do kart", narrativa contínua ao longo do ano; "Da pista para a rua", o único recorte que toca produto.

Isso cobre o eixo de relacionamento e comunidade — o modelo da revista da Stuttgart — com a diferença de que na Attra o fato já existe e só não está registrado. E funciona sob a restrição de voz institucional, porque um encontro na loja é a empresa, não uma pessoa.

**Ressalva:** a cobertura do kart envolve um menor de idade. O que pode aparecer — nome, rosto, resultado — deve ser acertado com o Thiago e registrado como regra na fonte de verdade, não decidido caso a caso.

### Costura entre os canais

Toda peça de `/blog` aponta para o estoque compatível com o perfil que descreve. Toda peça de `/news` aponta para o guia de `/blog` correspondente — a chegada de um 911 remete ao guia de custo de posse de esportivo alemão. O `/blog` traz o desconhecido pelo Google e o entrega ao `/news` e ao estoque; o `/news` toma quem já conhece a marca e o devolve ao `/blog` para amadurecer a decisão. Nenhum dos dois é fim de linha.

### Migração

As sete notícias de terceiro saem. Não há valor a preservar: conteúdo creditado a LANCE e CNN não ranqueia para a Attra. A URL `/news` permanece; o conteúdo é substituído.

## Formatos de pauta

Cada formato é um template de estrutura fixa. Estrutura fixa é o que mantém a voz constante entre peças e impede o texto de virar divagação.

**Guia de custo de posse** (`/blog`) — categoria, custo anual destrinchado em reais (revisão, seguro, IPVA, pneu, imprevisto), desvalorização observada, para quem esse custo faz sentido, estoque compatível. *Todo número tem fonte e data; sem número verificável, o trecho não entra.*

**Comparativo por perfil de uso** (`/blog`) — nunca "A contra B", sempre "para este uso, o que muda entre as opções". Perfil, o que importa nele, comportamento de cada categoria, recomendação condicional. *Permite dizer "não serve para você" sem dizer "é ruim".*

**Checklist de compra** (`/blog`) — a pergunta a fazer, por que importa, como verificar na prática, o que uma resposta ruim indica, qual o padrão da Attra naquele item.

**Caso real anonimizado** (`/blog`) — o que o cliente queria, o que não havia considerado, o que mudou na decisão, o resultado. *Sem dado identificável e sem depreciar o carro originalmente desejado.*

**Chegada com critério** (`/news`, gerado do feed) — a unidade, o que a torna incomum no mercado brasileiro, o que a inspeção verificou, para quem faz sentido, link para o guia de custo do segmento. *Toda especificação vem do feed; campo sem dado é campo omitido, nunca inferido.*

**Leitura de mercado** (`/news`) — o fato, o que muda de verdade, o efeito para quem já tem um carro do segmento, o ângulo Attra.

**Sábado de treino / kart** (`/news`) — curto, visual, recorrente.

**Ordem de implantação:** começar por *Chegada com critério* (automatizada pelo feed, produz volume sozinha), *Checklist de compra* (diferencial competitivo e melhor fundo de funil) e *Guia de custo de posse* (o que ranqueia). Os quatro restantes entram com o pipeline já estável.

## Fonte de verdade

Arquivos de texto versionados no repositório, carregados em toda geração, revisáveis por qualquer pessoa e com histórico de mudança. É o que separa conteúdo que soa como a Attra de conteúdo que soa genérico — a diferença não está no modelo nem no prompt.

| Arquivo | Conteúdo |
|---|---|
| `voz.md` | Posicionamento, os três pilares, o filtro do irmão, o que a Attra nunca diz. Calibra sobretudo por pares de exemplo — esta frase sim, esta não, e por quê. |
| `regras.md` | Os guard-rails, em forma de proibição |
| `fatos.md` | Institucional: tempo exato de mercado, estrutura familiar, critério de curadoria, processo de inspeção, cobertura da garantia |
| `custos.md` | Base de custo brasileiro: revisão por faixa, seguro por perfil, IPVA por estado, pneu, desvalorização. Cada linha datada e com origem. |
| `glossario.md` | Vocabulário e como a Attra o usa — "seminovo premium" não é "usado" |
| `formatos/` | Os sete templates |
| `publicados.json` | Índice do que já saiu: evita repetir pauta, evita canibalizar palavra-chave, permite sugestão de link interno |

### Guard-rails

- Nenhum número sem fonte e data
- Nenhuma crítica a marca ou modelo; crítica é sempre de encaixe com perfil de uso
- Nenhuma menção a concorrente
- Especificação de veículo vem exclusivamente do feed; campo sem dado é omitido, nunca preenchido por inferência
- Nenhum dado identificável de cliente
- Regras acertadas com o Thiago sobre o kart e o menor de idade
- Nenhum superlativo não sustentado — "o melhor", "incomparável", "sem igual". É o vocabulário padrão dos concorrentes e o que mais rápido denuncia texto vazio.

### O ponto de tensão

A regra "sem número verificável, o trecho não entra" só é sustentável se houver de onde tirar número — daí o `custos.md`. Sem essa base, ou a IA inventa valor, ou o texto fica vago, e vago não ranqueia nem convence quem vai gastar sete dígitos. Levantar esse dado é o trabalho mais chato do projeto e o que decide se ele tem diferencial. Uma vez montado, é o ativo que nenhum concorrente alcança sem refazer o mesmo trabalho.

### Divisão das fontes

Os arquivos são a verdade estática — voz, regras, custos, institucional. O feed de estoque é a verdade dinâmica. A IA nunca inventa nenhuma das duas; combina.

Fora do alcance da IA: qualquer afirmação sobre o que a Attra faz na operação — cobertura da inspeção, cobertura da garantia, prazo de entrega. Sai do `fatos.md` validado pelos sócios, e o modelo apenas reproduz, jamais deriva.

### Revisão humana

Cinco checagens por peça, não releitura integral:

1. Todo número tem fonte no `custos.md`?
2. Alguma marca ou modelo foi criticado nominalmente?
3. As especificações batem com o feed?
4. Passa no filtro do irmão?
5. Há promessa operacional que a Attra não cumpre hoje?

Dois minutos por peça. Sem a lista, o revisor relê tudo, cansa na terceira semana e passa a aprovar sem ler — que é como projetos assim costumam morrer.

## Produção

### Contexto técnico

Site em Next.js/React, no repositório `attraveiculoswebsite`. Estoque proveniente da AutoConf, já consumido em código pelo `vehicle-picker.ts` — é o que torna "estoque como pauta" automatizável, e é o ativo que nenhum dos três concorrentes converteu em sistema.

Como o pipeline de geração, o job diário, o linkador interno e os painéis de administração já existem, **o trabalho é de reorientação, não de construção.** O que falta é a camada que decide o que merece virar pauta e sob quais regras — precisamente a fonte de verdade descrita acima.

### Três gatilhos

**Automático — entrada de estoque.** Job periódico lê o feed, compara com o snapshot anterior, detecta unidade nova. Aplica critério de noticiabilidade objetivo: raridade do modelo no histórico do próprio feed, quilometragem, ano, configuração incomum, faixa de preço. Acima do limiar, gera o draft de *Chegada com critério* e envia à fila de revisão.

Isso substitui o critério atual do `vehicle-picker.ts`, que hoje seleciona por preço acima de R$ 300 mil e pareia por proximidade de valor. A seleção passa de "qual carro é caro" para "qual entrada é notícia".

O limiar é essencial. Nem todo carro que entra vira matéria — se todo carro virar, o `/news` vira catálogo duplicado, perde a palavra "critério" e o leitor aprende a ignorar. Publicar menos é o que faz publicar significar algo.

**Planejado — calendário do `/blog`.** Backlog priorizado por volume de busca cruzado com intenção. Fundo de funil primeiro; pautas de topo entram quando o domínio tiver autoridade para disputá-las.

**Manual — o que acontece na loja.** Sábado de treino, kart, uma pergunta boa de cliente. O desenho aqui importa: se depender de alguém da loja escrever, não acontece; se depender de mandar foto e três linhas num grupo de WhatsApp, acontece toda semana. O pipeline converte as três linhas em peça.

### Faseamento

**Fase -1 — Destravar o que já existe (dias).** Independe de tudo o mais e tem o melhor retorno por esforço do projeto:

1. Substituir o `POSTS_PREVIEW_LIMIT` por listagem paginada com página de arquivo, tornando os ~78 posts órfãos navegáveis.
2. Rodar o `internal-linker.ts` sobre o acervo, para que os posts se referenciem e distribuam autoridade.
3. Verificar o carregamento das imagens de capa na listagem — nos testes de navegação os cards apareceram sem imagem, o que precisa ser confirmado antes de tratado.
4. Recuperar a safra de dezembro de 2025 (procedência, curadoria, o mito da baixa quilometragem, decisão patrimonial). É o eixo "Comprar bem" já escrito, e deve ser promovido a conteúdo âncora em vez de reescrito do zero.

**Fase 0 — Fundação (2 a 3 semanas).** Montar a fonte de verdade a partir do `ATTRA_BRAND_POSITIONING_CONTENT_TASK.md`, fixar o ano de fundação e validar `fatos.md` com os sócios, levantar a primeira versão do `custos.md` com recorte de Minas Gerais, escrever os três templates prioritários, definir o critério de noticiabilidade.

**Decisão tomada: o job diário segue rodando durante esta fase.** A contrapartida é que o acervo cresce cerca de 20 peças ao longo da Fase 0 sob o critério antigo, todas entrando na fila de triagem descrita adiante. Se o prazo escorregar, a fila cresce na mesma proporção — vale reavaliar a decisão caso a Fase 0 passe de três semanas.

**Fase 1 — Seis a oito peças à mão (2 semanas).** Rodar o pipeline manualmente, sem automação. O objetivo não é publicar, é descobrir onde a voz sai errada e onde as regras têm buraco, e corrigir os arquivos.

**Fase 2 — Reorientação do pipeline (2 a 3 semanas).** Ligar a fonte de verdade ao `gemini-blog.ts`; substituir a lógica de seleção do `vehicle-picker.ts` pelo critério de noticiabilidade; reescrever ou aposentar o `news-guardrails.ts`; migrar o `weekly-news-ingestion.ts` de agregação para pauta própria; implantar a fila de revisão com as cinco checagens.

**Fase 3 — Operação.** Cadência regular, os quatro formatos restantes, medição.

**Triagem do acervo.** Os ~90 posts existentes precisam ser classificados em três destinos:

- **Promover** — a safra de procedência e curadoria de dezembro de 2025, que já corresponde ao eixo "Comprar bem". Vira conteúdo âncora, ganha link interno prioritário e é atualizada com números do `custos.md`.
- **Reescrever** — reviews de veículo com dado aproveitável, remodelados sob os novos formatos.
- **Despublicar com redirecionamento** — os comparativos por proximidade de preço, que não respondem a nenhuma pergunta real e contradizem o critério que o canal passará a defender publicamente.

Manter conteúdo que contradiz o critério recém-publicado é o pior dos desfechos: o `/blog` passaria a afirmar que a Attra compara carros por perfil de uso enquanto exibe quatro comparativos montados por faixa de preço.

A ordem não é negociável: calibrar antes de automatizar. Automação sobre contexto não calibrado multiplica o erro e cria dívida editorial que depois precisa ser despublicada.

### Cadência

Depois da Fase 2: 4 a 6 peças mensais no `/blog`; no `/news`, 2 a 4 chegadas somadas a mercado e aos sábados de temporada. Total entre 10 e 16 por mês — acima da Avantgarde, na faixa do 4Boss.

Nos três primeiros meses o peso vai no `/blog`: é ele que ranqueia, e o `/news` sozinho não traz público de fora.

## Métricas

**`/blog`, aquisição:** sessões orgânicas no conteúdo, posição nas palavras de fundo de funil, taxa de clique de conteúdo para estoque.

**`/news`, autoridade:** retorno de visitante, passagem por `/news` antes do contato.

**A métrica que decide o projeto:** quantos leads tocaram algum conteúdo antes de virar atendimento. É a única que liga o canal a receita, e exige marcação no formulário e no fluxo de atendimento desde a primeira publicação. Deixar para depois significa, em seis meses, não conseguir dizer se funcionou — e a discussão vira opinião.

**Antimétrica:** número de posts publicados. No momento em que a meta vira volume, o filtro do irmão morre e o canal vira moinho — exatamente o que a Attra tenta não ser.

**Horizonte:** conteúdo de fundo de funil em domínio sem histórico editorial leva de 4 a 6 meses para mostrar resultado de busca. Combinar isso com os sócios agora evita o cancelamento no mês 3, uma semana antes de o projeto começar a funcionar.

## Pendências para a fase de planejamento

- **Ano de fundação.** O site alterna entre 2008, 2009 e 2010, e entre "15+" e "18+" anos. Este spec usa "quase 20 anos" conforme o briefing verbal; 2009 daria 17. Bloqueia a publicação de qualquer peça consultiva.
- Nomes dos três sócios e definição do que entra em `fatos.md`
- Regras de exposição do menor de idade na cobertura de kart, acertadas com o Thiago
- Validação item a item do checklist de "Comprar bem" contra a operação real
- Definição do limiar de noticiabilidade que substitui o `REVIEW_MIN_PRICE`
- Destino do acervo já gerado: reescrever ou despublicar
- Decisão sobre o `news-guardrails.ts`: reescrever para pauta própria ou aposentar
- Ferramenta de marcação de origem de lead no fluxo de atendimento
- Onde a fonte de verdade vive no repositório `attraveiculoswebsite`, e se este spec migra para lá
