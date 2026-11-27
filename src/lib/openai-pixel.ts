/**
 * Os eventos que o site manda ao pixel da OpenAI, no formato que o SDK aceita.
 *
 * O SDK (oaiq) só aceita os eventos documentados, cada um com um tipo e uma
 * lista fechada de campos. Nome fora da lista ou campo a mais faz o SDK
 * descartar o evento no navegador ("[oaiq] validation failed; event dropped").
 *
 * Foi o que aconteceu de 08/08 a 26/11/2026. Os formulários mandavam
 * `lead_submitted`, o WhatsApp mandava `whatsapp_click` com `content_id`, e o
 * SDK não conhece nenhum dos dois. Ninguém viu porque a CSP também bloqueava o
 * SDK (ver next.config.ts).
 *
 * O teste em src/lib/__tests__/openai-pixel.test.ts confere estes eventos
 * contra o validador do SDK.
 */
export const EVENTOS_OPENAI = {
  /** Toda página vista, inclusive nas trocas de rota sem recarregar. */
  paginaVista: { evento: 'page_viewed', parametros: { type: 'contents' } },
  /**
   * Formulário enviado. Clique no WhatsApp não é lead (27/11/2026) e não manda
   * isto. `customer_action` só aceita `type`, `amount` e `currency`; o carro não
   * tem campo nesse tipo.
   */
  lead: { evento: 'lead_created', parametros: { type: 'customer_action', amount: 0, currency: 'BRL' } },
} as const
