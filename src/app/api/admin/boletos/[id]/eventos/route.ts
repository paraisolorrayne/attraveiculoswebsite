import { NextRequest, NextResponse } from 'next/server'
import { registrarEvento } from '@/lib/boletos-db'
import { ehUuid, exigirBoletos } from '../../acesso'

export const dynamic = 'force-dynamic'

/**
 * POST — anota o que foi feito no boleto.
 *
 *   { tipo: 'lembrete' }                    o WhatsApp foi aberto com o lembrete
 *   { tipo: 'contato', descricao: '...' }   ligação, conversa, combinado
 *
 * O painel não envia mensagem: quem envia é a pessoa, no WhatsApp dela. Aqui
 * fica só o registro de que o lembrete foi aberto.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const acesso = await exigirBoletos()
  if (acesso instanceof NextResponse) return acesso
  const { id } = await params
  if (!ehUuid(id)) return NextResponse.json({ error: 'Boleto inválido' }, { status: 400 })
  const corpo = (await request.json().catch(() => null)) as { tipo?: string; descricao?: string } | null
  const tipo = corpo?.tipo
  if (tipo !== 'lembrete' && tipo !== 'contato') return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
  const descricao = String(corpo?.descricao ?? '').trim().slice(0, 1000)
  if (tipo === 'contato' && !descricao) return NextResponse.json({ error: 'Escreva o que foi combinado.' }, { status: 400 })

  try {
    const boleto = await registrarEvento(id, tipo, tipo === 'lembrete' ? 'Lembrete aberto no WhatsApp' : descricao, acesso.autor)
    if (!boleto) return NextResponse.json({ error: 'Boleto não encontrado' }, { status: 404 })
    return NextResponse.json({ boleto })
  } catch (e) {
    console.error('[boletos] registrar evento falhou:', e)
    return NextResponse.json({ error: 'Não foi possível registrar.' }, { status: 500 })
  }
}
