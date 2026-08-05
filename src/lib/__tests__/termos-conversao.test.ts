import { describe, it, expect } from 'vitest'
import { classificarPadrao, pisoWilson } from '../termos-conversao'

/**
 * A classificação de intenção é o que transforma a lista de termos em decisão:
 * na base da Attra, quem procura a LOJA converte ~4x mais que quem procura a
 * categoria. Se um termo cair no grupo errado, a conclusão inverte — e o erro
 * é silencioso, porque a tela continua mostrando números plausíveis.
 */
describe('classificação de intenção do termo', () => {
  it('reconhece quem procura o estabelecimento — o padrão que mais converte', () => {
    expect(classificarPadrao('loja de carros importados')).toBe('estabelecimento')
    expect(classificarPadrao('loja de carro esportivo')).toBe('estabelecimento')
    expect(classificarPadrao('loja carros premium')).toBe('estabelecimento')
    expect(classificarPadrao('onde comprar carros de luxo')).toBe('estabelecimento')
    expect(classificarPadrao('concessionária de carros de luxo')).toBe('estabelecimento')
    expect(classificarPadrao('revenda de carros esportivos')).toBe('estabelecimento')
  })

  it('separa comprar+marca de comprar+categoria', () => {
    expect(classificarPadrao('comprar ferrari')).toBe('comprar_marca')
    expect(classificarPadrao('comprar lamborghini brasil')).toBe('comprar_marca')
    expect(classificarPadrao('comprar bentley usada')).toBe('comprar_marca')
    expect(classificarPadrao('comprar carro de luxo')).toBe('comprar_categoria')
  })

  it('separa marca+à venda da categoria genérica, que converte 4x menos', () => {
    expect(classificarPadrao('porsche a venda')).toBe('marca_venda')
    expect(classificarPadrao('land rover a venda')).toBe('marca_venda')
    expect(classificarPadrao('ferrari a venda brasil')).toBe('marca_venda')
    expect(classificarPadrao('carros importados a venda')).toBe('categoria_generica')
    expect(classificarPadrao('carros esportivos a venda brasil')).toBe('categoria_generica')
    expect(classificarPadrao('carros de luxo usados')).toBe('categoria_generica')
  })

  it('isola nome de criativo, que entra pelo mesmo campo e achataria a média', () => {
    // 6.183 sessões e 5 conversões: somado aos termos de busca, derruba a média
    // de todo mundo e esconde o que de fato converte.
    expect(classificarPadrao('Reels - Estoque')).toBe('criativo')
    expect(classificarPadrao('(Corte) - Estoque - Cris')).toBe('criativo')
  })

  it('aceita acento e caixa, que variam conforme quem cadastrou a campanha', () => {
    expect(classificarPadrao('Porsche à venda')).toBe('marca_venda')
    expect(classificarPadrao('LOJA DE CARROS IMPORTADOS')).toBe('estabelecimento')
    expect(classificarPadrao('  Comprar Ferrari  ')).toBe('comprar_marca')
  })

  it('reconhece Bentley, que entra no estoque em agosto/2026', () => {
    expect(classificarPadrao('bentley usada')).toBe('marca_venda')
    expect(classificarPadrao('onde comprar bentley')).toBe('estabelecimento')
  })
})

/**
 * O piso é o que decide a ORDEM da tabela. Se ele estiver errado, a tela indica
 * a aposta errada com aparência de rigor — o pior tipo de defeito num painel.
 */
describe('piso de confiança (Wilson 95%)', () => {
  it('coloca volume comprovado na frente de amostra pequena e sortuda', () => {
    // Caso real da base: "ferrari a venda" mostra 11,5% com 26 sessões;
    // "loja de carros importados" mostra 7,5% com 623. A segunda é a aposta.
    const pequeno = pisoWilson(3, 26)   // taxa crua 11,5%
    const grande  = pisoWilson(47, 623) // taxa crua 7,5%
    expect(pequeno).toBeLessThan(grande)
  })

  it('nunca passa da taxa crua, porque é um piso', () => {
    for (const [c, n] of [[3, 26], [47, 623], [1, 20], [15, 195]] as const) {
      expect(pisoWilson(c, n)).toBeLessThanOrEqual((100 * c) / n)
    }
  })

  it('aperta o piso conforme a amostra cresce, com a mesma taxa', () => {
    const p10 = pisoWilson(1, 10)
    const p100 = pisoWilson(10, 100)
    const p1000 = pisoWilson(100, 1000)
    expect(p10).toBeLessThan(p100)
    expect(p100).toBeLessThan(p1000)
    expect(p1000).toBeLessThan(10)
  })

  it('não quebra nos extremos', () => {
    expect(pisoWilson(0, 0)).toBe(0)
    expect(pisoWilson(0, 100)).toBe(0)
    expect(pisoWilson(100, 100)).toBeGreaterThan(90)
    expect(pisoWilson(5, 0)).toBe(0)
  })
})
