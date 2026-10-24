import { describe, it, expect } from 'vitest'
import { semTravessao } from '../sem-travessao'

describe('texto sem travessão', () => {
  it('par na mesma frase vira vírgulas', () => {
    expect(semTravessao('Cada etapa — da escolha à entrega — é cuidada.')).toBe('Cada etapa, da escolha à entrega, é cuidada.')
  })
  it('travessão solto vira vírgula', () => {
    expect(semTravessao('Baixíssima rodagem — praticamente novo')).toBe('Baixíssima rodagem, praticamente novo')
    expect(semTravessao('Um carro raro – e bem cuidado.')).toBe('Um carro raro, e bem cuidado.')
  })
  it('intervalo sem espaço fica', () => {
    expect(semTravessao('0–100 km/h em 2,9 s')).toBe('0–100 km/h em 2,9 s')
  })
  it('vazio e nulo passam direto', () => {
    expect(semTravessao('')).toBe('')
    expect(semTravessao(null)).toBeNull()
  })
})
