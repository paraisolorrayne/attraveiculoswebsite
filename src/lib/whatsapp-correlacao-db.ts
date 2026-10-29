/**
 * Liga o card do CRM ao clique de WhatsApp que o originou, por dois caminhos:
 *
 *   - `ligarPorCodigo`: o card traz o código invisível da mensagem (desde
 *     29/10/2026). Ligação certa; vale mais que a outra.
 *   - `ligarCliqueAoCard`: sem código, a decisão de `whatsapp-correlacao.ts`
 *     (mesmo carro, pouco antes). A função pura decide QUAL clique originou a
 *     conversa; aqui buscamos os candidatos, reivindicamos o clique e gravamos a
 *     sessão no card. A separação existe para que a regra, que é onde se erra,
 *     fique testável sem banco.
 */

import { sql, type Transaction } from 'kysely'
import type { Database } from './db/types'
import { correlacionarClique, JANELA_CORRELACAO_MS, type ResultadoCorrelacao } from './whatsapp-correlacao'
import { extrairRefSessao } from './atribuicao-receita'
import { codigoDoCampo } from './codigo-whatsapp'

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
  | { tipo: 'sem_veiculo' }
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

  // Candidatos com o CARRO de cada clique: o slug sai da própria página
  // (/veiculo/<slug>) ou, nos cards de listagem, da ficha daquele veículo que
  // alguém já abriu (o slug termina no id do anúncio). Marca e modelo vêm do
  // page view mais recente dessa ficha.
  const candidatos = await sql<{
    id: string
    session_db_id: string
    clicked_at: Date
    marca: string | null
    modelo: string | null
    slug: string | null
  }>`
    select w.id, w.session_db_id, w.clicked_at, v.vehicle_brand as marca, v.vehicle_model as modelo,
           coalesce(v.vehicle_slug, nullif(substring(w.page_path from '^/veiculo/([^/?#]+)'), '')) as slug
    from whatsapp_clicks w
    left join lateral (
      select pv.vehicle_brand, pv.vehicle_model, pv.vehicle_slug
      from visitor_page_views pv
      where pv.vehicle_slug is not null
        and (
          (w.vehicle_id is not null and pv.vehicle_slug like '%-' || w.vehicle_id)
          or pv.page_path = w.page_path
        )
      order by pv.viewed_at desc
      limit 1
    ) v on true
    where w.consumido_em is null
      and w.clicked_at >= ${desde}
      -- Folga igual à da função pura, para relógios dessincronizados entre o
      -- nosso servidor e o do CRM.
      and w.clicked_at <= ${new Date(quando.getTime() + 30_000)}
  `.execute(trx)

  // Payload cru do CRM: `veiculo_interesse` no contrato v2, `veiculo` no v1.
  const veiculoBruto = card.veiculo_interesse ?? card.veiculo
  const veiculoDoCard = typeof veiculoBruto === 'string' ? veiculoBruto : null
  const decisao: ResultadoCorrelacao = correlacionarClique(
    candidatos.rows.map(c => {
      const temVeiculo = c.marca || c.modelo || c.slug
      return {
        id: String(c.id),
        session_db_id: c.session_db_id,
        clicked_at: c.clicked_at,
        veiculo: temVeiculo ? { marca: c.marca, modelo: c.modelo, slug: c.slug } : null,
      }
    }),
    quando,
    veiculoDoCard,
  )

  if (decisao.tipo === 'sem_candidato') return { tipo: 'sem_candidato' }
  if (decisao.tipo === 'sem_veiculo') return { tipo: 'sem_veiculo' }
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

  // Marca COMO a referência chegou. Uma correlação por tempo é menos certa que
  // um id devolvido pelo CRM, e o relatório precisa saber a diferença em vez de
  // tratar as duas como o mesmo fato.
  // `_veiculo`: ligado por clique no MESMO carro (regra de 02/10/2026).
  // O valor antigo, `correlacao_clique_whatsapp`, era só por horário e foi
  // descartado na migration 20261002 — não confundir os dois.
  await gravarSessaoNoCard(trx, cardId, decisao.sessionId, 'correlacao_clique_veiculo')

  return { tipo: 'ligado', sessionId: decisao.sessionId, cliqueId: decisao.cliqueId }
}

