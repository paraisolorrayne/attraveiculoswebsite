import { describe, it, expect } from 'vitest'
import { itemDaListaDeVeiculos } from '../vehicle-schema'
import type { Vehicle } from '@/types'

const F812 = {
  id: '1154688', slug: '812-2024-1154688', brand: 'Ferrari', model: '812',
  version: 'Competizione', year_manufacture: 2024, year_model: 2024,
  price: 6_500_000, mileage: 900, status: 'available',
  photos: ['https://cdn.exemplo/1.jpg', 'https://cdn.exemplo/2.jpg', 'https://cdn.exemplo/3.jpg', 'https://cdn.exemplo/4.jpg'],
} as Vehicle

describe('carro numa lista do estoque (listagem do comerciante)', () => {
  it('com oferta, leva foto (sem image é erro crítico no Search Console)', () => {
    const item = itemDaListaDeVeiculos(F812, 1)
    expect(item).toMatchObject({
      '@type': 'ListItem',
      position: 1,
      item: {
        '@type': 'Vehicle',
        url: 'https://attraveiculos.com.br/veiculo/812-2024-1154688',
        image: F812.photos.slice(0, 3),
        offers: { price: 6_500_000, priceCurrency: 'BRL', availability: 'https://schema.org/InStock' },
      },
    })
  })

  it('sem foto, fica só nome e endereço, sem oferta', () => {
    const item = itemDaListaDeVeiculos({ ...F812, photos: [] }, 2)
    expect(item).toEqual({
      '@type': 'ListItem',
      position: 2,
      url: 'https://attraveiculos.com.br/veiculo/812-2024-1154688',
      name: expect.stringContaining('812'),
    })
    expect(item).not.toHaveProperty('item')
  })
})
