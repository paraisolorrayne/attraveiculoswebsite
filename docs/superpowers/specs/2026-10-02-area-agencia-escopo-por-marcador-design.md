# Área da agência: escopo por marcador, sem cadastro de campanha

Revisão de `2026-10-02-area-agencia-design.md`. Onde as duas divergem, vale
esta. Substitui: a decisão 5 (cadastro vale na hora + trava), a parte da
decisão 2 que fala em cadastrar a campanha da WebMotors, a tabela
`agencia_campanhas` do modelo de dados, a seção "Atribuição de visitas" e a
tela "Campanhas".

## Por que mudou

A usuária viu a área rodando local: a Media House só enxergaria dados depois de
cadastrar cada campanha. Não é a experiência desejada. Nas palavras dela: a
área é para eles **verem já filtrado, sem precisar cadastrar campanha**, com o
filtro "de `va-`, `[VA]` ou `utm_medium=` que eles me enviarem", e preparado
para o caso de o marcador vir no `utm_content`. As métricas das campanhas que
já rodaram têm de aparecer na área deles desde o primeiro acesso.

## Decisões (fechadas com a usuária em 02/10)

1. **Escopo por marcador**, sem cadastro. Uma regra só para todas as
   plataformas.
2. **GAM dentro do site da WebMotors:** a Media House coloca o marcador também
   nesses links. Sem exceção no código; link sem marcador não aparece para eles.
3. **Lista de marcadores mantida pela Attra, sem tela.** A Media House manda os
   marcadores para a usuária, que repassa; a mudança vai como uma linha de SQL
   junto do comando de deploy.
4. **A visão de campanhas da área** (conversão e score, a mesma do painel da
   Attra) já abre com as campanhas que rodaram. O painel da Attra não muda.

## A regra

Uma sessão é da agência quando **qualquer** destes casa:

| Marcador | Campo da sessão | Como casa |
|---|---|---|
| `prefixos` | `utm_campaign` **ou** `utm_content` | começa com o prefixo, sem diferenciar maiúsculas, ignorando espaço na frente |
| `utm_medium_marca` | `utm_medium` | igual, sem diferenciar maiúsculas e espaços |
| `ids_campanha` | `utm_id` | igual, sem diferenciar maiúsculas e espaços |

- **"Começa com", nunca "contém":** `nova-colecao` contém `va-` e não é da
  Media House.
- Os campos passam pelo mesmo `saneado()` de hoje (placeholders vazios viram
  nulo). O prefixo codificado (`%5bva%5d`) fica na lista porque a UTM às vezes
  chega sem decodificar.
- `prefixos` também cobre valor exato: um `utm_content` exato que eles mandarem
  entra como prefixo e casa do mesmo jeito.
- **Histórico entra sozinho:** a regra roda na hora da consulta, sobre todas as
  sessões gravadas.

**Marcadores iniciais da Media House:**

- `prefixos`: `va-`, `[va]`, `%5bva%5d`
- `utm_medium_marca`: `mediahouse`
- `ids_campanha`: `24295047322`, `24283864992` — a PMax
  `attraveiculos-google-ads-pmax-nucleo-setembro26` vinha com
  `utm_medium=mediahouse` até 29/09 (943 sessões). Desde 29/09 chega com o nome
  vazio, `utm_medium=cpc` e só o ID (43 sessões no dia 29), por um sufixo de URL
  trocado na conta. Sem o ID, essas visitas sumiriam da área. **A usuária
  confirma na revisão desta spec** se o ID entra como marcador.

**Nunca aparece para a agência:** orgânico, EB (marcadores próprios quando
entrar), portal WebMotors sem UTM, anúncios da própria Attra.

Agências com marcadores sobrepostos (um prefixo que casa nas duas) não são
tratadas: a lista é mantida pela Attra, que não cadastra marcadores conflitantes.

## Arquitetura

