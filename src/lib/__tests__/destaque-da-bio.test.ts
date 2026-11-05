import { describe, it, expect, beforeEach, vi } from 'vitest'
import { estoqueDaBio, escolherDestaque, esquecerEstoqueDaBio } from '../destaque-da-bio'
import type { Vehicle } from '@/types'

const carro = (id: string, price: number, extra: Partial<Vehicle> = {}) =>
  ({ id, slug: `carro-${id}`, brand: 'Ferrari', model: id, price, status: 'available', photos: [`https://cdn/${id}.jpg`], ...extra }) as Vehicle

describe('destaque da página de links', () => {
  beforeEach(() => {
    esquecerEstoqueDaBio()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('sorteia entre os 5 mais caros da faixa, com foto e à venda', () => {
    const lista = [
      carro('a', 4_000_000), carro('b', 3_000_000), carro('c', 2_000_000),
      carro('d', 1_900_000), carro('e', 1_800_000), carro('f', 1_700_000),
      carro('caro-demais', 9_000_000), carro('sem-foto', 4_500_000, { photos: [] }),
      carro('reservado', 4_200_000, { status: 'reserved' }),
    ]
    expect(escolherDestaque(lista, () => 0)?.id).toBe('a')
    expect(escolherDestaque(lista, () => 0.999)?.id).toBe('e')
  })

  it('sem carro na faixa, ou sem estoque, não há destaque', () => {
    expect(escolherDestaque([carro('barato', 500_000)])).toBeNull()
    expect(escolherDestaque(null)).toBeNull()
  })

  it('guarda a lista por 1 minuto e depois busca de novo', async () => {
    const buscar = vi.fn(async () => [carro('a', 2_000_000)])
    await estoqueDaBio(0, buscar)
    await estoqueDaBio(59_000, buscar)
    expect(buscar).toHaveBeenCalledTimes(1)
    await estoqueDaBio(61_000, buscar)
    expect(buscar).toHaveBeenCalledTimes(2)
  })

  it('com a AutoConf fora, usa a lista de até 10 minutos e, depois disso, nenhuma', async () => {
    await estoqueDaBio(0, async () => [carro('a', 2_000_000)])
    const falha = async () => { throw new Error('AutoConf 500') }
    expect(await estoqueDaBio(5 * 60_000, falha)).toHaveLength(1)
    expect(await estoqueDaBio(11 * 60_000, falha)).toBeNull()
  })

  it('visitas ao mesmo tempo fazem uma busca só', async () => {
    const buscar = vi.fn(async () => [carro('a', 2_000_000)])
    await Promise.all([estoqueDaBio(0, buscar), estoqueDaBio(0, buscar), estoqueDaBio(0, buscar)])
    expect(buscar).toHaveBeenCalledTimes(1)
  })
})
