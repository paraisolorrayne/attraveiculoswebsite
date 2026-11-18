import { NextRequest, NextResponse } from 'next/server'
import { hojeBRT, linkDoWhatsapp, mensagemDeLembrete } from '@/lib/boletos'
import { buscarBoleto, registrarEvento } from '@/lib/boletos-db'
import { ehUuid, exigirBoletos } from '../../acesso'

export const dynamic = 'force-dynamic'

/**
 * GET — o botão "Lembrar" da lista. Anota o lembrete e manda o navegador para
 * o WhatsApp, com o número e o texto prontos.
 *
 * É o servidor que monta o link porque a lista mostra o telefone mascarado
 * (****0537) e não recebe o número inteiro. Abre numa aba nova, a partir de
 * um link comum: o Next não faz pré-carregamento de rota de API, então o
 * lembrete só é anotado quando alguém clica de verdade.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const acesso = await exigirBoletos()
  if (acesso instanceof NextResponse) return acesso
  const { id } = await params
  if (!ehUuid(id)) return NextResponse.json({ error: 'Boleto inválido' }, { status: 400 })

  try {
    const achado = await buscarBoleto(id)
    if (!achado) return NextResponse.json({ error: 'Boleto não encontrado' }, { status: 404 })
    const { boleto } = achado
    const pagina = new URL(`/admin/boletos/${id}`, request.nextUrl.origin)
    // Pago ou cancelado não tem o que lembrar: mostra o boleto em vez de abrir o WhatsApp.
    if (boleto.status === 'pago' || boleto.status === 'cancelado') return NextResponse.redirect(pagina)

    await registrarEvento(id, 'lembrete', 'Lembrete aberto no WhatsApp', acesso.autor)
    return NextResponse.redirect(linkDoWhatsapp(boleto.telefone, mensagemDeLembrete(boleto, hojeBRT())))
  } catch (e) {
    console.error('[boletos] lembrar falhou:', e)
    return NextResponse.json({ error: 'Não foi possível abrir o lembrete.' }, { status: 500 })
  }
}
