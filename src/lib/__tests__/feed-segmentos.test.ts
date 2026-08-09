import { describe, it, expect } from 'vitest'
import { SEGMENTOS, segmentoPorSlug } from '../feed-segmentos'
import type { Vehicle } from '@/types'

function veiculo(sobrescreve: Partial<Vehicle> = {}): Vehicle {
  return {
    id: '1', slug: 'x', brand: 'Porsche', model: '911', version: 'Carrera GTS Coupe',
    year_manufacture: 2024, year_model: 2025, color: 'Preto', mileage: 100,
    fuel_type: 'Gasolina', transmission: 'Automático', price: 1_200_000,
    category: 'sports', body_type: 'Cupê', doors: 2, location_id: '1',
    photos: ['https://cdn/1.jpg'], videos: null, options: null,
    description: 'd', seo_title: null, seo_description: null,
    status: 'available', is_new: false,
    ...sobrescreve,
  } as Vehicle
}

describe('segmentos do feed', () => {
  it('todo segmento tem slug único e em minúsculas', () => {
    const slugs = SEGMENTOS.map(s => s.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const s of slugs) expect(s).toBe(s.toLowerCase())
  })

  it('slug desconhecido não resolve', () => {
    expect(segmentoPorSlug('inexistente')).toBeNull()
  })

  describe('porsche-911', () => {
    const seleciona = segmentoPorSlug('porsche-911')!.seleciona

    it('pega o 911', () => {
      expect(seleciona(veiculo())).toBe(true)
    })

    it('não pega outro Porsche', () => {
      expect(seleciona(veiculo({ model: 'Panamera' }))).toBe(false)
      expect(seleciona(veiculo({ model: 'Cayenne' }))).toBe(false)
      expect(seleciona(veiculo({ model: '718 Boxster' }))).toBe(false)
    })

    it('não pega 911 de outra marca — não existe, mas a regra não deve depender disso', () => {
      expect(seleciona(veiculo({ brand: 'Porsche Design', model: '911' }))).toBe(true)
      expect(seleciona(veiculo({ brand: 'Ferrari', model: '911' }))).toBe(false)
    })
  })

  describe('ferrari', () => {
    const seleciona = segmentoPorSlug('ferrari')!.seleciona

    it('pega qualquer Ferrari', () => {
      expect(seleciona(veiculo({ brand: 'Ferrari', model: '296' }))).toBe(true)
      expect(seleciona(veiculo({ brand: 'Ferrari', model: 'SF90' }))).toBe(true)
    })

    it('não pega outra marca', () => {
      expect(seleciona(veiculo({ brand: 'Lamborghini' }))).toBe(false)
    })

    it('marca vazia não entra em recorte de marca', () => {
      expect(seleciona(veiculo({ brand: '' }))).toBe(false)
    })
  })

  describe('suv-500-800', () => {
    const seleciona = segmentoPorSlug('suv-500-800')!.seleciona
    const suv = (p: number, extra: Partial<Vehicle> = {}) =>
      veiculo({ brand: 'BMW', model: 'X5', body_type: 'SUV', doors: 4, price: p, ...extra })

    it('pega SUV dentro da faixa', () => {
      expect(seleciona(suv(650_000))).toBe(true)
    })

    it('faixa fechada nas duas pontas', () => {
      expect(seleciona(suv(500_000))).toBe(true)
      expect(seleciona(suv(800_000))).toBe(true)
      expect(seleciona(suv(499_999))).toBe(false)
      expect(seleciona(suv(800_001))).toBe(false)
    })

    it('inclui o SUV de teto caído que a origem rotula Conversível/Cupê', () => {
      const x6 = suv(700_000, {
        model: 'X6', version: 'M Competition', body_type: 'Conversível/Cupê', doors: 4,
      })
      expect(seleciona(x6)).toBe(true)
    })

    it('não pega esportivo de 2 portas na mesma faixa', () => {
      const cupe = veiculo({ price: 700_000, body_type: 'Cupê', doors: 2 })
      expect(seleciona(cupe)).toBe(false)
    })

    it('não pega sedã na faixa', () => {
      expect(seleciona(veiculo({ price: 700_000, body_type: 'Sedã', doors: 4 }))).toBe(false)
    })
  })
})
