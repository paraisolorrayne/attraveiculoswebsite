import { describe, it, expect } from 'vitest'
import { buildVehicleBreadcrumbSchema, trilhaDoVeiculo } from '../vehicle-schema'
import type { Vehicle } from '@/types'

const S63 = {
  id: '1142317', slug: 'mercedes-s-63-2025-1142317', brand: 'Mercedes', model: 'S-63',
  version: 'AMG S E Performance Automático', year_manufacture: 2025, year_model: 2025,
  price: 1_690_000, mileage: 1920,
} as Vehicle

describe('trilha da ficha', () => {
  it('a marca leva à listagem filtrada, não à página de compra', () => {
    const marca = trilhaDoVeiculo(S63)[1]
    expect(marca.label).toBe('Mercedes-Benz')
    expect(marca.href).toBe('/veiculos?marca=mercedes-benz')
  })

  it('o BreadcrumbList usa a página da marca, para onde a listagem canonicaliza', () => {
    const itens = buildVehicleBreadcrumbSchema(S63).itemListElement
    const marca = itens.find(i => i.name === 'Mercedes-Benz')
    expect(marca?.item).toBe('https://attraveiculos.com.br/comprar/mercedes-benz')
  })

  it('o modelo continua na página de compra do modelo', () => {
    const modelo = trilhaDoVeiculo(S63)[2]
    expect(modelo.href).toMatch(/^\/comprar\/mercedes-benz\//)
  })
})
