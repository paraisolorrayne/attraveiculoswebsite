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

## Gate A: payload real da Attra (21/10/2026)

| Pergunta do handoff | Resposta | Status |
|---|---|---|
| 4. Caminho da descrição | `POST /api/v1/veiculo` → `veiculo.descricao` (string). Vem também `veiculo.descricao_anuncio`, com o mesmo começo. A lista `/veiculos` não traz nenhuma das duas | confirmado |
| 4. Conteúdo | **68 de 68** com o texto padrão da AutoConf ("A procura de um…"); 0 vazias; **0 com texto próprio**; 0 com HTML. No Temerário, 467 caracteres | confirmado |
| 4. String vazia | nunca vem vazia. Se a AutoConf guarda o texto padrão ou o monta na hora quando o campo está em branco, não dá para saber sem editar | não testado (Fase B) |
| 5. Versão customizada | `versao_descricao`: `null` no Temerário; preenchida em 14 de 68, e nos 14 diferente do `modelo_nome` | confirmado; quais são os 14, ver "Próximo passo" |
| 6. Opcionais | `acessorios[]`: 46 de 68 sem nenhum. O estoque inteiro usa só 7 itens: Alarme (19), Travas elétricas (19), Vidros elétricos dianteiros (19), Turbo (16), Blindado (6), Turbo intercooler (3), 7 lugares (2). `tags[]` vazio no Temerário | confirmado |
| 6. Pintura, interior, rodas, documentação | nenhum campo no payload | não encontrado |
| Garantia | `garantia_id` = 12 em 61 carros e `null` em 7; `garantiafabrica` preenchida em 1. No Temerário, 12, e o texto padrão diz "Veículo sem garantia." | confirmado |
| Perícia | `pericia` = 1 no Temerário, e o texto padrão diz "Veículo periciado." | confirmado |
| Data de atualização | o detalhe traz `atualizacao` ("2026-10-16 13:40:34" no Temerário). O site usa `publicacao` como `updated_at` (sitemap e `dateModified`) | confirmado |
| Dado pessoal | `placa` e `placa_completa` `null` no Temerário; o telefone do texto saiu mascarado pelo diagnóstico; o endereço do texto é o da loja | ok |

**Resultado:**
- **O campo chega, mas não há o que mapear.** Nenhum dos 68 carros tem texto próprio na
  "Descrição Customizada para o Site". Ligar o enriquecimento hoje não mudaria nenhuma ficha.
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

## Campos: UI da AutoConf → payload → site

| Campo na UI | Caminho no payload | Banco do site | Destino no site hoje | Verificação | Ação proposta |
|---|---|---|---|---|---|
| Descrição Customizada para o Site | `veiculo.descricao` (string) **só em `POST /veiculo`** | só dentro do JSON bruto de `inventory_snapshots` | **nenhum**: não está no tipo `AutoConfVehicle` nem no mapeamento | confirmado; texto padrão nos 68 | Fase B. Nunca publicar o texto bruto |
| (sem nome na UI) | `veiculo.descricao_anuncio` | idem | nenhum | confirmado; mesmo começo da `descricao` | hipótese: texto dos portais. A Fase B mostra qual dos dois muda com a aba Site |
| Versão Customizada para o Site | candidato: `versao_descricao` (14 de 68 preenchidas) | idem | reserva do título quando `cleanVersionString(modelo_nome)` dá vazio; e entra no texto `description` (`generateDescription`) | semântica **não confirmada** | ver os 14 valores; se for a versão customizada, o título hoje a ignora |
| Garantia ("Sem Garantia") | `garantia_id` (12 = "Veículo sem garantia." no texto padrão) e `garantiafabrica` (data ou `null`) | não mapeado | **nenhum**. A FAQ é neutra desde o PR #46 | rótulo do 12 confirmado; o fato, não | não publicar nada sobre garantia sem documento |
| Cor (seletor) | `cor_nome`, `cor_id` | `color` | ficha, JSON-LD `color` | confirmado ("Roxo", id 47, no Temerário) | manter; nome comercial da pintura só por fonte aprovada |
| Acessórios | `acessorios[]` e `acessorios_destaque[]`, cada um `{nome, id, categoria, destaque, slug}`, do **catálogo fixo** da AutoConf (`/filtros` → `opcionais`) | `options` (só os nomes) | seção "Opcionais" | confirmado; vazio no Temerário | o catálogo não tem opcional de supercarro (PCCB, Sport Chrono, pacote de interior); precisa de outra fonte |
| Potência | `potencia`, `potencia2` | `horsepower` | ficha e JSON-LD | confirmado; `null` no Temerário | cadastro |
| Perícia | `pericia` (1 = "Veículo periciado." no texto padrão) | não mapeado | nenhum | rótulo confirmado; o que a perícia cobre, não | não publicar |
| Exibição no site | provavelmente `status_id` (9 no Temerário) | não mapeado | nenhum | semântica desconhecida | ver a distribuição no estoque |
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
2. **Portais de terceiros (pergunta 11):** a existência de `descricao` e `descricao_anuncio`
   sugere textos separados para site e anúncio, mas não prova. **Perguntar à AutoConf antes**
   de a operação editar a aba Site em produção.
3. **A versão customizada pode estar sendo ignorada** em até 14 carros (ver `versao_descricao`).
4. **Status:** o site não lê `status_id`. Se a AutoConf mantiver no feed um carro reservado,
   o site mostra "disponível".

## Precedente no próprio banco para a camada editorial

`vehicle_semantic_labels` (`supabase/migrations/20260816_vehicle_semantic_labels.sql`) já faz o
que o handoff pede de uma camada editorial: tabela por `vehicle_id` (o id da AutoConf, como
`integer`), com a coluna `sobrescrito_por` marcando correção humana que a ressincronização
não pode apagar. Se a `descricao` não servir, o caminho é uma tabela no mesmo molde, com
pintura de fábrica, interior, rodas e opcionais, cada um com fonte, quem aprovou e quando.

## Próximo passo

**Segunda rodada do diagnóstico (opcional, só leitura).** O mesmo comando, com o script
atualizado, lista os 14 `versao_descricao` ao lado do `modelo_nome`, a frase de garantia de
cada `garantia_id` e de perícia de cada `pericia`, quantas `descricao` são iguais à
`descricao_anuncio`, a distribuição de `status_id`, o carro com `garantiafabrica` e as chaves
que só o detalhe traz:

```sh
ssh attra-vps 'cd /var/www/attra && set -a && . ./.env.production && set +a && /root/.nvm/versions/node/v20.20.0/bin/node --input-type=module - 1148612 --todos' < scripts/diagnostico/autoconf-campos-do-veiculo.mjs
```

**Gate A:** o caminho está confirmado, mas o conteúdo é o padrão em todo o estoque. O
enriquecimento pela `descricao` só avança depois da Fase B. Sem ela, vale a camada editorial.

## Depende da Attra (não é código)

- **Fase B:** num carro escolhido, o operador grava na aba Site um dado real e verificado (ex.:
  o nome da pintura conferido no documento). Rodamos o diagnóstico antes e depois para ver qual
  campo muda (`descricao` ou `descricao_anuncio`), o formato que chega e quanto tempo leva.
- **Portais:** a AutoConf confirma se a "Descrição Customizada para o Site" vai para portais.
- **Garantia:** o que vale para cada carro, com documento. O `garantia_id` 12 ("sem garantia")
  em 61 carros precisa ser conferido antes de qualquer uso.
- **Responsável (pergunta 12):** quem confere pintura, opcionais e garantia, e onde fica a fonte
  (nota fiscal, *build sheet*, Monroney, laudo).
