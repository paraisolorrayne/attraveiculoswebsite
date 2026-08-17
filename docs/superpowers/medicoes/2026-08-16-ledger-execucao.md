# SDD ledger — plan: docs/superpowers/plans/2026-08-16-camada-semantica-estoque.md
Task 1: complete (commit ccde75e, contrato HTTP verificado; conexão de cliente MCP real PENDENTE — não bloqueia Tasks 2-8)
Task 2: review — spec ✅, qualidade reprovada (3 importantes, 4 menores). Defeitos do brief, não desvio do implementador.
Task 2: adjudicado — `exclusividade` é override-only como conforto/liquidez; brand saiu das regras e o rótulo ficou órfão. Emenda ao plano, não contradição.
Task 2: minor (deferred): teste de dedup só cobre o array `uso`; os três usam o mesmo Set.
Task 2: minor (deferred): faixas de `executivo` (>=250k) e `primeiro-premium` (<300k) se sobrepõem entre 250k e 299.999 — não documentado nem testado.
Task 2: fix round 1/5 despachado (exclusividade documentado, teste de `pista`, testes de fronteira nos 5 limiares, constante de portas, comentário do acoplamento de `urbano`)
Task 2: fix round 1/5 (5 endereçados, 0 abertos; commits b12f431..2688ecc)
Task 2: complete (commits ccde75e..2688ecc, review clean — 17 testes)
Task 3: review — spec ✅, qualidade reprovada (1 crítico, 2 importantes, 1 menor).
Task 3: CRÍTICO — "amplo" ausente da trava; termo mais comum em anúncio brasileiro para alegar espaço. Buraco do plano, não do implementador. Controlador achou também que só havia formas masculinas ("espaçosa" escapava).
Task 3: aceito como não-defeito — prosa e rótulo podem repetir palavra; pior efeito é redundância no índice, não afirmação falsa.
Task 3: fix round 1/5 despachado (lista de termos com flexões, casamento por palavra inteira sobre forma normalizada, teste de descarte reforçado, exaustividade de NOME_DO_ROTULO)
Task 3: fix round 1/5 (4 endereçados, 0 abertos; commits e005d14..2213d7c)
Task 3: complete (commits 2688ecc..2213d7c, review clean — 18 testes; suíte dos dois módulos 35/35)
Task 3: minor (deferred): NOME_DO_ROTULO testado só quanto à presença da chave, não ao conteúdo.
Task 3: minor (deferred): termos de duas palavras sem teste com pontuação colada nas duas pontas (correto por análise da regex).
Task 4: Steps 1-2 pelo subagente (commit 4b401fa); precisou registrar a tabela em TABELAS_DO_CODIGO para a trava de completude compilar.
Task 4: Steps 3-4 pelo controlador — migration aplicada em produção (CREATE TABLE + CREATE INDEX, 8 colunas conferidas via \d).
Task 4: APRENDIZADO — o teste de drift NÃO roda de máquina de dev: DATABASE_URL da VPS aponta para localhost, então de fora ele bate no Postgres local ("role attra does not exist"). Verificação equivalente feita comparando TABELAS_DO_CODIGO com pg_tables por ssh, sem mutar o checkout de produção. 33 declaradas, todas existem.
Task 4: complete (commit 4b401fa + migration aplicada em produção pelo controlador, review clean, zero achados)
Task 5: implementador corrigiu 2 erros do brief — numUpdatedOrInsertedRows não existe no Kysely (é numInsertedOrUpdatedRows; com o nome errado a função devolveria 0 calado); e atualizado_em em insert de array não compila com Generated<Timestamp>, resolvido deixando o default do banco no INSERT e sql`now()` no doUpdateSet.
Task 5: dúvida do implementador resolvida pelo controlador — a tabela EXISTE em produção. O commit 4b401fa dizia "não aplicada" corretamente (foi escrito antes); a aplicação veio depois e está conferida.
Task 5: review — spec ✅, desvios do brief julgados corretos, qualidade REPROVADA (1 crítico, 1 importante, 2 menores).
Task 5: CRÍTICO — vehicle_id era bigint; driver pg devolve int8 como STRING apesar do tipo Kysely dizer number. Map com chave string nunca casaria com gravados.get(Number(id)) da Task 7: sobrescrita humana existiria no banco, protegida, e nunca seria lida. Defeito do plano (as 3 tabelas irmãs sempre foram integer).
Task 5: controlador alterou a coluna para integer em produção (tabela vazia, dentro de transação, tipo conferido depois).
Task 5: fix round 1/5 despachado (migration para integer, coerção defensiva Number(), teste de compilação de SQL provando a trava do upsert, 2 menores de mesclar)
Task 5: fix round 1/5 (4 endereçados, 0 abertos; commits ea612b7..d815044)
Task 5: complete (commits 4b401fa..d815044, review clean — trava do upsert verificada por mutação pelo revisor: com .where o SQL contém a cláusula, sem .where não contém)
Task 6: review — spec ✅, qualidade aprovada com 1 importante e 1 menor. Desvio do implementador julgado correto: o brief se contradizia (código gerava slug 'familia', teste exigia 'família').
Task 6: minor (deferred): legivel() duplicada entre perfil-semantico.ts e prosa.ts; corrigir exigiria exportar de perfil-semantico, fora do escopo da task.
Task 6: fix round 1/5 despachado (teste com fetch mockado provando que gerarProsa descarta prosa reprovada, os dois lados, com verificação por mutação)
Task 6: fix round 1/5 (1 endereçado, 0 abertos; commits 19e0dd3..1a04110 — só teste, implementação intocada)
Task 6: complete (commits d815044..1a04110, review clean — 10 testes, mutação confirmada pelo revisor)
Task 7: review — spec ✅, qualidade aprovada com 1 importante pendente e 1 menor. Desvio do Step 5 julgado CORRETO e necessário: o revisor mapeou os caminhos de exceção e confirmou que nenhum escapa do tratamento por lote; seguir a letra do brief teria virado bug de produção.
Task 7: minor (deferred): a restruturação do route.ts não tem teste automatizado (o repo não tem teste de rota em src/app/api — padrão existente).
Task 7: DISCORDÂNCIA do controlador com o revisor — ele classificou "prosa cacheada não expira quando o veículo muda" como não bloqueador. É bloqueador: carro cruzando 30.000 km perde o rótulo baixa-quilometragem mas mantém a prosa dizendo "Baixa quilometragem", indexada como afirmação falsa. Entrou na rodada de conserto.
Task 7: fix round 1/5 despachado (passagemDoVeiculo devolve a prosa usada, rota cacheia, invalidação por mudança de rótulo com comparação estável, 3 testes de cache)
Task 7: fix round 1/5 (2 endereçados, 0 abertos; commits d586f5a..eb31e1a — revisor rodou as 3 mutações ele mesmo)
Task 7: minor (deferred) INTRODUZIDO NESTA RODADA: ROTULOS_MACAN_ATUAIS em sync-semantico.test.ts sem `as const`/anotação, inferido como string[] largo — 3 erros novos de tsc (linhas 72, 109, 128). Correção trivial: anotar como Rotulos. NÃO quebra CI nem build.
Task 7: ACHADO DE PROJETO, além desta branch — o CI não roda tsc e next.config tem ignoreBuildErrors:true. TypeScript não barra nada: 28 erros acumulados hoje (25 pré-existentes + 3 desta rodada). É por isso que a regressão de tipo passou pelo build.
Task 7: complete (commits 1a04110..eb31e1a, review clean — 711 testes, build compilando)
FINAL: revisão da branch inteira — veredicto "pode ir" com 2 condições. Zero achados críticos. 5 importantes (I1..I5), 5 menores. Triagem dos adiados: só L40 precisa ser corrigido antes do merge; os demais podem ficar, com justificativa por item.
FINAL: linha de base capturada ANTES do deploy em .superpowers/sdd/.../linha-de-base/ (3 JSONs crus + RESUMO.txt). Condição 2 cumprida.
FINAL: A LINHA DE BASE INVALIDOU O CRITÉRIO DE ACEITE DO PLANO. "SUV familiar com bastante espaço devolver SUV de 4 portas em 1º" JÁ acontece hoje (G-63, Escalade, Cybertruck, GLE-400, Macan). O critério não detectaria melhora nenhuma. Os defeitos reais da busca hoje: "carro para o fim de semana" devolve Nissan Frontier (picape) em 1º, e "primeiro carro premium até 300 mil" devolve GMC Sierra 3500 Denali em 1º. A medição da Task 8 tem que ser contra ESSES, não contra o critério original.
FINAL: onda única de conserto (5 achados) — commit b4cee67. Re-revisão: 5/5 ENDEREÇADOS, zero quebras novas, verificado de forma independente (tsc 25, vitest 719, build ok, sem drift).
FINAL: branch pronta para merge. Task 8 (deploy + ressincronização) AGUARDA APROVAÇÃO DA LORRAYNE — não executar sem ela.
Task 8: complete — deploy f600ba2, ressync 77/77 (77 geradas, 0 reprovadas, 0 falhas), medição registrada em docs/superpowers/medicoes/. PLANO CONCLUÍDO.
