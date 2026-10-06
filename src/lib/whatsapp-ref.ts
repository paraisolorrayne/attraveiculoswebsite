/**
 * Ponte de atribuição do WhatsApp: embute o `session_id` do visitante na
 * mensagem pré-preenchida do wa.me (`[ref: <id>]`) e o extrai de volta quando
 * o Fykos empurra a conversa pro webhook. Assim a conversa do WhatsApp se liga
 * à sessão do site → e à origem (utm/campanha/termo/gclid) já gravada em
 * `visitor_sessions`. Ver docs/MIGRACAO_POSTGRES_PURO.md (fatia de tracking).
 *
 * HISTÓRICO: o marcador saiu da mensagem em 05/08/2026 (identificador interno
 * no texto que o cliente envia), voltou em 05/10/2026 a pedido da Fykos e saiu
 * de novo no mesmo dia, ao aparecer na mensagem do cliente. A ligação passou a
 * ser responsabilidade da Fykos: o aviso de clique (aviso-clique-fykos.ts)
 * leva o session_id, o horário e o TEXTO exato pré-preenchido, e eles casam
 * com a 1ª mensagem da conversa. `appendWhatsAppRef` não é usado.
 *
 * `extractWhatsAppRef` lê o marcador de volta nos cards (os anteriores a 05/08
 * e os do dia 05/10).
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
