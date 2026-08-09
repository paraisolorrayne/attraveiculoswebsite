import { describe, it, expect } from 'vitest'
import { resolveBrand } from '../vehicle-fallbacks'

/**
 * Casos reais do retorno do AutoConf, conferidos em 08/08/2026 contra a API.
 *
 * O AutoConf devolve `marca_nome: null` em parte do estoque e mantém
 * `marca_apelido` e `marca_slug` preenchidos — medido: 71/71 nos dois, 68/71 no
 * nome. Líamos só o nome, e três veículos saíam sem marca em todo o site.
 */
describe('resolveBrand — marca a partir do AutoConf', () => {
  it('prefere o apelido, que é a grafia cadastrada pela loja', () => {
    expect(
      resolveBrand({ marca_apelido: 'Porsche', marca_nome: 'Porsche', marca_slug: 'porsche' }),
    ).toBe('Porsche')
  })

  it('o apelido corrige a caixa alta que vem no nome', () => {
    // Único caso do estoque em que apelido e nome divergem.
    expect(
      resolveBrand({ marca_apelido: 'Lamborghini', marca_nome: 'LAMBORGHINI', marca_slug: 'lamborghini' }),
    ).toBe('Lamborghini')
  })

  it('não troca "Mercedes" por "Mercedes-Benz" pelas costas', () => {
    // O slug diz 'mercedes-benz', o apelido diz 'Mercedes'. Vale o apelido:
    // trocar mudaria a grafia de 8 veículos sem ninguém ter pedido.
    expect(
      resolveBrand({ marca_apelido: 'Mercedes', marca_nome: 'Mercedes', marca_slug: 'mercedes-benz' }),
    ).toBe('Mercedes')
  })

  describe('os três que saíam sem marca', () => {
    it('Cybertruck 2024 (id 1070715) → Tesla', () => {
      expect(
        resolveBrand({ marca_apelido: 'Tesla', marca_nome: null, marca_slug: 'tesla', modelopai_nome: 'Cybertruck' }),
      ).toBe('Tesla')
    })

    it('GLE 63s AMG 2023 (id 1005152) → Mercedes', () => {
      expect(
        resolveBrand({ marca_apelido: 'Mercedes', marca_nome: null, marca_slug: 'mercedes-benz', modelopai_nome: 'GLE 63s' }),
      ).toBe('Mercedes')
    })

    it('SF90 (id 1062018) → Ferrari', () => {
      expect(
        resolveBrand({ marca_apelido: 'Ferrari', marca_nome: null, marca_slug: 'ferrari', modelopai_nome: 'SF90' }),
      ).toBe('Ferrari')
    })
  })

  describe('degradação: slug quando apelido e nome faltam', () => {
    it('mantém sigla em caixa alta', () => {
      expect(resolveBrand({ marca_slug: 'bmw' })).toBe('BMW')
      expect(resolveBrand({ marca_slug: 'ram' })).toBe('RAM')
    })

    it('preserva o hífen de marca composta', () => {
      expect(resolveBrand({ marca_slug: 'rolls-royce' })).toBe('Rolls-Royce')
    })

    it('descarta o prefixo de grupo que o AutoConf usa', () => {
      expect(resolveBrand({ marca_slug: 'gm-chevrolet' })).toBe('Chevrolet')
    })

    it('title-case genérico cobre marca nova sem deploy', () => {
      expect(resolveBrand({ marca_slug: 'lotus' })).toBe('Lotus')
      expect(resolveBrand({ marca_slug: 'rivian' })).toBe('Rivian')
    })
  })

  describe('último recurso e ausência', () => {
    it('sem nenhum campo de marca, ainda infere pelo modelo', () => {
      expect(resolveBrand({ modelopai_nome: 'Huracan' })).toBe('Lamborghini')
    })

    it('devolve vazio quando não há como saber', () => {
      expect(resolveBrand({ modelopai_nome: 'Modelo Inexistente' })).toBe('')
      expect(resolveBrand({})).toBe('')
    })
  })
})
