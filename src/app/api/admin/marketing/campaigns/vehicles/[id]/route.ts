import { NextRequest, NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/admin-auth-supabase'
import { canAccessRoute } from '@/lib/auth/roles'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/** Mesmas colunas do board — qualquer outro valor é recusado pelo banco. */
const STATUS_VALIDOS = ['publicada', 'encerrada_ganho', 'encerrada_desempenho'] as const
type StatusVeiculo = (typeof STATUS_VALIDOS)[number]

/**
 * PATCH — move UM veículo entre as colunas do board.
 *
 * O status mora no veículo porque as colunas descrevem o ciclo de um anúncio:
 * o carro sai do ar porque vendeu (ganho) ou porque não performou. Arrastar um
 * card não deve mexer nos outros anúncios da mesma campanha.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!canAccessRoute(admin.role, '/admin/marketing', admin.secoes)) {
      return NextResponse.json({ error: 'Sem permissão para gerenciar campanhas' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const status = body.status as StatusVeiculo

    if (!STATUS_VALIDOS.includes(status)) {
      return NextResponse.json(
        { error: `status inválido: ${String(body.status)}` },
        { status: 400 },
      )
    }

    // Voltar um card para "Publicada" limpa o encerramento: manter a data de
    // fim num anúncio que voltou ao ar deixaria o histórico mentindo.
    const encerrado = status !== 'publicada'
    const hoje = new Date().toISOString().slice(0, 10)

    const atualizado = await db.updateTable('campaign_vehicles')
      .set({
        status,
        ended_date: encerrado ? hoje : null,
        end_reason: encerrado
          ? (status === 'encerrada_ganho' ? 'ganho' : 'desempenho')
          : null,
      })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirst()

    if (!atualizado) {
      return NextResponse.json({ error: 'Veículo não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ vehicle: atualizado })
  } catch (error) {
    console.error('[campaign vehicle PATCH]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
