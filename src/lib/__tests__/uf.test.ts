import { describe, it, expect } from 'vitest'
import { siglaDoEstado } from '../uf'

/**
 * Este texto vai para uma mensagem que o CLIENTE envia à loja. Errar aqui não
 * quebra nada tecnicamente — só faz a Attra parecer desleixada na primeira
 * frase que o comprador escreve. Os casos abaixo são os valores reais que a
 * geolocalização por IP devolveu no banco.
 */
describe('sigla do estado a partir da geolocalização', () => {
  it('traduz o valor em inglês que causou o relato', () => {
    // "sou de Brasília/Federal District" — mistura de idioma, reportado em 05/08/2026.
    expect(siglaDoEstado('Federal District')).toBe('DF')
    expect(siglaDoEstado('Distrito Federal')).toBe('DF')
  })

  it('resolve as duplicatas com e sem acento que convivem na base', () => {
    expect(siglaDoEstado('São Paulo')).toBe('SP')
    expect(siglaDoEstado('Sao Paulo')).toBe('SP')
    expect(siglaDoEstado('Goiás')).toBe('GO')
    expect(siglaDoEstado('Goias')).toBe('GO')
    expect(siglaDoEstado('Ceará')).toBe('CE')
    expect(siglaDoEstado('Ceara')).toBe('CE')
  })

  it('cobre os estados de maior volume da Attra', () => {
    expect(siglaDoEstado('Minas Gerais')).toBe('MG')
    expect(siglaDoEstado('Rio de Janeiro')).toBe('RJ')
    expect(siglaDoEstado('Rio Grande do Sul')).toBe('RS')
    expect(siglaDoEstado('Paraná')).toBe('PR')
    expect(siglaDoEstado('Espírito Santo')).toBe('ES')
    expect(siglaDoEstado('Santa Catarina')).toBe('SC')
  })

  it('não confunde Mato Grosso com Mato Grosso do Sul', () => {
    expect(siglaDoEstado('Mato Grosso')).toBe('MT')
    expect(siglaDoEstado('Mato Grosso do Sul')).toBe('MS')
  })

  it('aceita sigla que já venha pronta', () => {
    expect(siglaDoEstado('MG')).toBe('MG')
    expect(siglaDoEstado('df')).toBe('DF')
  })

  it('preserva o que não reconhece, em vez de apagar', () => {
    // Região estrangeira ou nome novo continua aparecendo na mensagem.
    expect(siglaDoEstado('Lisboa')).toBe('Lisboa')
    expect(siglaDoEstado('Florida')).toBe('Florida')
  })

  it('lida com vazio e nulo sem quebrar a mensagem', () => {
    expect(siglaDoEstado('')).toBe('')
    expect(siglaDoEstado(null)).toBe('')
    expect(siglaDoEstado(undefined)).toBe('')
    expect(siglaDoEstado('   ')).toBe('')
  })
})
