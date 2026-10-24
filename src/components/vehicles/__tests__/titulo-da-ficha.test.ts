import { describe, it, expect } from 'vitest'
import { numerosDoTitulo } from '../titulo-da-ficha'
import type { Vehicle } from '@/types'

function veiculo(extra: Partial<Vehicle> = {}): Vehicle {
  return {
    id: '1', brand: 'Mercedes', model: 'S-63', year_manufacture: 2025, year_model: 2025,
    mileage: 1920, horsepower: null, transmission: 'Automático', fuel_type: 'Gasolina e Elétrico',
    ...extra,
  } as Vehicle
}

describe('números grandes do título', () => {
  it('usa a potência e o câmbio da ficha do molde', () => {
    const numeros = numerosDoTitulo(veiculo({
      ficha: { potencia: '802 cv', cambio: 'AMG Speedshift de 9 marchas' } as Vehicle['ficha'],
    }))
    expect(numeros).toEqual([
      { rotulo: 'Ano', valor: '2025/2025' },
      { rotulo: 'Quilometragem', valor: '1.920 km' },
      { rotulo: 'Potência', valor: '802 cv' },
      { rotulo: 'Câmbio', valor: 'AMG Speedshift de 9 marchas' },
    ])
  })

  it('sem potência, o combustível entra no lugar', () => {
    expect(numerosDoTitulo(veiculo()).map(n => n.rotulo)).toEqual(['Ano', 'Quilometragem', 'Câmbio', 'Combustível'])
  })

  it('carro zero mostra 0 km', () => {
    expect(numerosDoTitulo(veiculo({ mileage: 0 }))[1].valor).toBe('0 km')
  })
})
