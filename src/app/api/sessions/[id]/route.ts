/**
 * `GET /api/sessions/{session_id}` — a atribuição de uma visita, pelo token.
 *
 * Serve os leads que JÁ carregam o token: os de 23/07 a 05/08, que trazem o
 * `[ref: ...]` na mensagem, e os de formulário, que mandam `site_session_id`
 * no payload. Para todo o resto, que é a maioria, o CRM não tem token — usa
 * `/api/sessions/card/{card_id}`, com o id que ele mesmo emitiu.
 *
 * Contrato acordado no handoff de 27/09: cabeçalho `X-Api-Key`, resposta com
 * `first_touch` e `last_touch`.
 */
import type { NextRequest } from 'next/server'
import { conferirChave, respostaDeErroDaChave } from '@/lib/atribuicao-api-key'
import { atribuicaoPorSessao } from '@/lib/atribuicao-sessao-db'
import { tokenDeSessaoValido } from '@/lib/atribuicao-sessao'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const erro = respostaDeErroDaChave(conferirChave(request.headers.get('x-api-key')))
  if (erro) return erro

  const { id } = await params
  // Recusa cedo o que não tem forma de token: o mesmo alfabeto que o CRM já
  // valida do lado dele, então lixo não chega ao banco.
  if (!tokenDeSessaoValido(id)) {
    return Response.json({ erro: 'token de sessão fora do formato' }, { status: 400 })
  }

  const atribuicao = await atribuicaoPorSessao(id)
  // 404 e não um corpo vazio: sessão desconhecida e sessão sem origem são
  // coisas diferentes, e o CRM decide o que fazer em cada caso.
  if (!atribuicao) return Response.json({ erro: 'sessão não encontrada' }, { status: 404 })

  return Response.json(atribuicao)
}
