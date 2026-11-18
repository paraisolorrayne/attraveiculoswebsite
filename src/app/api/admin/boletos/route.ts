import { NextRequest, NextResponse } from 'next/server'
import { chaveDeDuplicata, hojeBRT, validarBoleto } from '@/lib/boletos'
import { criarBoleto, duplicatasNoBanco, listarBoletos, resumoDosBoletos } from '@/lib/boletos-db'
import { estadoDoFykos } from '@/lib/boletos-fykos'
import { despacharAoFykos, exigirBoletos } from './acesso'

export const dynamic = 'force-dynamic'

// GET — a lista com os filtros da URL e o resumo do topo da tela.
export async function GET(request: NextRequest) {
  const acesso = await exigirBoletos()
  if (acesso instanceof NextResponse) return acesso
  const p = request.nextUrl.searchParams
  const hoje = hojeBRT()
  try {
    const [lista, resumo, fykos] = await Promise.all([
      listarBoletos(
        { q: p.get('q') ?? '', sit: p.get('sit') ?? '', lote: p.get('lote') ?? '', ordem: p.get('ordem') ?? '', pagina: Number(p.get('pagina')) || 1 },
        hoje,
      ),
      resumoDosBoletos(hoje),
      estadoDoFykos(),
    ])
    return NextResponse.json({ ...lista, resumo, hoje, fykos })
  } catch (e) {
    console.error('[boletos] listar falhou:', e)
    return NextResponse.json({ error: 'Não foi possível carregar os boletos.' }, { status: 500 })
  }
}

// POST — cadastra um boleto. Igual a outro já cadastrado, pede confirmação (`forcar`).
export async function POST(request: NextRequest) {
  const acesso = await exigirBoletos()
  if (acesso instanceof NextResponse) return acesso
  const corpo = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!corpo) return NextResponse.json({ error: 'Corpo inválido' }, { status: 400 })

  const lido = validarBoleto(corpo, hojeBRT())
  if ('erros' in lido) return NextResponse.json({ error: 'Confira os campos.', erros: lido.erros }, { status: 400 })
  try {
    if (corpo.forcar !== true) {
      const existentes = await duplicatasNoBanco([lido.dados])
      if (existentes.has(chaveDeDuplicata(lido.dados))) {
        return NextResponse.json(
          { error: 'Já existe um boleto com este telefone, vencimento e valor.', duplicado: true },
          { status: 409 },
        )
      }
    }
    const boleto = await criarBoleto(lido.dados, acesso.autor)
    despacharAoFykos()
    return NextResponse.json({ boleto }, { status: 201 })
  } catch (e) {
    console.error('[boletos] cadastrar falhou:', e)
    return NextResponse.json({ error: 'Não foi possível cadastrar o boleto.' }, { status: 500 })
  }
}
