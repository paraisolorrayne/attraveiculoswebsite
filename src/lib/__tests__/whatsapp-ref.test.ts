import { describe, it, expect } from 'vitest'
import { appendWhatsAppRef, extractWhatsAppRef } from '../whatsapp-ref'

describe('appendWhatsAppRef', () => {
  it('anexa o ref da sessão ao fim da mensagem', () => {
    expect(appendWhatsAppRef('Vim do site e tenho interesse no Porsche 911', '1721481234567-a1b2c3'))
      .toBe('Vim do site e tenho interesse no Porsche 911 [ref: 1721481234567-a1b2c3]')
  })

  it('sem sessionId → mensagem intacta', () => {
    expect(appendWhatsAppRef('Olá!', undefined)).toBe('Olá!')
    expect(appendWhatsAppRef('Olá!', '')).toBe('Olá!')
    expect(appendWhatsAppRef('Olá!', '   ')).toBe('Olá!')
  })

  it('idempotente — não duplica se já houver ref', () => {
    const withRef = 'Olá! [ref: abc-123]'
    expect(appendWhatsAppRef(withRef, 'outro-999')).toBe(withRef)
  })
})

describe('extractWhatsAppRef', () => {
  it('extrai o session_id do marcador', () => {
    expect(extractWhatsAppRef('Vim do site... [ref: 1721481234567-a1b2c3]'))
      .toBe('1721481234567-a1b2c3')
  })

  it('ida e volta bate (append → extract)', () => {
    const id = '1721481234567-zz9x8y'
    expect(extractWhatsAppRef(appendWhatsAppRef('Oi', id))).toBe(id)
  })

  it('sem marcador → null', () => {
    expect(extractWhatsAppRef('Olá, quero informações')).toBeNull()
    expect(extractWhatsAppRef(null)).toBeNull()
    expect(extractWhatsAppRef(undefined)).toBeNull()
  })
})
