import { NextRequest, NextResponse } from 'next/server'
import { excluirLote } from '@/lib/boletos-db'
import { despacharAoFykos, ehUuid, exigirBoletos } from '../../acesso'

export const dynamic = 'force-dynamic'

// DELETE — desfaz uma planilha: apaga os boletos que ela criou (e só eles).
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const acesso = await exigirBoletos()
  if (acesso instanceof NextResponse) return acesso
  const { id } = await params
  if (!ehUuid(id)) return NextResponse.json({ error: 'Planilha inválida' }, { status: 400 })
  try {
    const apagados = await excluirLote(id)
    despacharAoFykos()
    return NextResponse.json({ apagados })
  } catch (e) {
    console.error('[boletos] desfazer planilha falhou:', e)
    return NextResponse.json({ error: 'Não foi possível desfazer.' }, { status: 500 })
  }
}
