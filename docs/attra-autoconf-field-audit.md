# Auditoria AutoConf → Attra (handoff "enriquecimento AutoConf", 20/10/2026)

Fase A do handoff (reconhecimento, só leitura). Nada foi escrito na AutoConf e nada foi
publicado. Classificação de cada item: **confirmado**, **não encontrado**,
**sem permissão** ou **não testado**.

- **Data:** 20/10/2026; payload real em 21/10/2026. Branch local
  `investigacao/autoconf-enriquecimento`, a partir de `363fa68` (master com o PR #46 no ar).
- **Ambientes:** código do repositório; site em produção (HTML público e `/api/llm/vehicles`);
  coleção pública "Autoconf – Site API" no Postman (exemplos de **outra revenda**); e o
  `POST /veiculo` autenticado da Attra, consultado na VPS pelo diagnóstico
  (`scripts/diagnostico/autoconf-campos-do-veiculo.mjs`) para o 1148612 e os 68 carros do
  estoque. Os valores das credenciais não foram lidos nem impressos.

## Integração em uso

| Pergunta | Resposta | Status |
|---|---|---|
| Tipo de integração | REST, `POST https://api.autoconf.com.br/api/v1/...`, corpo `x-www-form-urlencoded` | confirmado (código) |
| Onde | `src/lib/autoconf-api.ts`: `fetchAutoConfVehicles` (`/veiculos`), `fetchAutoConfVehicleById` (`/veiculo`), `fetchAdsHome` (`/ads-home`) | confirmado |
| Autenticação | header `Authorization` com `AUTOCONF_BEARER_TOKEN` + campo `token` com `AUTOCONF_DEALER_TOKEN` (nomes; valores não lidos) | confirmado |
| Frequência | não há job de sincronização: cada página consulta na renderização, com cache do `fetch` de 5 min (`revalidate: 300`) | confirmado |
| Fallback | último retorno bom gravado em `inventory_snapshots` (fontes `autoconf:veiculos:list`, `autoconf:veiculos:byId`, `autoconf:ads-home`; 5 linhas por fonte) | confirmado |
| ID do veículo 1148612 | o número no fim do slug é o `id` da AutoConf; a ficha chama `POST /veiculo` com `id=1148612` (`getVehicleBySlug`) e lê `data.veiculo` | confirmado |
| Status/venda | `status` é fixo em `'available'` no mapeamento; carro vendido some do feed e a ficha dá 404. `status_id` existe no payload (9 no Temerário) e não é usado | confirmado |

## Gate A: payload real da Attra (21/10/2026, antes da edição de teste)

| Pergunta do handoff | Resposta | Status |
|---|---|---|
| 4. Caminho da descrição | `POST /api/v1/veiculo` → `veiculo.descricao` (string). Vem também `veiculo.descricao_anuncio`, com o mesmo começo. A lista `/veiculos` não traz nenhuma das duas | confirmado |
| 4. Conteúdo | **68 de 68** com o texto padrão da AutoConf ("A procura de um…"); 0 vazias; **0 com texto próprio**; 0 com HTML. No Temerário, 467 caracteres | confirmado |
| 4. String vazia | nunca vem vazia. Se a AutoConf guarda o texto padrão ou o monta na hora quando o campo está em branco, não dá para saber sem editar | não testado (Fase B) |
| 5. Versão customizada | `versao_descricao`: `null` no Temerário; preenchida em 14 de 68, e nos 14 diferente do `modelo_nome` | confirmado; os valores estão na Fase B |
| 6. Opcionais | `acessorios[]`: 46 de 68 sem nenhum. O estoque inteiro usa só 7 itens: Alarme (19), Travas elétricas (19), Vidros elétricos dianteiros (19), Turbo (16), Blindado (6), Turbo intercooler (3), 7 lugares (2). `tags[]` vazio no Temerário | confirmado |
| 6. Pintura, interior, rodas, documentação | nenhum campo no payload | não encontrado |
| Garantia | `garantia_id` = 12 em 61 carros e `null` em 7; `garantiafabrica` preenchida em 1. No Temerário, 12, e o texto padrão diz "Veículo sem garantia." | confirmado |
| Perícia | `pericia` = 1 no Temerário, e o texto padrão diz "Veículo periciado." | confirmado |
| Data de atualização | `atualizacao` ("2026-10-16 13:40:34" no Temerário) vem no detalhe e na lista. O site usa `publicacao` como `updated_at` (sitemap e `dateModified`) | confirmado |
| Dado pessoal | `placa` e `placa_completa` `null` no Temerário; o telefone do texto saiu mascarado pelo diagnóstico; o endereço do texto é o da loja | ok |

**Resultado:**
- **O campo chega, mas não havia o que mapear.** Nenhum dos 68 carros tinha texto próprio na
  "Descrição Customizada para o Site" antes da edição de teste no Aston (Fase B).
- **O texto padrão não é fonte.** As frases "Veículo sem garantia." e "Veículo periciado." são a
  tradução dos códigos `garantia_id` e `pericia`, os mesmos que a tela mostra. A tela e o texto
  concordam porque são o mesmo dado, não duas confirmações. "Sem garantia" em 61 dos 68 carros,
  inclusive num Temerário 0 km, tem cara de valor padrão do cadastro. O texto também sai com
  lacuna ("KM:  km" no 0 km).
- **A divergência de garantia do handoff segue aberta.** A FAQ antiga ("garantia de fábrica
  integral") saiu no PR #46, e a de hoje não afirma "com" nem "sem". Decidir exige documento ou
  confirmação comercial, não o `garantia_id`.
- **A detecção de "texto próprio" é só pelo começo** ("A procura de um"). Se o operador escrever
  mantendo esse começo, o diagnóstico conta como padrão. Na Fase B, comparar o texto inteiro antes
  e depois.

## Fase B: edição controlada no Aston Martin Vantage 899967 (21/10/2026)

A Lorrayne preencheu na aba Site do 899967 a "Versão Customizada para o Site" ("ASTON MARTIN
Vantage Cupê 4.0 V8 680cv - Podium Green - 2026") e a "Descrição Customizada para o Site" (texto
corrido: Vantage S 2026, 460 km, 680 cv, 81,6 kgfm, 0-100 km/h em 3,3 s, Podium Green, interior
Onyx Black, som Bowers & Wilkins, "acabamento full carbono"). Depois, o diagnóstico rodou de novo.

| Critério | Resultado | Status |
|---|---|---|
| Leitura | o texto chega em `veiculo.descricao` do 899967, pelo id; é o único dos 68 que não é o texto padrão | confirmado |
| Versão customizada | chega em `versao_descricao` (14 → 15 preenchidas). **`versao_descricao` é a "Versão Customizada para o Site"** | confirmado |
| Formato | texto corrido, sem rótulos. Tirar pintura, interior ou opcionais dele exigiria interpretar prosa, o que o handoff proíbe por IA | confirmado |
| Terceiros | `descricao_anuncio` é igual à `descricao` nos 68, **inclusive no Aston depois da edição**: a API entrega o texto do site também como texto do anúncio | **pendente**: ver o anúncio do Aston nos portais da aba Integrações, ou a AutoConf confirmar |
| Tempo | a edição já estava no payload quando o diagnóstico rodou, minutos depois | confirmado |

**A edição já chegou ao site, por um caminho antigo.** O `generateDescription`
(`src/lib/autoconf-api.ts` e `src/lib/vehicle-inventory-data.ts`) cola o `versao_descricao` no
meio do texto de `description`, que vai para o `og:description`, o `description` do JSON-LD
(Vehicle e Product) e o `/api/llm/vehicles`. Na ficha do Aston em produção (21/10):

- **título, h1 e `name` do JSON-LD:** "Aston Martin Vantage Cupê V8 510cv 2026", que vem do
  `modelo_nome` do catálogo;
- **`description` do mesmo JSON-LD:** "ASTON MARTIN Vantage 2026 com apenas 460 km rodados.
  ASTON MARTIN Vantage Cupê 4.0 V8 680cv - Podium Green - 2026 Motor Gasolina, câmbio
  Automático. Documentação em dia, pronto para entrega."

A página afirma 510 cv e 680 cv ao mesmo tempo. Nos outros 14 carros o mesmo caminho cola a
string de catálogo em maiúsculas no texto ("3.0 24V H6 GASOLINA CARRERA PDK").

**A versão customizada não serve como título automático.** Simulando "a versão customizada
vence o catálogo" com as funções do site, só o Aston melhora ("Vantage Cupê V8 680cv"); o
Corvette fica igual; os outros 13 pioram, porque ali o campo tem a string de catálogo ("Porsche
911 H6 GASOLINA CARRERA PDK" no lugar de "Porsche 911 Carrera Coupe"). Só o Aston e o Corvette
têm o campo no formato digitado por pessoa ("Marca Modelo - Cor - Ano").

**Contradições dentro do próprio cadastro do Aston:**
- o catálogo (`modelo_nome`) diz "Vantage Cupê 4.0 V8 510cv"; a versão customizada diz 680cv;
- a descrição diz "Vantage S", e a versão customizada não tem o "S";
- a cor estruturada é "Verde"; o nome comercial "Podium Green" só existe no texto.

A imprensa da época do lançamento dá ao Vantage S 2026 680 PS, 800 Nm (= 81,6 kgfm) e 0-100 km/h
em 3,3 s (algumas fontes, 3,4 s). Os números do texto batem com o Vantage S. **Se este carro é
um S** é dado do documento, não do texto. Pintura, interior, som e o que é "full carbono" pedem
a mesma fonte (*build sheet*, nota).

## Campos: UI da AutoConf → payload → site

| Campo na UI | Caminho no payload | Banco do site | Destino no site hoje | Verificação | Ação proposta |
|---|---|---|---|---|---|
| Descrição Customizada para o Site | `veiculo.descricao` (string) **só em `POST /veiculo`** | só dentro do JSON bruto de `inventory_snapshots` | **nenhum**: não está no tipo `AutoConfVehicle` nem no mapeamento | confirmado pela Fase B; texto padrão em 67, texto próprio no 899967 | usar só o texto próprio, nunca o padrão (ver "Proposta") |
| (sem nome na UI) | `veiculo.descricao_anuncio` | idem | nenhum | igual à `descricao` nos 68, também depois da edição | indício de que o texto da aba Site vai para os anúncios |
| Versão Customizada para o Site | `versao_descricao` (15 de 68; vem também na lista `/veiculos`) | idem | reserva do título quando `cleanVersionString(modelo_nome)` dá vazio; e **colada no texto `description`** (`generateDescription`) | confirmado pela Fase B | tirar do texto `description`; não usar como título automático |
| Garantia ("Sem Garantia") | `garantia_id` (12 e `null` viram "Veículo sem garantia." no texto padrão) e `garantiafabrica` (só um carro, com "0000-00-00") | não mapeado | **nenhum**. A FAQ é neutra desde o PR #46 | rótulo confirmado; o fato, não. Nenhum carro tem data de garantia de fábrica válida | não publicar nada sobre garantia sem documento; tratar "0000-00-00" como vazio |
| Cor (seletor) | `cor_nome`, `cor_id` | `color` | ficha, JSON-LD `color` | confirmado ("Roxo", id 47, no Temerário) | manter; nome comercial da pintura só por fonte aprovada |
| Acessórios | `acessorios[]` e `acessorios_destaque[]`, cada um `{nome, id, categoria, destaque, slug}`, do **catálogo fixo** da AutoConf (`/filtros` → `opcionais`) | `options` (só os nomes) | seção "Opcionais" | confirmado; vazio no Temerário | o catálogo não tem opcional de supercarro (PCCB, Sport Chrono, pacote de interior); precisa de outra fonte |
| Potência | `potencia`, `potencia2` | `horsepower` | ficha e JSON-LD | confirmado; `null` no Temerário | cadastro |
| Perícia | `pericia` (1 e 3 viram "Veículo periciado." no texto padrão) | não mapeado | nenhum | rótulo confirmado; o que a perícia cobre e a diferença entre 1 e 3, não | não publicar |
| Exibição no site | `status_id` = 9 nos 68 | não mapeado | nenhum | não distingue nada no estoque de hoje | não usar para reservado/vendido |
| Vídeo | `video_embed` | não mapeado | nenhum | vazio no Temerário | uso futuro |
| Placa | `placa` (mascarada) e `placa_completa` (**completa**) | o JSON bruto de `inventory_snapshots` guarda o que a API manda | nunca exibida | `null` no Temerário | dado interno; não pode ir para página, log ou Git |

## O que o site publica hoje sobre o exemplar (Temerário 1148612, produção)

- Título "Lamborghini TEMERÁRIO V8 Bi-Turbo 2026"; cor "Roxo"; potência ausente; nenhum opcional.
- **Garantia:** a FAQ diz "as condições de garantia deste … são informadas pelo consultor".
- "Sobre este veículo": modelo fixo de texto (`vehicle-description-generator.ts`), sem opcional.
- "Acabamento": texto do Gemini em cache (`vehicle_section_content`), genérico; o prompt proíbe
  citar opcional que não esteja no anúncio.

## Promessas na camada pública fora da FAQ (não dependem da AutoConf)

Achadas ao rastrear para onde vai cada texto (produção, 21/10/2026):

1. **`/api/llm/vehicles`**, o feed que o `llms.txt` indica aos assistentes: o campo
   `description` vem de `generateDescription` (`src/lib/autoconf-api.ts`; o mesmo texto em
   `src/lib/vehicle-inventory-data.ts`) e termina em "Documentação em dia, pronto para
   entrega." em **64 dos 68** carros. É o mesmo tipo de promessa sem documento que o PR #46
   tirou da FAQ.
2. **Mesmo feed:** `enginePower.unitCode: 'BHP'` em 9 carros, enquanto a ficha (desde o PR #46)
   diz cv, que é o que a AutoConf informa.
3. **Toda ficha:** `vehicle-contact.tsx` mostra "✓ Veículo verificado • ✓ Documentação em dia •
   ✓ Garantia de procedência". É política da loja, não dado do carro; mantê-la é decisão da Attra.

Os itens 1 e 2 são correção de código. O 3 muda o visual e a promessa comercial.

## Riscos e contradições

1. **A `descricao` padrão faz afirmações derivadas de códigos.** "Veículo sem garantia" e
   "Veículo periciado" não podem virar FAQ, JSON-LD nem fato.
2. **Portais de terceiros (pergunta 11):** `descricao_anuncio` continuou igual à `descricao`
   depois da edição do Aston, o que sugere que o texto da aba Site também vai para os anúncios.
   Conferir nos portais antes de editar outros carros.
3. **A versão customizada vai para o texto e não para o título** (ver Fase B): a ficha do Aston
   diz 510 cv no título e 680 cv na descrição.
4. **Status:** o site não lê `status_id`. Se a AutoConf mantiver no feed um carro reservado,
   o site mostra "disponível".

## Precedente no próprio banco para a camada editorial

`vehicle_semantic_labels` (`supabase/migrations/20260816_vehicle_semantic_labels.sql`) já faz o
que o handoff pede de uma camada editorial: tabela por `vehicle_id` (o id da AutoConf, como
`integer`), com a coluna `sobrescrito_por` marcando correção humana que a ressincronização
não pode apagar. Se a `descricao` não servir, o caminho é uma tabela no mesmo molde, com
pintura de fábrica, interior, rodas e opcionais, cada um com fonte, quem aprovou e quando.

## Proposta

1. **Correção que não depende da AutoConf:** o `description` gerado deixa de colar o
   `versao_descricao` e deixa de prometer "Documentação em dia, pronto para entrega". O
   `/api/llm/vehicles` passa a dizer cv. Some a contradição 510 × 680 do Aston.
2. **Aston na origem:** escolher na Ficha Técnica da AutoConf o modelo de catálogo que o
   documento confirma (se houver Vantage S 680 cv), e pôr o "S" na versão customizada se for um S.
   Corrigido o catálogo, título, h1, JSON-LD e portais mudam juntos, sem código.
3. **Descrição própria na ficha** (com `ATTRA_VEHICLE_ENRICHMENT_ENABLED`, desligado por padrão):
   - quando a `descricao` não é o texto padrão, ela substitui o texto gerado em "Sobre este
     veículo", no `og:description`, no JSON-LD e no `/api/llm/vehicles`;
   - fica retida (com aviso na auditoria) se falar de garantia, perícia ou laudo, se trouxer
     telefone ou link, ou se o número de cv dela for diferente do número do título;
   - nada vira dado estruturado: pintura, interior e opcionais em JSON-LD só pela camada
     editorial, com fonte.
4. **Ligar o item 3 só depois** de saber se o texto vai para os portais.

## Diagnóstico

Só leitura; roda na VPS com as credenciais que o site já usa:

```sh
ssh attra-vps 'cd /var/www/attra && set -a && . ./.env.production && set +a && /root/.nvm/versions/node/v20.20.0/bin/node --input-type=module - 1148612 --todos' < scripts/diagnostico/autoconf-campos-do-veiculo.mjs
```

**Gate A:** passou (caminho e leitura confirmados). **Gate B:** leitura e identidade por id
confirmadas; falta o impacto em terceiros.

## Depende da Attra (não é código)

- **Portais:** o texto do Aston apareceu nos anúncios dos portais? Se sim, a aba Site é
  multicanal e o handoff manda preferir a camada editorial para dado que ainda não foi conferido.
- **Aston 899967:** qual é o modelo certo (Vantage ou Vantage S, 510 ou 680 cv), com documento.
- **Garantia:** o que vale para cada carro, com documento. O `garantia_id` 12 ("sem garantia")
  em 61 carros precisa ser conferido antes de qualquer uso.
- **Responsável (pergunta 12):** quem confere pintura, opcionais e garantia, e onde fica a fonte
  (nota fiscal, *build sheet*, Monroney, laudo).
