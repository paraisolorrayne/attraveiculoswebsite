import { NextRequest, NextResponse } from 'next/server'
import { adminComAcessoA } from '@/lib/auth/guard-api'

export const dynamic = 'force-dynamic'
// A imagem de 1080x1920 chega em base64 (~420 KB). O endpoint respondeu em
// ~2,4s no teste, mas a documentação da Avisa avisa que ele pode demorar bem
// mais que os outros — daí a folga.
export const maxDuration = 60

const AVISA_API_URL = process.env.AVISA_API_URL || 'https://www.avisaapi.com.br/api'

/**
 * User-Agent de navegador, obrigatório.
 *
 * A Avisa fica atrás de Cloudflare, que bloqueia por assinatura do cliente. Sem
 * um UA de navegador a resposta é `403 error code: 1010` em ~0,2s — que parece
 * token inválido e manda a investigação para o lado errado. Com o MESMO token e
 * o MESMO payload, trocar só o UA faz passar. Verificado em 04/08/2026.
 */
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

/** Só aceita o que o canvas do gerador produz. */
const PREFIXO_JPEG = 'data:image/jpeg;base64,'
/** Teto de segurança: a peça padrão dá ~420 KB em base64. */
const LIMITE_BYTES = 8 * 1024 * 1024

/**
 * POST — publica um criativo no Status do WhatsApp (24h) via Avisa.
 *
 * O token NUNCA passa pelo navegador: o gerador é HTML servido ao operador, e
 * um token no cliente é um token vazado. Ele vive em env e só o servidor o vê —
 * mesmo padrão do proxy do rembg.
 *
 * Usa AVISA_STATUS_TOKEN, e não AVISA_API_TOKEN, de propósito: a segunda liga
 * TAMBÉM as notificações de lead por WhatsApp em src/lib/notifications.ts.
 * Publicar status e notificar lead são decisões separadas, e ligar uma não pode
 * ligar a outra sem querer.
 */
export async function POST(request: NextRequest) {
  const admin = await adminComAcessoA('/admin/gerador-criativos')
  if (!admin) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const token = process.env.AVISA_STATUS_TOKEN?.trim()
  if (!token) {
    return NextResponse.json(
      { error: 'AVISA_STATUS_TOKEN não configurada no servidor.' },
      { status: 503 },
    )
  }

  let corpo: { image?: unknown; caption?: unknown }
  try {
    corpo = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const image = typeof corpo.image === 'string' ? corpo.image : ''
  const caption = typeof corpo.caption === 'string' ? corpo.caption.trim() : ''

  if (!image.startsWith(PREFIXO_JPEG)) {
    return NextResponse.json(
      { error: 'image precisa ser um data URL JPEG (data:image/jpeg;base64,...)' },
      { status: 400 },
    )
  }
  if (image.length > LIMITE_BYTES) {
    return NextResponse.json(
      { error: `Imagem grande demais (${Math.round(image.length / 1024)} KB).` },
      { status: 413 },
    )
  }
  if (!caption) {
    return NextResponse.json({ error: 'caption vazia' }, { status: 400 })
  }

  try {
    const resposta = await fetch(`${AVISA_API_URL.replace(/\/$/, '')}/status/image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'User-Agent': USER_AGENT,
      },
      body: JSON.stringify({ image, caption }),
      signal: AbortSignal.timeout(55_000),
    })

    const texto = await resposta.text()
    let dados: Record<string, unknown> | null = null
    try { dados = JSON.parse(texto) } catch { /* resposta não-JSON (ex.: erro do Cloudflare) */ }

    if (!resposta.ok || dados?.status !== true) {
      // console.warn e não .log: o build de produção remove console.log.
      console.warn('[Status WhatsApp] falhou:', resposta.status, texto.slice(0, 300))
      return NextResponse.json(
        {
          error: 'A Avisa recusou a publicação.',
          httpStatus: resposta.status,
          detalhe: texto.slice(0, 300),
        },
        { status: 502 },
      )
    }

    // Comprovante de publicação — precisa sobreviver ao build.
    const envio = (dados?.data as Record<string, unknown> | undefined)?.response as
      | { data?: { Resp?: { ID?: string; Sender?: string; Timestamp?: string } } }
      | undefined
    const resp = envio?.data?.Resp
    console.warn('[Status WhatsApp] publicado:', JSON.stringify({
      id: resp?.ID, sender: resp?.Sender, timestamp: resp?.Timestamp,
      operador: admin.email,
    }))

    return NextResponse.json({
      ok: true,
      id: resp?.ID ?? null,
      sender: resp?.Sender ?? null,
      timestamp: resp?.Timestamp ?? null,
    })
  } catch (erro) {
    const msg = erro instanceof Error ? erro.message : String(erro)
    console.warn('[Status WhatsApp] erro de rede:', msg)
    return NextResponse.json(
      { error: 'Não foi possível falar com a Avisa.', detalhe: msg },
      { status: 502 },
    )
  }
}
