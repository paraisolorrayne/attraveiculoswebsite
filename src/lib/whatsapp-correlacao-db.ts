/**
 * Liga a decisão de `whatsapp-correlacao.ts` ao banco.
 *
 * A função pura decide QUAL clique originou uma conversa; aqui buscamos os
 * candidatos, reivindicamos o clique e gravamos a sessão no card. A separação
 * existe para que a regra — que é onde se erra — fique testável sem banco.
 */

import { sql, type Transaction } from 'kysely'
import type { Database } from './db/types'
import { correlacionarClique, JANELA_CORRELACAO_MS, type ResultadoCorrelacao } from './whatsapp-correlacao'
import { extrairRefSessao } from './atribuicao-receita'

/**
 * Origens que declaram outro canal de entrada.
 *
 * Um lead de marketplace não veio de clique no nosso site, e correlacioná-lo
 * por coincidência de horário atribuiria campanha e termo de OUTRA pessoa a um
 * lead real — o estrago exato que a regra de ambiguidade existe para evitar.
 * `patrocinado`, `site`, `organico` e nulo seguem elegíveis: todos podem ter
 * passado pelo site antes do WhatsApp.
 */
const ORIGENS_DE_OUTRO_CANAL = new Set(['portal'])

export type ResultadoLigacao =
  | { tipo: 'ligado'; sessionId: string; cliqueId: string }
  | { tipo: 'nao_elegivel'; motivo: string }
  | { tipo: 'sem_candidato' }
  | { tipo: 'ambigua'; candidatos: number }
  | { tipo: 'clique_tomado' }

/**
 * Momento a partir do qual procurar o clique.
 *
 * O clique precede a conversa, então usamos o instante mais antigo que o card
 * conhece. Cair no `now()` do webhook é o último recurso: se o CRM despachar em
 * lote, o horário de chegada pode estar muito depois do contato real e a janela
 * de 10 minutos não encontraria nada — falha por omissão, que é a desejada.
 */
function instanteDoContato(card: Record<string, unknown>): Date {
  for (const campo of ['primeiro_contato_em', 'atribuido_em', 'criado_em']) {
    const bruto = card[campo]
    if (typeof bruto === 'string' || bruto instanceof Date) {
      const data = new Date(bruto as string | Date)
      if (!Number.isNaN(data.getTime())) return data
    }
  }
  return new Date()
}

/**
 * Tenta ligar um card recém-criado ao clique de WhatsApp que o originou.
 *
 * Roda apenas em card NOVO: reprocessar a cada webhook faria o mesmo card
 * consumir vários cliques ao longo da vida.
 *
 * Nunca lança. A atribuição é acessório do recebimento do lead — se falhar,
 * o lead entra do mesmo jeito. Perder atribuição é recuperável; perder o lead
 * não é.
 */
export async function ligarCliqueAoCard(
  trx: Transaction<Database>,
  cardId: string,
  card: Record<string, unknown>,
): Promise<ResultadoLigacao> {
  const origem = typeof card.origem === 'string' ? card.origem.toLowerCase().trim() : ''
  if (ORIGENS_DE_OUTRO_CANAL.has(origem)) {
    return { tipo: 'nao_elegivel', motivo: `origem ${origem}` }
  }

  // Se o emissor já mandou o identificador, ele vale mais que qualquer
  // correlação por tempo — e é o caminho que queremos que passe a existir.
  const dados = (card.dados ?? card) as Record<string, unknown>
  if (extrairRefSessao(dados)) {
    return { tipo: 'nao_elegivel', motivo: 'card já traz referência de sessão' }
  }

  const quando = instanteDoContato(card)
  const desde = new Date(quando.getTime() - JANELA_CORRELACAO_MS)

  const candidatos = await trx
    .selectFrom('whatsapp_clicks')
    .select(['id', 'session_db_id', 'clicked_at'])
    .where('consumido_em', 'is', null)
    // Fragmento SQL parametrizado, como o resto do projeto faz com data: a
    // coluna é `Generated<Timestamp>` e o operando tipado do Kysely não aceita
    // nem Date nem string nessa posição.
    .where(sql<boolean>`clicked_at >= ${desde}`)
    // Folga igual à da função pura, para relógios dessincronizados entre o
    // nosso servidor e o do CRM.
    .where(sql<boolean>`clicked_at <= ${new Date(quando.getTime() + 30_000)}`)
    .execute()

  const decisao: ResultadoCorrelacao = correlacionarClique(
    candidatos.map(c => ({ id: String(c.id), session_db_id: c.session_db_id, clicked_at: c.clicked_at as unknown as Date })),
    quando,
  )

  if (decisao.tipo === 'sem_candidato') return { tipo: 'sem_candidato' }
  if (decisao.tipo === 'ambigua') return { tipo: 'ambigua', candidatos: decisao.candidatos }

  // Reivindica o clique ANTES de gravar no card, e só se ninguém o tomou.
  // A ordem importa: se a gravação do card falhar depois disto, perdemos uma
  // atribuição; se fosse ao contrário, dois cards poderiam reivindicar o mesmo
  // clique e ambos receberiam a mesma sessão.
  const reivindicacao = await trx
    .updateTable('whatsapp_clicks')
    .set({ consumido_em: new Date(), card_id: cardId })
    .where('id', '=', decisao.cliqueId)
    .where('consumido_em', 'is', null)
    .executeTakeFirst()

  if (Number(reivindicacao.numUpdatedRows ?? 0) === 0) return { tipo: 'clique_tomado' }

  const dadosAtuais = (card.dados && typeof card.dados === 'object' ? card.dados : {}) as Record<string, unknown>
  await trx
    .updateTable('crm_cards')
    .set({
      dados: JSON.stringify({
        ...dadosAtuais,
        site_session_id: decisao.sessionId,
        // Marca COMO a referência chegou. Uma correlação por tempo é menos
        // certa que um id devolvido pelo CRM, e o relatório precisa saber a
        // diferença em vez de tratar as duas como o mesmo fato.
        site_session_origem: 'correlacao_clique_whatsapp',
      }) as unknown as Database['crm_cards']['dados'],
    })
    .where('id', '=', cardId)
    .execute()

  return { tipo: 'ligado', sessionId: decisao.sessionId, cliqueId: decisao.cliqueId }
}
