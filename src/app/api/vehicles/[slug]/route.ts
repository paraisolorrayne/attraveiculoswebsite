import { NextRequest, NextResponse } from 'next/server'
import { getVehicleBySlug } from '@/lib/autoconf-api'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ slug: string }>
}

/**
 * GET /api/vehicles/{slug}
 *
 * Um carro do estoque, lido ao vivo da AutoConf (`POST /veiculo`, cache de
 * 5 min). Aceita o slug da ficha ou só o id da AutoConf (`/api/vehicles/1142317`).
 *
 * É a fonte do agente de atendimento para o que a lista da AutoConf não traz:
 * `data.ficha` sai da Descrição Customizada preenchida no molde, já filtrada
 * (sem garantia, procedência, preço ou contato). `null` quando o carro ainda
 * não tem o molde; campo sem dado confirmado vem `null` ou lista vazia.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params

    // getVehicleBySlug extracts the ID from slug and uses /veiculo endpoint
    const vehicle = await getVehicleBySlug(slug)

    if (!vehicle) {
      return NextResponse.json(
        { success: false, message: 'Veículo não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: vehicle,
    })
  } catch (error) {
    console.error('Vehicle API error:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

