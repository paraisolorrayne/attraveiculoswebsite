import { describe, it, expect } from 'vitest'
import { versaoNaLinhaDoModelo } from '../featured-vehicle-hero'

describe('versão na linha do modelo, no destaque de /veiculos', () => {
  it('versão curta vai junto do modelo', () => {
    expect(versaoNaLinhaDoModelo({ model: '296', version: 'GTS' })).toBe(true)
    expect(versaoNaLinhaDoModelo({ model: 'Corvette', version: 'Z06' })).toBe(true)
    expect(versaoNaLinhaDoModelo({ model: 'F-150', version: 'Raptor R' })).toBe(true)
  })

  it('versão longa fica na linha de baixo', () => {
    expect(versaoNaLinhaDoModelo({ model: 'TEMERÁRIO', version: 'V8 Bi-Turbo' })).toBe(false)
    expect(versaoNaLinhaDoModelo({ model: 'S-63', version: 'AMG S E Performance Aut.' })).toBe(false)
  })

  it('sem versão, nada a juntar', () => {
    expect(versaoNaLinhaDoModelo({ model: 'Panamera', version: null })).toBe(false)
    expect(versaoNaLinhaDoModelo({ model: 'Panamera', version: '  ' })).toBe(false)
  })
})
