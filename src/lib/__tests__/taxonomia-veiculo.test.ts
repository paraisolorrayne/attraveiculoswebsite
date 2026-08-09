import { describe, it, expect } from 'vitest'
import {
  classificarCarroceria,
  classificarCombustivel,
  carroceriaDoFiltro,
  combustivelDoFiltro,
  marcaCasaComFiltro,
} from '../taxonomia-veiculo'

/**
 * Cada caso abaixo é um veículo real do estoque de 08/08/2026, com os valores
 * exatos que o AutoConf devolve. São os defeitos que o Pedro reportou, mais os
 * que apareceram na medição.
 */

describe('carroceria', () => {
  describe('rótulos que a origem já entrega prontos', () => {
    const casos: Array<[string, string]> = [
      ['SUV / Utilitário Esportivo', 'suv'],
      ['Sedã', 'sedan'],
      ['Picapes', 'picape'],
      ['Wagon/Perua', 'perua'],
      ['Hatch', 'hatch'],
    ]
    for (const [rotulo, esperado] of casos) {
      it(`${rotulo} → ${esperado}`, () => {
        expect(classificarCarroceria({ carroceria: rotulo, portas: 4 })).toEqual([esperado])
      })
    }
  })

  it('Sedã responde ao filtro "sedan" — eram 9 veículos invisíveis', () => {
    const audiA5 = { carroceria: 'Sedã', marca: 'Audi', modelo: 'A5', versao: 'Sportb.Prestige Plus TFSI S-tronc', portas: 4 }
    const alvo = carroceriaDoFiltro('sedan')
    expect(alvo).toBe('sedan')
    expect(classificarCarroceria(audiA5)).toContain(alvo!)
  })

  describe('o balde ambíguo "Conversível/Cupê"', () => {
    it('4 portas é SUV de teto caído, não cupê — eram 12 fora do filtro de SUV', () => {
      const x6 = { carroceria: 'Conversível/Cupê', marca: 'BMW', modelo: 'X6', versao: 'M Competition BI-TB 625CV Aut.', portas: 4 }
      expect(classificarCarroceria(x6)).toEqual(['suv'])
    })

    it('911 Turbo S Coupe não aparece em conversível — era a reclamação original', () => {
      const turboS = { carroceria: 'Conversível/Cupê', marca: 'Porsche', modelo: '911', versao: 'Turbo S Coupe', portas: 2 }
      expect(classificarCarroceria(turboS)).toEqual(['cupe'])
    })

    it('911 Carrera Cabriolet é conversível', () => {
      const cabrio = { carroceria: 'Conversível/Cupê', marca: 'Porsche', modelo: '911', versao: 'Carrera Cabriolet', portas: 2 }
      expect(classificarCarroceria(cabrio)).toEqual(['conversivel'])
    })

    it('Boxster é roadster: não existe versão fechada', () => {
      const boxster = { carroceria: 'Conversível/Cupê', marca: 'Porsche', modelo: '718 Boxster', versao: 'GTS 400cv', portas: 2 }
      expect(classificarCarroceria(boxster)).toEqual(['conversivel'])
    })

    it('Ferrari: GTB é berlinetta, GTS é spider', () => {
      const base = { carroceria: 'Conversível/Cupê', marca: 'Ferrari', modelo: '296', portas: 2 }
      expect(classificarCarroceria({ ...base, versao: 'GTB' })).toEqual(['cupe'])
      expect(classificarCarroceria({ ...base, versao: 'GTS' })).toEqual(['conversivel'])
    })

    it('na Porsche, GTS é acabamento e não diz nada sobre o teto', () => {
      const carreraGTS = { carroceria: 'Conversível/Cupê', marca: 'Porsche', modelo: '911', versao: 'Carrera GTS', portas: 2 }
      expect(classificarCarroceria(carreraGTS)).toEqual(['conversivel', 'cupe'])
    })

    it('quando não dá para saber, aparece nos dois em vez de sumir dos dois', () => {
      const camaro = { carroceria: 'Conversível/Cupê', marca: 'Chevrolet', modelo: 'Camaro', versao: 'SS V8', portas: 2 }
      expect(classificarCarroceria(camaro)).toEqual(['conversivel', 'cupe'])
    })
  })

  it('carroceria vazia não entra em filtro nenhum', () => {
    expect(classificarCarroceria({ carroceria: '', portas: 4 })).toEqual([])
  })

  describe('as duas UIs mandam valores diferentes no mesmo parâmetro', () => {
    it('vehicle-filters manda minúsculo sem acento', () => {
      expect(carroceriaDoFiltro('coupe')).toBe('cupe')
      expect(carroceriaDoFiltro('sedan')).toBe('sedan')
      expect(carroceriaDoFiltro('perua')).toBe('perua')
    })

    it('advanced-filters manda o rótulo acentuado', () => {
      expect(carroceriaDoFiltro('Cupê')).toBe('cupe')
      expect(carroceriaDoFiltro('Conversível')).toBe('conversivel')
      expect(carroceriaDoFiltro('Wagon')).toBe('perua')
      expect(carroceriaDoFiltro('SUV')).toBe('suv')
    })
  })
})

describe('combustível', () => {
  it('"Gasolina e Elétrico" é híbrido — eram 22 sem filtro', () => {
    expect(classificarCombustivel('Gasolina e Elétrico')).toBe('hibrido')
  })

  it('"Diesel e Elétrico" também', () => {
    expect(classificarCombustivel('Diesel e Elétrico')).toBe('hibrido')
  })

  it('elétrico é 100% elétrico, sem híbrido junto', () => {
    expect(classificarCombustivel('Elétrico')).toBe('eletrico')
  })

  it('as categorias são exclusivas: gasolina pura não inclui híbrido', () => {
    expect(classificarCombustivel('Gasolina')).toBe('gasolina')
    expect(classificarCombustivel('Gasolina e Elétrico')).not.toBe('gasolina')
  })

  it('diesel e flex', () => {
    expect(classificarCombustivel('Diesel')).toBe('diesel')
    expect(classificarCombustivel('Flex')).toBe('flex')
  })

  it('vazio não classifica', () => {
    expect(classificarCombustivel('')).toBeNull()
    expect(classificarCombustivel(null)).toBeNull()
  })

  it('aceita o valor das duas UIs', () => {
    expect(combustivelDoFiltro('hibrido')).toBe('hibrido')
    expect(combustivelDoFiltro('Híbrido')).toBe('hibrido')
    expect(combustivelDoFiltro('Elétrico')).toBe('eletrico')
  })
})

describe('marca', () => {
  it('marca vazia nunca casa — era o Cybertruck em todas as marcas', () => {
    expect(marcaCasaComFiltro('', 'mercedes-benz')).toBe(false)
    expect(marcaCasaComFiltro(null, 'porsche')).toBe(false)
  })

  it('espaço e hífen não podem separar — eram 6 Land Rover invisíveis', () => {
    expect(marcaCasaComFiltro('Land Rover', 'land-rover')).toBe(true)
  })

  it('casa nos dois sentidos', () => {
    expect(marcaCasaComFiltro('Mercedes', 'mercedes-benz')).toBe(true)
    expect(marcaCasaComFiltro('Mercedes-Benz', 'mercedes')).toBe(true)
  })

  it('ignora caixa e acento', () => {
    expect(marcaCasaComFiltro('LAMBORGHINI', 'lamborghini')).toBe(true)
  })

  it('não casa marca diferente', () => {
    expect(marcaCasaComFiltro('Porsche', 'ferrari')).toBe(false)
  })
})
