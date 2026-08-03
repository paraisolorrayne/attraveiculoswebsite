import { describe, it, expect } from 'vitest'
import { sanitizeResendTag } from '../notifications'

/**
 * A Resend rejeita o e-mail INTEIRO quando uma tag tem caractere fora de
 * [A-Za-z0-9_-]. Como o valor de `source` é a página de origem, a barra de
 * "/contato" derrubava toda notificação de lead — 68 tentativas e zero
 * entregas entre 12/02/2026 e 03/08/2026. Estes testes existem para que a
 * barra (ou qualquer outro caractere novo) nunca mais derrube um lead.
 */
describe('sanitizeResendTag', () => {
  it('troca a barra da página de origem, que era o que quebrava o envio', () => {
    expect(sanitizeResendTag('/contato')).toBe('_contato')
    expect(sanitizeResendTag('/financiamento')).toBe('_financiamento')
  })

  it('preserva o que a Resend aceita, sem mexer no que já é válido', () => {
    expect(sanitizeResendTag('contact_form')).toBe('contact_form')
    expect(sanitizeResendTag('vehicle-inquiry')).toBe('vehicle-inquiry')
    expect(sanitizeResendTag('lead2026')).toBe('lead2026')
  })

  it('neutraliza acento, espaço e pontuação de páginas com slug composto', () => {
    expect(sanitizeResendTag('/veículos/importação')).toBe('_ve_culos_importa__o')
    expect(sanitizeResendTag('guia grátis')).toBe('guia_gr_tis')
  })

  it('nunca devolve vazio, porque tag vazia também é recusada', () => {
    expect(sanitizeResendTag('')).toBe('desconhecido')
    expect(sanitizeResendTag('///')).toBe('___')
  })

  it('corta valores longos antes do limite da API', () => {
    expect(sanitizeResendTag('a'.repeat(500))).toHaveLength(200)
  })

  it('o resultado sempre passa na regra da Resend', () => {
    const entradas = ['/contato', '/veículos/bmw x6?utm_source=google', '', '🚗 lead']
    for (const e of entradas) {
      expect(sanitizeResendTag(e)).toMatch(/^[A-Za-z0-9_-]+$/)
    }
  })
})
