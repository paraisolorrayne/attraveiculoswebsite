import { NextRequest, NextResponse } from 'next/server'
import { hojeBRT, lerData, STATUS_DO_BOLETO, validarBoleto, type StatusBoleto } from '@/lib/boletos'
import { atualizarBoleto, buscarBoleto, excluirBoleto, type MudancasDoBoleto } from '@/lib/boletos-db'
import { despacharAoFykos, ehUuid, exigirBoletos } from '../acesso'

export const dynamic = 'force-dynamic'

type Contexto = { params: Promise<{ id: string }> }

// GET — o boleto e o histórico do que foi feito nele.
export async function GET(_request: NextRequest, { params }: Contexto) {
  const acesso = await exigirBoletos()
  if (acesso instanceof NextResponse) return acesso
  const { id } = await params
  if (!ehUuid(id)) return NextResponse.json({ error: 'Boleto inválido' }, { status: 400 })
  try {
    const achado = await buscarBoleto(id)
    if (!achado) return NextResponse.json({ error: 'Boleto não encontrado' }, { status: 404 })
    return NextResponse.json({ ...achado, hoje: hojeBRT() })
  } catch (e) {
    console.error('[boletos] abrir falhou:', e)
    return NextResponse.json({ error: 'Não foi possível abrir o boleto.' }, { status: 500 })
  }
}

/**
 * PATCH — muda o status (`{ status, pago_em? }`), descarta um comprovante que
 * não servia (`{ descartar_comprovante: true }`) ou corrige os dados
 * (`{ nome, telefone, vencimento, valor, email, descricao }`, todos juntos,
 * como o formulário manda). Cada mudança entra no histórico.
 */
export async function PATCH(request: NextRequest, { params }: Contexto) {
  const acesso = await exigirBoletos()
  if (acesso instanceof NextResponse) return acesso
  const { id } = await params
  if (!ehUuid(id)) return NextResponse.json({ error: 'Boleto inválido' }, { status: 400 })
  const corpo = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!corpo) return NextResponse.json({ error: 'Corpo inválido' }, { status: 400 })

  const hoje = hojeBRT()
  const mudancas: MudancasDoBoleto = {}
  if (corpo.status !== undefined) {
    if (!STATUS_DO_BOLETO.includes(corpo.status as StatusBoleto)) return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
    mudancas.status = corpo.status as StatusBoleto
    if (corpo.pago_em) {
      const data = lerData(corpo.pago_em, hoje)
      if ('erro' in data) return NextResponse.json({ error: 'Data de pagamento inválida' }, { status: 400 })
      // Pagamento é fato passado: data futura pararia os lembretes de um boleto que ninguém pagou.
      if (data.data > hoje) return NextResponse.json({ error: 'A data do pagamento não pode ser no futuro.' }, { status: 400 })
      mudancas.pago_em = data.data
    }
  }
  if (corpo.descartar_comprovante === true) mudancas.descartarComprovante = true
  if (corpo.nome !== undefined) {
    const lido = validarBoleto(corpo, hoje)
    if ('erros' in lido) return NextResponse.json({ error: 'Confira os campos.', erros: lido.erros }, { status: 400 })
    Object.assign(mudancas, lido.dados)
  }
  if (Object.keys(mudancas).length === 0) return NextResponse.json({ error: 'Nada para alterar' }, { status: 400 })

  try {
    const boleto = await atualizarBoleto(id, mudancas, acesso.autor, hoje)
    if (!boleto) return NextResponse.json({ error: 'Boleto não encontrado' }, { status: 404 })
    despacharAoFykos()
    return NextResponse.json({ boleto })
  } catch (e) {
    console.error('[boletos] atualizar falhou:', e)
    return NextResponse.json({ error: 'Não foi possível salvar.' }, { status: 500 })
  }
}

// DELETE — apaga o boleto e o histórico dele. Para o que foi cadastrado por engano.
export async function DELETE(_request: NextRequest, { params }: Contexto) {
  const acesso = await exigirBoletos()
  if (acesso instanceof NextResponse) return acesso
  const { id } = await params
  if (!ehUuid(id)) return NextResponse.json({ error: 'Boleto inválido' }, { status: 400 })
  try {
    if (!(await excluirBoleto(id))) return NextResponse.json({ error: 'Boleto não encontrado' }, { status: 404 })
    despacharAoFykos()
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[boletos] excluir falhou:', e)
    return NextResponse.json({ error: 'Não foi possível excluir.' }, { status: 500 })
  }
}
