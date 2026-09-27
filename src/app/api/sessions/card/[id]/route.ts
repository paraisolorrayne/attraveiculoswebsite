/**
 * `GET /api/sessions/card/{card_id}` — a atribuição de um lead, pelo id do card.
 *
 * É esta que resolve o problema do handoff de 27/09. Desde 05/08 o site não
 * põe mais o identificador de sessão na mensagem que o comprador manda (commit
 * 0f337c9), então o CRM não tem token nenhum para consultar. Mas ele tem o id
 * do card que ELE MESMO mandou para `/api/webhook/fykos-crm` — e é por esse id
 * que a correlação clique↔conversa foi gravada aqui.
 *
 * Ou seja: a atribuição volta a chegar ao CRM sem devolver identificador
 * interno para dentro da conversa do cliente.
 *
 * A resposta traz `ligacao`, que diz COMO a visita foi ligada ao lead —
 * `correlacao_clique_whatsapp` é uma correspondência por janela de tempo, menos
 * certa que um marcador explícito. O relatório precisa saber a diferença.
 */
import type { NextRequest } from 'next/server'
import { conferirChave, respostaDeErroDaChave } from '@/lib/atribuicao-api-key'
import { atribuicaoPorCard } from '@/lib/atribuicao-sessao-db'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const erro = respostaDeErroDaChave(conferirChave(request.headers.get('x-api-key')))
  if (erro) return erro

  const { id } = await params
  if (!id || id.length > 128) {
    return Response.json({ erro: 'id de card inválido' }, { status: 400 })
  }

  const r = await atribuicaoPorCard(id)

  // Card conhecido sem visita ligada é o caso NORMAL: a correlação se recusa a
  // escolher quando há mais de uma sessão candidata na janela. Card
  // desconhecido é outra coisa — o webhook não entregou — e o `motivo` separa
  // os dois para o CRM não investigar o lado errado.
  if (r.tipo === 'card_desconhecido') {
    return Response.json({ erro: 'card desconhecido', motivo: 'card_desconhecido' }, { status: 404 })
  }
  if (r.tipo === 'sem_correlacao') {
    return Response.json(
      { erro: 'card sem visita correlacionada', motivo: 'sem_correlacao' },
      { status: 404 },
    )
  }

  return Response.json(r.atribuicao)
}
