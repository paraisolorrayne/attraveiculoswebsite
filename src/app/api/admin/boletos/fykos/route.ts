import { NextResponse } from 'next/server'
import { reenviarAbertosAoFykos } from '@/lib/boletos-db'
import { configuracaoBoletosFykos } from '@/lib/boletos-fykos'
import { despacharAoFykos, exigirBoletos } from '../acesso'

export const dynamic = 'force-dynamic'

/**
 * POST — manda ao Fykos todos os boletos em aberto. Para o dia em que a
 * integração é ligada com boletos já cadastrados, ou para ressincronizar. O
 * Fykos trata cada boleto pelo id, então reenviar não duplica lembrete.
 */
export async function POST() {
  const acesso = await exigirBoletos()
  if (acesso instanceof NextResponse) return acesso
  if (!configuracaoBoletosFykos()) return NextResponse.json({ error: 'A ligação com o Fykos não está configurada neste servidor.' }, { status: 503 })
  try {
    const enviados = await reenviarAbertosAoFykos()
    despacharAoFykos()
    return NextResponse.json({ enviados })
  } catch (e) {
    console.error('[boletos] reenviar ao Fykos falhou:', e)
    return NextResponse.json({ error: 'Não foi possível reenviar.' }, { status: 500 })
  }
}