- `Escopo` passa a ser
  `{ tipo: 'tudo' } | { tipo: 'agencia'; agenciaId; plataforma?; campanhas?: string[] }`.
  `campanhas` são **nomes** de campanha (o rótulo que a tela mostra), não mais
  ids de cadastro.
- `naAgencia(escopo)` deixa de fazer `exists` sobre `agencia_campanhas`: vira
  um `exists` sobre `agencias` (só a linha da agência do escopo), com o
  predicado de marcador sobre as colunas de `s`. Mais barato que o casamento
  por campanha.
- Filtro de plataforma: continua por `plataformaDaSessaoSql`.
- Filtro de campanha: compara o **mesmo rótulo que a tela mostra**,
  `lower(btrim(campanhaSql))` (nome saneado, ou `campanha #<utm_id>` quando o
  nome vem vazio), com a lista de nomes da URL, também em minúsculas. Assim a
  PMax que chega sem nome é filtrável como `campanha #24295047322`.
- Tudo o que já usa `naAgencia`/`sessaoNaAgencia`/`escopoDaAgencia`
  (Visitantes, jornadas, detalhe de sessão, Resumo) passa a valer pela regra
  nova sem mudar de forma.

## Modelo de dados

Migration nova `supabase/migrations/20261003_agencias_marcadores.sql`
(idempotente; roda depois da `20261002_agencias.sql`, tenha ela ido ao ar
antes ou junto):

- `agencias.ids_campanha text[] not null default '{}'`, preenchido na Media
  House com os dois IDs acima.
- `DROP TABLE IF EXISTS agencia_campanhas` — o cadastro deixa de existir.
- A `20261002_agencias.sql` não é editada (pode já ter rodado em produção).

## Telas

- **Abas principais:** Resumo · Visitantes. A aba Campanhas (cadastro,
  conferência e detectadas) sai.
- **Visão por campanha:** a sub-aba Campanhas de Visitantes (conversão, score
  de tempo, cliques sem acidentais) e a página `/campanha/[chave]` mostram só o
  que é da agência.
- **Filtro do topo:** período · plataforma · campanha. A lista de campanhas vem
  das sessões da agência no período (nome ou `campanha #<id>`), ordenada por
  sessões.
- Resumo, Visitantes, detalhe de sessão ("outra origem" para visita de fora),
  regra de largura total e papéis: sem mudança.

## Fase 3 (mini CRM) — o que muda no desenho

A ligação lead → campanha que dependia do cadastro passa a usar os marcadores:
o nome/ID de campanha que a Fykos mandar casa pela mesma regra; o prefixo da
mensagem do anúncio (braço WhatsApp direto da Meta) vira mais uma lista de
marcadores da agência quando a fase 3 começar. Detalhe na spec da fase 3.

## Testes

- **Integração (Postgres local):** sessões com `va-` no `utm_campaign`, `[VA]`
  codificado, `va-` só no `utm_content`, `utm_medium=MediaHouse` (caixa),
  `utm_id` da lista; e fora: `nova-colecao`, EB, portal WebMotors sem UTM,
  orgânico, Google sem marcador. Filtros de plataforma e de campanha (por
  nome) estreitam dentro da agência. Migration nova aplicada duas vezes sem
  erro, e depois da antiga.
- **Rotas:** as de cadastro (`/campanhas`, `/campanhas/[id]`,
  `/campanhas/detectadas`) respondem 404; as de Visitantes da agência continuam
  com os mesmos testes de vazamento (EB e orgânico nunca aparecem).
- **Navegador:** Resumo e Visitantes em 360, 768, 1280 e 1920 px sem rolagem
  lateral; o seed local passa a gerar sessões com e sem marcador.

## Entrega

Roda local para a usuária ver como agência (sem cadastrar nada, a área já vem
com dados) → aprovação → deploy em uma linha com as duas migrations.

Junto, um texto curto para a Media House: marcador também nos links do GAM, e
o sufixo de URL da PMax de volta com `utm_medium=mediahouse`.
