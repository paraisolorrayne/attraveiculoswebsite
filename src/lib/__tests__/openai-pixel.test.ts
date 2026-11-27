import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { EVENTOS_OPENAI } from '@/lib/openai-pixel'

/**
 * O contrato do SDK do pixel da OpenAI (oaiq 0.1.105, bzrcdn.openai.com/sdk/oaiq.min.js),
 * copiado do validador dele em 26/11/2026.
 *
 * Evento fora desta lista, ou com campo fora da lista do tipo, é descartado no
 * navegador ("[oaiq] validation failed; event dropped"). Os formulários mandavam
 * `lead_submitted` e o WhatsApp mandava `whatsapp_click` com `content_id`, e nada
 * disso existe no SDK.
 */
const TIPO_DO_EVENTO: Record<string, string> = {
  appointment_scheduled: 'customer_action',
  checkout_started: 'contents',
  contents_viewed: 'contents',
  custom: 'custom',
  items_added: 'contents',
  lead_created: 'customer_action',
  order_created: 'contents',
  page_viewed: 'contents',
  registration_completed: 'customer_action',
  subscription_created: 'plan_enrollment',
  trial_started: 'plan_enrollment',
}

const CAMPOS_DO_TIPO: Record<string, string[]> = {
  contents: ['type', 'amount', 'currency', 'contents'],
  custom: ['type', 'plan_id', 'amount', 'currency', 'contents'],
  customer_action: ['type', 'amount', 'currency'],
  plan_enrollment: ['type', 'plan_id', 'amount', 'currency', 'contents'],
}

/** Os problemas que o validador do SDK apontaria, na mesma ordem de checagem. */
function problemas(evento: string, parametros: Record<string, unknown>): string[] {
  const tipo = TIPO_DO_EVENTO[evento]
  if (!tipo) return [`${evento}: evento que o SDK não conhece`]
  const lista: string[] = []
  if (parametros.type !== tipo) lista.push(`${evento}: type deveria ser "${tipo}"`)
  for (const campo of Object.keys(parametros)) {
    if (!CAMPOS_DO_TIPO[tipo].includes(campo)) lista.push(`${evento}: campo ${campo} não existe no tipo ${tipo}`)
  }
  if ('amount' in parametros && !Number.isInteger(parametros.amount)) lista.push(`${evento}: amount tem de ser inteiro`)
  if ('amount' in parametros && !('currency' in parametros)) lista.push(`${evento}: amount sem currency`)
  if ('currency' in parametros && !/^[A-Za-z]{3}$/.test(String(parametros.currency))) lista.push(`${evento}: currency fora do ISO 4217`)
  return lista
}

function arquivosDoSite(pasta: string): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = path.join(pasta, nome)
    if (statSync(caminho).isDirectory()) return nome === '__tests__' ? [] : arquivosDoSite(caminho)
    return /\.tsx?$/.test(nome) ? [caminho] : []
  })
}

describe('eventos do pixel da OpenAI', () => {
  it.each(Object.entries(EVENTOS_OPENAI))('%s passa no validador do SDK', (_nome, { evento, parametros }) => {
    expect(problemas(evento, parametros)).toEqual([])
  })

  it('o lead é lead_created, o evento do SDK para contato novo', () => {
    expect(EVENTOS_OPENAI.lead.evento).toBe('lead_created')
  })

  it('nenhuma chamada no site usa nome de evento que o SDK descarta', () => {
    const src = path.resolve(__dirname, '../..')
    const desconhecidos = arquivosDoSite(src).flatMap((arquivo) =>
      [...readFileSync(arquivo, 'utf8').matchAll(/medirOpenAI\(\s*['"`]([^'"`]+)['"`]/g)]
        .map(([, evento]) => evento)
        .filter((evento) => !TIPO_DO_EVENTO[evento])
        .map((evento) => `${path.relative(src, arquivo)}: ${evento}`),
    )
    expect(desconhecidos).toEqual([])
  })
})
