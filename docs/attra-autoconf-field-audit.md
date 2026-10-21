# Auditoria AutoConf → Attra (handoff "enriquecimento AutoConf", 20/10/2026)

Fase A do handoff (reconhecimento, só leitura). Nada foi escrito na AutoConf e nada foi
publicado. Classificação de cada item: **confirmado**, **não encontrado**,
**sem permissão** ou **não testado**.

- **Data:** 20/10/2026. Branch local `investigacao/autoconf-enriquecimento`, a partir de
  `363fa68` (master com o PR #46 no ar).
- **Ambientes:** código do repositório; site em produção (HTML público); coleção pública
  "Autoconf – Site API" no Postman (exemplos de resposta, de **outra revenda**). O payload
  autenticado da Attra **não** foi consultado: as credenciais ficam só no `.env.production`
  da VPS. O diagnóstico para isso está pronto, ver "Próximo passo".

## Integração em uso

| Pergunta | Resposta | Status |
|---|---|---|
| Tipo de integração | REST, `POST https://api.autoconf.com.br/api/v1/...`, corpo `x-www-form-urlencoded` | confirmado (código) |
| Onde | `src/lib/autoconf-api.ts`: `fetchAutoConfVehicles` (`/veiculos`), `fetchAutoConfVehicleById` (`/veiculo`), `fetchAdsHome` (`/ads-home`) | confirmado |
| Autenticação | header `Authorization` com `AUTOCONF_BEARER_TOKEN` + campo `token` com `AUTOCONF_DEALER_TOKEN` (nomes; valores não lidos) | confirmado |
| Frequência | não há job de sincronização: cada página consulta na renderização, com cache do `fetch` de 5 min (`revalidate: 300`) | confirmado |
| Fallback | último retorno bom gravado em `inventory_snapshots` (fontes `autoconf:veiculos:list`, `autoconf:veiculos:byId`, `autoconf:ads-home`; 5 linhas por fonte) | confirmado |
| ID do veículo 1148612 | o número no fim do slug é o `id` da AutoConf; a ficha chama `POST /veiculo` com `id=1148612` (`getVehicleBySlug`) | confirmado (código) |
| Status/venda | `status` é fixo em `'available'` no mapeamento; carro vendido some do feed e a ficha dá 404. `status_id` existe no payload e não é usado | confirmado |

## Campos: UI da AutoConf → payload → site

| Campo na UI | Caminho no payload | Banco do site | Destino no site hoje | Verificação | Ação proposta |
|---|---|---|---|---|---|
| Descrição Customizada para o Site | `descricao` (string) **só em `POST /veiculo`**; não vem em `/veiculos` | só dentro do JSON bruto de `inventory_snapshots` | **nenhum**: não está no tipo `AutoConfVehicle` nem no mapeamento | Postman: confirmado (exemplo começa com "A procura de um Audi Q3…", o mesmo molde da aba Site do Temerário). Produção: **não testado** | rodar o diagnóstico; depois, Fase B |
| Versão Customizada para o Site | candidato: `versao_descricao`. No exemplo do Postman é o `modelo_nome` em maiúsculas | idem | usado só como **reserva** da versão, quando `cleanVersionString(modelo_nome)` dá vazio | semântica **não confirmada** | comparar no diagnóstico com o que o operador vê na aba Site. Se for a versão customizada, hoje o site a ignora em favor da versão do catálogo |
| Garantia ("Sem Garantia") | `garantia_id` (número; exemplos 1, 2, 3, 12) e `garantiafabrica` (data `aaaa-mm-dd` ou `null`) | não mapeado | **nenhum**. A FAQ é neutra desde o PR #46 ("condições informadas pelo consultor") | a tabela id → rótulo **não está documentada** | pedir à AutoConf/Attra a tabela; até lá, não publicar nada sobre garantia |
| Cor (seletor) | `cor_nome`, `cor_id` | `color` | ficha, JSON-LD `color` | confirmado ("Roxo" no Temerário) | manter; nome comercial da pintura só por fonte aprovada |
| Acessórios | `acessorios[]` e `acessorios_destaque[]`, cada um `{nome, id, categoria, destaque, slug}`, do **catálogo fixo** da AutoConf (`/filtros` → `opcionais`: "Calotas", "Bancos de couro"…) | `options` (só os nomes) | seção "Opcionais" | confirmado; **vazio** no Temerário, no 911 GTS e na 296 GTS | o catálogo fixo não tem opcional de supercarro (PCCB, Sport Chrono, pacote de interior); precisa de outra fonte |
| Potência | `potencia`, `potencia2` | `horsepower` | ficha e JSON-LD | confirmado; vazio no Temerário ("Não informado") | cadastro |
| Perícia | `pericia` (1, 3) | não mapeado | nenhum | semântica desconhecida | não publicar |
| Exibição no site | provavelmente `status_id` ou `prioridade` | não mapeado | nenhum | não testado | investigar no diagnóstico |
| Vídeo | `video_embed` | não mapeado | nenhum | — | uso futuro |
| Placa | `placa` (mascarada) e `placa_completa` (**completa**) | o JSON bruto de `inventory_snapshots` guarda o que a API manda | nunca exibida | Postman: confirmado | dado interno; não pode ir para página, log ou Git |

Interior, código de pintura, rodas e documentação de opcionais: **não encontrados** em
nenhum endpoint da coleção.

## O que o site publica hoje sobre o exemplar (Temerário 1148612, produção)

- Título "Lamborghini TEMERÁRIO V8 Bi-Turbo 2026"; cor "Roxo"; potência ausente; nenhum opcional.
- **Garantia:** o handoff viu "garantia de fábrica integral" na FAQ. Isso saiu no PR #46: hoje a
  FAQ diz "as condições de garantia deste … são informadas pelo consultor". Não há afirmação
  de "com" nem de "sem" garantia.
- "Sobre este veículo": modelo fixo de texto (`vehicle-description-generator.ts`), sem opcional.
- "Acabamento": texto do Gemini em cache (`vehicle_section_content`), genérico ("habitáculo
  … orientado a performance"); o prompt proíbe citar opcional que não esteja no anúncio.

## Riscos e contradições

1. **A `descricao` padrão faz promessas.** No exemplo do Postman ela diz "Veículo periciado
   DEKRA. 1 ano de garantia (motor e caixa)". Se o molde da Attra fizer o mesmo, o texto
   bruto **não pode** virar FAQ, JSON-LD nem fato: o próprio Temerário mostra "Sem Garantia"
   num campo e, talvez, garantia no texto.
2. **Portais de terceiros (pergunta 11):** a AutoConf distribui anúncios para portais. Não
   dá para saber pelo payload se a "Descrição Customizada para o Site" também vai para eles.
   **Perguntar à AutoConf antes** de a operação editar esse campo em produção.
3. **A versão customizada pode estar sendo ignorada** (ver `versao_descricao` acima).
4. **Status:** o site não lê `status_id`. Se a AutoConf mantiver no feed um carro reservado,
   o site mostra "disponível".

## Precedente no próprio banco para a camada editorial

`vehicle_semantic_labels` (`supabase/migrations/20260816_vehicle_semantic_labels.sql`) já faz o
que o handoff pede de uma camada editorial: tabela por `vehicle_id` (o id da AutoConf, como
`integer`), com a coluna `sobrescrito_por` marcando correção humana que a ressincronização
não pode apagar. Se a `descricao` não servir, o caminho é uma tabela no mesmo molde, com
pintura de fábrica, interior, rodas e opcionais, cada um com fonte, quem aprovou e quando.

## Próximo passo (Gate A)

Rodar o diagnóstico na VPS. Ele é só leitura, usa as credenciais que o site já usa e não
imprime token, placa, contato nem fotos:

```sh
ssh attra-vps 'cd /var/www/attra && set -a && . ./.env.production && set +a && /root/.nvm/versions/node/v20.20.0/bin/node --input-type=module - 1148612 --todos' < scripts/diagnostico/autoconf-campos-do-veiculo.mjs
```

Ele responde as perguntas 3 a 6 e 8 com o payload real: caminho e tamanho da `descricao` do
1148612, se é o texto padrão ou próprio, `versao_descricao` × `modelo_nome`, `garantia_id`,
acessórios, e as mesmas contagens para o estoque inteiro.

**Gate A passa** se `descricao` vier preenchida no `/veiculo` da Attra. Sem isso, nada de
mapear o campo: vale a camada editorial.

## Depende da Attra (não é código)

- **Fase B:** num carro escolhido, o operador grava na aba Site um dado real e verificado (ex.:
  o nome da pintura conferido no documento). Rodamos o diagnóstico antes e depois para medir
  a janela de sincronização e o formato.
- **Portais:** a AutoConf confirma se a "Descrição Customizada para o Site" vai para portais.
- **`garantia_id`:** a tabela de rótulos ("Sem Garantia", "Fábrica" …).
- **Responsável (pergunta 12):** quem confere pintura, opcionais e garantia, e onde fica a fonte
  (nota fiscal, *build sheet*, Monroney, laudo).
