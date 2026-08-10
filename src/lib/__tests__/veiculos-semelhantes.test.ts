import { describe, it, expect } from 'vitest'
import { lerSlug, ordenarPorSemelhanca, semelhantesDoSlug } from '../veiculos-semelhantes'
import type { Vehicle } from '@/types'

function v(brand: string, model: string, year: number, price: number, id = String(Math.abs(price))): Vehicle {
  return {
    id, slug: `${brand}-${model}-${year}-${id}`.toLowerCase(), brand, model, version: null,
    year_manufacture: year, year_model: year, color: 'Preto', mileage: 1000,
    fuel_type: 'Gasolina', transmission: 'Automático', price, category: 'sports',
    body_type: 'Cupê', doors: 2, location_id: '1', photos: ['https://cdn/1.jpg'],
    videos: null, options: null, description: 'd', seo_title: null, seo_description: null,
    status: 'available', is_new: false,
  } as Vehicle
}

const ESTOQUE = [
  v('Porsche', '911', 2023, 899_000),
  v('Porsche', '911', 2025, 1_150_000),
  v('Porsche', 'Cayenne', 2024, 749_000),
  v('Porsche', 'Panamera', 2025, 1_090_000),
  v('BMW', 'M3', 2025, 749_000),
  v('Mercedes', 'GLC', 2022, 249_000),
]

describe('leitura do slug', () => {
  it('separa id, ano e prefixo do caso real', () => {
    expect(lerSlug('porsche-911-2019-950539')).toEqual({
      prefixo: 'porsche-911', ano: 2019, id: '950539',
    })
  })

  it('lê de trás para frente, então marca composta não atrapalha', () => {
    expect(lerSlug('land-rover-defender-2023-123456')).toEqual({
      prefixo: 'land-rover-defender', ano: 2023, id: '123456',
    })
  })

  it('aguenta slug sem ano', () => {
    expect(lerSlug('cybertruck-1070715')).toEqual({ prefixo: 'cybertruck', ano: null, id: '1070715' })
  })

  it('aguenta slug sem nada reconhecível', () => {
    expect(lerSlug('xxxxx')).toEqual({ prefixo: 'xxxxx', ano: null, id: null })
  })

  it('não confunde ano com id de quatro dígitos no fim', () => {
    // O id sai primeiro; só então o ano é considerado.
    expect(lerSlug('bmw-m3-2025-1000847').ano).toBe(2025)
  })
})

describe('ordenação por semelhança', () => {
  const pedido = lerSlug('porsche-911-2019-950539')

  it('mesmo modelo vem antes de tudo', () => {
    const ordenado = ordenarPorSemelhanca(ESTOQUE, pedido)
    expect(ordenado.slice(0, 2).map(x => x.model)).toEqual(['911', '911'])
  })

  it('mesma marca vem antes de outra marca', () => {
    const ordenado = ordenarPorSemelhanca(ESTOQUE, pedido)
    const marcas = ordenado.map(x => x.brand)
    expect(marcas.indexOf('Porsche')).toBeLessThan(marcas.indexOf('BMW'))
  })

  it('nunca devolve lista vazia — quem chegou precisa ver algo', () => {
    const semNada = ordenarPorSemelhanca(ESTOQUE, lerSlug('bugatti-chiron-2020-1'))
    expect(semNada).toHaveLength(ESTOQUE.length)
  })

  it('ano próximo desempata dentro do mesmo modelo', () => {
    const estoque = [v('Porsche', '911', 2025, 900_000), v('Porsche', '911', 2020, 900_000)]
    const ordenado = ordenarPorSemelhanca(estoque, lerSlug('porsche-911-2019-1'))
    expect(ordenado[0].year_model).toBe(2020)
  })

  it('preço não elimina ninguém, só desempata', () => {
    // O GLC de R$ 249 mil continua na lista mesmo pedindo um 911 de R$ 1 mi.
    const ordenado = ordenarPorSemelhanca(ESTOQUE, pedido)
    expect(ordenado.some(x => x.model === 'GLC')).toBe(true)
  })
})

describe('semelhantes a partir do slug', () => {
  it('reconhece marca e modelo do carro que saiu', () => {
    const r = semelhantesDoSlug(ESTOQUE, 'porsche-911-2019-950539')
    expect(r.marca).toBe('Porsche')
    expect(r.modelo).toBe('911')
  })

  it('respeita o limite', () => {
    expect(semelhantesDoSlug(ESTOQUE, 'porsche-911-2019-950539', 2).veiculos).toHaveLength(2)
  })

  it('marca desconhecida não inventa reconhecimento', () => {
    const r = semelhantesDoSlug(ESTOQUE, 'bugatti-chiron-2020-1')
    expect(r.marca).toBeNull()
    expect(r.modelo).toBeNull()
    // Mas ainda sugere carros.
    expect(r.veiculos.length).toBeGreaterThan(0)
  })

  it('estoque vazio não quebra', () => {
    const r = semelhantesDoSlug([], 'porsche-911-2019-950539')
    expect(r.veiculos).toEqual([])
    expect(r.marca).toBeNull()
  })

  it('casa "Mercedes" do estoque com slug "mercedes-glc"', () => {
    const r = semelhantesDoSlug(ESTOQUE, 'mercedes-glc-2022-1025906')
    expect(r.marca).toBe('Mercedes')
    expect(r.modelo).toBe('GLC')
    expect(r.veiculos[0].model).toBe('GLC')
  })
})