/**
 * Acrescenta a sessão aos `dados` que o card JÁ tem no banco.
 *
 * O merge é no próprio banco (`||`), não a partir do payload: até 29/10/2026 a
 * correlação regravava `dados` a partir de `card.dados` do payload, que o CRM
 * não manda, e apagava os extras que o insert acabara de gravar.
 */
async function gravarSessaoNoCard(
  trx: Transaction<Database>,
  cardId: string,
  sessionId: string,
  origem: 'codigo_whatsapp' | 'correlacao_clique_veiculo',
): Promise<void> {
  const sessao = JSON.stringify({ site_session_id: sessionId, site_session_origem: origem })
  await sql`
    update crm_cards set dados = coalesce(dados, '{}'::jsonb) || ${sessao}::jsonb
    where id = ${cardId}
  `.execute(trx)
}

/**
 * Até quanto tempo antes do contato o clique do código ainda vale. O mesmo
 * prazo combinado com a Fykos para o aviso (docs/crm/codigo-invisivel-whatsapp.md).
 */
export const JANELA_CODIGO_MS = 7 * 24 * 60 * 60 * 1000

/** Folga depois do contato, para relógio adiantado no CRM ou card mandado em lote. */
const FOLGA_CODIGO_MS = 60 * 60 * 1000

export type ResultadoPorCodigo =
  | { tipo: 'ligado'; sessionId: string; cliqueId: string }
  /** O card não trouxe `codigo_whatsapp` válido. */
  | { tipo: 'sem_codigo' }
  /** Trouxe, mas nenhum clique gravado tem esse código: clique perdido ou de antes do deploy. */
  | { tipo: 'codigo_sem_clique'; codigo: number }

/**
 * Liga o card ao clique pelo código invisível que a Fykos leu na primeira
 * mensagem e devolveu no card (`codigo_whatsapp`).
 *
 * É a ligação determinística: o código saiu deste clique e de nenhum outro, então
 * não precisa das recusas da correlação por horário (carro, ambiguidade). Por
 * isso roda também em card que já existia: o código pode chegar numa
 * atualização, e aí substitui a correlação por horário, se houver, e devolve o
 * clique que ela tinha tomado.
 *
 * Um clique já tomado por OUTRO card fica com ele: o card atual se liga do
 * mesmo jeito (o código é a prova), mas sem tirar o registro de quem chegou antes.
 *
 * Nunca lança por regra de negócio; erro de banco sobe para o chamador, que
 * trata como best-effort, igual à correlação.
 */
export async function ligarPorCodigo(
  trx: Transaction<Database>,
  cardId: string,
  card: Record<string, unknown>,
): Promise<ResultadoPorCodigo> {
  const codigo = codigoDoCampo(card.codigo_whatsapp)
  if (codigo === null) return { tipo: 'sem_codigo' }

  const quando = instanteDoContato(card)
  const clique = (
    await sql<{ id: string; session_db_id: string }>`
      select w.id, w.session_db_id
      from whatsapp_clicks w
      where w.codigo_whatsapp = ${String(codigo)}::bigint
        and w.clicked_at >= ${new Date(quando.getTime() - JANELA_CODIGO_MS)}
        and w.clicked_at <= ${new Date(quando.getTime() + FOLGA_CODIGO_MS)}
      order by w.clicked_at desc
      limit 1
    `.execute(trx)
  ).rows[0]

  if (!clique) return { tipo: 'codigo_sem_clique', codigo }
  const cliqueId = String(clique.id)

  // Devolve o clique que a correlação por horário tinha dado a este card.
  await trx
    .updateTable('whatsapp_clicks')
    .set({ consumido_em: null, card_id: null })
    .where('card_id', '=', cardId)
    .where('id', '<>', cliqueId)
    .execute()

  await trx
    .updateTable('whatsapp_clicks')
    .set({ consumido_em: new Date(), card_id: cardId })
    .where('id', '=', cliqueId)
    .where('consumido_em', 'is', null)
    .execute()

  await gravarSessaoNoCard(trx, cardId, clique.session_db_id, 'codigo_whatsapp')

  return { tipo: 'ligado', sessionId: clique.session_db_id, cliqueId }
}
