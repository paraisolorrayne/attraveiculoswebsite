/**
 * Ponte de atribuição do WhatsApp: embute o `session_id` do visitante na
 * mensagem pré-preenchida do wa.me (`[ref: <id>]`) e o extrai de volta quando
 * o Fykos empurra a conversa pro webhook. Assim a conversa do WhatsApp se liga
 * à sessão do site → e à origem (utm/campanha/termo/gclid) já gravada em
 * `visitor_sessions`. Ver docs/MIGRACAO_POSTGRES_PURO.md (fatia de tracking).
 *
 * HISTÓRICO: o marcador saiu da mensagem em 05/08/2026 (identificador interno
 * no texto que o cliente envia) e VOLTOU em 05/10/2026, por decisão da
 * Lorrayne a pedido da Fykos: sem ele a ligação conversa↔clique era por horário
 * e ligava só 16 de 501 cliques. Agora vai em TODO link de WhatsApp do site,
 * anexado no instante do clique pelo ouvinte global do
 * visitor-tracking-provider (`comRefNoLinkWhatsApp`), e não em cada botão.
 *
 * `extractWhatsAppRef` lê o marcador de volta nos cards (inclusive os
 * anteriores a 05/08).
 */

/** Casa `[ref: <token>]` — token = caracteres de sessão (letras, dígitos, - _). */
const REF_RE = /\[ref:\s*([\w-]+)\]/i

/**
 * Anexa `[ref: <sessionId>]` ao fim da mensagem, se ainda não houver um ref e
 * o sessionId existir. Idempotente (não duplica o marcador).
 */
export function appendWhatsAppRef(message: string, sessionId?: string | null): string {
  const id = sessionId?.trim()
  if (!id || REF_RE.test(message)) return message
  return `${message} [ref: ${id}]`
}

/** Extrai o `session_id` do primeiro `[ref: ...]` no texto, ou null. */
export function extractWhatsAppRef(text: string | null | undefined): string | null {
  if (!text) return null
  const m = text.match(REF_RE)
  return m ? m[1].trim() : null
}

const HOST_WHATSAPP = /^(?:api\.)?wa\.me$|^(?:www\.|api\.)?whatsapp\.com$/i

function decodificar(texto: string): string {
  try {
    return decodeURIComponent(texto.replace(/\+/g, ' '))
  } catch {
    return texto
  }
}

/**
 * Link de WhatsApp com `[ref: <sessionId>]` no fim do texto pré-preenchido.
 *
 * Mexe só no parâmetro `text`, e SEM reescrever o resto da URL: o texto
 * original fica com a codificação que veio (`%20`), porque reserializar pelo
 * URLSearchParams trocaria espaço por `+`, que alguns WhatsApp mostram literal.
 * Link sem texto ganha só o marcador. Idempotente; fora do WhatsApp ou sem
 * sessão, devolve o link como veio.
 */
export function comRefNoLinkWhatsApp(href: string, sessionId?: string | null): string {
  const id = sessionId?.trim()
  if (!id) return href
  let url: URL
  try {
    url = new URL(href)
  } catch {
    return href
  }
  if (!/^https?:$/.test(url.protocol) || !HOST_WHATSAPP.test(url.hostname)) return href

  const marcador = encodeURIComponent(`[ref: ${id}]`)
  const [semHash, hash] = href.split('#')
  const [base, query = ''] = semHash.split('?')
  const partes = query.split('&').filter(Boolean)
  const i = partes.findIndex(p => p.startsWith('text='))
  if (i >= 0) {
    const bruto = partes[i].slice('text='.length)
    if (REF_RE.test(decodificar(bruto))) return href
    partes[i] = `text=${bruto}${bruto ? '%20' : ''}${marcador}`
  } else {
    partes.push(`text=${marcador}`)
  }
  return `${base}?${partes.join('&')}${hash !== undefined ? `#${hash}` : ''}`
}
