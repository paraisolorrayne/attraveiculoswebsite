import { NextRequest, NextResponse } from 'next/server'
import { hojeBRT } from '@/lib/boletos'
import { aplicarEventoDoFykos, lerEventoDoFykos } from '@/lib/boletos-fykos'
import { verifyCrmSignature } from '@/lib/crm-webhook'

export const dynamic = 'force-dynamic'

/**
 * POST — o Fykos conta o que aconteceu na conversa da Ângela com o cliente:
 * lembrete enviado ou não entregue, cliente respondeu, prometeu pagar em tal
 * dia, mandou o comprovante, pagamento confirmado.
 *
 * Autenticação: `X-Boletos-Signature` = HMAC-SHA256 (hex) do corpo bruto com
 * `BOLETOS_SITE_WEBHOOK_SECRET`. O mesmo `id_evento` entregue de novo responde
 * 200 sem mudar nada, então o Fykos pode repetir à vontade em caso de dúvida.
 *
 * Contrato e exemplos: docs/boletos/handoff-fykos-angela.md.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.BOLETOS_SITE_WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ error: 'Webhook de boletos não configurado.' }, { status: 503 })

  const bruto = await request.text()
  if (bruto.length > 100_000) return NextResponse.json({ error: 'Corpo grande demais.' }, { status: 413 })
  if (!verifyCrmSignature(bruto, request.headers.get('x-boletos-signature'), secret)) {
    // Sem dizer se faltou a assinatura ou se ela veio errada: quem sonda não aprende nada.
    console.error(`[boletos/webhook] recusado: assinatura ${request.headers.get('x-boletos-signature') ? 'inválida' : 'ausente'}, ${bruto.length} bytes`)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let corpo: unknown
  try {
    corpo = JSON.parse(bruto)
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }
  const lido = lerEventoDoFykos(corpo, hojeBRT())
  if ('erro' in lido) {
    console.error(`[boletos/webhook] recusado: ${lido.erro}`)
    return NextResponse.json({ error: lido.erro }, { status: 400 })
  }

  try {
    const resultado = await aplicarEventoDoFykos(lido.evento)
    if (resultado === 'boleto-nao-existe') {
      console.error(`[boletos/webhook] boleto ${lido.evento.boletoId} não existe (evento ${lido.evento.evento})`)
      return NextResponse.json({ error: 'Boleto não encontrado neste painel.' }, { status: 404 })
    }
    return NextResponse.json({ ok: true, repetido: resultado === 'repetido' })
  } catch (e) {
    console.error('[boletos/webhook] falhou ao aplicar:', e)
    // 500 pede nova tentativa: o evento não foi gravado.
    return NextResponse.json({ error: 'Falha ao gravar. Tente de novo.' }, { status: 500 })
  }
}
